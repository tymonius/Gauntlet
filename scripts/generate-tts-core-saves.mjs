import { createHash } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';

const CORE_SAVE_ROOT = join(ROOT, 'tts', 'generated', 'saves');
const PLAYER_COLORS = Object.freeze({
  blue: { r: 0.12, g: 0.32, b: 0.72, a: 1 },
  red: { r: 0.72, g: 0.14, b: 0.16, a: 1 },
});
const TERRITORY_X = Object.freeze([-8.75, -5.25, -1.75, 1.75, 5.25, 8.75]);

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function safeSegment(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function deterministicGuid(seed) {
  return createHash('sha1').update(String(seed)).digest('hex').slice(0, 6);
}

function transform(posX, posY, posZ, rotX = 0, rotY = 0, rotZ = 0, scaleX = 1, scaleY = 1, scaleZ = 1) {
  return { posX, posY, posZ, rotX, rotY, rotZ, scaleX, scaleY, scaleZ };
}

function objectBase({ name, nickname, description = '', transform: objectTransform, guid, locked = false, hands = false }) {
  return {
    Name: name,
    Transform: objectTransform,
    Nickname: nickname,
    Description: description,
    ColorDiffuse: { r: 1, g: 1, b: 1, a: 1 },
    Locked: locked,
    Grid: true,
    Snap: true,
    Autoraise: true,
    Sticky: true,
    Tooltip: true,
    GridProjection: false,
    HideWhenFaceDown: false,
    Hands: hands,
    GUID: guid,
  };
}

function customDeckState(faceUrl, backUrl, numWidth, numHeight, backIsHidden = true, uniqueBack = false) {
  if (!faceUrl || !backUrl) throw new Error('CustomDeck requires hosted face and back URLs.');
  return {
    FaceURL: faceUrl,
    BackURL: backUrl,
    NumWidth: numWidth,
    NumHeight: numHeight,
    BackIsHidden: backIsHidden,
    UniqueBack: uniqueBack,
  };
}

function starterCustomDeck(starter, hostedUrls) {
  const result = {};
  for (const sheet of starter.faceSheets || []) {
    const faceUrl = hostedUrls[sheet.faceFile];
    const backUrl = hostedUrls[sheet.backFile];
    if (!faceUrl) throw new Error(`${starter.id} is missing hosted face URL for ${sheet.faceFile}.`);
    if (!backUrl) throw new Error(`${starter.id} is missing hosted back URL for ${sheet.backFile}.`);
    result[sheet.deckId] = customDeckState(
      faceUrl,
      backUrl,
      sheet.numWidth,
      sheet.numHeight,
      sheet.backIsHidden !== false,
      Boolean(sheet.uniqueBack),
    );
  }
  return result;
}

function containedStarterCards(starter, customDeck, seedPrefix) {
  const byCardId = new Map();
  for (const card of starter.cards || []) byCardId.set(card.tts?.cardId, card);
  const seenCopies = new Map();
  return (starter.deckCardIds || []).map((cardId, index) => {
    const card = byCardId.get(cardId);
    if (!card) throw new Error(`${starter.id} deckCardIds contains unknown CardID ${cardId}.`);
    const copy = (seenCopies.get(cardId) || 0) + 1;
    seenCopies.set(cardId, copy);
    return {
      Name: 'Card',
      Transform: transform(0, 0, 0),
      Nickname: card.name,
      Description: `${card.faction === 'neutral' ? 'Neutral' : starter.factionId} · deckbuilding value ${card.cost}${card.quantity > 1 ? ` · copy ${copy}/${card.quantity}` : ''}`,
      ColorDiffuse: { r: 1, g: 1, b: 1, a: 1 },
      Locked: false,
      Grid: true,
      Snap: true,
      Autoraise: true,
      Sticky: true,
      Tooltip: true,
      GridProjection: false,
      HideWhenFaceDown: false,
      Hands: true,
      CardID: cardId,
      SidewaysCard: false,
      CustomDeck: customDeck,
      GUID: deterministicGuid(`${seedPrefix}:card:${index}:${cardId}`),
    };
  });
}

function deckObject(starter, hostedUrls, position, playerLabel, seedPrefix) {
  if (!Array.isArray(starter.deckCardIds) || starter.deckCardIds.length !== starter.cardCount) {
    throw new Error(`${starter.id} deckCardIds do not match declared cardCount.`);
  }
  const customDeck = starterCustomDeck(starter, hostedUrls);
  return {
    ...objectBase({
      name: 'DeckCustom',
      nickname: `${playerLabel} — ${starter.name}`,
      description: `${starter.leader.name} · ${starter.factionId} starter Deck · ${starter.cardCount} cards`,
      transform: transform(position.x, 1.15, position.z, 0, position.rotY, 180),
      guid: deterministicGuid(`${seedPrefix}:deck`),
      hands: true,
    }),
    DeckIDs: [...starter.deckCardIds],
    CustomDeck: customDeck,
    ContainedObjects: containedStarterCards(starter, customDeck, seedPrefix),
  };
}

function standaloneCardObject({ cardId, deckId, faceFile, backFile, numWidth, numHeight, nickname, description, position, sideways, hostedUrls, seed }) {
  const faceUrl = hostedUrls[faceFile];
  const backUrl = hostedUrls[backFile];
  if (!faceUrl) throw new Error(`Missing hosted face URL for ${faceFile}.`);
  if (!backUrl) throw new Error(`Missing hosted back URL for ${backFile}.`);
  return {
    ...objectBase({
      name: 'Card',
      nickname,
      description,
      transform: transform(position.x, position.y ?? 1.05, position.z, 0, position.rotY ?? 0, 0),
      guid: deterministicGuid(seed),
    }),
    CardID: cardId,
    SidewaysCard: Boolean(sideways),
    CustomDeck: {
      [deckId]: customDeckState(faceUrl, backUrl, numWidth, numHeight, true, false),
    },
  };
}

function leaderObject(starter, hostedUrls, position, playerLabel, seedPrefix) {
  const tts = starter.leader?.tts;
  if (!tts) throw new Error(`${starter.id} has no rendered Leader reference.`);
  return standaloneCardObject({
    cardId: tts.cardId,
    deckId: tts.deckId,
    faceFile: tts.faceFile,
    backFile: tts.backFile,
    numWidth: tts.numWidth,
    numHeight: tts.numHeight,
    nickname: `${starter.leader.name} — ${playerLabel}`,
    description: `${starter.factionId} Leader`,
    position,
    sideways: false,
    hostedUrls,
    seed: `${seedPrefix}:leader`,
  });
}

function orderedTerritories(starter) {
  const byId = new Map((starter.territories || []).map((territory) => [territory.id, territory]));
  const ids = Array.isArray(starter.recommendedTerritoryOrder) && starter.recommendedTerritoryOrder.length
    ? starter.recommendedTerritoryOrder
    : (starter.territories || []).map((territory) => territory.id);
  if (ids.length !== 3) throw new Error(`${starter.id} must contribute exactly three Territories to the core table.`);
  return ids.map((id) => {
    const territory = byId.get(id);
    if (!territory) throw new Error(`${starter.id} recommended Territory order references unknown ${id}.`);
    return territory;
  });
}

function territoryObject(territory, hostedUrls, position, ownerLabel, seed) {
  const tts = territory.tts;
  return standaloneCardObject({
    cardId: tts.cardId,
    deckId: tts.deckId,
    faceFile: tts.faceFile,
    backFile: tts.backFile,
    numWidth: tts.numWidth,
    numHeight: tts.numHeight,
    nickname: territory.name,
    description: `${territory.arena ? 'Arena' : 'Territory'} · starts controlled by ${ownerLabel}`,
    position,
    sideways: true,
    hostedUrls,
    seed,
  });
}

function pawnObject(color, position, label, seed) {
  return {
    ...objectBase({
      name: 'PlayerPawn',
      nickname: `${label} Position`,
      description: 'Move this pawn along the six-Territory Gauntlet.',
      transform: transform(position.x, 1.2, position.z, 0, 0, 0, 0.8, 0.8, 0.8),
      guid: deterministicGuid(seed),
    }),
    ColorDiffuse: { ...PLAYER_COLORS[color] },
  };
}

function dieObject(color, position, label, seed) {
  return {
    ...objectBase({
      name: 'Die_6',
      nickname: `${label} Battle Die`,
      description: 'Six-sided die for Gauntlet battle rolls.',
      transform: transform(position.x, 1.35, position.z, 0, 0, 0, 0.9, 0.9, 0.9),
      guid: deterministicGuid(seed),
    }),
    ColorDiffuse: { ...PLAYER_COLORS[color] },
    MaterialIndex: 0,
  };
}

function handTransform(color, posZ, rotY) {
  return {
    Color: color,
    Transform: transform(0, 1.2, posZ, 0, rotY, 0, 12, 1, 3.2),
  };
}

function matchupId(blueStarter, redStarter) {
  return `${safeSegment(blueStarter.id)}--vs--${safeSegment(redStarter.id)}`;
}

function buildCoreSave(blueStarter, redStarter, releaseAssetManifest) {
  const hostedUrls = releaseAssetManifest?.bySourceFile || {};
  if (!releaseAssetManifest?.gameVersion) throw new Error('Release asset manifest is missing gameVersion.');
  if (blueStarter.factionId === undefined || redStarter.factionId === undefined) throw new Error('Starter records are incomplete.');
  const matchup = matchupId(blueStarter, redStarter);
  const objects = [];

  objects.push(deckObject(blueStarter, hostedUrls, { x: -8.4, z: -8.2, rotY: 0 }, 'Blue', `${matchup}:blue`));
  objects.push(deckObject(redStarter, hostedUrls, { x: 8.4, z: 8.2, rotY: 180 }, 'Red', `${matchup}:red`));
  objects.push(leaderObject(blueStarter, hostedUrls, { x: -4.5, z: -8.2, rotY: 0 }, 'Blue', `${matchup}:blue`));
  objects.push(leaderObject(redStarter, hostedUrls, { x: 4.5, z: 8.2, rotY: 180 }, 'Red', `${matchup}:red`));

  const blueTerritories = orderedTerritories(blueStarter);
  const redTerritories = orderedTerritories(redStarter);
  blueTerritories.forEach((territory, index) => {
    objects.push(territoryObject(
      territory,
      hostedUrls,
      { x: TERRITORY_X[index], z: 0, rotY: 0 },
      'Blue',
      `${matchup}:blue:territory:${territory.id}`,
    ));
  });
  redTerritories.forEach((territory, index) => {
    const xIndex = TERRITORY_X.length - 1 - index;
    objects.push(territoryObject(
      territory,
      hostedUrls,
      { x: TERRITORY_X[xIndex], z: 0, rotY: 180 },
      'Red',
      `${matchup}:red:territory:${territory.id}`,
    ));
  });

  objects.push(pawnObject('blue', { x: -12.0, z: 0 }, 'Blue', `${matchup}:blue:pawn`));
  objects.push(pawnObject('red', { x: 12.0, z: 0 }, 'Red', `${matchup}:red:pawn`));
  objects.push(dieObject('blue', { x: 0, z: -8.0 }, 'Blue', `${matchup}:blue:die`));
  objects.push(dieObject('red', { x: 0, z: 8.0 }, 'Red', `${matchup}:red:die`));

  const guids = objects.flatMap((object) => [object.GUID, ...(object.ContainedObjects || []).map((item) => item.GUID)]);
  if (new Set(guids).size !== guids.length) throw new Error(`Generated duplicate GUIDs for ${matchup}.`);

  return {
    SaveName: `Gauntlet ${releaseAssetManifest.gameVersion} — ${blueStarter.name} vs ${redStarter.name}`,
    GameMode: 'None',
    Gravity: 0.5,
    PlayArea: 0.5,
    Date: '',
    Table: 'Table_RPG',
    TableURL: '',
    Sky: 'Sky_Field',
    SkyURL: '',
    Note: [
      `Gauntlet ${releaseAssetManifest.gameVersion} core TTS table.`,
      `Blue: ${blueStarter.name} (${blueStarter.leader.name}, ${blueStarter.factionId}).`,
      `Red: ${redStarter.name} (${redStarter.leader.name}, ${redStarter.factionId}).`,
      'Shuffle each Deck and draw three cards before play.',
      'Faction supplemental components are not included in this core-table milestone yet; use physical/manual substitutes where required.',
      'No Lua rules automation is included. Resolve the current published rules manually.',
    ].join('\n'),
    Rules: 'Current Gauntlet rules authority is the published release identified by this save. Specific card, Leader, faction, Territory, and component text controls over general rules.',
    XmlUI: '',
    CustomUIAssets: [],
    LuaScript: '',
    LuaScriptState: '',
    Grid: {
      Type: 0,
      Lines: false,
      Color: { r: 0.25, g: 0.25, b: 0.25, a: 0.75 },
      Opacity: 0.75,
      ThickLines: false,
      Snapping: false,
      Offset: false,
      BothSnapping: false,
      xSize: 2,
      ySize: 2,
    },
    Hands: {
      Enable: true,
      DisableUnused: true,
      Hiding: 0,
      HandTransforms: [
        handTransform('Blue', -12.0, 0),
        handTransform('Red', 12.0, 180),
      ],
    },
    Turns: {
      Enable: false,
      Type: 1,
      TurnOrder: ['Blue', 'Red'],
      Reverse: false,
      SkipEmpty: true,
      DisableInteractions: false,
      PassTurns: true,
      TurnColor: 'Blue',
    },
    VectorLines: [],
    ObjectStates: objects,
    SnapPoints: [],
    DecalPallet: [],
    Decals: [],
    TabStates: {},
    CameraStates: [],
    VersionNumber: '',
  };
}

function buildAllMatchups(starterManifest, releaseAssetManifest) {
  if (starterManifest.gameVersion !== releaseAssetManifest.gameVersion) {
    throw new Error(`Starter manifest targets ${starterManifest.gameVersion}; hosted assets target ${releaseAssetManifest.gameVersion}.`);
  }
  const starters = starterManifest.decks || [];
  if (!starters.length) throw new Error('Starter manifest contains no Decks.');
  const saves = [];
  for (let blueIndex = 0; blueIndex < starters.length; blueIndex += 1) {
    for (let redIndex = blueIndex; redIndex < starters.length; redIndex += 1) {
      const blue = starters[blueIndex];
      const red = starters[redIndex];
      const id = matchupId(blue, red);
      saves.push({
        id,
        file: `${id}.json`,
        blueStarterId: blue.id,
        redStarterId: red.id,
        blueName: blue.name,
        redName: red.name,
        save: buildCoreSave(blue, red, releaseAssetManifest),
      });
    }
  }
  return saves;
}

async function generateCoreSaves(release, outputRoot = release.outputRoot) {
  const starterManifest = JSON.parse(await readFile(join(outputRoot, 'starter-deck-manifest.json'), 'utf8'));
  const releaseAssetManifestName = `Gauntlet_${release.version}_TTS_Release_Assets.json`;
  const releaseAssetManifestPath = join(ROOT, 'tts', 'generated', 'release-assets', releaseAssetManifestName);
  const releaseAssetManifest = JSON.parse(await readFile(releaseAssetManifestPath, 'utf8'));
  if (releaseAssetManifest.releaseTag !== release.version || releaseAssetManifest.gameVersion !== release.version) {
    throw new Error(`Hosted TTS release manifest does not match current release ${release.version}.`);
  }

  const matchups = buildAllMatchups(starterManifest, releaseAssetManifest);
  await rm(CORE_SAVE_ROOT, { recursive: true, force: true });
  await mkdir(CORE_SAVE_ROOT, { recursive: true });
  for (const matchup of matchups) {
    await writeFile(join(CORE_SAVE_ROOT, matchup.file), jsonText(matchup.save));
  }
  const saveManifest = {
    schemaVersion: 1,
    gameVersion: release.version,
    releaseTag: release.version,
    releaseAssetManifest: basename(releaseAssetManifestPath),
    mode: 'core-two-player-table',
    fullyPlayable: false,
    limitations: [
      'Faction supplemental components are not yet included.',
      'No Lua rules automation is included.',
      'Hosted image URLs become loadable only after the TTS release-asset publication workflow is run for this release.',
    ],
    starterCount: starterManifest.decks.length,
    matchupCount: matchups.length,
    matchups: matchups.map(({ save, ...record }) => record),
  };
  await writeFile(join(CORE_SAVE_ROOT, 'save-manifest.json'), jsonText(saveManifest));
  return saveManifest;
}

async function main() {
  const release = await resolveCurrentTtsRelease();
  const manifest = await generateCoreSaves(release);
  console.log(`Generated ${manifest.matchupCount} core two-player TTS saves for ${release.version} in ${relative(ROOT, CORE_SAVE_ROOT)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

export {
  CORE_SAVE_ROOT,
  buildAllMatchups,
  buildCoreSave,
  generateCoreSaves,
  matchupId,
};
