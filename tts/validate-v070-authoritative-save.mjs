import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { resolveCurrentTtsRelease, ROOT } from '../scripts/tts-current-catalog.mjs';
import {
  STANDARD_CARD_LONG_EDGE,
  TTS_STANDARD_CARD_WORLD_LONG_EDGE,
  trackerPresentation,
} from '../scripts/tts-supplemental-geometry.mjs';

const SUPPLEMENTAL_GUID_NOTE_PREFIX = 'gauntlet:supplemental:';
const SUPPLEMENTAL_STACK_NOTE_PREFIX = 'gauntlet:supplemental-stack:';
const PLAYER_TOKEN_NOTE_PREFIX = 'gauntlet:starter-utility:player-token:';
const BATTLE_DIE_NOTE_PREFIX = 'gauntlet:starter-utility:battle-die:';
const TERRITORY_TAG = 'gauntlet-territory';
const DEED_TAG = 'gauntlet-deed';
const DEED_STACK_TAG = 'gauntlet-deed-stack';
const FACTION_ZONE_TAG = 'gauntlet-faction-zone';
const HAND_TRIGGER_NOTE_PREFIX = 'gauntlet:hand-trigger:';

const FACTION_ROW_Z = Object.freeze({
  military: -12,
  diplomats: -7.2,
  financiers: -2.4,
  intelligence: 2.4,
  mystics: 7.2,
  inquisition: 12,
});

function walk(objects, visit) {
  for (const object of objects || []) {
    visit(object);
    walk(object?.ContainedObjects, visit);
  }
}

function allObjects(save) {
  const result = [];
  walk(save.ObjectStates || [], object => result.push(object));
  return result;
}

function close(a, b, tolerance = 0.001) {
  return Math.abs(Number(a) - Number(b)) <= tolerance;
}

function sameColor(a, b) {
  return ['r', 'g', 'b'].every(channel => close(a?.[channel], b?.[channel], 0.0001));
}

function hasTag(object, tag) {
  return Array.isArray(object?.Tags) && object.Tags.includes(tag);
}

function findSnap(save, x, z) {
  return (save.SnapPoints || []).find(point => close(point.Position?.x, x) && close(point.Position?.z, z));
}

function validateEnvironment(save) {
  if (save.Table !== 'Table_Custom' || !String(save.TableURL || '').includes('campaign-map-table')) {
    throw new Error('Authoritative TTS save is not using the campaign-map custom table.');
  }
  if (!String(save.SkyURL || '').includes('command-tent-panorama')) {
    throw new Error('Authoritative TTS save is not using the command-tent panorama.');
  }
}

function validateTableWorkspace(save) {
  if ((save.VectorLines || []).length !== 40) {
    throw new Error(`Expected 40 visible table outline lines; found ${save.VectorLines?.length || 0}. Manifest Destiny extension slots must remain invisible.`);
  }
  if ((save.SnapPoints || []).length !== 80) throw new Error(`Expected 80 final table snaps; found ${save.SnapPoints?.length || 0}.`);

  const territory = (save.SnapPoints || []).filter(point => point.Tags?.includes(TERRITORY_TAG));
  const deeds = (save.SnapPoints || []).filter(point => point.Tags?.includes(DEED_TAG));
  const faction = (save.SnapPoints || []).filter(point => point.Tags?.includes(FACTION_ZONE_TAG));
  const deedStacks = (save.SnapPoints || []).filter(point => point.Tags?.includes(DEED_STACK_TAG));
  if (territory.length !== 8 || territory.some(point => !close(point.Rotation?.y, 90))) {
    throw new Error('Territory table snaps do not match the recovered eight-position landscape contract.');
  }
  if (deeds.length !== 16 || deeds.some(point => !close(Math.abs(point.Position?.x), 4.35) || !close(point.Rotation?.y, 90))) {
    throw new Error('Deed table snaps must keep SidewaysCard Deeds landscape at ±4.35 / rotation 90.');
  }
  if (faction.length !== 24) throw new Error(`Expected 24 Faction Zone card snaps; found ${faction.length}.`);
  if (faction.filter(point => Number(point.Position?.z) < 0).some(point => !close(point.Rotation?.y, 180))) {
    throw new Error('Red Faction Zone card snaps are not facing the Red player.');
  }
  if (faction.filter(point => Number(point.Position?.z) > 0).some(point => !close(point.Rotation?.y, 0))) {
    throw new Error('Blue Faction Zone card snaps are not facing the Blue player.');
  }
  if (deedStacks.length !== 2) throw new Error(`Expected two Deed-stack parking snaps; found ${deedStacks.length}.`);
  const redDeedStack = deedStacks.find(point => Number(point.Position?.z) < 0);
  const blueDeedStack = deedStacks.find(point => Number(point.Position?.z) > 0);
  if (!redDeedStack || !close(redDeedStack.Rotation?.y, 270) || !blueDeedStack || !close(blueDeedStack.Rotation?.y, 90)) {
    throw new Error('Deed-stack parking magnets do not use the recovered perpendicular player-facing rotations.');
  }

  const redWorkspace = [
    [-1.55, -13.55],
    [1.55, -13.55],
    [0, -18.25],
    [17.15, -17.75],
  ];
  const blueWorkspace = redWorkspace.map(([x, z]) => [-x, -z]);
  if (redWorkspace.some(([x, z]) => !close(findSnap(save, x, z)?.Rotation?.y, 180))) {
    throw new Error('One or more Red Draw/Discard/Hand/Graveyard snaps are not facing Red.');
  }
  if (blueWorkspace.some(([x, z]) => !close(findSnap(save, x, z)?.Rotation?.y, 0))) {
    throw new Error('One or more Blue Draw/Discard/Hand/Graveyard snaps are not facing Blue.');
  }

  const labels = (save.ObjectStates || []).filter(object => String(object?.GMNotes || '').startsWith('gauntlet:table-layout:'));
  if (labels.length !== 28) throw new Error(`Expected 28 table-label objects; found ${labels.length}.`);
  const redLeader = labels.find(object => object.GMNotes === 'gauntlet:table-layout:red-leader-references:label');
  const redHand = labels.find(object => object.GMNotes === 'gauntlet:table-layout:red-hand:label');
  const redGraveyard = labels.find(object => object.GMNotes === 'gauntlet:table-layout:red-graveyard:label');
  if (!redLeader || !close(redLeader.Transform?.posX, -12.25)
    || !redHand || !close(redHand.Transform?.posZ, -20.59, 0.01)
    || !redGraveyard || !close(redGraveyard.Transform?.posX, 17.15)) {
    throw new Error('Final Round-3 workspace geometry was not preserved in generated table labels.');
  }
}

function validateHandsAndSeats(save) {
  if (save.Hands?.Enable !== true || save.Hands?.DisableUnused !== false || save.Hands?.HandTransforms?.length !== 2) {
    throw new Error('Expected exactly two always-enabled top-level TTS hand transforms.');
  }
  const red = save.Hands.HandTransforms.find(hand => hand.Color === 'Red');
  const blue = save.Hands.HandTransforms.find(hand => hand.Color === 'Blue');
  if (!red || !blue) throw new Error('Missing Red or Blue hand transform.');

  const expectedHands = [
    [red, 'Red', -23, 180],
    [blue, 'Blue', 23, 0],
  ];
  for (const [hand, side, z, rotY] of expectedHands) {
    if (!close(hand.Transform?.posZ, z) || !close(hand.Transform?.rotY, rotY)
      || !close(hand.Transform?.scaleX, 34) || !close(hand.Transform?.scaleY, 2) || !close(hand.Transform?.scaleZ, 5.5)) {
      throw new Error(`${side} hand transform does not match the recovered rear-edge hand geometry.`);
    }
  }

  const objects = allObjects(save);
  const handTriggers = objects.filter(object => object?.Name === 'HandTrigger');
  if (handTriggers.length !== 2) throw new Error(`Expected exactly two real HandTrigger ObjectStates; found ${handTriggers.length}.`);
  for (const [hand, side, z, rotY] of expectedHands) {
    const trigger = handTriggers.find(object => object.GMNotes === `${HAND_TRIGGER_NOTE_PREFIX}${side.toLowerCase()}`);
    if (!trigger || trigger.Nickname !== `${side} Hand`
      || !close(trigger.Transform?.posZ, z) || !close(trigger.Transform?.rotY, rotY)
      || !close(trigger.Transform?.scaleX, 34) || !close(trigger.Transform?.scaleY, 2) || !close(trigger.Transform?.scaleZ, 5.5)) {
      throw new Error(`${side} real HandTrigger is missing or does not match the serialized HandTransform.`);
    }
    for (const key of ['posX', 'posY', 'posZ', 'rotX', 'rotY', 'rotZ', 'scaleX', 'scaleY', 'scaleZ']) {
      if (!close(trigger.Transform?.[key], hand.Transform?.[key], 0.00001)) {
        throw new Error(`${side} HandTrigger and Hands.HandTransforms disagree at ${key}.`);
      }
    }
  }

  const fogVolumes = objects.filter(object => object?.Name === 'FogOfWarTrigger');
  if (fogVolumes.length) {
    throw new Error(`Found ${fogVolumes.length} FogOfWarTrigger objects. Player privacy must use real HandTrigger zones without table-spanning fog volumes.`);
  }

  const handEligible = objects.filter(object => object?.Name === 'CardCustom' || object?.Name === 'DeckCustom');
  if (!handEligible.length || handEligible.some(object => object.Hands !== true)) {
    throw new Error('Every CardCustom and DeckCustom must participate in the real TTS hand system.');
  }

  const lua = String(save.LuaScript || '');
  if (!lua.includes('function gauntletSeatCamera(color)')
    || !lua.includes('pitch = 55, yaw = 0, distance = 38')
    || !lua.includes('pitch = 55, yaw = 180, distance = 38')
    || !lua.includes('function onPlayerChangeColor(color)')) {
    throw new Error('Authoritative save is missing the recovered Red/Blue seat-camera alignment script.');
  }
}

function validateBagsAndUtilities(save) {
  const bags = (save.ObjectStates || []).filter(object => object?.Name === 'Bag');
  if (bags.length !== 12) throw new Error(`Expected 12 starter Bags; found ${bags.length}.`);

  const looseUtilities = (save.ObjectStates || []).filter(object => object?.Name === 'PlayerPawn' || object?.Name === 'Die_6');
  if (looseUtilities.length) throw new Error(`Found ${looseUtilities.length} loose utility objects; faction token/die belong inside starter Bags.`);

  const byFaction = new Map();
  for (const bag of bags) {
    const objects = bag.ContainedObjects || [];
    const token = objects.filter(object => object?.Name === 'PlayerPawn' && String(object.GMNotes || '').startsWith(PLAYER_TOKEN_NOTE_PREFIX));
    const die = objects.filter(object => object?.Name === 'Die_6' && String(object.GMNotes || '').startsWith(BATTLE_DIE_NOTE_PREFIX));
    if (token.length !== 1 || die.length !== 1) throw new Error(`${bag.Nickname} must contain exactly one faction token and one faction die.`);
    if (!sameColor(token[0].ColorDiffuse, bag.ColorDiffuse) || !sameColor(die[0].ColorDiffuse, bag.ColorDiffuse)) {
      throw new Error(`${bag.Nickname} token/die colors do not match the bag faction color.`);
    }

    const faction = String(token[0].GMNotes).slice(PLAYER_TOKEN_NOTE_PREFIX.length);
    if (!Object.hasOwn(FACTION_ROW_Z, faction)) throw new Error(`${bag.Nickname} has unknown faction utility marker ${faction}.`);
    if (!byFaction.has(faction)) byFaction.set(faction, []);
    byFaction.get(faction).push(bag);

    const playable = objects.filter(object => object?.Name === 'DeckCustom' && / Deck — \d+ cards$/u.test(String(object.Nickname || '')));
    if (playable.length !== 1 || !close(playable[0].Transform?.rotZ, 180)) {
      throw new Error(`${bag.Nickname} must contain one face-down playable Deck.`);
    }
  }

  for (const [faction, expectedZ] of Object.entries(FACTION_ROW_Z)) {
    const pair = byFaction.get(faction) || [];
    if (pair.length !== 2) throw new Error(`Expected two ${faction} starter Bags; found ${pair.length}.`);
    const left = pair.find(bag => close(bag.Transform?.posX, -20.5));
    const right = pair.find(bag => close(bag.Transform?.posX, 20.5));
    if (!left || !right || !close(left.Transform?.posZ, expectedZ) || !close(right.Transform?.posZ, expectedZ)
      || !close(left.Transform?.rotY, 90) || !close(right.Transform?.rotY, 270)) {
      throw new Error(`${faction} starter Bags do not use the recovered paired setup parking row.`);
    }
  }
  return bags;
}

function validateFamilyStacks(bags) {
  const expectations = new Map([
    ['proposals', { count: 2, cards: 9, sideways: false, rotY: 0, tag: FACTION_ZONE_TAG }],
    ['deeds', { count: 2, cards: 8, sideways: true, rotY: 90, tag: DEED_STACK_TAG }],
    ['rites-rituals', { count: 2, cards: 4, sideways: false, rotY: 0, tag: FACTION_ZONE_TAG }],
  ]);
  const found = new Map([...expectations.keys()].map(key => [key, []]));

  for (const bag of bags) {
    for (const object of bag.ContainedObjects || []) {
      const notes = String(object.GMNotes || '');
      if (!notes.startsWith(SUPPLEMENTAL_STACK_NOTE_PREFIX)) continue;
      const key = notes.slice(SUPPLEMENTAL_STACK_NOTE_PREFIX.length);
      if (found.has(key)) found.get(key).push(object);
    }
  }

  for (const [key, expected] of expectations) {
    const stacks = found.get(key);
    if (stacks.length !== expected.count) throw new Error(`Expected ${expected.count} ${key} stacks; found ${stacks.length}.`);
    for (const stack of stacks) {
      if (stack.Name !== 'DeckCustom' || stack.ContainedObjects?.length !== expected.cards) {
        throw new Error(`${key} stack has incorrect package size.`);
      }
      if (stack.SidewaysCard !== expected.sideways || !close(stack.Transform?.rotY, expected.rotY)) {
        throw new Error(`${key} stack has incorrect physical stack orientation.`);
      }
      if (!hasTag(stack, expected.tag)) throw new Error(`${key} stack is missing functional table tag ${expected.tag}.`);
    }
  }
}

function validateTerritoriesDeedsAndFactionEligibility(save, manifest) {
  const objects = allObjects(save);
  const territories = objects.filter(object => object?.Name === 'CardCustom' && hasTag(object, TERRITORY_TAG));
  if (!territories.length) throw new Error('No tagged Territory cards found.');
  for (const card of territories) {
    if (card.SidewaysCard !== true || !close(card.Transform?.rotY, 90)) {
      throw new Error(`Territory ${card.Nickname || card.GUID} is not a standard-size landscape card.`);
    }
    if (!close(card.Transform?.scaleX, 1) || !close(card.Transform?.scaleY, 1) || !close(card.Transform?.scaleZ, 1)) {
      throw new Error(`Territory ${card.Nickname || card.GUID} has nonstandard physical scale.`);
    }
  }

  const deedRecord = (manifest.ready || []).find(record => record.family === 'deed-card');
  if (!deedRecord) throw new Error('Supplemental manifest contains no Deed record.');
  if (deedRecord.tts?.cellOrientation !== 'portrait' || deedRecord.tts?.sidewaysCard !== true) {
    throw new Error('Deeds must be exported in standard portrait TTS cells and presented sideways in play.');
  }

  const deeds = objects.filter(object => object?.Name === 'CardCustom' && hasTag(object, DEED_TAG));
  if (deeds.length !== 16) throw new Error(`Expected 16 packaged Deed card objects across two starters; found ${deeds.length}.`);
  for (const card of deeds) {
    if (card.SidewaysCard !== true || !close(card.Transform?.rotY, 0)) {
      throw new Error(`Deed ${card.Nickname || card.GUID} does not use the standard landscape SidewaysCard presentation.`);
    }
    if (!close(card.Transform?.scaleX, 1) || !close(card.Transform?.scaleY, 1) || !close(card.Transform?.scaleZ, 1)) {
      throw new Error(`Deed ${card.Nickname || card.GUID} has nonstandard physical scale.`);
    }
    if (!hasTag(card, FACTION_ZONE_TAG)) {
      throw new Error(`Deed ${card.Nickname || card.GUID} must snap both to dedicated Deed slots and to generic Faction Zone positions.`);
    }
  }

  const ordinaryCards = objects.filter(object => object?.Name === 'CardCustom' && !hasTag(object, TERRITORY_TAG) && !hasTag(object, DEED_TAG));
  if (!ordinaryCards.length || ordinaryCards.some(card => !hasTag(card, FACTION_ZONE_TAG))) {
    throw new Error('Every ordinary card must retain generic Faction Zone snap eligibility for Treasury/public faction state.');
  }
}

function validateTrackers(save, manifest) {
  const trackerRecords = new Map((manifest.ready || [])
    .filter(record => record.representation === 'sliding-tracker')
    .map(record => [record.id, record]));
  const counts = new Map([...trackerRecords.keys()].map(id => [id, 0]));

  walk(save.ObjectStates || [], object => {
    if (object?.Name !== 'Custom_Tile') return;
    const notes = String(object.GMNotes || '');
    if (!notes.startsWith(SUPPLEMENTAL_GUID_NOTE_PREFIX)) return;
    const id = notes.slice(SUPPLEMENTAL_GUID_NOTE_PREFIX.length);
    const record = trackerRecords.get(id);
    if (!record) return;

    const expected = trackerPresentation(record);
    if (!close(object.Transform?.scaleX, expected.transformScale)
      || !close(object.Transform?.scaleY, 1)
      || !close(object.Transform?.scaleZ, expected.transformScale)) {
      throw new Error(`Tracker ${id} does not use the canonical card-sized Custom_Tile transform.`);
    }
    if (!close(object.CustomImage?.WidthScale, expected.widthScale)
      || object.CustomImage?.CustomTile?.Type !== expected.tileType
      || object.CustomImage?.CustomTile?.Stretch !== expected.stretch
      || object.CustomImage?.CustomTile?.Stackable !== false) {
      throw new Error(`Tracker ${id} does not use the canonical Custom_Tile presentation.`);
    }

    const actual = object.AttachedSnapPoints || [];
    const authored = record.tts?.snapPoints || [];
    if (actual.length !== expected.snapPoints.length || actual.length !== authored.length || actual.some((point, index) => {
      const expectedPoint = expected.snapPoints[index];
      const authoredPoint = authored[index];
      const expectedWorldTravel = (Number(authoredPoint.offset) / STANDARD_CARD_LONG_EDGE) * TTS_STANDARD_CARD_WORLD_LONG_EDGE;
      const actualWorldTravel = Math.abs(Number(point.Position?.z)) * Number(object.Transform?.scaleZ);
      return !close(point.Position?.x, expectedPoint.Position.x, 0.00001)
        || !close(point.Position?.y, expectedPoint.Position.y, 0.00001)
        || !close(point.Position?.z, expectedPoint.Position.z, 0.00001)
        || !close(actualWorldTravel, expectedWorldTravel, 0.00001)
        || point.RotationSnap !== true
        || !Array.isArray(point.Tags)
        || point.Tags[0] !== expectedPoint.Tags[0];
    })) {
      throw new Error(`Tracker ${id} snap geometry does not map each renderer value line to the same fraction of a real TTS card length.`);
    }
    const lua = String(object.LuaScript || '');
    if (lua !== expected.luaScript || !lua.includes('setSnapPoints')
      || lua.includes('getBoundsNormalized') || lua.includes('Wait.frames')) {
      throw new Error(`Tracker ${id} runtime snap registration does not match the canonical static renderer mapping.`);
    }
    counts.set(id, counts.get(id) + 1);
  });

  for (const [id, count] of counts) if (!count) throw new Error(`No assembled ${id} tracker found.`);
}

async function main() {
  const release = await resolveCurrentTtsRelease();
  const name = `Gauntlet_${release.version}_TTS_Review_Scaffold.json`;
  const path = join(release.outputRoot, name);
  const [save, manifest] = await Promise.all([
    readFile(path, 'utf8').then(JSON.parse),
    readFile(join(release.outputRoot, 'supplemental-manifest.json'), 'utf8').then(JSON.parse),
  ]);

  validateEnvironment(save);
  validateTableWorkspace(save);
  validateHandsAndSeats(save);
  const bags = validateBagsAndUtilities(save);
  validateFamilyStacks(bags);
  validateTerritoriesDeedsAndFactionEligibility(save, manifest);
  validateTrackers(save, manifest);

  console.log(`Authoritative v0.7.0 TTS save contract passed for ${relative(ROOT, path)}.`);
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
