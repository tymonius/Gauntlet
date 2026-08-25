import { readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from '../scripts/tts-current-catalog.mjs';

const SUPPLEMENTAL_GUID_NOTE_PREFIX = 'gauntlet:supplemental:';
const SUPPLEMENTAL_STACK_NOTE_PREFIX = 'gauntlet:supplemental-stack:';
const HAND_TRIGGER_NOTE_PREFIX = 'gauntlet:hand-trigger:';
const HAND_PARKING_NOTE_PREFIX = 'gauntlet:hand-parking:';
const TERRITORY_TAG = 'gauntlet-territory';
const DEED_TAG = 'gauntlet-deed';
const DEED_STACK_TAG = 'gauntlet-deed-stack';
const FACTION_ZONE_TAG = 'gauntlet-faction-zone';

const RED = Object.freeze({ r: 0.856, g: 0.1, b: 0.094 });
const BLUE = Object.freeze({ r: 0.118, g: 0.53, b: 1.0 });
const HAND_PARKING_Z = 18.25;
const PRIMARY_HAND_Z = 22.4;

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function vector(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function transform(posX = 0, posY = 1, posZ = 0, rotY = 0, scaleX = 1, scaleY = 1, scaleZ = 1) {
  return { posX, posY, posZ, rotX: 0, rotY, rotZ: 0, scaleX, scaleY, scaleZ };
}

function walkObjects(objects, visit) {
  for (const object of objects || []) {
    visit(object);
    walkObjects(object?.ContainedObjects, visit);
  }
}

function collectGuids(objects, used = new Set()) {
  for (const object of objects || []) {
    if (typeof object?.GUID === 'string' && object.GUID) used.add(object.GUID.toLowerCase());
    collectGuids(object?.ContainedObjects, used);
  }
  return used;
}

function makeContinuationGuidFactory(save) {
  const used = collectGuids(save.ObjectStates || []);
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

function addTag(object, tag) {
  const tags = new Set(Array.isArray(object?.Tags) ? object.Tags : []);
  tags.add(tag);
  object.Tags = [...tags].sort();
}

function removeTag(object, tag) {
  if (!Array.isArray(object?.Tags)) return;
  object.Tags = object.Tags.filter(value => value !== tag);
  if (!object.Tags.length) delete object.Tags;
}

function isTerritoryCard(object) {
  return object?.Name === 'CardCustom' && /(?:Arena )?Territory$/u.test(String(object.Description || ''));
}

function restoreLandscapeCards(save) {
  let territories = 0;
  let deeds = 0;
  let deedStacks = 0;

  walkObjects(save.ObjectStates, object => {
    if (isTerritoryCard(object)) {
      object.SidewaysCard = true;
      object.Transform ||= transform();
      object.Transform.rotY = 90;
      object.Transform.scaleX = 1;
      object.Transform.scaleY = 1;
      object.Transform.scaleZ = 1;
      addTag(object, TERRITORY_TAG);
      territories += 1;
      return;
    }

    const notes = String(object?.GMNotes || '');
    const deedCard = notes === `${SUPPLEMENTAL_GUID_NOTE_PREFIX}financiers-deed`
      || /· deed-card$/u.test(String(object?.Description || ''));
    const deedStack = notes === `${SUPPLEMENTAL_STACK_NOTE_PREFIX}deeds`;

    if (deedCard && object?.Name === 'CardCustom') {
      // SidewaysCard is the physical landscape-card geometry. Keep the card's
      // native table rotation at 0 so a Deed snap also at 0 presents landscape.
      object.SidewaysCard = true;
      object.Transform ||= transform();
      object.Transform.rotY = 0;
      object.Transform.scaleX = 1;
      object.Transform.scaleY = 1;
      object.Transform.scaleZ = 1;
      removeTag(object, FACTION_ZONE_TAG);
      addTag(object, DEED_TAG);
      deeds += 1;
      return;
    }

    if (deedStack && object?.Name === 'DeckCustom') {
      // The Deed family leaves the bag as one landscape-card deck, but its
      // dedicated Faction Zone parking magnet rotates that stack portrait.
      object.SidewaysCard = true;
      object.Transform ||= transform();
      object.Transform.rotY = 90;
      object.Transform.scaleX = 1;
      object.Transform.scaleY = 1;
      object.Transform.scaleZ = 1;
      object.Tags = [DEED_STACK_TAG];
      deedStacks += 1;
    }
  });

  for (const point of save.SnapPoints || []) {
    if (point.Tags?.includes(DEED_TAG)) point.Rotation = vector(0, 0, 0);
    if (point.Tags?.includes(TERRITORY_TAG)) point.Rotation = vector(0, 90, 0);
  }

  return { territories, deeds, deedStacks };
}

function staticTrackerLua(points) {
  const definitions = points.map(point => {
    const position = point.Position || {};
    const rotation = point.Rotation || {};
    const tags = Array.isArray(point.Tags) ? point.Tags : [];
    return `    { position = {${Number(position.x || 0)}, ${Number(position.y || 0)}, ${Number(position.z || 0)}}, rotation = {${Number(rotation.x || 0)}, ${Number(rotation.y || 0)}, ${Number(rotation.z || 0)}}, rotation_snap = ${point.RotationSnap === false ? 'false' : 'true'}, tags = {${tags.map(tag => JSON.stringify(tag)).join(', ')}} }`;
  });
  return [
    'function registerGauntletTrackerSnaps()',
    '  self.setSnapPoints({',
    definitions.join(',\n'),
    '  })',
    'end',
    '',
    'function onLoad()',
    '  -- Use the same renderer-derived static registrations serialized into',
    '  -- the object. Live-bounds recalibration cleared working snaps on some',
    '  -- TTS clients, so this deliberately does not replace them dynamically.',
    '  registerGauntletTrackerSnaps()',
    'end',
    '',
  ].join('\n');
}

function restoreTrackerSnaps(save) {
  let trackers = 0;
  walkObjects(save.ObjectStates, object => {
    if (object?.Name !== 'Custom_Tile') return;
    if (!String(object.GMNotes || '').startsWith(SUPPLEMENTAL_GUID_NOTE_PREFIX)) return;
    const points = object.AttachedSnapPoints;
    if (!Array.isArray(points) || points.length < 2) return;
    object.LuaScript = staticTrackerLua(points);
    object.LuaScriptState = '';
    trackers += 1;
  });
  if (!trackers) throw new Error('Round four found no assembled sliding trackers.');
  return trackers;
}

function makeHandTrigger(side, guid) {
  const red = side === 'Red';
  const tint = red ? RED : BLUE;
  return {
    Name: 'HandTrigger',
    Transform: transform(0, 1.5, red ? -PRIMARY_HAND_Z : PRIMARY_HAND_Z, red ? 180 : 0, 4.25, 2.0, 1.55),
    Nickname: `${side} Hand`,
    Description: 'Primary owner hand zone for dealing and drawing',
    GMNotes: `${HAND_TRIGGER_NOTE_PREFIX}${side.toLowerCase()}:round4`,
    ColorDiffuse: { ...tint },
    Locked: true,
    Grid: false,
    Snap: false,
    Autoraise: false,
    Sticky: false,
    Tooltip: false,
    GridProjection: false,
    HideWhenFaceDown: false,
    Hands: false,
    LuaScript: '',
    LuaScriptState: '',
    XmlUI: '',
    GUID: guid(),
  };
}

function makeHandParkingHiddenZone(side, guid) {
  const red = side === 'Red';
  const tint = red ? RED : BLUE;
  return {
    Name: 'FogOfWarTrigger',
    Transform: transform(0, 1.5, red ? -HAND_PARKING_Z : HAND_PARKING_Z, red ? 180 : 0, 1.48, 2.0, 2.0),
    Nickname: `${side} Hand Parking`,
    Description: 'Private one-card hand parking stack',
    GMNotes: `${HAND_PARKING_NOTE_PREFIX}${side.toLowerCase()}`,
    ColorDiffuse: { ...tint, a: 0.25 },
    Locked: true,
    Grid: false,
    Snap: false,
    Autoraise: false,
    Sticky: false,
    Tooltip: false,
    GridProjection: false,
    HideWhenFaceDown: false,
    Hands: false,
    FogColor: side,
    FogHidePointers: false,
    FogReverseHiding: false,
    FogSeethrough: true,
    LuaScript: '',
    LuaScriptState: '',
    XmlUI: '',
    GUID: guid(),
  };
}

function restoreHands(save, guid) {
  save.ObjectStates = (save.ObjectStates || []).filter(object => (
    object?.Name !== 'HandTrigger'
    && !String(object?.GMNotes || '').startsWith(HAND_TRIGGER_NOTE_PREFIX)
    && !String(object?.GMNotes || '').startsWith(HAND_PARKING_NOTE_PREFIX)
  ));

  const triggers = ['Red', 'Blue'].map(side => makeHandTrigger(side, guid));
  const parking = ['Red', 'Blue'].map(side => makeHandParkingHiddenZone(side, guid));
  save.ObjectStates.push(...triggers, ...parking);

  save.Hands = {
    Enable: true,
    DisableUnused: true,
    Hiding: 0,
    HandTransforms: triggers.map(trigger => ({
      Color: trigger.Nickname.startsWith('Red') ? 'Red' : 'Blue',
      Transform: { ...trigger.Transform },
    })),
  };

  walkObjects(save.ObjectStates, object => {
    if (object?.Name === 'CardCustom' || object?.Name === 'DeckCustom') object.Hands = true;
  });

  return { triggers: triggers.length, parking: parking.length };
}

function validate(save) {
  const territories = [];
  const deeds = [];
  const deedStacks = [];
  const trackers = [];
  const handTriggers = [];
  const handParking = [];

  walkObjects(save.ObjectStates, object => {
    if (isTerritoryCard(object)) territories.push(object);
    if (String(object?.GMNotes || '') === `${SUPPLEMENTAL_GUID_NOTE_PREFIX}financiers-deed`) deeds.push(object);
    if (String(object?.GMNotes || '') === `${SUPPLEMENTAL_STACK_NOTE_PREFIX}deeds`) deedStacks.push(object);
    if (object?.Name === 'Custom_Tile' && Array.isArray(object.AttachedSnapPoints) && object.AttachedSnapPoints.length > 1) trackers.push(object);
    if (object?.Name === 'HandTrigger') handTriggers.push(object);
    if (String(object?.GMNotes || '').startsWith(HAND_PARKING_NOTE_PREFIX)) handParking.push(object);
  });

  if (!territories.length || territories.some(object => object.SidewaysCard !== true || Number(object.Transform?.rotY) !== 90)) {
    throw new Error('Round-four Territory landscape contract failed.');
  }
  if (!deeds.length || deeds.some(object => object.SidewaysCard !== true || Number(object.Transform?.rotY) !== 0)) {
    throw new Error('Round-four Deed landscape contract failed.');
  }
  if (deedStacks.length !== 2 || deedStacks.some(object => object.SidewaysCard !== true || Number(object.Transform?.rotY) !== 90)) {
    throw new Error(`Round-four Deed stack contract failed: ${deedStacks.length} stacks.`);
  }
  const deedSnaps = (save.SnapPoints || []).filter(point => point.Tags?.includes(DEED_TAG));
  if (deedSnaps.length !== 16 || deedSnaps.some(point => Number(point.Rotation?.y) !== 0)) {
    throw new Error('Round-four Deed snap contract failed.');
  }
  if (!trackers.length || trackers.some(object => /getBoundsNormalized|Wait\.frames/.test(String(object.LuaScript || '')))) {
    throw new Error('Round-four tracker static-registration contract failed.');
  }
  if (handTriggers.length !== 2 || handParking.length !== 2) {
    throw new Error(`Round-four hand-zone contract failed: ${handTriggers.length} hands / ${handParking.length} parking zones.`);
  }
  const redHand = handTriggers.find(object => object.Nickname === 'Red Hand');
  const blueHand = handTriggers.find(object => object.Nickname === 'Blue Hand');
  if (!redHand || !blueHand || JSON.stringify(redHand.ColorDiffuse) !== JSON.stringify(RED) || JSON.stringify(blueHand.ColorDiffuse) !== JSON.stringify(BLUE)) {
    throw new Error('Round-four HandTrigger colors do not match canonical TTS Red/Blue seats.');
  }

  return {
    territories: territories.length,
    deeds: deeds.length,
    deedStacks: deedStacks.length,
    trackers: trackers.length,
    handTriggers: handTriggers.length,
    handParking: handParking.length,
  };
}

function appendNote(save) {
  const note = 'TTS QA round 4 restores cumulative fixes after round-three regressions: Territories and individual Deeds use physical landscape CardCustom geometry; the Deed family parks portrait only as a stack in the Faction Zone; tracker value registrations use stable renderer-derived static snap points; canonical Red/Blue primary HandTriggers sit behind the table for reliable deal routing; the visible one-card Hand parking position is a separate private Hidden Zone so its snap cannot fight TTS hand auto-layout.';
  for (const field of ['Note', 'Rules']) {
    const current = String(save[field] || '').trim();
    if (!current.includes(note)) save[field] = `${current}\n\n${note}`.trim();
  }
}

async function main() {
  const release = await resolveCurrentTtsRelease();
  const name = `Gauntlet_${release.version}_TTS_Review_Scaffold.json`;
  const path = join(release.outputRoot, name);
  const save = JSON.parse(await readFile(path, 'utf8'));
  const guid = makeContinuationGuidFactory(save);

  const landscape = restoreLandscapeCards(save);
  const trackers = restoreTrackerSnaps(save);
  const hands = restoreHands(save, guid);
  appendNote(save);
  const checked = validate(save);

  const text = jsonText(save);
  await writeFile(path, text);
  await writeFile(join(CURRENT_ALIAS_ROOT, 'Gauntlet_TTS_Review_Scaffold.json'), text);
  console.log(
    `Applied TTS QA round-four regression corrections to ${relative(ROOT, path)}: `
    + `${JSON.stringify({ landscape, trackers, hands, checked })}.`,
  );
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
