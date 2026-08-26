import { readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from '../scripts/tts-current-catalog.mjs';

const TABLE_URL = 'https://raw.githubusercontent.com/tymonius/Gauntlet/release/v0.7.0-cutover/tts/assets/environment/campaign-map-table.jpg';
const SKY_URL = 'https://raw.githubusercontent.com/tymonius/Gauntlet/release/v0.7.0-cutover/tts/assets/environment/command-tent-panorama.jpg';

const TABLE_LAYOUT_NOTE = 'Gauntlet TTS table layout: White sits south and Green north. Each player has Leader & References, Draw, Discard, Graveyard, Asset Bank, Faction Zone, and a visible one-card Hand parking area. The outward Reserve is the player\'s actual TTS Hand zone. The tabletop Hand parking area is a separate player-private Hidden Zone so a card can be parked physically on the table without returning to the Reserve hand. Asset Bank provides seven portrait positions; Faction Zone provides twelve compact portrait positions. Territory snaps constrain position only so players can rotate Territories freely to show control; Deed snaps remain landscape rotation snaps beside every possible Territory.';
const TABLE_TEXT_NOTE_PREFIX = 'gauntlet:table-layout:';
const LEGACY_PRIVATE_ZONE_NOTE_PREFIX = 'gauntlet:private-zone:';
const LEGACY_HAND_TRIGGER_NOTE_PREFIX = 'gauntlet:hand-trigger:';
const PRIVATE_PARKING_NOTE_PREFIX = 'gauntlet:private-parking:';
const TERRITORY_TAG = 'gauntlet-territory';
const DEED_TAG = 'gauntlet-deed';
const FACTION_ZONE_TAG = 'gauntlet-faction-zone';

const PRIMARY_TERRITORY_Z = Object.freeze([-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]);
const EXPANSION_TERRITORY_Z = Object.freeze([-10.5, 10.5]);
const ALL_TERRITORY_Z = Object.freeze([EXPANSION_TERRITORY_Z[0], ...PRIMARY_TERRITORY_Z, EXPANSION_TERRITORY_Z[1]]);
const DEED_X = Object.freeze([-4.35, 4.35]);

const TABLE_MARK_Y = 1.01;
const TERRITORY_SLOT_WIDTH = 3.8;
const TERRITORY_SLOT_DEPTH = 2.75;
const LABEL_GAP = 0.34;

const OUTLINE_SHADOW_COLOR = Object.freeze({ r: 0.12, g: 0.085, b: 0.055 });
const OUTLINE_COLOR = Object.freeze({ r: 0.83, g: 0.69, b: 0.40 });
const LABEL_SHADOW_COLOR = Object.freeze({ r: 0.08, g: 0.055, b: 0.035 });
const LABEL_COLOR = Object.freeze({ r: 0.99, g: 0.91, b: 0.70 });

const TERRITORY_FLIP_SCRIPT = [
  '-- Territory cards rotate around Y to show control, so their face/back flip',
  '-- must use the orthogonal local X axis without changing that control spin.',
  'function tryRotate(spin, flip, player_color, old_spin, old_flip)',
  '  if flip ~= old_flip then',
  '    self.setRotationSmooth({x = flip, y = spin, z = 0}, false, false)',
  '    return false',
  '  end',
  '  return true',
  'end',
].join('\\n');
// Player workspaces are mirrored across the center line. These definitions own
// both the visible guides and their functional snap positions.
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

// The Reserve is the actual TTS Hand zone and sits fully outside the visible
// tabletop parking rectangle. Parking itself is a Hidden Zone so cards remain
// physical tabletop objects while concealed from the opponent.
const HAND_RESERVE_EXTENSION = 4.0;
const HAND_RESERVE_GAP = 0.25;
const HAND_ZONE_WIDTH = 7.0;
const HAND_ZONE_HEIGHT = 6.0;
const PARKING_ZONE_HEIGHT = 5.0;
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
    // Keep Territories at their natural local rotation in starter bags. The
    // board snap constrains only position; players retain Y rotation to show
    // control. A small object script intercepts only face/back flips and rotates
    // around local X, leaving the control spin untouched.
    object.Transform.rotX = 0;
    object.Transform.rotY = 0;
    object.Transform.rotZ = 0;
    object.Transform.scaleX = 1;
    object.Transform.scaleY = 1;
    object.Transform.scaleZ = 1;
    object.LuaScript = TERRITORY_FLIP_SCRIPT;
    object.LuaScriptState = '';
  });
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
  const mirror = side === 'Green' ? -1 : 1;
  const x = zone.x * mirror;
  const z = zone.z * mirror;
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

function playerFacingCardRotation(side) {
  // Native TTS convention: the south seat faces north at 0 degrees; the
  // mirrored north seat faces south at 180 degrees.
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
    playerFacingCardRotation(side),
    HAND_ZONE_WIDTH,
    HAND_ZONE_HEIGHT,
    HAND_RESERVE_EXTENSION,
  );
}

export function parkingHiddenZoneTransform(side) {
  const parking = handParkingDefinition();
  const north = side === 'Green';
  return transform(
    0,
    2.5,
    north ? Math.abs(parking.z) : -Math.abs(parking.z),
    playerFacingCardRotation(side),
    parking.width,
    PARKING_ZONE_HEIGHT,
    parking.depth,
  );
}

function pointInPlayerZone(side, zone, offsetX = 0, offsetZ = 0) {
  const mirror = side === 'Green' ? -1 : 1;
  return vector((zone.x + offsetX) * mirror, 0, (zone.z + offsetZ) * mirror);
}

function snap(position, rotationY = null, tags = null) {
  const point = { Position: position };
  if (rotationY !== null) point.Rotation = vector(0, rotationY, 0);
  if (tags?.length) point.Tags = tags;
  return point;
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

export function buildTableVectorLines() {
  const lines = [];
  for (const side of ['White', 'Green']) {
    for (const zone of PLAYER_ZONES) {
      const placed = playerZone(side, zone);
      lines.push(...outlinedRectangle(placed.x, placed.z, placed.width, placed.depth));
    }
  }
  // Manifest Destiny positions remain functional but invisible until needed.
  for (const z of PRIMARY_TERRITORY_Z) lines.push(...outlinedRectangle(0, z, TERRITORY_SLOT_WIDTH, TERRITORY_SLOT_DEPTH));
  return lines;
}

export function buildTableSnapPoints() {
  const points = [];
  for (const z of ALL_TERRITORY_Z) points.push(snap(vector(0, 0, z), null, [TERRITORY_TAG]));

  for (const z of ALL_TERRITORY_Z) {
    for (const x of DEED_X) points.push(snap(vector(x, 0, z), 90, [DEED_TAG]));
  }

  for (const side of ['White', 'Green']) {
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
      } else if (zone.snapLayout === 'pile' || zone.snapLayout === 'hand') {
        points.push(snap(pointInPlayerZone(side, zone), faceRotation));
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
    }
  });
}
function applyEnvironment(save) {
  save.Table = 'Table_Custom';
  save.TableURL = TABLE_URL;
  save.Sky = 'Sky_Museum';
  save.SkyURL = SKY_URL;
}

export function applyTableLayout(save) {
  if (!save || !Array.isArray(save.ObjectStates)) throw new Error('TTS table layout requires a save with ObjectStates.');

  save.ObjectStates = save.ObjectStates.filter(object => !String(object?.GMNotes || '').startsWith(TABLE_TEXT_NOTE_PREFIX));
  tagTerritories(save.ObjectStates);
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
    if (lines.length !== 40) throw new Error(`Expected 40 visible table-marking vector lines; found ${lines.length}.`);
    if (snaps.length !== 78) throw new Error(`Expected 78 functional table snaps; found ${snaps.length}.`);
    if (text.length !== 28) throw new Error(`Expected 28 visible table labels/shadows; found ${text.length}.`);
    if (!text.some(object => object.Text?.Text === 'Hand')) throw new Error('Visible Hand parking guide label is missing.');
    if (snaps.some(point => Number(point.Position?.y) !== 0)) throw new Error('Global table snap points must remain on the y=0 plane.');
    const territory = snaps.filter(point => point.Tags?.includes(TERRITORY_TAG));
    const deeds = snaps.filter(point => point.Tags?.includes(DEED_TAG));
    const faction = snaps.filter(point => point.Tags?.includes(FACTION_ZONE_TAG));
    if (territory.length !== 8) throw new Error(`Expected 8 Territory snaps; found ${territory.length}.`);
    if (territory.some(point => point.Rotation !== undefined)) throw new Error('Territory snaps must constrain position only; rotation indicates control.');
    if (deeds.length !== 16) throw new Error(`Expected 16 Deed snaps; found ${deeds.length}.`);
    if (deeds.some(point => Number(point.Rotation?.y) !== 90)) throw new Error('Deed snap rotations must keep SidewaysCard Deeds landscape at 90 degrees.');
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
