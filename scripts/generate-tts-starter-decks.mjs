import { readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  buildCatalog,
  CURRENT_ALIAS_ROOT,
  loadCurrentLeaders,
  loadCurrentStarterDecks,
  PLAYABLE_BACK_FACTIONS,
  ROOT,
} from './tts-current-catalog.mjs';
import {
  loadTtsComponentContract,
  resolveFactionBackFile,
  resolveStandardBackFile,
} from './tts-component-contract.mjs';

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function indexUniqueByName(items, label) {
  const index = new Map();
  for (const item of items) {
    const name = String(item?.name || '').trim();
    if (!name) throw new Error(`${label} contains an item without a name.`);
    if (index.has(name)) throw new Error(`${label} contains duplicate name "${name}"; starter-deck name references would be ambiguous.`);
    index.set(name, item);
  }
  return index;
}

function indexLeaders(leaders, label) {
  const index = new Map();
  for (const leader of leaders || []) {
    const faction = String(leader?.faction || '').trim().toLowerCase();
    const id = String(leader?.id || '').trim().toLowerCase();
    if (!faction || !id) throw new Error(`${label} contains a Leader without faction/id.`);
    const key = `${faction}:${id}`;
    if (index.has(key)) throw new Error(`${label} contains duplicate Leader key ${key}.`);
    index.set(key, leader);
  }
  return index;
}

function validateStarterDecks(starterDecks, catalog, leaders) {
  const decks = starterDecks.decks || [];
  const construction = starterDecks.construction || {};
  const cardByName = indexUniqueByName(catalog.playableCards, 'Canonical playable-card catalog');
  const territoryByName = indexUniqueByName(catalog.territories, 'Canonical Territory catalog');
  const leaderByKey = indexLeaders(leaders, 'Canonical Leader catalog');
  const deckIds = new Set();

  for (const deck of decks) {
    if (!deck.id || deckIds.has(deck.id)) throw new Error(`Starter deck has a missing or duplicate id: ${deck.id || 'missing'}.`);
    deckIds.add(deck.id);

    const faction = String(deck.factionId || '').trim().toLowerCase();
    if (!PLAYABLE_BACK_FACTIONS.includes(faction)) {
      throw new Error(`Starter deck ${deck.id} has unsupported factionId ${deck.factionId}.`);
    }
    const leaderId = String(deck.leaderId || '').trim().toLowerCase();
    if (!leaderId) throw new Error(`Starter deck ${deck.id} does not declare leaderId.`);
    if (!leaderByKey.has(`${faction}:${leaderId}`)) {
      throw new Error(`Starter deck ${deck.id} references unknown ${faction} Leader "${deck.leaderId}".`);
    }
    if (!Array.isArray(deck.cards) || !deck.cards.length) throw new Error(`Starter deck ${deck.id} has no cards.`);

    let cardCount = 0;
    let deckbuildingValue = 0;
    for (const entry of deck.cards) {
      const quantity = Number(entry.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`Starter deck ${deck.id} has invalid quantity for ${entry.name}: ${entry.quantity}.`);
      }

      const card = cardByName.get(entry.name);
      if (!card) throw new Error(`Starter deck ${deck.id} references unknown card "${entry.name}".`);
      if (card.faction !== 'neutral' && card.faction !== faction) {
        throw new Error(`Starter deck ${deck.id} (${faction}) illegally contains ${card.faction} card "${card.name}".`);
      }
      if (card.unique && Number.isInteger(construction.uniqueCopyLimit) && quantity > construction.uniqueCopyLimit) {
        throw new Error(`Starter deck ${deck.id} exceeds the unique-copy limit for "${card.name}".`);
      }

      cardCount += quantity;
      deckbuildingValue += Number(card.cost || 0) * quantity;
    }

    if (Number.isInteger(deck.cardCount) && deck.cardCount !== cardCount) {
      throw new Error(`Starter deck ${deck.id} declares ${deck.cardCount} cards but resolves to ${cardCount}.`);
    }
    if (Number.isInteger(construction.minimumCards) && cardCount < construction.minimumCards) {
      throw new Error(`Starter deck ${deck.id} has ${cardCount} cards; minimum is ${construction.minimumCards}.`);
    }
    if (Number.isFinite(deck.deckbuildingValue) && Number(deck.deckbuildingValue) !== deckbuildingValue) {
      throw new Error(`Starter deck ${deck.id} declares deckbuilding value ${deck.deckbuildingValue} but resolves to ${deckbuildingValue}.`);
    }
    if (Number.isFinite(construction.maximumDeckbuildingValue) && deckbuildingValue > Number(construction.maximumDeckbuildingValue)) {
      throw new Error(`Starter deck ${deck.id} has deckbuilding value ${deckbuildingValue}; maximum is ${construction.maximumDeckbuildingValue}.`);
    }

    if (!Array.isArray(deck.territories)) throw new Error(`Starter deck ${deck.id} does not declare Territories.`);
    if (Number.isInteger(construction.territoryCount) && deck.territories.length !== construction.territoryCount) {
      throw new Error(`Starter deck ${deck.id} has ${deck.territories.length} Territories; expected ${construction.territoryCount}.`);
    }

    let arenaCount = 0;
    for (const name of deck.territories) {
      const territory = territoryByName.get(name);
      if (!territory) throw new Error(`Starter deck ${deck.id} references unknown Territory "${name}".`);
      if (territory.arena) arenaCount += 1;
    }
    if (Number.isInteger(construction.maximumArenas) && arenaCount > construction.maximumArenas) {
      throw new Error(`Starter deck ${deck.id} contains ${arenaCount} Arenas; maximum is ${construction.maximumArenas}.`);
    }

    if (Array.isArray(deck.recommendedTerritoryOrder)) {
      const expected = [...deck.territories].sort();
      const recommended = [...deck.recommendedTerritoryOrder].sort();
      if (expected.length !== recommended.length || expected.some((name, index) => name !== recommended[index])) {
        throw new Error(`Starter deck ${deck.id} recommended Territory order does not contain exactly its selected Territories.`);
      }
    }
  }

  return { cardByName, territoryByName, leaderByKey };
}

function flattenCardManifest(manifest) {
  const result = new Map();
  for (const sheet of manifest.sheets || []) {
    for (const card of sheet.cards || []) {
      result.set(card.id, {
        ...card,
        sheetNumber: sheet.sheetNumber,
        deckId: sheet.deckId,
        faceFile: sheet.faceFile,
        numWidth: sheet.numWidth,
        numHeight: sheet.numHeight,
      });
    }
  }
  return result;
}

function flattenTerritoryManifest(manifest) {
  if (manifest.backPolicy !== 'standardBack') {
    throw new Error(`Territory manifest must use standardBack; found ${manifest.backPolicy || 'missing'}.`);
  }
  const result = new Map();
  for (const sheet of manifest.sheets || []) {
    if (sheet.backPolicy !== 'standardBack') {
      throw new Error(`Territory sheet ${sheet.sheetNumber} must use standardBack; found ${sheet.backPolicy || 'missing'}.`);
    }
    for (const territory of sheet.cards || []) {
      result.set(territory.id, {
        ...territory,
        sheetNumber: sheet.sheetNumber,
        deckId: sheet.deckId,
        faceFile: sheet.faceFile,
        numWidth: sheet.numWidth,
        numHeight: sheet.numHeight,
      });
    }
  }
  return result;
}

function makePlayableReference(card, render, quantity) {
  return {
    id: card.id,
    name: card.name,
    quantity,
    faction: card.faction,
    cost: card.cost,
    unique: card.unique,
    tts: {
      cardId: render.ttsCardId,
      deckId: render.deckId,
      sheetNumber: render.sheetNumber,
      index: render.index,
      faceFile: render.faceFile,
      numWidth: render.numWidth,
      numHeight: render.numHeight,
    },
  };
}

function makeTerritoryReference(territory, render, backFile) {
  return {
    id: territory.id,
    name: territory.name,
    arena: territory.arena,
    backPolicy: 'standardBack',
    tts: {
      cardId: render.ttsCardId,
      deckId: render.deckId,
      sheetNumber: render.sheetNumber,
      index: render.index,
      faceFile: render.faceFile,
      backFile,
      numWidth: render.numWidth,
      numHeight: render.numHeight,
    },
  };
}

function makeLeaderReference(leader, render) {
  return {
    id: leader.id,
    name: leader.name,
    faction: leader.faction,
    factionLabel: leader.factionLabel,
    backPolicy: 'factionComponentBack',
    tts: { ...render.tts },
  };
}

function buildStarterManifest(starterDecks, catalog, leaders, cardManifest, territoryManifest, leaderManifest, componentContract) {
  const { cardByName, territoryByName, leaderByKey } = validateStarterDecks(starterDecks, catalog, leaders);
  const renderedCards = flattenCardManifest(cardManifest);
  const renderedTerritories = flattenTerritoryManifest(territoryManifest);
  const renderedLeaders = indexLeaders(leaderManifest.leaders, 'Rendered Leader manifest');

  if (
    cardManifest.gameVersion !== catalog.gameVersion
    || territoryManifest.gameVersion !== catalog.gameVersion
    || leaderManifest.gameVersion !== catalog.gameVersion
  ) {
    throw new Error(`Generated TTS manifests do not match current release ${catalog.gameVersion}.`);
  }

  const decks = starterDecks.decks.map((deck) => {
    const faction = String(deck.factionId).trim().toLowerCase();
    const leaderId = String(deck.leaderId).trim().toLowerCase();
    const backFile = resolveStandardBackFile(componentContract);
    const factionBackFile = resolveFactionBackFile(componentContract, faction);
    for (const requiredBack of [backFile, factionBackFile]) {
      const backVariant = requiredBack.replace(/^backs\//, '').replace(/\.png$/i, '');
      if (!cardManifest.backVariants?.[backVariant] || cardManifest.backVariants[backVariant].file !== requiredBack) {
        throw new Error(`Generated card manifest does not provide required back ${requiredBack} for ${deck.id}.`);
      }
    }

    const canonicalLeader = leaderByKey.get(`${faction}:${leaderId}`);
    const renderedLeader = renderedLeaders.get(`${faction}:${leaderId}`);
    if (!renderedLeader) throw new Error(`Rendered Leader manifest is missing ${faction}:${leaderId} required by ${deck.id}.`);
    if (renderedLeader.tts?.backFile !== factionBackFile) {
      throw new Error(`Rendered Leader ${faction}:${leaderId} does not use faction-component back ${factionBackFile} required by ${deck.id}.`);
    }
    const leader = makeLeaderReference(canonicalLeader, renderedLeader);

    const cards = deck.cards.map((entry) => {
      const card = cardByName.get(entry.name);
      const render = renderedCards.get(card.id);
      if (!render) throw new Error(`Rendered card manifest is missing ${card.id} required by ${deck.id}.`);
      return makePlayableReference(card, render, Number(entry.quantity));
    });

    const territories = deck.territories.map((name) => {
      const territory = territoryByName.get(name);
      const render = renderedTerritories.get(territory.id);
      if (!render) throw new Error(`Rendered Territory manifest is missing ${territory.id} required by ${deck.id}.`);
      return makeTerritoryReference(territory, render, backFile);
    });

    const faceSheetMap = new Map();
    for (const card of cards) {
      const tts = card.tts;
      if (!faceSheetMap.has(tts.deckId)) {
        faceSheetMap.set(tts.deckId, {
          deckId: tts.deckId,
          faceFile: tts.faceFile,
          numWidth: tts.numWidth,
          numHeight: tts.numHeight,
          backFile,
          backIsHidden: true,
          uniqueBack: false,
        });
      }
    }

    const deckCardIds = cards.flatMap((card) => Array.from({ length: card.quantity }, () => card.tts.cardId));
    const orderNames = Array.isArray(deck.recommendedTerritoryOrder) ? deck.recommendedTerritoryOrder : deck.territories;
    const territoryBySelectedName = new Map(territories.map((territory) => [territory.name, territory]));

    return {
      id: deck.id,
      name: deck.name,
      factionId: faction,
      leaderId,
      leader,
      recommendedFirstLeader: Boolean(deck.recommendedFirstLeader),
      summary: deck.summary || '',
      strategy: deck.strategy || '',
      signatureCards: deck.signatureCards || [],
      cardCount: deckCardIds.length,
      deckbuildingValue: cards.reduce((sum, card) => sum + Number(card.cost || 0) * card.quantity, 0),
      back: {
        faction: 'universal',
        file: backFile,
        policy: 'standardBack',
        mode: 'universal-black',
        neutralCardsUseSameStandardBack: true,
        territoriesUseSameStandardBack: true,
      },
      factionComponentBack: {
        faction,
        file: factionBackFile,
        policy: 'factionComponentBack',
        mode: 'faction',
      },
      cards,
      deckCardIds,
      faceSheets: [...faceSheetMap.values()].sort((a, b) => a.deckId - b.deckId),
      territories,
      recommendedTerritoryOrder: orderNames.map((name) => territoryBySelectedName.get(name).id),
      territoryOrderGuidance: deck.territoryOrderGuidance || null,
      selectedRites: Array.isArray(deck.selectedRites) ? [...deck.selectedRites] : [],
      recommendedRiteOrder: Array.isArray(deck.recommendedRiteOrder) ? [...deck.recommendedRiteOrder] : [],
    };
  });

  return {
    schemaVersion: 3,
    gameVersion: catalog.gameVersion,
    release: catalog.release,
    source: {
      starterDecks: catalog.release.starterDecksSource,
      starterDeckDataVersion: starterDecks.version || null,
      starterDeckDataStatus: starterDecks.status || null,
      componentContract: 'game-data/current-game.json#componentContract',
    },
    construction: starterDecks.construction || {},
    backPolicy: {
      standardBack: 'universal-black',
      factionComponentBack: 'faction',
      variants: componentContract.standardBack.variants,
    },
    deckCount: decks.length,
    decks,
  };
}

async function readGeneratedManifests(outputRoot) {
  const [cardManifest, territoryManifest, leaderManifest] = await Promise.all([
    readFile(join(outputRoot, 'manifest.json'), 'utf8').then(JSON.parse),
    readFile(join(outputRoot, 'territory-manifest.json'), 'utf8').then(JSON.parse),
    readFile(join(outputRoot, 'leader-manifest.json'), 'utf8').then(JSON.parse),
  ]).catch((error) => {
    if (error.code === 'ENOENT') {
      throw new Error('Starter-deck assembly requires current card, Territory, and Leader manifests. Run npm run tts:cards, npm run tts:territories, and npm run tts:leaders first, or use npm run tts:build.');
    }
    throw error;
  });
  return { cardManifest, territoryManifest, leaderManifest };
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const [catalog, currentStarterDecks, currentLeaders, componentContract] = await Promise.all([
    buildCatalog(),
    loadCurrentStarterDecks(),
    loadCurrentLeaders(),
    loadTtsComponentContract(),
  ]);
  const { release, starterDecks } = currentStarterDecks;
  const { leaders } = currentLeaders;
  validateStarterDecks(starterDecks, catalog, leaders);

  if (checkOnly) {
    resolveStandardBackFile(componentContract);
    for (const deck of starterDecks.decks) resolveFactionBackFile(componentContract, String(deck.factionId).trim().toLowerCase());
    console.log(`Current TTS starter-deck source check passed for ${catalog.gameVersion}: ${starterDecks.decks.length} starter decks using universal-black Deck/Territory backs and faction-color component backs.`);
    return;
  }

  const { cardManifest, territoryManifest, leaderManifest } = await readGeneratedManifests(release.outputRoot);
  const manifest = buildStarterManifest(starterDecks, catalog, leaders, cardManifest, territoryManifest, leaderManifest, componentContract);
  const outputPath = join(release.outputRoot, 'starter-deck-manifest.json');
  const aliasPath = join(CURRENT_ALIAS_ROOT, 'starter-deck-manifest.json');
  await writeFile(outputPath, jsonText(manifest));
  await writeFile(aliasPath, jsonText(manifest));
  console.log(`Assembled ${manifest.deckCount} current TTS starter decks to ${relative(ROOT, outputPath)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

export { buildStarterManifest, validateStarterDecks };