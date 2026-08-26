import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { resolveCurrentTtsRelease, ROOT } from '../scripts/tts-current-catalog.mjs';
import { trackerPresentation } from '../scripts/tts-supplemental-geometry.mjs';

const SUPPLEMENTAL_GUID_NOTE_PREFIX = 'gauntlet:supplemental:';
const SUPPLEMENTAL_STACK_NOTE_PREFIX = 'gauntlet:supplemental-stack:';
const PLAYER_TOKEN_NOTE_PREFIX = 'gauntlet:starter-utility:player-token:';
const BATTLE_DIE_NOTE_PREFIX = 'gauntlet:starter-utility:battle-die:';
const HAND_TRIGGER_NOTE_PREFIX = 'gauntlet:hand-trigger:';
const TERRITORY_TAG = 'gauntlet-territory';
const DEED_TAG = 'gauntlet-deed';
const DEED_STACK_TAG = 'gauntlet-deed-stack';
const FACTION_ZONE_TAG = 'gauntlet-faction-zone';

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

function zoneContainsPoint(zone, x, z) {
  return Math.abs(Number(x) - Number(zone?.posX)) <= Number(zone?.scaleX) / 2
    && Math.abs(Number(z) - Number(zone?.posZ)) <= Number(zone?.scaleZ) / 2;
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
    throw new Error(`Expected 40 visible table outline lines; found ${save.VectorLines?.length || 0}. Both visible Hand parking guides must remain present; only Manifest Destiny extensions are invisible.`);
  }
  if ((save.SnapPoints || []).length !== 78) throw new Error(`Expected 78 final table snaps; found ${save.SnapPoints?.length || 0}.`);

  const territory = save.SnapPoints.filter(point => point.Tags?.includes(TERRITORY_TAG));
  const deeds = save.SnapPoints.filter(point => point.Tags?.includes(DEED_TAG));
  const faction = save.SnapPoints.filter(point => point.Tags?.includes(FACTION_ZONE_TAG));
  const deedStackMagnets = save.SnapPoints.filter(point => point.Tags?.includes(DEED_STACK_TAG));

  if (territory.length !== 8 || territory.some(point => !close(point.Rotation?.y, 90))) {
    throw new Error('Territory table snaps do not match the eight-position landscape contract.');
  }
  if (deeds.length !== 16 || deeds.some(point => !close(Math.abs(point.Position?.x), 4.35) || !close(point.Rotation?.y, 90))) {
    throw new Error('Deed table snaps must remain landscape at ±4.35 / rotation 90.');
  }
  if (faction.length !== 24) throw new Error(`Expected 24 Faction Zone card snaps; found ${faction.length}.`);
  if (deedStackMagnets.length) throw new Error('Deed stacks must use ordinary Faction Zone magnets; dedicated Deed-stack magnets are forbidden.');
  if (faction.filter(point => Number(point.Position?.z) < 0).some(point => !close(point.Rotation?.y, 180))) {
    throw new Error('Red Faction Zone card snaps are not facing Red.');
  }
  if (faction.filter(point => Number(point.Position?.z) > 0).some(point => !close(point.Rotation?.y, 0))) {
    throw new Error('Blue Faction Zone card snaps are not facing Blue.');
  }

  const redWorkspace = [[-1.55, -13.55], [1.55, -13.55], [0, -18.25], [17.15, -17.75]];
  const blueWorkspace = redWorkspace.map(([x, z]) => [-x, -z]);
  if (redWorkspace.some(([x, z]) => !close(findSnap(save, x, z)?.Rotation?.y, 180))) {
    throw new Error('One or more Red Draw/Discard/Hand/Graveyard snaps are not facing Red.');
  }
  if (blueWorkspace.some(([x, z]) => !close(findSnap(save, x, z)?.Rotation?.y, 0))) {
    throw new Error('One or more Blue Draw/Discard/Hand/Graveyard snaps are not facing Blue.');
  }

  const labels = (save.ObjectStates || []).filter(object => String(object?.GMNotes || '').startsWith('gauntlet:table-layout:'));
  if (labels.length !== 28) throw new Error(`Expected 28 visible table-label objects; found ${labels.length}.`);
  const handLabels = labels.filter(object => object.Text?.Text === 'Hand');
  if (handLabels.length !== 4) throw new Error(`Expected visible Hand parking labels/shadows for both players; found ${handLabels.length}.`);
  const redHandLabel = labels.find(object => object.GMNotes === 'gauntlet:table-layout:red-hand:label');
  const blueHandLabel = labels.find(object => object.GMNotes === 'gauntlet:table-layout:blue-hand:label');
  if (!redHandLabel || !close(redHandLabel.Transform?.posZ, -20.59, 0.01)
    || !blueHandLabel || !close(blueHandLabel.Transform?.posZ, 20.59, 0.01)) {
    throw new Error('Visible Hand parking labels are not in the expected player workspaces.');
  }
}

function validateHandsAndSeats(save) {
  if (save.Hands?.Enable !== true || save.Hands?.DisableUnused !== false || save.Hands?.HandTransforms?.length !== 2) {
    throw new Error('Expected exactly two enabled serialized TTS hand transforms.');
  }
  if (save.Hands?.Hiding !== 0) throw new Error('TTS Hand hiding must remain at the default player-private setting.');

  const red = save.Hands.HandTransforms.find(hand => hand.Color === 'Red');
  const blue = save.Hands.HandTransforms.find(hand => hand.Color === 'Blue');
  if (!red || !blue) throw new Error('Missing Red or Blue hand transform.');

  const expectedHands = [
    [red, 'Red', -20.25, 180, -18.25],
    [blue, 'Blue', 20.25, 0, 18.25],
  ];
  for (const [hand, side, z, rotY, parkingZ] of expectedHands) {
    if (!close(hand.Transform?.posX, 0) || !close(hand.Transform?.posZ, z) || !close(hand.Transform?.rotY, rotY)
      || !close(hand.Transform?.scaleX, 7) || !close(hand.Transform?.scaleY, 2) || !close(hand.Transform?.scaleZ, 8)) {
      throw new Error(`${side} hand transform does not match the unified parking-plus-Reserve geometry.`);
    }
    if (!zoneContainsPoint(hand.Transform, 0, parkingZ)) {
      throw new Error(`${side} visible Hand parking snap is not inside the same private Hand zone as the Reserve.`);
    }
  }

  // The unified private zone must not swallow ordinary public workspaces.
  for (const [hand, side, publicPoints] of [
    [red, 'Red', [[-1.55, -13.55], [1.55, -13.55], [17.15, -17.75]]],
    [blue, 'Blue', [[1.55, 13.55], [-1.55, 13.55], [-17.15, 17.75]]],
  ]) {
    if (publicPoints.some(([x, z]) => zoneContainsPoint(hand.Transform, x, z))) {
      throw new Error(`${side} private Hand zone overlaps Draw, Discard, or Graveyard.`);
    }
  }

  const objects = allObjects(save);
  const handTriggers = objects.filter(object => object?.Name === 'HandTrigger');
  if (handTriggers.length !== 2) throw new Error(`Expected exactly two real HandTrigger ObjectStates; found ${handTriggers.length}.`);
  for (const [hand, side] of expectedHands) {
    const trigger = handTriggers.find(object => object.GMNotes === `${HAND_TRIGGER_NOTE_PREFIX}${side.toLowerCase()}`);
    if (!trigger || trigger.Nickname !== `${side} Hand`) {
      throw new Error(`${side} real HandTrigger is missing.`);
    }
    for (const key of ['posX', 'posY', 'posZ', 'rotX', 'rotY', 'rotZ', 'scaleX', 'scaleY', 'scaleZ']) {
      if (!close(trigger.Transform?.[key], hand.Transform?.[key], 0.00001)) {
        throw new Error(`${side} HandTrigger and Hands.HandTransforms disagree at ${key}.`);
      }
    }
  }

  const fogVolumes = objects.filter(object => object?.Name === 'FogOfWarTrigger');
  if (fogVolumes.length) throw new Error(`Found ${fogVolumes.length} obsolete FogOfWarTrigger objects.`);

  const handEligible = objects.filter(object => object?.Name === 'CardCustom' || object?.Name === 'DeckCustom');
  if (!handEligible.length || handEligible.some(object => object.Hands !== true)) {
    throw new Error('Every CardCustom and DeckCustom must participate in the TTS hand system.');
  }

  const lua = String(save.LuaScript || '');
  if (lua.includes('gauntletSeatCamera') || lua.includes('Player[color].lookAt(')) {
    throw new Error('Authoritative save must not rotate or commandeer a seated player camera.');
  }
}

function validateBagsAndUtilities(save) {
  const bags = (save.ObjectStates || []).filter(object => object?.Name === 'Bag');
  if (bags.length !== 12) throw new Error(`Expected 12 starter Bags; found ${bags.length}.`);

  const looseUtilities = save.ObjectStates.filter(object => object?.Name === 'PlayerPawn' || object?.Name === 'Die_6');
  if (looseUtilities.length) throw new Error(`Found ${looseUtilities.length} loose utility objects.`);

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
  }

  for (const [faction, expectedZ] of Object.entries(FACTION_ROW_Z)) {
    const pair = byFaction.get(faction) || [];
    if (pair.length !== 2) throw new Error(`Expected two ${faction} starter Bags; found ${pair.length}.`);
    const left = pair.find(bag => close(bag.Transform?.posX, -20.5));
    const right = pair.find(bag => close(bag.Transform?.posX, 20.5));
    if (!left || !right || !close(left.Transform?.posZ, expectedZ) || !close(right.Transform?.posZ, expectedZ)) {
      throw new Error(`${faction} starter Bags do not use the expected setup row.`);
    }
  }
  return bags;
}

function validateFamilyStacks(bags) {
  const expectations = new Map([
    ['proposals', { count: 2, cards: 9, sideways: false, rotY: 0, tags: [FACTION_ZONE_TAG] }],
    ['deeds', { count: 2, cards: 8, sideways: true, rotY: 90, tags: [DEED_STACK_TAG, FACTION_ZONE_TAG] }],
    ['rites-rituals', { count: 2, cards: 4, sideways: false, rotY: 0, tags: [FACTION_ZONE_TAG] }],
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
      if (stack.Name !== 'DeckCustom' || stack.ContainedObjects?.length !== expected.cards) throw new Error(`${key} stack has incorrect package size.`);
      if (stack.SidewaysCard !== expected.sideways || !close(stack.Transform?.rotY, expected.rotY)) throw new Error(`${key} stack has incorrect physical orientation.`);
      for (const tag of expected.tags) if (!hasTag(stack, tag)) throw new Error(`${key} stack is missing functional tag ${tag}.`);
    }
  }
}

function validateTerritoriesDeedsAndFactionEligibility(save, manifest) {
  const objects = allObjects(save);
  const territories = objects.filter(object => object?.Name === 'CardCustom' && hasTag(object, TERRITORY_TAG));
  if (!territories.length) throw new Error('No tagged Territory cards found.');
  for (const card of territories) {
    if (card.SidewaysCard !== true || !close(card.Transform?.rotY, 90)) throw new Error(`Territory ${card.Nickname || card.GUID} is not landscape.`);
    if (!String(card.LuaScript || '').includes('self.use_rotation_value_flip = false')) {
      throw new Error(`Territory ${card.Nickname || card.GUID} does not use the alternate TTS flip axis.`);
    }
  }

  const deedRecord = (manifest.ready || []).find(record => record.family === 'deed-card');
  if (!deedRecord) throw new Error('Supplemental manifest contains no Deed record.');
  const deeds = objects.filter(object => object?.Name === 'CardCustom' && hasTag(object, DEED_TAG));
  if (deeds.length !== 16) throw new Error(`Expected 16 packaged Deed card objects across two starters; found ${deeds.length}.`);
  for (const card of deeds) {
    if (card.SidewaysCard !== true || !close(card.Transform?.rotY, 0)) throw new Error(`Deed ${card.Nickname || card.GUID} has incorrect free orientation.`);
    if (!hasTag(card, FACTION_ZONE_TAG)) throw new Error(`Deed ${card.Nickname || card.GUID} is not Faction Zone eligible.`);
  }

  const ordinaryCards = objects.filter(object => object?.Name === 'CardCustom' && !hasTag(object, TERRITORY_TAG) && !hasTag(object, DEED_TAG));
  if (!ordinaryCards.length || ordinaryCards.some(card => !hasTag(card, FACTION_ZONE_TAG))) {
    throw new Error('Every ordinary card must retain generic Faction Zone snap eligibility.');
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
    const authored = record.tts?.snapPoints || [];
    if (expected.registrations.length !== authored.length) {
      throw new Error(`Tracker ${id} does not preserve one registration for every rendered value line.`);
    }
    if (Array.isArray(object.AttachedSnapPoints) && object.AttachedSnapPoints.length) {
      throw new Error(`Tracker ${id} has serialized snap coordinates competing with its live-bounds authority.`);
    }

    expected.registrations.forEach((registration, index) => {
      if (!close(registration.registrationFraction, authored[index]?.registrationFraction, 0.0000001)) {
        throw new Error(`Tracker ${id} altered rendered registration fraction ${index}.`);
      }
    });

    const lua = String(object.LuaScript || '');
    if (lua !== expected.luaScript
      || !lua.includes('self.getBoundsNormalized()')
      || !lua.includes('local localLength = bounds.size.z / scaleZ')
      || !lua.includes('-localLength * registration.fraction')
      || !lua.includes('Wait.condition(')
      || lua.includes('3.06')
      || lua.includes('value / max')) {
      throw new Error(`Tracker ${id} runtime snap registration is not the canonical rendered-line/live-bounds mapping.`);
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
