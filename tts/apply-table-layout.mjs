import { readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from '../scripts/tts-current-catalog.mjs';

const TABLE_LAYOUT_NOTE = 'Table markings: each player has a compact Leader + Tracker(s) workspace, Draw Pile, Discard Pile, Graveyard, a temporary Hand set-down area, an eight-slot Asset Bank, and a flexible twelve-snap Faction Zone. The Faction Zone is intentionally generic: it can hold Financier Treasury cards, ratified Diplomat Treaty Articles, Mystic Rites and Ritual material, Intelligence Operation components, Inquisition Doctrine/Purge components, or other public faction state. The hidden TTS hand zone remains the private Reserve area during battle. The Gauntlet has six primary Territory snaps plus two faint end positions for the eight-Territory Manifest Destiny configuration. Deed snaps remain intentionally unmarked beside every possible Territory position.';
const TABLE_TEXT_NOTE_PREFIX = 'gauntlet:table-layout:';
const TERRITORY_TAG = 'gauntlet-territory';
const DEED_TAG = 'gauntlet-deed';

const PRIMARY_TERRITORY_Z = Object.freeze([-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]);
const EXPANSION_TERRITORY_Z = Object.freeze([-10.5, 10.5]);
const ALL_TERRITORY_Z = Object.freeze([...EXPANSION_TERRITORY_Z.slice(0, 1), ...PRIMARY_TERRITORY_Z, ...EXPANSION_TERRITORY_Z.slice(1)]);
const DEED_X = Object.freeze([-4.1, 4.1]);

const TABLE_MARK_Y = 1.01;
const TERRITORY_SLOT_WIDTH = 3.8;
const TERRITORY_SLOT_DEPTH = 2.75;
const LABEL_GAP = 0.30;

const OUTLINE_SHADOW_COLOR = Object.freeze({ r: 0.12, g: 0.085, b: 0.055 });
const OUTLINE_COLOR = Object.freeze({ r: 0.79, g: 0.65, b: 0.38 });
const SECONDARY_OUTLINE_COLOR = Object.freeze({ r: 0.48, g: 0.40, b: 0.27 });
const LABEL_SHADOW_COLOR = Object.freeze({ r: 0.10, g: 0.07, b: 0.045 });
const LABEL_COLOR = Object.freeze({ r: 0.96, g: 0.88, b: 0.68 });

// Coordinates are authored from the Red player's perspective, then rotated
// 180 degrees for Blue. Zones are sized around actual card footprints instead
// of equal-width decorative boxes.
const PLAYER_ZONES = Object.freeze([
  { id: 'leader-trackers', label: 'Leader + Tracker(s)', x: -11.2, z: -14.1, width: 7.6, depth: 4.2, fontSize: 27, textScale: 0.25, snapLayout: 'leader' },
  { id: 'draw', label: 'Draw Pile', x: -5.3, z: -14.1, width: 2.9, depth: 4.2, fontSize: 28, textScale: 0.25, snapLayout: 'pile' },
  { id: 'discard', label: 'Discard Pile', x: -2.1, z: -14.1, width: 2.9, depth: 4.2, fontSize: 27, textScale: 0.24, snapLayout: 'pile' },
  { id: 'graveyard', label: 'Graveyard', x: 1.1, z: -14.1, width: 2.9, depth: 4.2, fontSize: 27, textScale: 0.24, snapLayout: 'pile' },
  { id: 'hand', label: 'Hand', x: 7.7, z: -14.1, width: 9.6, depth: 4.2, fontSize: 30, textScale: 0.27, snapLayout: 'hand' },
  { id: 'asset-bank', label: 'Asset Bank', x: -10.2, z: -8.0, width: 8.6, depth: 7.2, fontSize: 29, textScale: 0.26, snapLayout: 'assets' },
  { id: 'faction-zone', label: 'Faction Zone', x: 10.0, z: -7.2, width: 8.6, depth: 9.0, fontSize: 29, textScale: 0.26, snapLayout: 'faction' },
]);

function color(r = 1, g = 1, b = 1) {
  return { r, g, b };
}

function vector(x = 0, y = 0, z = 0) {
  return { x, y, z };
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

function outlinedRectangle(x, z, width, depth, foreground = OUTLINE_COLOR, secondary = false) {
  const shadowThickness = secondary ? 0.075 : 0.105;
  const foregroundThickness = secondary ? 0.032 : 0.048;
  return [
    rectangleLine(x, z, width, depth, OUTLINE_SHADOW_COLOR, shadowThickness, TABLE_MARK_Y - 0.006),
    rectangleLine(x, z, width, depth, foreground, foregroundThickness, TABLE_MARK_Y + 0.006),
  ];
}

function generatedTextGuid(index) {
  return `zt${index.toString(36).padStart(4, '0')}`.slice(-6);
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

function tagTerritories(objects) {
  for (const object of objects || []) {
    const description = String(object?.Description || '');
    if (object?.Name === 'CardCustom' && /Territory$/u.test(description)) addTag(object, TERRITORY_TAG);
    tagTerritories(object?.ContainedObjects);
  }
}

function makeTableText({ id, label, x, z, rotationY, fontSize, scale, shadow = false }, guid) {
  const sideOffset = rotationY === 180 ? -0.035 : 0.035;
  return {
    Name: '3DText',
    Transform: flatTextTransform(
      x + (shadow ? sideOffset : 0),
      z + (shadow ? sideOffset : 0),
      rotationY,
      scale,
      TABLE_MARK_Y + (shadow ? -0.003 : 0.003),
    ),
    Nickname: '',
    Description: '',
    GMNotes: `${TABLE_TEXT_NOTE_PREFIX}${id}:${shadow ? 'shadow' : 'label'}`,
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
      Text: label,
      colorstate: { ...(shadow ? LABEL_SHADOW_COLOR : LABEL_COLOR) },
      fontSize: shadow ? fontSize + 1 : fontSize,
    },
    LuaScript: '',
    LuaScriptState: '',
    XmlUI: '',
    GUID: guid,
  };
}

function playerZone(side, zone) {
  const north = side === 'Blue';
  const sign = north ? -1 : 1;
  const x = zone.x * sign;
  const z = zone.z * sign;
  return {
    ...zone,
    id: `${side.toLowerCase()}-${zone.id}`,
    x,
    z,
    rotationY: north ? 180 : 0,
    labelX: x,
    labelZ: z + (north ? 1 : -1) * (zone.depth / 2 + LABEL_GAP),
  };
}

function playerFacingCardRotation(side) {
  // CardCustom's zero-degree image orientation is opposite the table-text
  // convention used by the zone labels.
  return side === 'Blue' ? 0 : 180;
}

function pointInPlayerZone(side, zone, offsetX = 0, offsetZ = 0) {
  const north = side === 'Blue';
  const sign = north ? -1 : 1;
  return vector((zone.x + offsetX) * sign, 1, (zone.z + offsetZ) * sign);
}

function snap(position, rotationY, tags = null) {
  const point = {
    Position: position,
    Rotation: vector(0, rotationY, 0),
  };
  if (tags?.length) point.Tags = tags;
  return point;
}

function zoneSnapOffsets(layout) {
  if (layout === 'leader') return [
    [-2.55, 0],
    [0, 0],
    [2.55, 0],
  ];
  if (layout === 'pile') return [[0, 0]];
  if (layout === 'hand') return [
    [-3.40, 0],
    [-1.70, 0],
    [0, 0],
    [1.70, 0],
    [3.40, 0],
  ];
  if (layout === 'assets') {
    const offsets = [];
    for (const z of [-1.65, 1.65]) {
      for (const x of [-2.90, -0.97, 0.97, 2.90]) offsets.push([x, z]);
    }
    return offsets;
  }
  if (layout === 'faction') {
    const offsets = [];
    for (const z of [-2.80, 0, 2.80]) {
      for (const x of [-2.90, -0.97, 0.97, 2.90]) offsets.push([x, z]);
    }
    return offsets;
  }
  return [];
}

export function buildTableVectorLines() {
  const lines = [];
  for (const side of ['Red', 'Blue']) {
    for (const zone of PLAYER_ZONES) {
      const placed = playerZone(side, zone);
      lines.push(...outlinedRectangle(placed.x, placed.z, placed.width, placed.depth));
    }
  }

  for (const z of PRIMARY_TERRITORY_Z) {
    lines.push(...outlinedRectangle(0, z, TERRITORY_SLOT_WIDTH, TERRITORY_SLOT_DEPTH));
  }
  for (const z of EXPANSION_TERRITORY_Z) {
    lines.push(...outlinedRectangle(0, z, TERRITORY_SLOT_WIDTH, TERRITORY_SLOT_DEPTH, SECONDARY_OUTLINE_COLOR, true));
  }
  return lines;
}

export function buildTableSnapPoints() {
  const snaps = [];

  for (const z of ALL_TERRITORY_Z) {
    snaps.push(snap(vector(0, 1, z), 90, [TERRITORY_TAG]));
  }

  // Deed positions are intentionally invisible. They are tagged so ordinary
  // cards and player pieces do not compete with the Deed magnets beside the
  // Territory row.
  for (const z of ALL_TERRITORY_Z) {
    for (const x of DEED_X) snaps.push(snap(vector(x, 1, z), 90, [DEED_TAG]));
  }

  for (const side of ['Red', 'Blue']) {
    const rotation = playerFacingCardRotation(side);
    for (const zone of PLAYER_ZONES) {
      for (const [offsetX, offsetZ] of zoneSnapOffsets(zone.snapLayout)) {
        snaps.push(snap(pointInPlayerZone(side, zone, offsetX, offsetZ), rotation));
      }
    }
  }

  return snaps;
}

export function buildTableTextObjects(existingObjects = []) {
  const used = collectGuids(existingObjects);
  const definitions = [];
  for (const side of ['Red', 'Blue']) {
    for (const zone of PLAYER_ZONES) {
      const placed = playerZone(side, zone);
      definitions.push({
        ...placed,
        x: placed.labelX,
        z: placed.labelZ,
        scale: placed.textScale,
        shadow: true,
      });
      definitions.push({
        ...placed,
        x: placed.labelX,
        z: placed.labelZ,
        scale: placed.textScale,
        shadow: false,
      });
    }
  }

  return definitions.map((definition, index) => {
    const guid = generatedTextGuid(index + 1);
    if (used.has(guid.toLowerCase())) throw new Error(`TTS table-layout text GUID collision: ${guid}.`);
    used.add(guid.toLowerCase());
    return makeTableText(definition, guid);
  });
}

function repositionUtilityObjects(save) {
  const positions = new Map([
    ['Red Battle Die', { x: -5.2, z: -10.4, rotation: 0 }],
    ['Red Player Token', { x: -6.8, z: -10.4, rotation: 0 }],
    ['Blue Battle Die', { x: 5.2, z: 10.4, rotation: 180 }],
    ['Blue Player Token', { x: 6.8, z: 10.4, rotation: 180 }],
  ]);

  for (const object of save.ObjectStates || []) {
    const target = positions.get(object?.Nickname);
    if (!target || !object.Transform) continue;
    object.Transform.posX = target.x;
    object.Transform.posZ = target.z;
    object.Transform.rotY = target.rotation;
  }
}

export function applyTableLayout(save) {
  if (!save || !Array.isArray(save.ObjectStates)) throw new Error('TTS table layout requires a save with ObjectStates.');

  save.ObjectStates = save.ObjectStates.filter(
    object => !String(object?.GMNotes || '').startsWith(TABLE_TEXT_NOTE_PREFIX),
  );
  tagTerritories(save.ObjectStates);
  save.VectorLines = buildTableVectorLines();
  save.SnapPoints = buildTableSnapPoints();
  save.ObjectStates.push(...buildTableTextObjects(save.ObjectStates));
  repositionUtilityObjects(save);

  for (const field of ['Note', 'Rules']) {
    const current = String(save[field] || '').trim();
    if (!current.includes(TABLE_LAYOUT_NOTE)) save[field] = `${current}\n\n${TABLE_LAYOUT_NOTE}`.trim();
  }

  return {
    save,
    vectorLineCount: save.VectorLines.length,
    snapPointCount: save.SnapPoints.length,
    textObjectCount: save.ObjectStates.filter(
      object => String(object?.GMNotes || '').startsWith(TABLE_TEXT_NOTE_PREFIX),
    ).length,
  };
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const release = await resolveCurrentTtsRelease();
  if (checkOnly) {
    const lines = buildTableVectorLines();
    const snaps = buildTableSnapPoints();
    if (lines.length !== 44) throw new Error(`Expected 44 generated table-marking vector lines; found ${lines.length}.`);
    if (snaps.length !== 86) throw new Error(`Expected 86 generated table snap points; found ${snaps.length}.`);
    console.log(`Current TTS table-layout source check passed for ${release.version}: ${lines.length} high-contrast outline lines and ${snaps.length} functional snap points.`);
    return;
  }

  const versionedName = `Gauntlet_${release.version}_TTS_Review_Scaffold.json`;
  const versionedPath = join(release.outputRoot, versionedName);
  const save = JSON.parse(await readFile(versionedPath, 'utf8').catch(error => {
    if (error.code === 'ENOENT') throw new Error('TTS table layout requires the generated review scaffold. Run npm run tts:save:base first.');
    throw error;
  }));

  const result = applyTableLayout(save);
  const text = `${JSON.stringify(result.save, null, 2)}\n`;
  await writeFile(versionedPath, text);
  await writeFile(join(CURRENT_ALIAS_ROOT, 'Gauntlet_TTS_Review_Scaffold.json'), text);
  console.log(`Applied ${result.vectorLineCount} table-outline lines, ${result.snapPointCount} snap points, and ${result.textObjectCount} locked edge labels to ${relative(ROOT, versionedPath)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
