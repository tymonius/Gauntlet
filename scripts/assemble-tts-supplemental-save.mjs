import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';
import { makeCustomDeckState, requireHostedUrl } from './generate-tts-save.mjs';
import { STAGING_ROOT } from './stage-tts-release-assets.mjs';

const SUPPLEMENTAL_GUID_NOTE_PREFIX = 'gauntlet:supplemental:';

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function color(r = 1, g = 1, b = 1) {
  return { r, g, b };
}

function vector(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function transform(posX = 0, posY = 1, posZ = 0, rotY = 0, scaleX = 1, scaleY = 1, scaleZ = 1) {
  return { posX, posY, posZ, rotX: 0, rotY, rotZ: 0, scaleX, scaleY, scaleZ };
}

function collectGuids(objects, used = new Set()) {
  for (const object of objects || []) {
    if (typeof object?.GUID === 'string' && object.GUID) used.add(object.GUID.toLowerCase());
    collectGuids(object?.ContainedObjects, used);
  }
  return used;
}

function makeContinuationGuidFactory(save) {
  const used = collectGuids(save?.ObjectStates);
  let value = 1;
  for (const guid of used) {
    if (/^[0-9a-z]{6}$/i.test(guid)) value = Math.max(value, Number.parseInt(guid, 36) + 1);
  }
  return () => {
    while (value < 36 ** 6) {
      const candidate = value.toString(36).padStart(6, '0').slice(-6);
      value += 1;
      if (used.has(candidate)) continue;
      used.add(candidate);
      return candidate;
    }
    throw new Error('Unable to allocate another deterministic six-character TTS GUID.');
  };
}

function makeSupplementalCard(component, releaseAssets, guid) {
  if (!component.tts?.faceFile || !component.tts?.backFile || !component.tts?.deckId) {
    throw new Error(`Ready supplemental card ${component.id} is missing rendered TTS metadata.`);
  }

  const deckId = String(component.tts.deckId);
  const state = makeCustomDeckState(
    requireHostedUrl(releaseAssets, component.tts.faceFile),
    requireHostedUrl(releaseAssets, component.tts.backFile),
    component.tts.numWidth || 1,
    component.tts.numHeight || 1,
  );

  return {
    Name: 'CardCustom',
    Transform: transform(),
    Nickname: component.name || component.id,
    Description: `${component.faction || 'Faction'} supplemental · ${component.family || 'component'}`,
    GMNotes: `${SUPPLEMENTAL_GUID_NOTE_PREFIX}${component.id}`,
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
    GUID: guid(),
    CardID: Number(component.tts.cardId),
    SidewaysCard: false,
    CustomDeck: {
      [deckId]: state,
    },
  };
}

function makeTrackerSnapPoints(component) {
  const tag = String(component.tts?.snapTag || '').trim();
  const points = component.tts?.snapPoints;
  if (!tag || !Array.isArray(points) || points.length < 2) {
    throw new Error(`Ready sliding tracker ${component.id} is missing snap tag or renderer-derived snap points.`);
  }
  if (points[0]?.value !== 0 || Number(points[0]?.offset) !== 0) {
    throw new Error(`Ready sliding tracker ${component.id} must begin with its fully covered 0 registration.`);
  }

  return points.map((point) => ({
    Position: vector(0, 0.12, Number(point.offset)),
    Rotation: vector(0, 0, 0),
    Tags: [tag],
  }));
}

function makeSlidingTracker(component, starter, releaseAssets, guid) {
  if (!component.tts?.faceFile || component.tts?.stackable !== false) {
    throw new Error(`Ready sliding tracker ${component.id} is missing its production face or non-stackable metadata.`);
  }
  if (!starter.factionComponentBack?.file) {
    throw new Error(`Starter ${starter.id} has no faction-component back for tracker ${component.id}.`);
  }

  const faceUrl = requireHostedUrl(releaseAssets, component.tts.faceFile);
  const backUrl = requireHostedUrl(releaseAssets, starter.factionComponentBack.file);
  const snapTag = String(component.tts.snapTag || '').trim();

  return {
    Name: 'Custom_Tile',
    Transform: transform(),
    Nickname: component.name || component.id,
    Description: `${component.faction || 'Faction'} sliding tracker · ${component.physicalScale?.minimum ?? 0}–${component.physicalScale?.maximum ?? '?'}`,
    GMNotes: `${SUPPLEMENTAL_GUID_NOTE_PREFIX}${component.id}`,
    ColorDiffuse: color(),
    Locked: false,
    Grid: false,
    Snap: true,
    Autoraise: true,
    Sticky: false,
    Tooltip: true,
    GridProjection: false,
    HideWhenFaceDown: false,
    Hands: false,
    LuaScript: '',
    LuaScriptState: '',
    XmlUI: '',
    GUID: guid(),
    Tags: [snapTag],
    AttachedSnapPoints: makeTrackerSnapPoints(component),
    CustomImage: {
      ImageURL: faceUrl,
      ImageSecondaryURL: backUrl,
      WidthScale: Number(component.tts.widthScale || 2.5),
      CustomTile: {
        Type: 0,
        Thickness: Number(component.tts.thickness || 0.05),
        Stackable: false,
        Stretch: true,
      },
    },
  };
}

function makeSupplementalObject(component, starter, releaseAssets, guid) {
  if (component.representation === 'card') return makeSupplementalCard(component, releaseAssets, guid);
  if (component.representation === 'sliding-tracker') return makeSlidingTracker(component, starter, releaseAssets, guid);
  throw new Error(`Ready supplemental component ${component.id} uses unsupported save representation ${component.representation || 'missing'}.`);
}

function starterBagNickname(starter) {
  return `${starter.name} — ${starter.leader.name}`;
}

function stripSupplementalDescription(description) {
  return String(description || '').replace(/\n\nReady faction supplementals:[^\n]*$/u, '');
}

function findStarterBag(save, starter) {
  const nickname = starterBagNickname(starter);
  const matches = (save.ObjectStates || []).filter((object) => object?.Name === 'Bag' && object?.Nickname === nickname);
  if (matches.length !== 1) {
    throw new Error(`Expected exactly one starter Bag named ${JSON.stringify(nickname)}; found ${matches.length}.`);
  }
  return matches[0];
}

function validateSupplementalManifest(supplementalManifest, version) {
  if (supplementalManifest?.gameVersion !== version) {
    throw new Error(`Supplemental manifest targets ${supplementalManifest?.gameVersion || 'no version'}; expected ${version}.`);
  }
  const ready = supplementalManifest.ready || [];
  if (Number(supplementalManifest.readyCount) !== ready.length) {
    throw new Error(`Supplemental manifest readyCount ${supplementalManifest.readyCount} does not match ${ready.length} ready records.`);
  }
  for (const component of ready) {
    if (component.productionStatus !== 'ready') {
      throw new Error(`Supplemental manifest includes non-ready component ${component.id || 'unknown'} in ready records.`);
    }
  }
  return ready;
}

function addObjectTag(object, tag) {
  if (!tag) return;
  const tags = new Set(Array.isArray(object.Tags) ? object.Tags : []);
  tags.add(tag);
  object.Tags = [...tags].sort();
}

function removeGeneratedTrackerTags(object, generatedTags) {
  if (!Array.isArray(object?.Tags)) return;
  object.Tags = object.Tags.filter((tag) => !generatedTags.has(tag));
  if (!object.Tags.length) delete object.Tags;
}

function resolveTrackerCover(bag, starter, tracker) {
  const cover = tracker.cover;
  if (cover?.kind === 'leader') {
    const leaderCardId = Number(starter.leader?.tts?.cardId);
    const matches = (bag.ContainedObjects || []).filter((object) => object?.Name === 'CardCustom' && Number(object.CardID) === leaderCardId);
    if (matches.length !== 1) {
      throw new Error(`Tracker ${tracker.id} expected exactly one selected Leader cover in starter ${starter.id}; found ${matches.length}.`);
    }
    return matches[0];
  }

  if (cover?.kind === 'component') {
    const marker = `${SUPPLEMENTAL_GUID_NOTE_PREFIX}${cover.componentId}`;
    const matches = (bag.ContainedObjects || []).filter((object) => object?.GMNotes === marker);
    if (matches.length !== 1) {
      throw new Error(`Tracker ${tracker.id} expected exactly one supplemental cover ${cover.componentId} in starter ${starter.id}; found ${matches.length}.`);
    }
    return matches[0];
  }

  throw new Error(`Tracker ${tracker.id} has unsupported cover definition ${JSON.stringify(cover || null)}.`);
}

export function assembleReadySupplementals(save, starterManifest, supplementalManifest, releaseAssets) {
  const version = String(starterManifest?.gameVersion || '').trim();
  if (!version) throw new Error('Starter manifest does not declare gameVersion.');
  if (releaseAssets?.gameVersion !== version || releaseAssets?.releaseTag !== version) {
    throw new Error(`Hosted TTS release assets do not match starter manifest ${version}.`);
  }

  const ready = validateSupplementalManifest(supplementalManifest, version);
  const starters = starterManifest.decks || [];
  if (!starters.length) throw new Error('Starter manifest contains no starter decks.');
  const guid = makeContinuationGuidFactory(save);
  let placedCount = 0;

  for (const starter of starters) {
    const bag = findStarterBag(save, starter);
    const factionComponents = ready.filter((component) => component.faction === starter.factionId);
    const factionTrackers = factionComponents.filter((component) => component.representation === 'sliding-tracker');
    const generatedTrackerTags = new Set(factionTrackers.map((component) => component.tts?.snapTag).filter(Boolean));

    bag.ContainedObjects = (bag.ContainedObjects || []).filter(
      (object) => !String(object?.GMNotes || '').startsWith(SUPPLEMENTAL_GUID_NOTE_PREFIX),
    );
    for (const object of bag.ContainedObjects || []) removeGeneratedTrackerTags(object, generatedTrackerTags);

    const placedNames = [];
    for (const component of factionComponents) {
      const quantity = Number(component.quantity || 0);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        throw new Error(`Ready supplemental component ${component.id} has invalid quantity ${component.quantity}.`);
      }
      for (let copy = 0; copy < quantity; copy += 1) {
        bag.ContainedObjects.push(makeSupplementalObject(component, starter, releaseAssets, guid));
        placedCount += 1;
      }
      placedNames.push(quantity === 1 ? component.name : `${component.name} ×${quantity}`);
    }

    for (const tracker of factionTrackers) {
      const cover = resolveTrackerCover(bag, starter, tracker);
      addObjectTag(cover, tracker.tts.snapTag);
    }

    const baseDescription = stripSupplementalDescription(bag.Description);
    bag.Description = placedNames.length
      ? `${baseDescription}\n\nReady faction supplementals: ${placedNames.join(', ')}`
      : baseDescription;
  }

  const oldSentence = 'This scaffold intentionally does not yet include faction-specific supplemental trackers or secondary components. Rules remain manual.';
  const newSentence = 'Faction supplemental components marked ready are included automatically in the matching starter kits; single-sided faction components use faction-color backs, and sliding trackers use production-derived snap registration and tagged physical cover cards. Rules remain manual.';
  for (const field of ['Note', 'Rules']) {
    const text = String(save[field] || '');
    save[field] = text.includes(oldSentence)
      ? text.replace(oldSentence, newSentence)
      : text.includes(newSentence)
        ? text
        : `${text}\n\n${newSentence}`.trim();
  }

  return {
    save,
    placedCount,
    readyComponentCount: ready.length,
  };
}

async function readReleaseAssetManifest(version) {
  const names = await readdir(STAGING_ROOT).catch((error) => {
    if (error.code === 'ENOENT') {
      throw new Error('TTS supplemental save assembly requires staged hosted assets. Run npm run tts:release:stage first.');
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
    console.log(`Current TTS supplemental save assembler source check passed for ${release.version}.`);
    return;
  }

  const starterManifest = JSON.parse(await readFile(join(release.outputRoot, 'starter-deck-manifest.json'), 'utf8').catch((error) => {
    if (error.code === 'ENOENT') throw new Error('TTS supplemental save assembly requires the current starter manifest. Run npm run tts:build first.');
    throw error;
  }));
  const supplementalManifest = JSON.parse(await readFile(join(release.outputRoot, 'supplemental-manifest.json'), 'utf8').catch((error) => {
    if (error.code === 'ENOENT') throw new Error('TTS supplemental save assembly requires the supplemental manifest. Run npm run tts:supplementals first.');
    throw error;
  }));
  const releaseAssets = await readReleaseAssetManifest(release.version);
  const versionedName = `Gauntlet_${release.version}_TTS_Review_Scaffold.json`;
  const versionedPath = join(release.outputRoot, versionedName);
  const save = JSON.parse(await readFile(versionedPath, 'utf8').catch((error) => {
    if (error.code === 'ENOENT') throw new Error('TTS supplemental save assembly requires the generated review scaffold. Run npm run tts:save first.');
    throw error;
  }));

  const result = assembleReadySupplementals(save, starterManifest, supplementalManifest, releaseAssets);
  const aliasPath = join(CURRENT_ALIAS_ROOT, 'Gauntlet_TTS_Review_Scaffold.json');
  await writeFile(versionedPath, jsonText(result.save));
  await writeFile(aliasPath, jsonText(result.save));
  console.log(`Assembled ${result.placedCount} ready supplemental objects from ${result.readyComponentCount} ready component definitions into ${relative(ROOT, versionedPath)}.`);
  console.log(`Hosted supplemental assets are resolved from ${basename(releaseAssets.sourceOutput || STAGING_ROOT)} release staging.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}