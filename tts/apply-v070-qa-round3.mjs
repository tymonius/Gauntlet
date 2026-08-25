import { readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from '../scripts/tts-current-catalog.mjs';

const TABLE_TEXT_NOTE_PREFIX = 'gauntlet:table-layout:';
const HAND_TRIGGER_NOTE_PREFIX = 'gauntlet:hand-trigger:';
const SUPPLEMENTAL_GUID_NOTE_PREFIX = 'gauntlet:supplemental:';
const SUPPLEMENTAL_STACK_NOTE_PREFIX = 'gauntlet:supplemental-stack:';
const TERRITORY_TAG = 'gauntlet-territory';
const DEED_TAG = 'gauntlet-deed';
const DEED_STACK_TAG = 'gauntlet-deed-stack';
const FACTION_ZONE_TAG = 'gauntlet-faction-zone';

const PRIMARY_TERRITORY_Z = Object.freeze([-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]);
const EXPANSION_TERRITORY_Z = Object.freeze([-10.5, 10.5]);
const ALL_TERRITORY_Z = Object.freeze([
  EXPANSION_TERRITORY_Z[0],
  ...PRIMARY_TERRITORY_Z,
  EXPANSION_TERRITORY_Z[1],
]);
const DEED_X = Object.freeze([-4.35, 4.35]);
const TABLE_MARK_Y = 1.01;
const TERRITORY_SLOT_WIDTH = 3.8;
const TERRITORY_SLOT_DEPTH = 2.75;
const LABEL_GAP = 0.34;
const TRACKER_AUTHORED_HEIGHT = 3.5;
const TRACKER_SERIALIZED_LOCAL_HEIGHT = TRACKER_AUTHORED_HEIGHT / 1.5;

const OUTLINE_SHADOW_COLOR = Object.freeze({ r: 0.12, g: 0.085, b: 0.055 });
const OUTLINE_COLOR = Object.freeze({ r: 0.83, g: 0.69, b: 0.40 });
const LABEL_SHADOW_COLOR = Object.freeze({ r: 0.08, g: 0.055, b: 0.035 });
const LABEL_COLOR = Object.freeze({ r: 0.99, g: 0.91, b: 0.70 });

// Red-side coordinates. Blue is the exact 180-degree mirror. The Leader &
// References zone is deliberately deep: its four parked cards live toward the
// player edge while a sliding Leader has clear runway toward the center.
const PLAYER_ZONES = Object.freeze([
  {
    id: 'leader-references',
    label: 'Leader & References',
    x: -12.25,
    z: -14.2,
    width: 11.1,
    depth: 9.2,
    fontSize: 29,
    textScale: 0.26,
    snapLayout: 'leader',
  },
  {
    id: 'draw',
    label: 'Draw Pile',
    x: -1.55,
    z: -13.55,
    width: 2.85,
    depth: 4.15,
    fontSize: 28,
    textScale: 0.25,
    snapLayout: 'pile',
  },
  {
    id: 'discard',
    label: 'Discard Pile',
    x: 1.55,
    z: -13.55,
    width: 2.85,
    depth: 4.15,
    fontSize: 27,
    textScale: 0.24,
    snapLayout: 'pile',
  },
  {
    id: 'hand',
    label: 'Hand',
    x: 0,
    z: -18.25,
    width: 2.85,
    depth: 4.0,
    fontSize: 30,
    textScale: 0.27,
    snapLayout: 'hand',
  },
  {
    id: 'graveyard',
    label: 'Graveyard',
    x: 17.15,
    z: -17.75,
    width: 2.85,
    depth: 4.15,
    fontSize: 27,
    textScale: 0.24,
    snapLayout: 'pile',
  },
  {
    id: 'asset-bank',
    label: 'Asset Bank',
    x: -12.3,
    z: -5.15,
    width: 10.9,
    depth: 7.15,
    fontSize: 29,
    textScale: 0.26,
    snapLayout: 'assets',
  },
  {
    id: 'faction-zone',
    label: 'Faction Zone',
    x: 12.0,
    z: -5.55,
    width: 10.8,
    depth: 10.35,
    fontSize: 29,
    textScale: 0.26,
    snapLayout: 'faction',
  },
]);

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
  if (!tag) return;
  const tags = new Set(Array.isArray(object.Tags) ? object.Tags : []);
  tags.add(tag);
  object.Tags = [...tags].sort();
}

function removeTag(object, tag) {
  if (!Array.isArray(object.Tags)) return;
  object.Tags = object.Tags.filter(value => value !== tag);
  if (!object.Tags.length) delete object.Tags;
}

function playerZone(side, zone) {
  const mirror = side === 'Blue' ? -1 : 1;
  const x = zone.x * mirror;
  const z = zone.z * mirror;
  return {
    ...zone,
    id: `${side.toLowerCase()}-${zone.id}`,
    x,
    z,
    rotationY: side === 'Blue' ? 180 : 0,
    labelX: x,
    labelZ: z + (side === 'Blue' ? 1 : -1) * (zone.depth / 2 + LABEL_GAP),
  };
}

function playerFacingCardRotation(side) {
  return side === 'Blue' ? 0 : 180;
}

function flatTextTransform(x, z, rotationY, scale, y = TABLE_MARK_Y) {
  return {
    posX: x,
    posY: y,
    posZ: z,
    rotX: 90,
    rotY: rotationY,
    rotZ: 0,
    scaleX: scale,
    scaleY: scale,
    scaleZ: scale,
  };
}

function rectangleLine(x, z, width, depth, lineColor, thickness, y) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  return {
    points3: [
      vector(x - halfWidth, y, z - halfDepth),
      vector(x + halfWidth, y, z - halfDepth),
      vector(x + halfWidth, y, z + halfDepth),
      vector(x - halfWidth, y, z + halfDepth),
    ],
    color: { ...lineColor },
    thickness,
    rotation: vector(0, 0, 0),
    loop: true,
    square: true,
  };
}

function outlinedRectangle(x, z, width, depth) {
  return [
    rectangleLine(x, z, width, depth, OUTLINE_SHADOW_COLOR, 0.105, TABLE_MARK_Y - 0.006),
    rectangleLine(x, z, width, depth, OUTLINE_COLOR, 0.048, TABLE_MARK_Y + 0.006),
  ];
}

function generatedTextGuid(index) {
  return `r3${index.toString(36).padStart(4, '0')}`.slice(-6);
}

function makeTableText(definition, guid) {
  const shadow = definition.shadow;
  const sideOffset = definition.rotationY === 180 ? -0.035 : 0.035;
  return {
    Name: '3DText',
    Transform: flatTextTransform(
      definition.x + (shadow ? sideOffset : 0),
      definition.z + (shadow ? sideOffset : 0),
      definition.rotationY,
      definition.scale,
      TABLE_MARK_Y + (shadow ? -0.003 : 0.003),
    ),
    Nickname: '',
    Description: '',
    GMNotes: `${TABLE_TEXT_NOTE_PREFIX}${definition.id}:${shadow ? 'shadow' : 'label'}`,
    ColorDiffuse: color(),
    Locked: true,
    Grid: false,
    Snap: false,
    Autoraise: false,
    Sticky: false,
    Tooltip: false,
    GridProjection: false,
    HideWhenFaceDown: false,
    Hands: false,
    Text: {
      Text: definition.label,
      colorstate: { ...(shadow ? LABEL_SHADOW_COLOR : LABEL_COLOR) },
      fontSize: shadow ? definition.fontSize + 1 : definition.fontSize,
    },
    LuaScript: '',
    LuaScriptState: '',
    XmlUI: '',
    GUID: guid,
  };
}

function buildVectorLines() {
  const lines = [];
  for (const side of ['Red', 'Blue']) {
    for (const zone of PLAYER_ZONES) {
      const placed = playerZone(side, zone);
      lines.push(...outlinedRectangle(placed.x, placed.z, placed.width, placed.depth));
    }
  }
  // Manifest Destiny positions remain invisible until needed.
  for (const z of PRIMARY_TERRITORY_Z) {
    lines.push(...outlinedRectangle(0, z, TERRITORY_SLOT_WIDTH, TERRITORY_SLOT_DEPTH));
  }
  return lines;
}

function snap(position, rotationY = null, tags = null) {
  const point = { Position: position };
  if (rotationY !== null) point.Rotation = vector(0, rotationY, 0);
  if (tags?.length) point.Tags = tags;
  return point;
}

function pointInPlayerZone(side, zone, offsetX = 0, offsetZ = 0) {
  const mirror = side === 'Blue' ? -1 : 1;
  return vector((zone.x + offsetX) * mirror, 0, (zone.z + offsetZ) * mirror);
}

function leaderOffsets() {
  return [
    [-4.05, -2.25],
    [-1.35, -2.25],
    [1.35, -2.25],
    [4.05, -2.25],
  ];
}

function assetOffsets() {
  return [
    [-3.975, -1.82],
    [-1.325, -1.82],
    [1.325, -1.82],
    [3.975, -1.82],
    [-2.65, 1.82],
    [0, 1.82],
    [2.65, 1.82],
  ];
}

function factionOffsets() {
  const offsets = [];
  for (const z of [-3.55, 0, 3.55]) {
    for (const x of [-3.9, -1.3, 1.3, 3.9]) offsets.push([x, z]);
  }
  return offsets;
}

function buildSnapPoints() {
  const points = [];
  for (const z of ALL_TERRITORY_Z) {
    points.push(snap(vector(0, 0, z), 90, [TERRITORY_TAG]));
  }
  // Deeds are native landscape images. Zero/180 rotation keeps them landscape;
  // the previous 90-degree magnet was what made them stand portrait here.
  for (const z of ALL_TERRITORY_Z) {
    for (const x of DEED_X) points.push(snap(vector(x, 0, z), 0, [DEED_TAG]));
  }

  for (const side of ['Red', 'Blue']) {
    const faceRotation = playerFacingCardRotation(side);
    for (const zone of PLAYER_ZONES) {
      if (zone.snapLayout === 'leader') {
        for (const [x, z] of leaderOffsets()) points.push(snap(pointInPlayerZone(side, zone, x, z), faceRotation));
      } else if (zone.snapLayout === 'assets') {
        for (const [x, z] of assetOffsets()) points.push(snap(pointInPlayerZone(side, zone, x, z), faceRotation));
      } else if (zone.snapLayout === 'faction') {
        for (const [x, z] of factionOffsets()) {
          points.push(snap(pointInPlayerZone(side, zone, x, z), faceRotation, [FACTION_ZONE_TAG]));
        }
        // Dedicated portrait parking point for the landscape Deed stack.
        points.push(snap(
          pointInPlayerZone(side, zone, -3.9, -3.55),
          (faceRotation + 90) % 360,
          [DEED_STACK_TAG],
        ));
      } else if (zone.snapLayout === 'hand') {
        points.push(snap(pointInPlayerZone(side, zone), faceRotation));
      } else if (zone.snapLayout === 'pile') {
        points.push(snap(pointInPlayerZone(side, zone), faceRotation));
      }
    }
  }
  return points;
}

function buildTextObjects() {
  const definitions = [];
  for (const side of ['Red', 'Blue']) {
    for (const zone of PLAYER_ZONES) {
      const placed = playerZone(side, zone);
      for (const shadow of [true, false]) {
        definitions.push({
          ...placed,
          x: placed.labelX,
          z: placed.labelZ,
          scale: placed.textScale,
          shadow,
        });
      }
    }
  }
  return definitions.map((definition, index) => makeTableText(definition, generatedTextGuid(index + 1)));
}

function makeHandTrigger(side, zone, guid) {
  const placed = playerZone(side, zone);
  const tint = side === 'Red'
    ? color(0.86, 0.12, 0.12)
    : color(0.12, 0.34, 0.88);
  return {
    Name: 'HandTrigger',
    Transform: transform(
      placed.x,
      1.5,
      placed.z,
      playerFacingCardRotation(side),
      1.45,
      2.0,
      2.0,
    ),
    Nickname: `${side} Hand`,
    Description: 'Owner-hidden hand zone',
    GMNotes: `${HAND_TRIGGER_NOTE_PREFIX}${side.toLowerCase()}`,
    ColorDiffuse: tint,
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

function applyHands(save, guid) {
  const hand = PLAYER_ZONES.find(zone => zone.id === 'hand');
  if (!hand) throw new Error('Round-three layout has no Hand zone.');
  save.ObjectStates = (save.ObjectStates || []).filter(object => (
    object?.Name !== 'HandTrigger'
    && !String(object?.GMNotes || '').startsWith(HAND_TRIGGER_NOTE_PREFIX)
  ));

  const triggers = ['Red', 'Blue'].map(side => makeHandTrigger(side, hand, guid));
  save.ObjectStates.push(...triggers);
  save.Hands = {
    Enable: true,
    DisableUnused: true,
    Hiding: 0,
    HandTransforms: triggers.map(trigger => ({
      Color: trigger.Nickname.startsWith('Red') ? 'Red' : 'Blue',
      Transform: { ...trigger.Transform },
    })),
  };
  return triggers.length;
}

function ensureHandsEnabled(save) {
  let cardCount = 0;
  walkObjects(save.ObjectStates, object => {
    if (object?.Name === 'CardCustom') {
      object.Hands = true;
      cardCount += 1;
    } else if (object?.Name === 'DeckCustom') {
      object.Hands = true;
    }
  });
  return cardCount;
}

function normalizeDeeds(save) {
  let cards = 0;
  let stacks = 0;
  walkObjects(save.ObjectStates, object => {
    const notes = String(object?.GMNotes || '');
    const isDeedCard = notes === `${SUPPLEMENTAL_GUID_NOTE_PREFIX}financiers-deed`
      || /· deed-card$/u.test(String(object?.Description || ''));
    const isDeedStack = notes === `${SUPPLEMENTAL_STACK_NOTE_PREFIX}deeds`;

    if (isDeedCard && object.Name === 'CardCustom') {
      object.SidewaysCard = false;
      object.Transform ||= transform();
      object.Transform.rotY = 0;
      object.Transform.scaleX = 1;
      object.Transform.scaleY = 1;
      object.Transform.scaleZ = 1;
      removeTag(object, FACTION_ZONE_TAG);
      addTag(object, DEED_TAG);
      cards += 1;
    }

    if (isDeedStack && object.Name === 'DeckCustom') {
      object.SidewaysCard = false;
      object.Transform ||= transform();
      object.Transform.rotY = 90;
      object.Transform.scaleX = 1;
      object.Transform.scaleY = 1;
      object.Transform.scaleZ = 1;
      object.Tags = [DEED_STACK_TAG];
      stacks += 1;
    }
  });
  return { cards, stacks };
}

function tagFactionZoneCards(save) {
  let tagged = 0;
  walkObjects(save.ObjectStates, object => {
    const notes = String(object?.GMNotes || '');
    if (notes === `${SUPPLEMENTAL_STACK_NOTE_PREFIX}deeds`) return;
    if (notes === `${SUPPLEMENTAL_STACK_NOTE_PREFIX}proposals`
      || notes === `${SUPPLEMENTAL_STACK_NOTE_PREFIX}rites-rituals`) {
      addTag(object, FACTION_ZONE_TAG);
      tagged += 1;
      return;
    }
    // Any ordinary card may become Financier Treasury material. Territory and
    // Deed objects are excluded because they have dedicated table semantics.
    if (object?.Name === 'CardCustom'
      && !Array.isArray(object.Tags)?.includes?.(TERRITORY_TAG)
      && !Array.isArray(object.Tags)?.includes?.(DEED_TAG)) {
      addTag(object, FACTION_ZONE_TAG);
      tagged += 1;
    }
  });
  return tagged;
}

function trackerRuntimeLua(component) {
  const tag = String(component.tts?.snapTag || '').trim();
  const authored = component.tts?.snapPoints;
  if (!tag || !Array.isArray(authored) || authored.length < 2) {
    throw new Error(`Tracker ${component.id} is missing renderer-derived registration data.`);
  }
  const fractions = authored.map(point => ({
    value: point.value,
    fraction: Number(point.offset) / TRACKER_AUTHORED_HEIGHT,
  }));
  const definitions = fractions.map(({ fraction }) => (
    `    { position = {0, 0.12, -localLength * ${Number(fraction.toFixed(7))}}, rotation = {0, 0, 0}, rotation_snap = true, tags = {${JSON.stringify(tag)}} }`
  ));
  return [
    'function registerGauntletTrackerSnaps()',
    '  local bounds = self.getBoundsNormalized()',
    '  local scale = self.getScale()',
    '  local scaleZ = math.abs(scale.z)',
    '  if scaleZ < 0.0001 then scaleZ = 1 end',
    '  local localLength = bounds.size.z / scaleZ',
    '  self.setSnapPoints({',
    definitions.join(',\n'),
    '  })',
    'end',
    '',
    'function onLoad()',
    '  -- Wait until TTS has built the Custom_Tile collider, then derive each',
    '  -- registration from the tile actual bounds. This avoids assuming that',
    '  -- card CSS inches map 1:1 onto TTS world units.',
    '  Wait.frames(registerGauntletTrackerSnaps, 2)',
    'end',
    '',
  ].join('\n');
}

function serializedTrackerPoints(component) {
  const tag = String(component.tts?.snapTag || '').trim();
  return component.tts.snapPoints.map(point => ({
    Position: vector(
      0,
      0.12,
      -(Number(point.offset) / TRACKER_AUTHORED_HEIGHT) * TRACKER_SERIALIZED_LOCAL_HEIGHT,
    ),
    Rotation: vector(0, 0, 0),
    RotationSnap: true,
    Tags: [tag],
  }));
}

function correctTrackerSnaps(save, manifest) {
  const trackers = new Map((manifest.ready || [])
    .filter(component => component.representation === 'sliding-tracker')
    .map(component => [component.id, component]));
  const counts = new Map([...trackers.keys()].map(id => [id, 0]));

  walkObjects(save.ObjectStates, object => {
    const notes = String(object?.GMNotes || '');
    if (!notes.startsWith(SUPPLEMENTAL_GUID_NOTE_PREFIX) || object?.Name !== 'Custom_Tile') return;
    const id = notes.slice(SUPPLEMENTAL_GUID_NOTE_PREFIX.length);
    const component = trackers.get(id);
    if (!component) return;
    object.AttachedSnapPoints = serializedTrackerPoints(component);
    object.LuaScript = trackerRuntimeLua(component);
    object.LuaScriptState = '';
    counts.set(id, (counts.get(id) || 0) + 1);
  });

  for (const [id, count] of counts) {
    if (!count) throw new Error(`Round-three correction found no assembled ${id} tracker.`);
  }
  return Object.fromEntries(counts);
}

function repositionUtilities(save) {
  const placements = new Map([
    ['Red Player Token', { x: 7.4, z: -18.15, rotation: 0 }],
    ['Red Battle Die', { x: 9.0, z: -18.15, rotation: 0 }],
    ['Blue Player Token', { x: -7.4, z: 18.15, rotation: 180 }],
    ['Blue Battle Die', { x: -9.0, z: 18.15, rotation: 180 }],
  ]);
  for (const object of save.ObjectStates || []) {
    const target = placements.get(object?.Nickname);
    if (!target || !object.Transform) continue;
    object.Transform.posX = target.x;
    object.Transform.posZ = target.z;
    object.Transform.rotY = target.rotation;
  }
}

function replaceLayout(save) {
  save.ObjectStates = (save.ObjectStates || []).filter(object => (
    !String(object?.GMNotes || '').startsWith(TABLE_TEXT_NOTE_PREFIX)
  ));
  save.VectorLines = buildVectorLines();
  save.SnapPoints = buildSnapPoints();
  save.ObjectStates.push(...buildTextObjects());
}

function appendNote(save) {
  const note = 'TTS QA round 3: Leader & References provides four parked card positions plus forward sliding-tracker runway; Draw/Discard are centered behind the Gauntlet; Hand is a one-card owner-hidden HandTrigger with a parking snap; Graveyard is isolated; Asset Bank uses seven tight portrait positions; Faction Zone uses twelve compact portrait positions plus a dedicated portrait Deed-stack parking snap; Deed slots keep native landscape orientation; trackers register against live TTS bounds for renderer-accurate value lines; player token and die are parked together behind the active board.';
  for (const field of ['Note', 'Rules']) {
    const current = String(save[field] || '').trim();
    if (!current.includes(note)) save[field] = `${current}\n\n${note}`.trim();
  }
}

async function main() {
  const release = await resolveCurrentTtsRelease();
  const versionedName = `Gauntlet_${release.version}_TTS_Review_Scaffold.json`;
  const versionedPath = join(release.outputRoot, versionedName);
  const [save, supplementalManifest] = await Promise.all([
    readFile(versionedPath, 'utf8').then(JSON.parse),
    readFile(join(release.outputRoot, 'supplemental-manifest.json'), 'utf8').then(JSON.parse),
  ]);

  const guid = makeContinuationGuidFactory(save);
  replaceLayout(save);
  const handTriggerCount = applyHands(save, guid);
  const handCardCount = ensureHandsEnabled(save);
  const deedResult = normalizeDeeds(save);
  const factionTagged = tagFactionZoneCards(save);
  const trackerCounts = correctTrackerSnaps(save, supplementalManifest);
  repositionUtilities(save);
  appendNote(save);

  const text = jsonText(save);
  await writeFile(versionedPath, text);
  await writeFile(join(CURRENT_ALIAS_ROOT, 'Gauntlet_TTS_Review_Scaffold.json'), text);
  console.log(
    `Applied TTS QA round-three corrections to ${relative(ROOT, versionedPath)}: `
    + `${save.SnapPoints.length} table snaps, ${handTriggerCount} live HandTrigger objects, `
    + `${handCardCount} hand-enabled cards, ${deedResult.cards} Deed cards/${deedResult.stacks} Deed stacks, `
    + `${factionTagged} faction-zone eligible objects, trackers=${JSON.stringify(trackerCounts)}.`,
  );
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
