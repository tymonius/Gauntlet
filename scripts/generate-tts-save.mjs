import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';
import { STAGING_ROOT } from './stage-tts-release-assets.mjs';

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
    CustomDeck: {
      [String(deckId)]: customDeckState,
    },
  };
}

function starterBagTransform(index, total) {
  const rows = Math.ceil(total / 2);
  const column = index < rows ? 0 : 1;
  const row = index % rows;
  const spacing = rows <= 1 ? 0 : Math.min(4, 20 / (rows - 1));
  const start = -((rows - 1) * spacing) / 2;
  return transform(column === 0 ? -15 : 15, 1.4, start + row * spacing, column === 0 ? 90 : 270);
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

  const deck = {
    ...objectBase(
      'DeckCustom',
      `${starter.name} Deck`,
      `${starter.cardCount} cards · ${starter.deckbuildingValue} deckbuilding value`,
      transform(),
      guid(),
    ),
    Hands: true,
    DeckIDs: deckIds,
    CustomDeck: deckStates,
    ContainedObjects: containedCards,
  };

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

  const territories = starter.territories.map((territory) => {
    const state = makeCustomDeckState(
      requireHostedUrl(releaseAssets, territory.tts.faceFile),
      requireHostedUrl(releaseAssets, territory.tts.backFile),
      territory.tts.numWidth,
      territory.tts.numHeight,
    );
    return makeCardObject({
      nickname: territory.name,
      description: territory.arena ? 'Arena Territory' : 'Territory',
      cardId: territory.tts.cardId,
      deckId: territory.tts.deckId,
      customDeckState: state,
      sideways: true,
      guid: guid(),
    });
  });

  const orderById = new Map(starter.territories.map((territory) => [territory.id, territory.name]));
  const territoryOrder = (starter.recommendedTerritoryOrder || []).map((id) => orderById.get(id) || id).join(' → ');
  const kitDescription = [
    `${starter.leader.name} · ${starter.factionId}`,
    starter.summary || starter.strategy || '',
    territoryOrder ? `Recommended Territories: ${territoryOrder}` : '',
    'Contains the playable Deck, Leader Card, and three selected Territories.',
  ].filter(Boolean).join('\n\n');

  return {
    ...objectBase('Bag', `${starter.name} — ${starter.leader.name}`, kitDescription, kitTransform, guid()),
    ContainedObjects: [leader, ...territories, deck],
  };
}

function makeDie(nickname, x, z, tint, guid) {
  return {
    ...objectBase('Die_6', nickname, '', transform(x, 1.5, z), guid),
    ColorDiffuse: tint,
    MaterialIndex: 0,
  };
}

function makePawn(nickname, x, z, tint, rotation, guid) {
  return {
    ...objectBase('PlayerPawn', nickname, '', transform(x, 1.1, z, rotation), guid),
    ColorDiffuse: tint,
  };
}

function buildTtsSave(starterManifest, releaseAssets) {
  const version = String(starterManifest?.gameVersion || '').trim();
  if (!version) throw new Error('Starter manifest does not declare gameVersion.');
  if (releaseAssets?.gameVersion !== version || releaseAssets?.releaseTag !== version) {
    throw new Error(`Hosted TTS release assets do not match starter manifest ${version}.`);
  }
  const starters = starterManifest.decks || [];
  if (!starters.length) throw new Error('Starter manifest contains no starter decks.');

  const guid = makeGuidFactory();
  const red = color(0.856, 0.1, 0.094);
  const blue = color(0.118, 0.53, 1);
  const starterKits = starters.map((starter, index) => buildStarterKit(
    starter,
    releaseAssets,
    starterBagTransform(index, starters.length),
    guid,
  ));

  const territoryZ = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5];
  const snapPoints = territoryZ.map((z) => ({ Position: vector(0, 1, z), Rotation: vector(0, 0, 0) }));

  const note = [
    `Gauntlet ${version} Tabletop Simulator review scaffold.`,
    'Choose one starter kit per player. Each kit contains its Deck, Leader Card, and three Territories. Arrange the six chosen Territories on the center snap points, then complete normal opening setup from the current Rulebook.',
    'Red sits at the south end; Blue sits at the north end. Player pawns begin on the Territory at their own end after setup.',
    'This scaffold intentionally does not yet include faction-specific supplemental trackers or secondary components. Rules remain manual.',
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
        { Color: 'Red', Transform: transform(0, 1.5, -17, 180, 9, 2, 2) },
        { Color: 'Blue', Transform: transform(0, 1.5, 17, 0, 9, 2, 2) },
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
    ObjectStates: [
      ...starterKits,
      makeDie('Red Battle Die', -4.5, -12.5, red, guid()),
      makeDie('Blue Battle Die', 4.5, 12.5, blue, guid()),
      makePawn('Red Player Token', 0, -10.5, red, 0, guid()),
      makePawn('Blue Player Token', 0, 10.5, blue, 180, guid()),
    ],
  };
}

async function readReleaseAssetManifest(version) {
  const names = await readdir(STAGING_ROOT).catch((error) => {
    if (error.code === 'ENOENT') {
      throw new Error('TTS save generation requires staged hosted assets. Run npm run tts:release:stage first.');
    }
    throw error;
  });
  const candidates = names.filter((name) => /^Gauntlet_.*_TTS_Release_Assets\.json$/i.test(name));
  if (candidates.length !== 1) {
    throw new Error(`Expected exactly one staged TTS release-asset manifest; found ${candidates.length}.`);
  }
  const manifest = JSON.parse(await readFile(join(STAGING_ROOT, candidates[0]), 'utf8'));
  if (manifest.gameVersion !== version || manifest.releaseTag !== version) {
    throw new Error(`Staged TTS release-asset manifest targets ${manifest.gameVersion || manifest.releaseTag || 'unknown'}; expected ${version}.`);
  }
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
  const starterManifest = JSON.parse(await readFile(starterPath, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') {
      throw new Error('TTS save generation requires the current starter manifest. Run npm run tts:build first.');
    }
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
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

export { buildStarterKit, buildTtsSave, makeCustomDeckState, requireHostedUrl, starterBagTransform };
