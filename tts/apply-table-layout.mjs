import { readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from '../scripts/tts-current-catalog.mjs';

const TABLE_URL = 'https://raw.githubusercontent.com/tymonius/Gauntlet/release/v0.7.0-cutover/tts/assets/environment/campaign-map-table.jpg';
const SKY_URL = 'https://raw.githubusercontent.com/tymonius/Gauntlet/release/v0.7.0-cutover/tts/assets/environment/command-tent-panorama.jpg';

const TABLE_LAYOUT_NOTE = 'Gauntlet TTS table layout: Red sits south and Blue north. Each player has Leader & References, Draw, Discard, Graveyard, Asset Bank, Faction Zone, and an intentionally unmarked one-card Hand parking snap. The actual Red/Blue TTS Hand Zones sit behind the player workspace and provide normal private Reserve behavior. Asset Bank provides seven portrait positions; Faction Zone provides twelve compact portrait positions. The Gauntlet visibly marks six primary Territory positions; two Manifest Destiny extension snaps remain invisible. Deed snaps are invisible landscape positions beside every possible Territory.';
const TABLE_TEXT_NOTE_PREFIX = 'gauntlet:table-layout:';
const LEGACY_PRIVATE_ZONE_NOTE_PREFIX = 'gauntlet:private-zone:';
const LEGACY_HAND_TRIGGER_NOTE_PREFIX = 'gauntlet:hand-trigger:';
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
  'function onLoad()',
  '  self.use_rotation_value_flip = true',
  'end',
].join('\n');

// Player workspaces are mirrored across the center line. The Hand parking
// position remains functional but intentionally has no visible outline or label.
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
    hiddenGuide: true,
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

// HandTransforms are the canonical serialized TTS hand-zone representation.
// Do not duplicate them as HandTrigger ObjectStates: doing so creates two
// overlapping primary hands and produces unstable draw/deal behavior.
const HAND_ZONE = Object.freeze({ x: 0, z: -23.0, scaleX: 7.0, scaleY: 2.5, scaleZ: 3.0 });

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
    if (object?.Name === 'CardCustom' && /(?:Arena )?Territory$/u.test(String(object.Description || ''))) {
      addTag(object, TERRITORY_TAG);
      object.SidewaysCard = true;
      object.Transform ||= transform();
      object.Transform.rotY = 90;
      object.Transform.scaleX = 1;
      object.Transform.scaleY = 1;
      object.Transform.scaleZ = 1;
      // Territory artwork and backs remain unchanged. This switches TTS's flip
      // axis so a landscape card turns over like a landscape card.
      object.LuaScript = TERRITORY_FLIP_SCRIPT;
      object.LuaScriptState = '';
    }
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

function handZoneRotation(side) {
  // A hand zone's forward direction defines the player's seat. South/Red must
  // look toward +Z; North/Blue must look toward -Z.
  return side === 'Blue' ? 180 : 0;
}

function handZoneTransform(side) {
  const mirror = side === 'Blue' ? -1 : 1;
  return transform(
    HAND_ZONE.x * mirror,
    1.5,
    HAND_ZONE.z * mirror,
    handZoneRotation(side),
    HAND_ZONE.scaleX,
    HAND_ZONE.scaleY,
    HAND_ZONE.scaleZ,
  );
}

function pointInPlayerZone(side, zone, offsetX = 0, offsetZ = 0) {
  const mirror = side === 'Blue' ? -1 : 1;
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
  for (const side of ['Red', 'Blue']) {
    for (const zone of PLAYER_ZONES.filter(candidate => !candidate.hiddenGuide)) {
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
  for (const z of ALL_TERRITORY_Z) points.push(snap(vector(0, 0, z), 90, [TERRITORY_TAG]));

  for (const z of ALL_TERRITORY_Z) {
    for (const x of DEED_X) points.push(snap(vector(x, 0, z), 90, [DEED_TAG]));
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
  for (const side of ['Red', 'Blue']) {
    for (const zone of PLAYER_ZONES.filter(candidate => !candidate.hiddenGuide)) {
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

function makeSeatCameraLua() {
  return [
    '-- Gauntlet seat cameras: each player loads from the same end as their hand zone.',
    'function gauntletSeatCamera(color)',
    '  if color == "Red" then',
    '    Player[color].lookAt({ position = {0, 0, 0}, pitch = 55, yaw = 0, distance = 38 })',
    '  elseif color == "Blue" then',
    '    Player[color].lookAt({ position = {0, 0, 0}, pitch = 55, yaw = 180, distance = 38 })',
    '  end',
    'end',
    '',
    'function onLoad()',
    '  Wait.frames(function()',
    '    for _, color in ipairs(getSeatedPlayers()) do',
    '      gauntletSeatCamera(color)',
    '    end',
    '  end, 3)',
    'end',
    '',
    'function onPlayerChangeColor(color)',
    '  if color == "Red" or color == "Blue" then',
    '    Wait.frames(function() gauntletSeatCamera(color) end, 2)',
    '  end',
    'end',
    '',
  ].join('\n');
}

function applyHandsAndSeatCameras(save) {
  // HandTransforms are the single hand-zone authority. Remove stale serialized
  // zone objects from older QA saves instead of creating a second overlapping
  // hand representation.
  save.ObjectStates = (save.ObjectStates || []).filter(object => (
    object?.Name !== 'HandTrigger'
    && object?.Name !== 'FogOfWarTrigger'
    && !String(object?.GMNotes || '').startsWith(LEGACY_PRIVATE_ZONE_NOTE_PREFIX)
    && !String(object?.GMNotes || '').startsWith(LEGACY_HAND_TRIGGER_NOTE_PREFIX)
  ));

  save.Hands = {
    Enable: true,
    DisableUnused: false,
    Hiding: 0,
    HandTransforms: ['Red', 'Blue'].map(side => ({
      Color: side,
      Transform: handZoneTransform(side),
    })),
  };

  save.LuaScript = makeSeatCameraLua();
  save.LuaScriptState = '';

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
  applyHandsAndSeatCameras(save);
  applyEnvironment(save);

  save.Turns ||= {};
  save.Turns.TurnColor = 'Red';

  for (const field of ['Note', 'Rules']) {
    const current = String(save[field] || '').trim();
    if (!current.includes(TABLE_LAYOUT_NOTE)) save[field] = `${current}\n\n${TABLE_LAYOUT_NOTE}`.trim();
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
    if (lines.length !== 36) throw new Error(`Expected 36 visible table-marking vector lines; found ${lines.length}.`);
    if (snaps.length !== 78) throw new Error(`Expected 78 functional table snaps; found ${snaps.length}.`);
    if (snaps.some(point => Number(point.Position?.y) !== 0)) throw new Error('Global table snap points must remain on the y=0 plane.');
    const territory = snaps.filter(point => point.Tags?.includes(TERRITORY_TAG));
    const deeds = snaps.filter(point => point.Tags?.includes(DEED_TAG));
    const faction = snaps.filter(point => point.Tags?.includes(FACTION_ZONE_TAG));
    if (territory.length !== 8) throw new Error(`Expected 8 Territory snaps; found ${territory.length}.`);
    if (deeds.length !== 16) throw new Error(`Expected 16 Deed snaps; found ${deeds.length}.`);
    if (deeds.some(point => Number(point.Rotation?.y) !== 90)) throw new Error('Deed snap rotations must keep SidewaysCard Deeds landscape at 90 degrees.');
    if (faction.length !== 24) throw new Error(`Expected 24 faction-zone card snaps; found ${faction.length}.`);
    console.log(`Current TTS table-layout source check passed for ${release.version}: ${lines.length} visible outline lines and ${snaps.length} functional snaps.`);
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
