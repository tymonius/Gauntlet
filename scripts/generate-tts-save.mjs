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
const TABLE_IMAGE_SOURCE = 'environment/campaign-map-table.png';
const PANORAMA_IMAGE_SOURCE = 'environment/command-tent-panorama.png';
const RULEBOOK_READER_SOURCE = 'rulebook-reader.pdf';
const STARTER_DECK_NOTE_PREFIX = 'gauntlet:starter-deck:';
const STARTER_TERRITORY_STACK_NOTE_PREFIX = 'gauntlet:starter-territories:';
const SHARED_RULEBOOK_NOTE = 'gauntlet:shared-rulebook';


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

function makeSharedRulebook(version, releaseAssets, guid) {
  const rulebook = {
    ...objectBase(
      'Custom_PDF',
      `Gauntlet ${version} Rulebook`,
      'Shared table Rulebook · current stable rules',
      transform(11.4, 1.2, 0, 90, 1, 1, 1),
      guid,
    ),
    GMNotes: SHARED_RULEBOOK_NOTE,
    Grid: false,
    Snap: false,
    Sticky: false,
    IgnoreFoW: false,
    MeasureMovement: false,
    DragSelectable: true,
    CustomPDF: {
      PDFUrl: requireHostedUrl(releaseAssets, RULEBOOK_READER_SOURCE),
      PDFPassword: '',
      PDFPage: 0,
      PDFPageOffset: 0,
    },
  };
  return rulebook;
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

function starterBagTransform(starter, starters) {
  // Preserve the tested setup presentation without hard-coding the starter
  // count: each faction occupies one Z row and its Leaders sit as a left/right
  // pair outside the active board. Faction rows are derived from manifest order.
  const factionIds = [...new Set(starters.map(candidate => candidate.factionId))];
  const factionIndex = factionIds.indexOf(starter.factionId);
  if (factionIndex < 0) throw new Error(`Starter ${starter.id || 'unknown'} has no faction row.`);
  const factionStarters = starters.filter(candidate => candidate.factionId === starter.factionId);
  const leaderIndex = factionStarters.findIndex(candidate => candidate.id === starter.id);
  if (leaderIndex < 0) throw new Error(`Starter ${starter.id || 'unknown'} cannot be located inside faction ${starter.factionId}.`);

  const rowSpacing = factionIds.length <= 1 ? 0 : 24 / (factionIds.length - 1);
  const z = -((factionIds.length - 1) * rowSpacing) / 2 + factionIndex * rowSpacing;
  if (factionStarters.length === 1) return transform(-20.5, 1.4, z, 180);

  // TTS testing establishes that the former stored orientation emerges facing
  // the opposite seat. Store starter Bags at the 180°-reversed orientation.
  const fraction = leaderIndex / (factionStarters.length - 1);
  const x = -20.5 + fraction * 41;
  return transform(x, 1.4, z, 180);
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
  if (!Array.isArray(starter.territories) || starter.territories.length !== 3) {
    throw new Error(`Starter ${starter.id} must contain exactly three selected Territories; found ${starter.territories?.length || 0}.`);
  }

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
      const playable = makeCardObject({
        nickname: card.name,
        description: `${card.faction === 'neutral' ? 'Neutral' : starter.factionId} · Cost ${card.cost}`,
        cardId: card.tts.cardId,
        deckId,
        customDeckState,
        guid: guid(),
      });
      playable.GMNotes = `gauntlet:playable-card:${card.id}`;
      containedCards.push(playable);
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
  deck.GMNotes = `${STARTER_DECK_NOTE_PREFIX}${starter.id}`;
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
    return card;
  });

  for (const territory of territories) {
    territory.Transform.rotY = 180;
  }
  const territoryDeckStates = {};
  for (const territory of territories) Object.assign(territoryDeckStates, territory.CustomDeck || {});
  const territoryStack = {
    ...objectBase(
      'DeckCustom',
      `${starter.name} Territories`,
      'Three selected Territories · setup stack',
      transform(),
      guid(),
    ),
    Hands: true,
    GMNotes: `${STARTER_TERRITORY_STACK_NOTE_PREFIX}${starter.id}`,
    DeckIDs: territories.map(territory => Number(territory.CardID)),
    SidewaysCard: true,
    CustomDeck: territoryDeckStates,
    ContainedObjects: territories,
  };

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
    `Contains the complete ${starter.cardCount}-card face-down playable Deck, Leader Card, one three-card selected-Territory stack, faction-colored Player Token, and faction-colored Battle Die.`,
  ].filter(Boolean).join('\n\n');

  // Base package order is already setup-oriented. Supplemental assembly inserts
  // trackers/reference material ahead of the playable Deck while retaining this
  // Leader-first / Deck-before-Territories backbone.
  const containedObjects = [leader, deck, territoryStack, playerToken, battleDie];
  for (const object of containedObjects) {
    if (object?.Transform) object.Transform.rotY = 180;
  }

  return {
    ...objectBase('Bag', `${starter.name} — ${starter.leader.name}`, kitDescription, kitTransform, guid()),
    GMNotes: `gauntlet:starter-kit:${starter.id}`,
    ColorDiffuse: { ...tint },
    ContainedObjects: containedObjects,
  };
}

function buildTtsSave(starterManifest, releaseAssets) {
  const version = String(starterManifest?.gameVersion || '').trim();
  if (!version) throw new Error('Starter manifest does not declare gameVersion.');
  if (releaseAssets?.gameVersion !== version || releaseAssets?.releaseTag !== version) throw new Error(`Hosted TTS release assets do not match starter manifest ${version}.`);
  const starters = starterManifest.decks || [];
  if (!starters.length) throw new Error('Starter manifest contains no starter decks.');

  const tableUrl = requireHostedUrl(releaseAssets, TABLE_IMAGE_SOURCE);
  const panoramaUrl = requireHostedUrl(releaseAssets, PANORAMA_IMAGE_SOURCE);

  const guid = makeGuidFactory();
  const rulebook = makeSharedRulebook(version, releaseAssets, guid());
  const starterKits = starters.map(starter => buildStarterKit(starter, releaseAssets, starterBagTransform(starter, starters), guid));
  const territoryZ = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];
  const snapPoints = territoryZ.map(z => ({ Position: vector(0, 0, z) }));

  const note = [
    `Gauntlet ${version} Tabletop Simulator review scaffold.`,
    'Choose one starter kit per player. Each kit contains its face-down Deck, Leader Card, three Territories, faction-colored Player Token, and faction-colored Battle Die. Arrange the six chosen Territories on the center snap points, then complete normal opening setup from the current Rulebook.',
    'White sits at the south end; Green sits at the north end. Each player uses the faction-colored token and die from the chosen starter kit.',
    'Ready shared and faction supplemental components are assembled into the same starter kit later in the TTS package pipeline. Rules remain manual.',
  ].join('\n\n');

  return {
    SaveName: `Gauntlet ${version} — TTS Review Scaffold`,
    GameMode: 'Gauntlet',
    Gravity: 0.5,
    PlayArea: 0.5,
    Date: '',
    Table: 'Table_Custom',
    TableURL: tableUrl,
    Sky: 'Sky_Museum',
    SkyURL: panoramaUrl,
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
      DisableUnused: false,
      Hiding: 0,
      HandTransforms: [
        { Color: 'White', Transform: transform(0, 4, -23.25, 0, 12, 6, 4) },
        { Color: 'Green', Transform: transform(0, 4, 23.25, 180, 12, 6, 4) },
      ],
    },
    Turns: {
      Enable: false,
      Type: 0,
      TurnOrder: ['White', 'Green'],
      Reverse: false,
      SkipEmpty: true,
      DisableInteractions: false,
      PassTurns: true,
      TurnColor: 'White',
    },
    SnapPoints: snapPoints,
    ObjectStates: [rulebook, ...starterKits],
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

export { buildStarterKit, buildTtsSave, makeCustomDeckState, makeSharedRulebook, requireHostedUrl, starterBagTransform };
