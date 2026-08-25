import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';
import { STAGING_ROOT } from './stage-tts-release-assets.mjs';

const FACTION_COLORS = Object.freeze({
  military: { r: 0.620, g: 0.149, b: 0.173 },
  diplomats: { r: 0.149, g: 0.310, b: 0.569 },
  financiers: { r: 0.133, g: 0.439, b: 0.267 },
  intelligence: { r: 0.157, g: 0.157, b: 0.153 },
  mystics: { r: 0.365, g: 0.204, b: 0.494 },
  inquisition: { r: 0.651, g: 0.478, b: 0.153 },
});

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function transform(posX = 0, posY = 1, posZ = 0, rotY = 0, scaleX = 1, scaleY = 1, scaleZ = 1) {
  return { posX, posY, posZ, rotX: 0, rotY, rotZ: 0, scaleX, scaleY, scaleZ };
}

function color(r = 1, g = 1, b = 1) {
  return { r, g, b };
}

function vector(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function makeGuidFactory() {
  let value = 1;
  return () => (value++).toString(36).padStart(6, '0').slice(-6);
}

function objectBase(name, nickname, description, objectTransform, guid) {
  return {
    Name: name,
    Transform: objectTransform,
    Nickname: nickname || '',
    Description: description || '',
    ColorDiffuse: color(),
    Locked: false,
    Grid: true,
    Snap: true,
    Autoraise: true,
    Sticky: true,
    Tooltip: true,
    GridProjection: false,
    HideWhenFaceDown: false,
    Hands: false,
    LuaScript: '',
    LuaScriptState: '',
    XmlUI: '',
    GUID: guid,
  };
}

function requireHostedUrl(releaseAssets, sourceFile) {
  const url = releaseAssets?.bySourceFile?.[sourceFile];
  if (!url) throw new Error(`Hosted TTS release manifest does not map source file ${sourceFile}.`);
  if (!/^https:\/\//i.test(url)) throw new Error(`Hosted TTS URL for ${sourceFile} is not HTTPS: ${url}`);
  return url;
}

function makeCustomDeckState(faceUrl, backUrl, numWidth, numHeight) {
  return {
    FaceURL: faceUrl,
    BackURL: backUrl,
    NumWidth: Number(numWidth),
    NumHeight: Number(numHeight),
    BackIsHidden: true,
    UniqueBack: false,
  };
}

function makeCardObject({ nickname, description, cardId, deckId, customDeckState, sideways = false, guid }) {
  return {
    ...objectBase('CardCustom', nickname, description, transform(), guid),
    Hands: true,
    CardID: Number(cardId),
    SidewaysCard: Boolean(sideways),
    CustomDeck: { [String(deckId)]: customDeckState },
  };
}

function starterBagTransform(index, total) {
  // Starter kits are setup containers, not play-area objects. Keep them well
  // outside the functional board so choosing a kit never obscures zones/cards.
  const rows = Math.ceil(total / 2);
  const column = index < rows ? 0 : 1;
  const row = index % rows;
  const spacing = rows <= 1 ? 0 : Math.min(4, 20 / (rows - 1));
  const start = -((rows - 1) * spacing) / 2;
  return transform(column === 0 ? -22.5 : 22.5, 1.4, start + row * spacing, column === 0 ? 90 : 270);
}

function factionColor(factionId) {
  const tint = FACTION_COLORS[factionId];
  if (!tint) throw new Error(`No TTS component color is defined for faction ${factionId || 'missing'}.`);
  return color(tint.r, tint.g, tint.b);
}

function makeDie(nickname, tint, guid) {
  return {
    ...objectBase('Die_6', nickname, '', transform(0, 1.5, 0), guid),
    ColorDiffuse: { ...tint },
    MaterialIndex: 0,
  };
}

function makePawn(nickname, tint, guid) {
  return {
    ...objectBase('PlayerPawn', nickname, '', transform(0, 1.1, 0), guid),
    ColorDiffuse: { ...tint },
  };
}

function buildStarterKit(starter, releaseAssets, kitTransform, guid) {
  if (!starter?.leader?.tts) throw new Error(`Starter ${starter?.id || 'unknown'} does not contain a rendered Leader reference.`);
  if (!Array.isArray(starter.cards) || !starter.cards.length) throw new Error(`Starter ${starter.id} has no playable cards.`);
  if (!Array.isArray(starter.faceSheets) || !starter.faceSheets.length) throw new Error(`Starter ${starter.id} has no face-sheet references.`);
  if (!Array.isArray(starter.territories) || !starter.territories.length) throw new Error(`Starter ${starter.id} has no Territories.`);

  const backUrl = requireHostedUrl(releaseAssets, starter.back.file);
  const deckStates = {};
  for (const sheet of starter.faceSheets) {
    deckStates[String(sheet.deckId)] = makeCustomDeckState(
      requireHostedUrl(releaseAssets, sheet.faceFile),
      backUrl,
      sheet.numWidth,
      sheet.numHeight,
    );
  }

  const containedCards = [];
  const deckIds = [];
  for (const card of starter.cards) {
    const deckId = String(card.tts.deckId);
    const customDeckState = deckStates[deckId];
    if (!customDeckState) throw new Error(`Starter ${starter.id} card ${card.id} references unmapped deck ${deckId}.`);
    for (let copy = 0; copy < Number(card.quantity); copy += 1) {
      deckIds.push(Number(card.tts.cardId));
      containedCards.push(makeCardObject({
        nickname: card.name,
        description: `${card.faction === 'neutral' ? 'Neutral' : starter.factionId} · Cost ${card.cost}`,
        cardId: card.tts.cardId,
        deckId,
        customDeckState,
        guid: guid(),
      }));
    }
  }

  const expectedIds = (starter.deckCardIds || []).map(Number);
  if (expectedIds.length !== deckIds.length || expectedIds.some((cardId, index) => cardId !== deckIds[index])) {
    throw new Error(`Starter ${starter.id} expanded card order does not match deckCardIds.`);
  }

  const deckTransform = transform();
  deckTransform.rotZ = 180;
  const deck = {
    ...objectBase(
      'DeckCustom',
      `${starter.name} Deck — ${starter.cardCount} cards`,
      `Complete ${starter.cardCount}-card starter Deck · ${starter.deckbuildingValue} deckbuilding value`,
      deckTransform,
      guid(),
    ),
    Hands: true,
    DeckIDs: deckIds,
    CustomDeck: deckStates,
    ContainedObjects: containedCards,
  };
  if (deck.DeckIDs.length !== Number(starter.cardCount) || deck.ContainedObjects.length !== Number(starter.cardCount)) {
    throw new Error(`Starter ${starter.id} generated an incomplete DeckCustom stack: ${deck.DeckIDs.length} DeckIDs / ${deck.ContainedObjects.length} cards; expected ${starter.cardCount}.`);
  }

  const leaderTts = starter.leader.tts;
  const leaderBackFile = leaderTts.backFile || starter.back.file;
  const leaderState = makeCustomDeckState(
    requireHostedUrl(releaseAssets, leaderTts.faceFile),
    requireHostedUrl(releaseAssets, leaderBackFile),
    leaderTts.numWidth || 1,
    leaderTts.numHeight || 1,
  );
  const leader = makeCardObject({
    nickname: starter.leader.name,
    description: `${starter.leader.factionLabel || starter.factionId} Leader`,
    cardId: leaderTts.cardId,
    deckId: leaderTts.deckId,
    customDeckState: leaderState,
    guid: guid(),
  });

  const territories = starter.territories.map(territory => {
    const state = makeCustomDeckState(
      requireHostedUrl(releaseAssets, territory.tts.faceFile),
      requireHostedUrl(releaseAssets, territory.tts.backFile),
      territory.tts.numWidth,
      territory.tts.numHeight,
    );
    const card = makeCardObject({
      nickname: territory.name,
      description: territory.arena ? 'Arena Territory' : 'Territory',
      cardId: territory.tts.cardId,
      deckId: territory.tts.deckId,
      customDeckState: state,
      sideways: true,
      guid: guid(),
    });
    card.Transform.rotY = 90;
    return card;
  });

  const factionLabel = starter.leader.factionLabel || starter.factionId;
  const tint = factionColor(starter.factionId);
  const playerToken = makePawn(`${factionLabel} Player Token`, tint, guid());
  playerToken.Description = `${factionLabel} faction-colored player token`;
  playerToken.GMNotes = `gauntlet:starter-utility:player-token:${starter.factionId}`;
  const battleDie = makeDie(`${factionLabel} Battle Die`, tint, guid());
  battleDie.Description = `${factionLabel} faction-colored battle die`;
  battleDie.GMNotes = `gauntlet:starter-utility:battle-die:${starter.factionId}`;

  const orderById = new Map(starter.territories.map(territory => [territory.id, territory.name]));
  const territoryOrder = (starter.recommendedTerritoryOrder || []).map(id => orderById.get(id) || id).join(' → ');
  const kitDescription = [
    `${starter.leader.name} · ${starter.factionId}`,
    starter.summary || starter.strategy || '',
    territoryOrder ? `Recommended Territories: ${territoryOrder}` : '',
    `Contains the complete ${starter.cardCount}-card face-down playable Deck, Leader Card, three selected Territories, faction-colored Player Token, and faction-colored Battle Die.`,
  ].filter(Boolean).join('\n\n');

  return {
    ...objectBase('Bag', `${starter.name} — ${starter.leader.name}`, kitDescription, kitTransform, guid()),
    ColorDiffuse: { ...tint },
    ContainedObjects: [leader, ...territories, deck, playerToken, battleDie],
  };
}

function buildTtsSave(starterManifest, releaseAssets) {
  const version = String(starterManifest?.gameVersion || '').trim();
  if (!version) throw new Error('Starter manifest does not declare gameVersion.');
  if (releaseAssets?.gameVersion !== version || releaseAssets?.releaseTag !== version) throw new Error(`Hosted TTS release assets do not match starter manifest ${version}.`);
  const starters = starterManifest.decks || [];
  if (!starters.length) throw new Error('Starter manifest contains no starter decks.');

  const guid = makeGuidFactory();
  const starterKits = starters.map((starter, index) => buildStarterKit(starter, releaseAssets, starterBagTransform(index, starters.length), guid));
  const territoryZ = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];
  const snapPoints = territoryZ.map(z => ({ Position: vector(0, 0, z), Rotation: vector(0, 90, 0) }));

  const note = [
    `Gauntlet ${version} Tabletop Simulator review scaffold.`,
    'Choose one starter kit per player. Each kit contains its face-down Deck, Leader Card, three Territories, faction-colored Player Token, and faction-colored Battle Die. Arrange the six chosen Territories on the center snap points, then complete normal opening setup from the current Rulebook.',
    'Red sits at the south end; Blue sits at the north end. Each player uses the faction-colored token and die from the chosen starter kit.',
    'Ready shared and faction supplemental components are assembled into the same starter kit later in the TTS package pipeline. Rules remain manual.',
  ].join('\n\n');

  return {
    SaveName: `Gauntlet ${version} — TTS Review Scaffold`,
    GameMode: 'Gauntlet',
    Gravity: 0.5,
    PlayArea: 0.5,
    Date: '',
    Table: 'Table_RPG',
    Sky: 'Sky_Field',
    Note: note,
    Rules: note,
    XmlUI: '',
    LuaScript: '',
    LuaScriptState: '',
    Grid: {
      Type: 0,
      Lines: false,
      Color: color(0, 0, 0),
      Opacity: 0.35,
      ThickLines: false,
      Snapping: false,
      Offset: false,
      BothSnapping: false,
      xSize: 2,
      ySize: 2,
      PosOffset: vector(0, 1, 0),
    },
    Hands: {
      Enable: true,
      DisableUnused: true,
      Hiding: 0,
      HandTransforms: [
        { Color: 'Red', Transform: transform(0, 1.5, -20.15, 0, 7, 2.5, 3) },
        { Color: 'Blue', Transform: transform(0, 1.5, 20.15, 180, 7, 2.5, 3) },
      ],
    },
    Turns: {
      Enable: false,
      Type: 0,
      TurnOrder: ['Red', 'Blue'],
      Reverse: false,
      SkipEmpty: true,
      DisableInteractions: false,
      PassTurns: true,
      TurnColor: 'Red',
    },
    SnapPoints: snapPoints,
    ObjectStates: starterKits,
  };
}

async function readReleaseAssetManifest(version) {
  const names = await readdir(STAGING_ROOT).catch(error => {
    if (error.code === 'ENOENT') throw new Error('TTS save generation requires staged hosted assets. Run npm run tts:release:stage first.');
    throw error;
  });
  const candidates = names.filter(name => /^Gauntlet_.*_TTS_Release_Assets\.json$/i.test(name));
  if (candidates.length !== 1) throw new Error(`Expected exactly one staged TTS release-asset manifest; found ${candidates.length}.`);
  const manifest = JSON.parse(await readFile(join(STAGING_ROOT, candidates[0]), 'utf8'));
  if (manifest.gameVersion !== version || manifest.releaseTag !== version) throw new Error(`Staged TTS release-asset manifest targets ${manifest.gameVersion || manifest.releaseTag || 'unknown'}; expected ${version}.`);
  return manifest;
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const release = await resolveCurrentTtsRelease();
  if (checkOnly) {
    console.log(`Current TTS save publisher source check passed for ${release.version}.`);
    return;
  }

  const starterPath = join(release.outputRoot, 'starter-deck-manifest.json');
  const starterManifest = JSON.parse(await readFile(starterPath, 'utf8').catch(error => {
    if (error.code === 'ENOENT') throw new Error('TTS save generation requires the current starter manifest. Run npm run tts:build first.');
    throw error;
  }));
  const releaseAssets = await readReleaseAssetManifest(release.version);
  const save = buildTtsSave(starterManifest, releaseAssets);
  const versionedName = `Gauntlet_${release.version}_TTS_Review_Scaffold.json`;
  const versionedPath = join(release.outputRoot, versionedName);
  const aliasPath = join(CURRENT_ALIAS_ROOT, 'Gauntlet_TTS_Review_Scaffold.json');
  await writeFile(versionedPath, jsonText(save));
  await writeFile(aliasPath, jsonText(save));
  console.log(`Generated TTS review scaffold with ${starterManifest.decks.length} starter kits to ${relative(ROOT, versionedPath)}.`);
  console.log(`Hosted assets are resolved from ${basename(releaseAssets.sourceOutput || STAGING_ROOT)} release staging.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

export { buildStarterKit, buildTtsSave, makeCustomDeckState, requireHostedUrl, starterBagTransform };
