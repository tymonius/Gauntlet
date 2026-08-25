import { readdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';
import { makeCustomDeckState, requireHostedUrl } from './generate-tts-save.mjs';
import { trackerPresentation } from './tts-supplemental-geometry.mjs';
import { STAGING_ROOT } from './stage-tts-release-assets.mjs';

const SUPPLEMENTAL_GUID_NOTE_PREFIX = 'gauntlet:supplemental:';
const SUPPLEMENTAL_STACK_NOTE_PREFIX = 'gauntlet:supplemental-stack:';
const DEED_TAG = 'gauntlet-deed';
const DEED_STACK_TAG = 'gauntlet-deed-stack';
const FACTION_ZONE_TAG = 'gauntlet-faction-zone';
const PENDING_SUPPLEMENTAL_NOTE = 'Ready shared and faction supplemental components are assembled into the same starter kit later in the TTS package pipeline. Rules remain manual.';
const ASSEMBLED_SUPPLEMENTAL_NOTE = 'Shared components and production-ready faction components are included automatically in the matching starter kits. Proposals, Deeds, and Mystics Rites/Ritual are packaged as family stacks; sliding trackers use renderer-derived registration points. Rules remain manual.';

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function color(r = 1, g = 1, b = 1) {
  return { r, g, b };
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
  const sideways = component.tts?.sidewaysCard === true;
  // Landscape Deeds are normalized into ordinary portrait TTS image cells.
  // SidewaysCard supplies the physical landscape footprint while the card's
  // free tabletop transform remains 0; tagged table snaps own its parked angle.
  const tabletopRotation = component.family === 'deed-card' ? 0 : (sideways ? 90 : 0);
  const tags = component.family === 'deed-card'
    ? [DEED_TAG, FACTION_ZONE_TAG]
    : [FACTION_ZONE_TAG];
  return {
    Name: 'CardCustom',
    Transform: transform(0, 1, 0, tabletopRotation),
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
    Hands: true,
    LuaScript: '',
    LuaScriptState: '',
    XmlUI: '',
    GUID: guid(),
    CardID: Number(component.tts.cardId),
    SidewaysCard: sideways,
    // Deeds must use their dedicated battlefield slots and also remain legal
    // Faction Zone cards; TTS tag matching permits both without changing size.
    Tags: tags,
    CustomDeck: { [deckId]: state },
  };
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
  const presentation = trackerPresentation(component);
  return {
    Name: 'Custom_Tile',
    Transform: transform(0, 1, 0, 0, presentation.transformScale, 1, presentation.transformScale),
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
    LuaScript: presentation.luaScript,
    LuaScriptState: '',
    XmlUI: '',
    GUID: guid(),
    Tags: [snapTag],
    AttachedSnapPoints: presentation.snapPoints,
    CustomImage: {
      ImageURL: faceUrl,
      ImageSecondaryURL: backUrl,
      WidthScale: presentation.widthScale,
      CustomTile: {
        Type: presentation.tileType,
        Thickness: Number(component.tts.thickness || 0.05),
        Stackable: false,
        Stretch: presentation.stretch,
      },
    },
  };
}

function makeSupplementalObject(component, starter, releaseAssets, guid) {
  if (component.representation === 'card') return makeSupplementalCard(component, releaseAssets, guid);
  if (component.representation === 'sliding-tracker') return makeSlidingTracker(component, starter, releaseAssets, guid);
  throw new Error(`Ready supplemental component ${component.id} uses unsupported save representation ${component.representation || 'missing'}.`);
}

function makeSupplementalStack(cards, { key, nickname, description, stackRotation = 0, sidewaysCard = false, tags = [] }, guid) {
  if (!Array.isArray(cards) || cards.length < 2) throw new Error(`Supplemental stack ${key} needs at least two cards.`);
  const customDeck = {};
  for (const card of cards) {
    if (card?.Name !== 'CardCustom' || !Number.isFinite(Number(card.CardID))) throw new Error(`Supplemental stack ${key} contains a non-card object.`);
    Object.assign(customDeck, card.CustomDeck || {});
  }
  return {
    Name: 'DeckCustom',
    Transform: transform(0, 1, 0, stackRotation),
    Nickname: nickname,
    Description: description,
    GMNotes: `${SUPPLEMENTAL_STACK_NOTE_PREFIX}${key}`,
    ColorDiffuse: color(),
    Locked: false,
    Grid: true,
    Snap: true,
    Autoraise: true,
    Sticky: true,
    Tooltip: true,
    GridProjection: false,
    HideWhenFaceDown: false,
    Hands: true,
    LuaScript: '',
    LuaScriptState: '',
    XmlUI: '',
    GUID: guid(),
    DeckIDs: cards.map(card => Number(card.CardID)),
    SidewaysCard: sidewaysCard,
    ...(tags.length ? { Tags: [...tags] } : {}),
    CustomDeck: customDeck,
    ContainedObjects: cards,
  };
}

const FAMILY_STACKS = Object.freeze([
  {
    key: 'proposals', nickname: 'Proposals', description: 'Diplomat Proposal / ratified Treaty Article cards', expectedCount: 9,
    tags: [FACTION_ZONE_TAG],
    predicate: object => object?.Name === 'CardCustom' && /· proposal-treaty-card$/u.test(String(object.Description || '')),
  },
  {
    key: 'deeds', nickname: 'Deeds', description: 'Financier Deed cards', expectedCount: 8, stackRotation: 90, sidewaysCard: true, tags: [DEED_STACK_TAG],
    predicate: object => object?.Name === 'CardCustom' && /· deed-card$/u.test(String(object.Description || '')),
  },
  {
    key: 'rites-rituals', nickname: 'Rites + Ritual', description: 'Mystics Rites and Ritual of Ascension', expectedCount: 4,
    tags: [FACTION_ZONE_TAG],
    predicate: object => object?.Name === 'CardCustom' && /· (?:rite-card|ritual-card)$/u.test(String(object.Description || '')),
  },
]);

function stackFamilyInBag(bag, definition, guid) {
  const objects = bag.ContainedObjects || [];
  const matching = objects.filter(definition.predicate);
  if (!matching.length) return false;
  if (matching.length !== definition.expectedCount) throw new Error(`${bag.Nickname} has ${matching.length} ${definition.key} cards; expected ${definition.expectedCount}.`);
  const firstIndex = objects.findIndex(definition.predicate);
  bag.ContainedObjects = objects.filter(object => !definition.predicate(object));
  bag.ContainedObjects.splice(firstIndex, 0, makeSupplementalStack(matching, definition, guid));
  return true;
}

function stackStarterFamilies(bag, guid) {
  const stacked = [];
  for (const definition of FAMILY_STACKS) if (stackFamilyInBag(bag, definition, guid)) stacked.push(definition.key);
  return stacked;
}

function starterBagNickname(starter) {
  return `${starter.name} — ${starter.leader.name}`;
}

function stripSupplementalDescription(description) {
  return String(description || '').replace(/\n\nReady (?:faction )?supplement(?:al components|als):[^\n]*$/u, '');
}

function findStarterBag(save, starter) {
  const nickname = starterBagNickname(starter);
  const matches = (save.ObjectStates || []).filter(object => object?.Name === 'Bag' && object?.Nickname === nickname);
  if (matches.length !== 1) throw new Error(`Expected exactly one starter Bag named ${JSON.stringify(nickname)}; found ${matches.length}.`);
  return matches[0];
}

function validateSupplementalManifest(supplementalManifest, version) {
  if (supplementalManifest?.gameVersion !== version) throw new Error(`Supplemental manifest targets ${supplementalManifest?.gameVersion || 'no version'}; expected ${version}.`);
  const ready = supplementalManifest.ready || [];
  if (Number(supplementalManifest.readyCount) !== ready.length) throw new Error(`Supplemental manifest readyCount ${supplementalManifest.readyCount} does not match ${ready.length} ready records.`);
  for (const component of ready) if (component.productionStatus !== 'ready') throw new Error(`Supplemental manifest includes non-ready component ${component.id || 'unknown'} in ready records.`);
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
  object.Tags = object.Tags.filter(tag => !generatedTags.has(tag));
  if (!object.Tags.length) delete object.Tags;
}

function resolveTrackerCover(bag, starter, tracker) {
  const cover = tracker.cover;
  if (cover?.kind === 'leader') {
    const leaderCardId = Number(starter.leader?.tts?.cardId);
    const matches = (bag.ContainedObjects || []).filter(object => object?.Name === 'CardCustom' && Number(object.CardID) === leaderCardId);
    if (matches.length !== 1) throw new Error(`Tracker ${tracker.id} expected exactly one selected Leader cover in starter ${starter.id}; found ${matches.length}.`);
    return matches[0];
  }
  if (cover?.kind === 'component') {
    const marker = `${SUPPLEMENTAL_GUID_NOTE_PREFIX}${cover.componentId}`;
    const matches = (bag.ContainedObjects || []).filter(object => object?.GMNotes === marker);
    if (matches.length !== 1) throw new Error(`Tracker ${tracker.id} expected exactly one supplemental cover ${cover.componentId} in starter ${starter.id}; found ${matches.length}.`);
    return matches[0];
  }
  throw new Error(`Tracker ${tracker.id} has unsupported cover definition ${JSON.stringify(cover || null)}.`);
}

function markSupplementalsAsAssembled(save) {
  for (const field of ['Note', 'Rules']) {
    const text = String(save[field] || '');
    if (text.includes(ASSEMBLED_SUPPLEMENTAL_NOTE)) continue;
    if (!text.includes(PENDING_SUPPLEMENTAL_NOTE)) {
      throw new Error(`TTS save ${field} does not contain the expected pre-assembly supplemental instruction.`);
    }
    save[field] = text.replace(PENDING_SUPPLEMENTAL_NOTE, ASSEMBLED_SUPPLEMENTAL_NOTE);
  }
}

export function assembleReadySupplementals(save, starterManifest, supplementalManifest, releaseAssets) {
  const version = String(starterManifest?.gameVersion || '').trim();
  if (!version) throw new Error('Starter manifest does not declare gameVersion.');
  if (releaseAssets?.gameVersion !== version || releaseAssets?.releaseTag !== version) throw new Error(`Hosted TTS release assets do not match starter manifest ${version}.`);

  const ready = validateSupplementalManifest(supplementalManifest, version);
  const starters = starterManifest.decks || [];
  if (!starters.length) throw new Error('Starter manifest contains no starter decks.');
  const guid = makeContinuationGuidFactory(save);
  let placedCount = 0;
  const stackCounts = { proposals: 0, deeds: 0, 'rites-rituals': 0 };

  for (const starter of starters) {
    const bag = findStarterBag(save, starter);
    const starterComponents = ready.filter(component => component.deckInclusion === 'every-deck' || component.faction === starter.factionId);
    const factionTrackers = starterComponents.filter(component => component.representation === 'sliding-tracker');
    const generatedTrackerTags = new Set(factionTrackers.map(component => component.tts?.snapTag).filter(Boolean));

    bag.ContainedObjects = (bag.ContainedObjects || []).filter(object => !String(object?.GMNotes || '').startsWith(SUPPLEMENTAL_GUID_NOTE_PREFIX) && !String(object?.GMNotes || '').startsWith(SUPPLEMENTAL_STACK_NOTE_PREFIX));
    for (const object of bag.ContainedObjects || []) removeGeneratedTrackerTags(object, generatedTrackerTags);

    const placedNames = [];
    for (const component of starterComponents) {
      const quantity = Number(component.quantity || 0);
      if (!Number.isInteger(quantity) || quantity <= 0) throw new Error(`Ready supplemental component ${component.id} has invalid quantity ${component.quantity}.`);
      for (let copy = 0; copy < quantity; copy += 1) {
        bag.ContainedObjects.push(makeSupplementalObject(component, starter, releaseAssets, guid));
        placedCount += 1;
      }
      placedNames.push(quantity === 1 ? component.name : `${component.name} ×${quantity}`);
    }

    for (const tracker of factionTrackers) addObjectTag(resolveTrackerCover(bag, starter, tracker), tracker.tts.snapTag);
    for (const key of stackStarterFamilies(bag, guid)) stackCounts[key] += 1;

    const baseDescription = stripSupplementalDescription(bag.Description);
    bag.Description = placedNames.length ? `${baseDescription}\n\nReady supplemental components: ${placedNames.join(', ')}` : baseDescription;
  }

  markSupplementalsAsAssembled(save);
  return { save, placedCount, readyComponentCount: ready.length, stackCounts };
}

async function readReleaseAssetManifest(version) {
  const names = await readdir(STAGING_ROOT).catch(error => {
    if (error.code === 'ENOENT') throw new Error('TTS supplemental save assembly requires staged hosted assets. Run npm run tts:release:stage first.');
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
    console.log(`Current TTS supplemental save assembler source check passed for ${release.version}.`);
    return;
  }

  const starterManifest = JSON.parse(await readFile(join(release.outputRoot, 'starter-deck-manifest.json'), 'utf8').catch(error => {
    if (error.code === 'ENOENT') throw new Error('TTS supplemental save assembly requires the current starter manifest. Run npm run tts:build first.');
    throw error;
  }));
  const supplementalManifest = JSON.parse(await readFile(join(release.outputRoot, 'supplemental-manifest.json'), 'utf8').catch(error => {
    if (error.code === 'ENOENT') throw new Error('TTS supplemental save assembly requires the supplemental manifest. Run npm run tts:supplementals first.');
    throw error;
  }));
  const releaseAssets = await readReleaseAssetManifest(release.version);
  const versionedName = `Gauntlet_${release.version}_TTS_Review_Scaffold.json`;
  const versionedPath = join(release.outputRoot, versionedName);
  const save = JSON.parse(await readFile(versionedPath, 'utf8').catch(error => {
    if (error.code === 'ENOENT') throw new Error('TTS supplemental save assembly requires the generated review scaffold. Run npm run tts:save first.');
    throw error;
  }));

  const result = assembleReadySupplementals(save, starterManifest, supplementalManifest, releaseAssets);
  const aliasPath = join(CURRENT_ALIAS_ROOT, 'Gauntlet_TTS_Review_Scaffold.json');
  await writeFile(versionedPath, jsonText(result.save));
  await writeFile(aliasPath, jsonText(result.save));
  console.log(`Assembled ${result.placedCount} ready supplemental objects from ${result.readyComponentCount} component definitions into ${relative(ROOT, versionedPath)}; stacks=${JSON.stringify(result.stackCounts)}.`);
  console.log(`Hosted supplemental assets are resolved from ${basename(releaseAssets.sourceOutput || STAGING_ROOT)} release staging.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
