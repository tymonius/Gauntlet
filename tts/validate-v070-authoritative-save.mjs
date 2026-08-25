import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { resolveCurrentTtsRelease, ROOT } from '../scripts/tts-current-catalog.mjs';
import { trackerPresentation } from '../scripts/tts-supplemental-geometry.mjs';

const PRIVATE_ZONE_NOTE_PREFIX = 'gauntlet:private-zone:';
const SUPPLEMENTAL_GUID_NOTE_PREFIX = 'gauntlet:supplemental:';
const SUPPLEMENTAL_STACK_NOTE_PREFIX = 'gauntlet:supplemental-stack:';
const PLAYER_TOKEN_NOTE_PREFIX = 'gauntlet:starter-utility:player-token:';
const BATTLE_DIE_NOTE_PREFIX = 'gauntlet:starter-utility:battle-die:';
const TERRITORY_TAG = 'gauntlet-territory';
const DEED_TAG = 'gauntlet-deed';

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

function validateEnvironment(save) {
  if (save.Table !== 'Table_Custom' || !String(save.TableURL || '').includes('campaign-map-table')) {
    throw new Error('Authoritative TTS save is not using the campaign-map custom table.');
  }
  if (!String(save.SkyURL || '').includes('command-tent-panorama')) {
    throw new Error('Authoritative TTS save is not using the command-tent panorama.');
  }
}

function validateHandsAndSeats(save) {
  if (save.Hands?.Enable !== true || save.Hands?.HandTransforms?.length !== 2) {
    throw new Error('Expected exactly two enabled top-level TTS hand transforms.');
  }
  const red = save.Hands.HandTransforms.find(hand => hand.Color === 'Red');
  const blue = save.Hands.HandTransforms.find(hand => hand.Color === 'Blue');
  if (!red || !blue) throw new Error('Missing Red or Blue hand transform.');
  if (!(Number(red.Transform?.posZ) < 0) || !close(red.Transform?.rotY, 0)) {
    throw new Error(`Red must own the south hand zone at rotY 0; got z=${red.Transform?.posZ}, rotY=${red.Transform?.rotY}.`);
  }
  if (!(Number(blue.Transform?.posZ) > 0) || !close(blue.Transform?.rotY, 180)) {
    throw new Error(`Blue must own the north hand zone at rotY 180; got z=${blue.Transform?.posZ}, rotY=${blue.Transform?.rotY}.`);
  }
  if (Number(red.Transform?.scaleX) < 6 || Number(blue.Transform?.scaleX) < 6) {
    throw new Error('Actual TTS hand zones are too narrow for stable card handling.');
  }

  const pseudoHands = (save.ObjectStates || []).filter(object => object?.Name === 'HandTrigger');
  if (pseudoHands.length) throw new Error(`Found ${pseudoHands.length} duplicate HandTrigger ObjectStates; hand zones must live only under Hands.HandTransforms.`);

  const privateZones = (save.ObjectStates || []).filter(object => (
    object?.Name === 'FogOfWarTrigger'
    && String(object.GMNotes || '').startsWith(PRIVATE_ZONE_NOTE_PREFIX)
  ));
  if (privateZones.length !== 2) throw new Error(`Expected two player-side private zones; found ${privateZones.length}.`);
  for (const side of ['Red', 'Blue']) {
    const zone = privateZones.find(object => object.FogColor === side);
    if (!zone) throw new Error(`${side} private zone is missing its FogColor owner.`);
    if (zone.FogReverseHiding !== false || zone.FogSeethrough !== true) {
      throw new Error(`${side} private zone hiding semantics are incorrect.`);
    }
    if (Number(zone.Transform?.scaleX) < 30 || Number(zone.Transform?.scaleZ) < 6) {
      throw new Error(`${side} private zone does not cover enough of the player's side of the table.`);
    }
  }
}

function validateBagsAndUtilities(save) {
  const bags = (save.ObjectStates || []).filter(object => object?.Name === 'Bag');
  if (bags.length !== 12) throw new Error(`Expected 12 starter Bags; found ${bags.length}.`);
  if (bags.some(bag => Math.abs(Number(bag.Transform?.posX)) < 20)) {
    throw new Error('Starter Bags must remain outside the active board workspace.');
  }

  const looseUtilities = (save.ObjectStates || []).filter(object => object?.Name === 'PlayerPawn' || object?.Name === 'Die_6');
  if (looseUtilities.length) throw new Error(`Found ${looseUtilities.length} loose utility objects; faction token/die belong inside starter Bags.`);

  for (const bag of bags) {
    const objects = bag.ContainedObjects || [];
    const token = objects.filter(object => object?.Name === 'PlayerPawn' && String(object.GMNotes || '').startsWith(PLAYER_TOKEN_NOTE_PREFIX));
    const die = objects.filter(object => object?.Name === 'Die_6' && String(object.GMNotes || '').startsWith(BATTLE_DIE_NOTE_PREFIX));
    if (token.length !== 1 || die.length !== 1) throw new Error(`${bag.Nickname} must contain exactly one faction token and one faction die.`);
    if (!sameColor(token[0].ColorDiffuse, bag.ColorDiffuse) || !sameColor(die[0].ColorDiffuse, bag.ColorDiffuse)) {
      throw new Error(`${bag.Nickname} token/die colors do not match the bag faction color.`);
    }

    const playable = objects.filter(object => object?.Name === 'DeckCustom' && / Deck — \d+ cards$/u.test(String(object.Nickname || '')));
    if (playable.length !== 1 || !close(playable[0].Transform?.rotZ, 180)) {
      throw new Error(`${bag.Nickname} must contain one face-down playable Deck.`);
    }
  }
  return bags;
}

function validateFamilyStacks(bags) {
  const expectations = new Map([
    ['proposals', { count: 2, cards: 9, sideways: false }],
    ['deeds', { count: 2, cards: 8, sideways: false }],
    ['rites-rituals', { count: 2, cards: 4, sideways: false }],
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
      if (stack.SidewaysCard !== expected.sideways) throw new Error(`${key} stack has incorrect physical stack orientation.`);
    }
  }
}

function validateTerritoriesAndDeeds(save, manifest) {
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
    if (card.SidewaysCard !== true || !close(card.Transform?.rotY, 90)) {
      throw new Error(`Deed ${card.Nickname || card.GUID} is not landscape in play.`);
    }
    if (!close(card.Transform?.scaleX, 1) || !close(card.Transform?.scaleY, 1) || !close(card.Transform?.scaleZ, 1)) {
      throw new Error(`Deed ${card.Nickname || card.GUID} has nonstandard physical scale.`);
    }
  }

  const territorySnaps = (save.SnapPoints || []).filter(point => point.Tags?.includes(TERRITORY_TAG));
  const deedSnaps = (save.SnapPoints || []).filter(point => point.Tags?.includes(DEED_TAG));
  if (territorySnaps.length !== 8) throw new Error(`Expected 8 Territory snaps; found ${territorySnaps.length}.`);
  if (deedSnaps.length !== 16) throw new Error(`Expected 16 Deed snaps; found ${deedSnaps.length}.`);
  if (deedSnaps.some(point => !close(point.Rotation?.y, 90))) throw new Error('Deed snaps must orient individual Deeds landscape.');
  if ((save.VectorLines || []).length !== 40) throw new Error(`Expected only six visibly marked Territory positions; vector line count is ${save.VectorLines?.length}.`);
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
    if (actual.length !== expected.snapPoints.length || actual.some((point, index) => {
      const expectedPoint = expected.snapPoints[index];
      return !close(point.Position?.x, expectedPoint.Position.x, 0.00001)
        || !close(point.Position?.y, expectedPoint.Position.y, 0.00001)
        || !close(point.Position?.z, expectedPoint.Position.z, 0.00001)
        || point.RotationSnap !== true
        || !Array.isArray(point.Tags)
        || point.Tags[0] !== expectedPoint.Tags[0];
    })) {
      throw new Error(`Tracker ${id} serialized snap geometry does not match the shared renderer-to-TTS geometry contract.`);
    }
    const lua = String(object.LuaScript || '');
    if (lua !== expected.luaScript || !lua.includes('setSnapPoints') || lua.includes('getBoundsNormalized')) {
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
  validateHandsAndSeats(save);
  const bags = validateBagsAndUtilities(save);
  validateFamilyStacks(bags);
  validateTerritoriesAndDeeds(save, manifest);
  validateTrackers(save, manifest);

  console.log(`Authoritative v0.7.0 TTS save contract passed for ${relative(ROOT, path)}.`);
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
