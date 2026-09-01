import { readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from '../scripts/tts-current-catalog.mjs';

const TABLE_LAYOUT_NOTE = 'Gauntlet TTS table layout: White sits south and Green north. The table is organized by function rather than rotational symmetry: both Asset Banks share the west side with a dedicated Battle Zone between them; both combined Faction / Leader & References workspaces share the east side; Draw and Discard stay compact near the Gauntlet; Graveyards remain deliberately isolated at the outer east edge; and each player has a wide private tabletop Hand parking strip backed by a player-private Hidden Zone. Battle staging provides compact overlapping snap rows for multiple Gambits and especially multiple Tactics. Territory and Deed snaps constrain position only so their Y rotation can show control or ownership. Manifest Destiny is explicitly Territory-slot eligible. Territory cards carry an attached overlay-only snap so physical Overlays inherit the Territory\'s current orientation.';
const TABLE_TEXT_NOTE_PREFIX = 'gauntlet:table-layout:';
const LEGACY_PRIVATE_ZONE_NOTE_PREFIX = 'gauntlet:private-zone:';
const LEGACY_HAND_TRIGGER_NOTE_PREFIX = 'gauntlet:hand-trigger:';
const PRIVATE_PARKING_NOTE_PREFIX = 'gauntlet:private-parking:';
const TERRITORY_TAG = 'gauntlet-territory';
const TERRITORY_OVERLAY_TAG = 'gauntlet-territory-overlay';
const DEED_TAG = 'gauntlet-deed';
const FACTION_ZONE_TAG = 'gauntlet-faction-zone';
const PLAYABLE_CARD_NOTE_PREFIX = 'gauntlet:playable-card:';
const STARTER_TERRITORY_STACK_NOTE_PREFIX = 'gauntlet:starter-territories:';

const TERRITORY_SLOT_CARD_IDS = new Set(['neutral-manifest-destiny']);
const TERRITORY_SLOT_CARD_NAMES = new Set(['Manifest Destiny']);
const TERRITORY_OVERLAY_CARD_IDS = new Set([
  'military-encampment',
  'diplomats-demilitarized-zone',
  'diplomats-sanctions-blockade',
  'intelligence-fog-of-war',
  'neutral-bombardment',
  'neutral-scorched-earth',
  'neutral-protracted-siege',
  'mystics-circle-of-bones',
  'mystics-spirit-hollow',
]);
const TERRITORY_OVERLAY_CARD_NAMES = new Set([
  'Encampment',
  'Demilitarized Zone',
  'Sanctions: Blockade',
  'Fog of War',
  'Bombardment',
  'Scorched Earth',
  'Protracted Siege',
  'Circle of Bones',
  'Spirit Hollow',
]);

const PRIMARY_TERRITORY_Z = Object.freeze([-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]);
const EXPANSION_TERRITORY_Z = Object.freeze([-10.5, 10.5]);
const ALL_TERRITORY_Z = Object.freeze([EXPANSION_TERRITORY_Z[0], ...PRIMARY_TERRITORY_Z, EXPANSION_TERRITORY_Z[1]]);
const DEED_X = Object.freeze([-3.95, 3.95]);

const TABLE_MARK_Y = 1.01;
const TERRITORY_SLOT_WIDTH = 3.8;
const TERRITORY_SLOT_DEPTH = 2.75;
const LABEL_GAP = 0.34;

const PORTRAIT_CARD_WIDTH = 2.5;
const PORTRAIT_CARD_DEPTH = 3.5;

const BATTLE_ZONE = Object.freeze({
  id: 'battle-zone',
  x: -12.4,
  z: 0,
  width: 12.6,
  depth: 8.6,
});

const OUTLINE_SHADOW_COLOR = Object.freeze({ r: 0.12, g: 0.085, b: 0.055 });
const OUTLINE_COLOR = Object.freeze({ r: 0.83, g: 0.69, b: 0.40 });
const LABEL_SHADOW_COLOR = Object.freeze({ r: 0.08, g: 0.055, b: 0.035 });
const LABEL_COLOR = Object.freeze({ r: 0.99, g: 0.91, b: 0.70 });


// Player workspaces mirror only north/south. East/west placement is functional:
// Assets and battle staging live to the west; faction/leader material to the east.
const PLAYER_ZONES = Object.freeze([
  {
    id: 'draw',
    label: 'Draw',
    x: -1.6,
    z: -14.25,
    width: 2.75,
    depth: 3.9,
    fontSize: 27,
    textScale: 0.24,
    snapLayout: 'pile',
  },
  {
    id: 'discard',
    label: 'Discard',
    x: 1.6,
    z: -14.25,
    width: 2.75,
    depth: 3.9,
    fontSize: 27,
    textScale: 0.24,
    snapLayout: 'pile',
  },
  {
    id: 'hand',
    label: 'Private / Hand',
    x: 0,
    z: -18.65,
    width: 14.0,
    depth: 2.9,
    fontSize: 27,
    textScale: 0.24,
    snapLayout: 'private',
  },
  {
    id: 'graveyard',
    label: 'Graveyard',
    x: 18.7,
    z: -15.1,
    width: 2.6,
    depth: 3.9,
    fontSize: 26,
    textScale: 0.23,
    snapLayout: 'pile',
  },
  {
    id: 'asset-bank',
    label: 'Asset Bank',
    x: -12.4,
    z: -8.3,
    width: 12.6,
    depth: 4.6,
    fontSize: 28,
    textScale: 0.25,
    snapLayout: 'assets',
  },
  {
    id: 'faction-zone',
    label: 'Faction / Leader & References',
    x: 11.4,
    z: -10.0,
    width: 10.5,
    depth: 10.6,
    fontSize: 26,
    textScale: 0.23,
    snapLayout: 'faction-leader',
  },
]);

// The Reserve is the actual TTS Hand zone and sits fully outside the visible
// tabletop parking rectangle. Parking itself is a Hidden Zone so cards remain
// physical tabletop objects while concealed from the opponent.
const HAND_RESERVE_EXTENSION = 4.0;
const HAND_RESERVE_GAP = 0.6;
const HAND_ZONE_WIDTH = 14.0;
const HAND_ZONE_HEIGHT = 6.0;
const PARKING_ZONE_WIDTH = 14.0;
const PARKING_ZONE_HEIGHT = 6.0;
const PARKING_ZONE_DEPTH = 4.2;
const PARKING_ZONE_CENTER_OFFSET = 0.4;
const TTS_ZONE_COLORS = Object.freeze({
  White: { r: 1.0, g: 1.0, b: 1.0, a: 0.22 },
  Green: { r: 0.192, g: 0.701, b: 0.168, a: 0.22 },
});

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function color(r = 1, g = 1, b = 1, a = undefined) {
  const result = { r, g, b };
  if (a !== undefined) result.a = a;
  return result;
}

function vector(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function transform(posX = 0, posY = 1, posZ = 0, rotY = 0, scaleX = 1, scaleY = 1, scaleZ = 1) {
  return { posX, posY, posZ, rotX: 0, rotY, rotZ: 0, scaleX, scaleY, scaleZ };
}

function collectGuids(objects, guids = new Set()) {
  for (const object of objects || []) {
    if (typeof object?.GUID === 'string' && object.GUID) guids.add(object.GUID.toLowerCase());
    collectGuids(object?.ContainedObjects, guids);
  }
  return guids;
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

function addTag(object, tag) {
  const tags = new Set(Array.isArray(object?.Tags) ? object.Tags : []);
  tags.add(tag);
  object.Tags = [...tags].sort();
}

function walkObjects(objects, visit) {
  for (const object of objects || []) {
    visit(object);
    walkObjects(object?.ContainedObjects, visit);
  }
}

function tagTerritories(objects) {
  walkObjects(objects, object => {
    if (object?.Name !== 'CardCustom' || !/(?:Arena )?Territory$/u.test(String(object.Description || ''))) return;

    addTag(object, TERRITORY_TAG);
    object.SidewaysCard = true;
    object.Transform ||= transform();
    // The board snap constrains only position; Y rotation remains free for
    // control. Territory face orientation is corrected in the generated sheet,
    // so TTS's native sideways-card flip behavior is authoritative.
    object.Transform.rotX = 0;
    object.Transform.rotY = 0;
    object.Transform.rotZ = 0;
    object.Transform.scaleX = 1;
    object.Transform.scaleY = 1;
    object.Transform.scaleZ = 1;
    const territoryLua = String(object.LuaScript || '');
    if (territoryLua.includes('function tryRotate(spin, flip')
      || territoryLua.includes('use_rotation_value_flip')) {
      object.LuaScript = '';
      object.LuaScriptState = '';
    }

    // Attached snap points are local to the Territory object. An overlay placed
    // here therefore follows the Territory's current world orientation instead
    // of inheriting a fixed table rotation.
    const retained = (object.AttachedSnapPoints || []).filter(point => !point?.Tags?.includes(TERRITORY_OVERLAY_TAG));
    object.AttachedSnapPoints = [
      ...retained,
      {
        Position: vector(0, 0.25, 0),
        Rotation: vector(0, 0, 0),
        Tags: [TERRITORY_OVERLAY_TAG],
      },
    ];
  });
}

function playableCardId(object) {
  const notes = String(object?.GMNotes || '');
  return notes.startsWith(PLAYABLE_CARD_NOTE_PREFIX)
    ? notes.slice(PLAYABLE_CARD_NOTE_PREFIX.length)
    : null;
}

function tagTerritoryInteractions(objects) {
  walkObjects(objects, object => {
    if (object?.Name !== 'CardCustom') return;
    const id = playableCardId(object);
    const name = String(object.Nickname || '');

    if (TERRITORY_SLOT_CARD_IDS.has(id) || TERRITORY_SLOT_CARD_NAMES.has(name)) {
      addTag(object, TERRITORY_TAG);
      addTag(object, FACTION_ZONE_TAG);
    }
    if (TERRITORY_OVERLAY_CARD_IDS.has(id) || TERRITORY_OVERLAY_CARD_NAMES.has(name)) {
      addTag(object, TERRITORY_OVERLAY_TAG);
      addTag(object, FACTION_ZONE_TAG);
    }
  });
}

function orientStarterBagsForHost(save) {
  for (const bag of save.ObjectStates || []) {
    if (bag?.Name !== 'Bag') continue;
    bag.Transform ||= transform();
    // TTS testing established that direct starter-package contents need the
    // host-facing stored orientation before extraction. Keep that package-level
    // orientation instead of trying to make every component use its nominal
    // authored 0° rotation. Landscape Deed stacks are the perpendicular case.
    bag.Transform.rotY = 180;
    for (const object of bag.ContainedObjects || []) {
      if (!object?.Transform) continue;
      const notes = String(object.GMNotes || '');
      const stackKind = notes.replace('gauntlet:supplemental-stack:', '');
      object.Transform.rotY = stackKind === 'deeds' ? 270 : 180;

      // Territory cards are now packaged as one three-card DeckCustom. Keep
      // the members at the same tested host-facing stored rotation as the stack
      // so separating the stack does not reintroduce an orientation mismatch.
      if (notes.startsWith(STARTER_TERRITORY_STACK_NOTE_PREFIX)) {
        for (const territory of object.ContainedObjects || []) {
          if (territory?.Name !== 'CardCustom' || !/(?:Arena )?Territory$/u.test(String(territory.Description || ''))) continue;
          territory.Transform ||= transform();
          territory.Transform.rotY = 180;
        }
      }
    }
  }
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

function playerZone(side, zone) {
  const zMirror = side === 'Green' ? -1 : 1;
  const x = zone.x;
  const z = zone.z * zMirror;
  return {
    ...zone,
    id: `${side.toLowerCase()}-${zone.id}`,
    x,
    z,
    rotationY: side === 'Green' ? 180 : 0,
    labelX: x,
    labelZ: z + (side === 'Green' ? 1 : -1) * (zone.depth / 2 + LABEL_GAP),
  };
}

function tabletopCardRotation(side) {
  // TTS-tested tabletop card-facing contract: south/White workspace cards face
  // the player at 180 degrees; mirrored north/Green workspace cards face at 0.
  // This is intentionally NOT the native Hand transform rotation: TTS also uses
  // the Hand transform as seat/camera-facing authority when a save loads.
  return side === 'Green' ? 0 : 180;
}

function nativeHandRotation(side) {
  // Native TTS seat orientation: White is the south seat looking north and
  // Green is the north seat looking south. Reversing these values makes TTS
  // move the player's camera to the opposite side of the table on load.
  return side === 'Green' ? 180 : 0;
}

function handParkingDefinition() {
  const zone = PLAYER_ZONES.find(candidate => candidate.id === 'hand');
  if (!zone) throw new Error('TTS table layout has no Hand parking definition.');
  return zone;
}

export function handZoneTransform(side) {
  const parking = handParkingDefinition();
  const parkingCenter = Math.abs(parking.z);
  const inwardEdge = parkingCenter + parking.depth / 2 + HAND_RESERVE_GAP;
  const outwardEdge = inwardEdge + HAND_RESERVE_EXTENSION;
  const center = (inwardEdge + outwardEdge) / 2;
  const north = side === 'Green';

  return transform(
    0,
    4.0,
    north ? center : -center,
    nativeHandRotation(side),
    HAND_ZONE_WIDTH,
    HAND_ZONE_HEIGHT,
    HAND_RESERVE_EXTENSION,
  );
}

export function parkingHiddenZoneTransform(side) {
  const parking = handParkingDefinition();
  const north = side === 'Green';
  const center = Math.abs(parking.z) + PARKING_ZONE_CENTER_OFFSET;
  return transform(
    0,
    3.0,
    north ? center : -center,
    nativeHandRotation(side),
    PARKING_ZONE_WIDTH,
    PARKING_ZONE_HEIGHT,
    PARKING_ZONE_DEPTH,
  );
}

function pointInPlayerZone(side, zone, offsetX = 0, offsetZ = 0) {
  const zMirror = side === 'Green' ? -1 : 1;
  return vector(zone.x + offsetX, 0, (zone.z + offsetZ) * zMirror);
}

function snap(position, rotationY = null, tags = null) {
  const point = { Position: position };
  if (rotationY !== null) point.Rotation = vector(0, rotationY, 0);
  if (tags?.length) point.Tags = tags;
  return point;
}

function leaderOffsets() {
  return [
    [-3.75, -3.4],
    [-1.25, -3.4],
    [1.25, -3.4],
    [3.75, -3.4],
  ];
}

function assetOffsets() {
  return [-4.5, -3, -1.5, 0, 1.5, 3, 4.5].map(x => [x, 0]);
}

function factionOffsets() {
  const offsets = [];
  for (const z of [0.35, 3.5]) {
    for (const x of [-3.75, -2.25, -0.75, 0.75, 2.25, 3.75]) offsets.push([x, z]);
  }
  return offsets;
}

function privateOffsets() {
  return [-5.5, -3.3, -1.1, 1.1, 3.3, 5.5].map(x => [x, 0]);
}

function battleOffsets(kind) {
  if (kind === 'gambit') return [-4.75, -3.55, -2.35, -1.15];
  if (kind === 'tactic') return [0, 1, 2, 3, 4, 5];
  throw new Error(`Unknown Battle Zone offset kind: ${kind}`);
}

function battleRowZ(side) {
  return side === 'Green' ? 2.15 : -2.15;
}

function battleLabelDefinitions() {
  return [
    { id: 'green-battle-gambits', label: 'Gambits', x: BATTLE_ZONE.x - 3.55, z: 3.95, rotationY: 180, fontSize: 23, scale: 0.21 },
    { id: 'green-battle-tactics', label: 'Tactics', x: BATTLE_ZONE.x + 2.45, z: 3.95, rotationY: 180, fontSize: 23, scale: 0.21 },
    { id: 'white-battle-gambits', label: 'Gambits', x: BATTLE_ZONE.x - 3.55, z: -3.95, rotationY: 0, fontSize: 23, scale: 0.21 },
    { id: 'white-battle-tactics', label: 'Tactics', x: BATTLE_ZONE.x + 2.45, z: -3.95, rotationY: 0, fontSize: 23, scale: 0.21 },
  ];
}

export function buildTableVectorLines() {
  const lines = [];
  for (const side of ['White', 'Green']) {
    for (const zone of PLAYER_ZONES) {
      const placed = playerZone(side, zone);
      lines.push(...outlinedRectangle(placed.x, placed.z, placed.width, placed.depth));
    }
  }
  lines.push(...outlinedRectangle(BATTLE_ZONE.x, BATTLE_ZONE.z, BATTLE_ZONE.width, BATTLE_ZONE.depth));
  // Manifest Destiny positions remain functional but invisible until needed.
  for (const z of PRIMARY_TERRITORY_Z) lines.push(...outlinedRectangle(0, z, TERRITORY_SLOT_WIDTH, TERRITORY_SLOT_DEPTH));
  return lines;
}

export function buildTableSnapPoints() {
  const points = [];
  for (const z of ALL_TERRITORY_Z) points.push(snap(vector(0, 0, z), null, [TERRITORY_TAG]));

  for (const z of ALL_TERRITORY_Z) {
    for (const x of DEED_X) points.push(snap(vector(x, 0, z), null, [DEED_TAG]));
  }

  for (const side of ['White', 'Green']) {
    const faceRotation = tabletopCardRotation(side);
    for (const zone of PLAYER_ZONES) {
      if (zone.snapLayout === 'faction-leader') {
        for (const [x, z] of leaderOffsets()) points.push(snap(pointInPlayerZone(side, zone, x, z), faceRotation));
        for (const [x, z] of factionOffsets()) {
          points.push(snap(pointInPlayerZone(side, zone, x, z), faceRotation, [FACTION_ZONE_TAG]));
        }
      } else if (zone.snapLayout === 'assets') {
        for (const [x, z] of assetOffsets()) points.push(snap(pointInPlayerZone(side, zone, x, z), faceRotation));
      } else if (zone.snapLayout === 'private') {
        for (const [x, z] of privateOffsets()) points.push(snap(pointInPlayerZone(side, zone, x, z), faceRotation));
      } else if (zone.snapLayout === 'pile') {
        points.push(snap(pointInPlayerZone(side, zone), faceRotation));
      }
    }

    for (const kind of ['gambit', 'tactic']) {
      for (const x of battleOffsets(kind)) {
        points.push(snap(vector(BATTLE_ZONE.x + x, 0, battleRowZ(side)), faceRotation));
      }
    }
  }
  return points;
}

function generatedTextGuid(index) {
  return `tl${index.toString(36).padStart(4, '0')}`.slice(-6);
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

export function buildTableTextObjects(existingObjects = []) {
  const used = collectGuids(existingObjects);
  const definitions = [];
  for (const side of ['White', 'Green']) {
    for (const zone of PLAYER_ZONES) {
      const placed = playerZone(side, zone);
      for (const shadow of [true, false]) {
        definitions.push({ ...placed, x: placed.labelX, z: placed.labelZ, scale: placed.textScale, shadow });
      }
    }
  }
  for (const battle of battleLabelDefinitions()) {
    for (const shadow of [true, false]) definitions.push({ ...battle, shadow });
  }
  return definitions.map((definition, index) => {
    const guid = generatedTextGuid(index + 1);
    if (used.has(guid.toLowerCase())) throw new Error(`TTS table-layout text GUID collision: ${guid}.`);
    used.add(guid.toLowerCase());
    return makeTableText(definition, guid);
  });
}

function makePrivateParkingZone(side, guid) {
  return {
    Name: 'FogOfWarTrigger',
    Transform: parkingHiddenZoneTransform(side),
    Nickname: `${side} Private Hand Parking`,
    Description: 'Private tabletop parking for cards moved out of the Reserve hand',
    GMNotes: `${PRIVATE_PARKING_NOTE_PREFIX}${side.toLowerCase()}`,
    ColorDiffuse: { ...TTS_ZONE_COLORS[side] },
    Locked: true,
    Grid: false,
    Snap: false,
    IgnoreFoW: false,
    MeasureMovement: false,
    DragSelectable: true,
    Autoraise: true,
    Sticky: true,
    Tooltip: true,
    GridProjection: false,
    HideWhenFaceDown: false,
    Hands: false,
    FogColor: side,
    FogHidePointers: true,
    FogReverseHiding: false,
    FogSeethrough: true,
    LuaScript: '',
    LuaScriptState: '',
    XmlUI: '',
    GUID: guid(),
  };
}

function applyHands(save, guid) {
  // Reserve uses TTS's serialized hand-zone authority. The tabletop parking
  // area is deliberately NOT a Hand zone: it is a color-owned Hidden Zone so
  // parked cards stay on the table instead of being pulled back into Reserve.
  save.ObjectStates = (save.ObjectStates || []).filter(object => (
    object?.Name !== 'HandTrigger'
    && !String(object?.GMNotes || '').startsWith(LEGACY_PRIVATE_ZONE_NOTE_PREFIX)
    && !String(object?.GMNotes || '').startsWith(LEGACY_HAND_TRIGGER_NOTE_PREFIX)
    && !String(object?.GMNotes || '').startsWith(PRIVATE_PARKING_NOTE_PREFIX)
  ));

  save.Hands = {
    Enable: true,
    DisableUnused: false,
    Hiding: 0,
    HandTransforms: ['White', 'Green'].map(side => ({
      Color: side,
      Transform: handZoneTransform(side),
    })),
  };

  save.ObjectStates.push(
    makePrivateParkingZone('White', guid),
    makePrivateParkingZone('Green', guid),
  );

  // Do not commandeer a player's camera when the save opens or when they sit.
  // Remove only the obsolete Gauntlet-generated seat-camera script if this
  // function is applied to a scaffold produced by the previous interaction model.
  if (String(save.LuaScript || '').includes('function gauntletSeatCamera(color)')) {
    save.LuaScript = '';
    save.LuaScriptState = '';
  }

  walkObjects(save.ObjectStates, object => {
    if (object?.Name === 'CardCustom') {
      object.Hands = true;
      const tags = Array.isArray(object.Tags) ? object.Tags : [];
      if (!tags.includes(TERRITORY_TAG) && !tags.includes(DEED_TAG)) addTag(object, FACTION_ZONE_TAG);
    } else if (object?.Name === 'DeckCustom') {
      object.Hands = true;
    } else if (object?.Name === 'Custom_Tile'
      && String(object.LuaScript || '').includes('gauntletTrackerRegistrations')) {
      addTag(object, FACTION_ZONE_TAG);
    }
  });
}
function applyEnvironment(save) {
  const tableUrl = String(save.TableURL || '');
  const skyUrl = String(save.SkyURL || '');
  if (!/^https:\/\//i.test(tableUrl) || !/^https:\/\//i.test(skyUrl)) {
    throw new Error('TTS environment images must already be resolved to hosted HTTPS assets by base save generation.');
  }
  if (tableUrl.includes('raw.githubusercontent.com') || skyUrl.includes('raw.githubusercontent.com')) {
    throw new Error('TTS environment images must use published release hosting, not raw branch URLs.');
  }
  save.Table = 'Table_Custom';
  save.Sky = 'Sky_Museum';
}

export function applyTableLayout(save) {
  if (!save || !Array.isArray(save.ObjectStates)) throw new Error('TTS table layout requires a save with ObjectStates.');

  save.ObjectStates = save.ObjectStates.filter(object => !String(object?.GMNotes || '').startsWith(TABLE_TEXT_NOTE_PREFIX));
  tagTerritories(save.ObjectStates);
  tagTerritoryInteractions(save.ObjectStates);
  orientStarterBagsForHost(save);
  save.VectorLines = buildTableVectorLines();
  save.SnapPoints = buildTableSnapPoints();
  save.ObjectStates.push(...buildTableTextObjects(save.ObjectStates));
  const guid = makeContinuationGuidFactory(save);
  applyHands(save, guid);
  applyEnvironment(save);

  save.Turns ||= {};
  save.Turns.TurnColor = 'White';

  for (const field of ['Note', 'Rules']) {
    const current = String(save[field] || '').trim();
    const paragraphs = current
      .split(/\n\s*\n/u)
      .filter(paragraph => !paragraph.startsWith('Gauntlet TTS table layout:'));
    save[field] = [...paragraphs, TABLE_LAYOUT_NOTE].filter(Boolean).join('\n\n').trim();
  }

  return {
    save,
    vectorLineCount: save.VectorLines.length,
    snapPointCount: save.SnapPoints.length,
    textObjectCount: save.ObjectStates.filter(object => String(object?.GMNotes || '').startsWith(TABLE_TEXT_NOTE_PREFIX)).length,
  };
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const release = await resolveCurrentTtsRelease();
  if (checkOnly) {
    const lines = buildTableVectorLines();
    const snaps = buildTableSnapPoints();
    const text = buildTableTextObjects([]);
    if (lines.length !== 38) throw new Error(`Expected 38 visible table-marking vector lines; found ${lines.length}.`);
    if (snaps.length !== 108) throw new Error(`Expected 108 functional table snaps; found ${snaps.length}.`);
    if (text.length !== 32) throw new Error(`Expected 32 visible table labels/shadows; found ${text.length}.`);
    if (!text.some(object => object.Text?.Text === 'Private / Hand')) throw new Error('Visible private Hand parking guide label is missing.');
    if (text.filter(object => object.Text?.Text === 'Gambits').length !== 4
      || text.filter(object => object.Text?.Text === 'Tactics').length !== 4) {
      throw new Error('Battle Zone Gambit/Tactic labels are incomplete.');
    }
    if (snaps.some(point => Number(point.Position?.y) !== 0)) throw new Error('Global table snap points must remain on the y=0 plane.');
    const territory = snaps.filter(point => point.Tags?.includes(TERRITORY_TAG));
    const deeds = snaps.filter(point => point.Tags?.includes(DEED_TAG));
    const faction = snaps.filter(point => point.Tags?.includes(FACTION_ZONE_TAG));
    if (territory.length !== 8) throw new Error(`Expected 8 Territory snaps; found ${territory.length}.`);
    if (territory.some(point => point.Rotation !== undefined)) throw new Error('Territory snaps must constrain position only; rotation indicates control.');
    if (deeds.length !== 16) throw new Error(`Expected 16 Deed snaps; found ${deeds.length}.`);
    if (deeds.some(point => point.Rotation !== undefined)) throw new Error('Deed snaps must constrain position only; rotation indicates ownership.');
    if (faction.length !== 24) throw new Error(`Expected 24 faction-zone card snaps; found ${faction.length}.`);
    console.log(`Current TTS table-layout source check passed for ${release.version}: ${lines.length} visible outline lines, ${snaps.length} functional snaps, ${text.length} labels/shadows.`);
    return;
  }

  const versionedName = `Gauntlet_${release.version}_TTS_Review_Scaffold.json`;
  const versionedPath = join(release.outputRoot, versionedName);
  const save = JSON.parse(await readFile(versionedPath, 'utf8').catch(error => {
    if (error.code === 'ENOENT') throw new Error('TTS table layout requires the generated review scaffold. Run npm run tts:save:base first.');
    throw error;
  }));

  const result = applyTableLayout(save);
  const text = jsonText(result.save);
  await writeFile(versionedPath, text);
  await writeFile(join(CURRENT_ALIAS_ROOT, 'Gauntlet_TTS_Review_Scaffold.json'), text);
  console.log(`Applied authoritative table layout to ${relative(ROOT, versionedPath)}: ${result.vectorLineCount} visible outline lines, ${result.snapPointCount} snaps, ${result.textObjectCount} labels.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
