import { readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from '../scripts/tts-current-catalog.mjs';

const TABLE_LAYOUT_NOTE = 'Table markings: each player has labeled Leader + Tracker(s), Draw Pile, Discard Pile, Graveyard, Hand, Asset Bank, and Treasury areas. The marked Hand area is where you physically set down your Hand during battle before drawing Reserve; the hidden TTS hand zone remains the private Reserve area. The Gauntlet has six primary Territory snaps plus two faint end positions for the eight-Territory Manifest Destiny configuration. Deed snaps are intentionally unmarked beside every possible Territory position.';
const TABLE_TEXT_NOTE_PREFIX = 'gauntlet:table-layout:';

const PRIMARY_TERRITORY_Z = Object.freeze([-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]);
const EXPANSION_TERRITORY_Z = Object.freeze([-10.5, 10.5]);
const ALL_TERRITORY_Z = Object.freeze([...EXPANSION_TERRITORY_Z.slice(0, 1), ...PRIMARY_TERRITORY_Z, ...EXPANSION_TERRITORY_Z.slice(1)]);
const DEED_X = Object.freeze([-4.1, 4.1]);

const TABLE_MARK_Y = 1.01;
const TERRITORY_SLOT_WIDTH = 3.8;
const TERRITORY_SLOT_DEPTH = 2.75;
const PLAYER_ZONE_ROW_Z = 14.1;
const TREASURY_ROW_Z = 10.2;

const PRIMARY_LINE_COLOR = Object.freeze({ r: 0.58, g: 0.46, b: 0.25 });
const SECONDARY_LINE_COLOR = Object.freeze({ r: 0.34, g: 0.29, b: 0.21 });
const TEXT_COLOR = Object.freeze({ r: 0.68, g: 0.57, b: 0.34 });

const PLAYER_ZONES = Object.freeze([
  { id: 'leader-trackers', label: 'Leader + Tracker(s)', x: -12.2, width: 7.4, depth: 3.8, fontSize: 38, textScale: 0.44 },
  { id: 'draw', label: 'Draw Pile', x: -6.7, width: 2.8, depth: 3.8, fontSize: 34, textScale: 0.38, snap: true },
  { id: 'discard', label: 'Discard Pile', x: -3.6, width: 2.8, depth: 3.8, fontSize: 32, textScale: 0.36, snap: true },
  { id: 'graveyard', label: 'Graveyard', x: -0.5, width: 2.8, depth: 3.8, fontSize: 31, textScale: 0.35, snap: true },
  { id: 'hand', label: 'Hand', x: 3.8, width: 6.2, depth: 3.8, fontSize: 38, textScale: 0.44 },
  { id: 'asset-bank', label: 'Asset Bank', x: 11.3, width: 7.6, depth: 3.8, fontSize: 36, textScale: 0.42 },
]);

const TREASURY_ZONE = Object.freeze({
  id: 'treasury',
  label: 'Treasury',
  x: 10.5,
  width: 5.5,
  depth: 3.0,
  fontSize: 34,
  textScale: 0.40,
});

function color(r = 1, g = 1, b = 1) {
  return { r, g, b };
}

function vector(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function flatTextTransform(x, z, rotationY, scale) {
  return {
    posX: x,
    posY: TABLE_MARK_Y,
    posZ: z,
    rotX: 90,
    rotY: rotationY,
    rotZ: 0,
    scaleX: scale,
    scaleY: scale,
    scaleZ: scale,
  };
}

function rectangleLine(x, z, width, depth, lineColor = PRIMARY_LINE_COLOR, thickness = 0.055) {
  const halfWidth = width / 2;
  const halfDepth = depth / 2;
  return {
    points3: [
      vector(x - halfWidth, TABLE_MARK_Y, z - halfDepth),
      vector(x + halfWidth, TABLE_MARK_Y, z - halfDepth),
      vector(x + halfWidth, TABLE_MARK_Y, z + halfDepth),
      vector(x - halfWidth, TABLE_MARK_Y, z + halfDepth),
    ],
    color: { ...lineColor },
    thickness,
    rotation: vector(0, 0, 0),
    loop: true,
    square: true,
  };
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

function makeTableText({ id, label, x, z, rotationY, fontSize, scale }, guid) {
  return {
    Name: '3DText',
    Transform: flatTextTransform(x, z, rotationY, scale),
    Nickname: '',
    Description: '',
    GMNotes: `${TABLE_TEXT_NOTE_PREFIX}${id}`,
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
      colorstate: { ...TEXT_COLOR },
      fontSize,
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
  return {
    ...zone,
    id: `${side.toLowerCase()}-${zone.id}`,
    x: zone.x * sign,
    z: PLAYER_ZONE_ROW_Z * (north ? 1 : -1),
    rotationY: north ? 180 : 0,
  };
}

function treasuryZone(side) {
  const north = side === 'Blue';
  const sign = north ? -1 : 1;
  return {
    ...TREASURY_ZONE,
    id: `${side.toLowerCase()}-${TREASURY_ZONE.id}`,
    x: TREASURY_ZONE.x * sign,
    z: TREASURY_ROW_Z * (north ? 1 : -1),
    rotationY: north ? 180 : 0,
  };
}

export function buildTableVectorLines() {
  const lines = [];
  for (const side of ['Red', 'Blue']) {
    for (const zone of PLAYER_ZONES) {
      const placed = playerZone(side, zone);
      lines.push(rectangleLine(placed.x, placed.z, placed.width, placed.depth));
    }
    const treasury = treasuryZone(side);
    lines.push(rectangleLine(treasury.x, treasury.z, treasury.width, treasury.depth));
  }

  for (const z of PRIMARY_TERRITORY_Z) {
    lines.push(rectangleLine(0, z, TERRITORY_SLOT_WIDTH, TERRITORY_SLOT_DEPTH, PRIMARY_LINE_COLOR, 0.065));
  }
  for (const z of EXPANSION_TERRITORY_Z) {
    lines.push(rectangleLine(0, z, TERRITORY_SLOT_WIDTH, TERRITORY_SLOT_DEPTH, SECONDARY_LINE_COLOR, 0.04));
  }
  return lines;
}

export function buildTableSnapPoints() {
  const snaps = [];

  // Territories are ordinary card-size objects rotated landscape on the table.
  for (const z of ALL_TERRITORY_Z) {
    snaps.push({ Position: vector(0, 1, z), Rotation: vector(0, 90, 0) });
  }

  // Deeds are intentionally unmarked. Two positions beside each possible
  // Territory let placement communicate ownership in a Financier mirror.
  for (const z of ALL_TERRITORY_Z) {
    for (const x of DEED_X) {
      snaps.push({ Position: vector(x, 1, z), Rotation: vector(0, 90, 0) });
    }
  }

  // Draw, Discard, and Graveyard are stack zones; snapping helps keep them tidy.
  for (const side of ['Red', 'Blue']) {
    for (const zone of PLAYER_ZONES.filter(item => item.snap)) {
      const placed = playerZone(side, zone);
      snaps.push({
        Position: vector(placed.x, 1, placed.z),
        Rotation: vector(0, side === 'Blue' ? 180 : 0, 0),
      });
    }
  }

  return snaps;
}

export function buildTableTextObjects(existingObjects = []) {
  const used = collectGuids(existingObjects);
  const definitions = [];
  for (const side of ['Red', 'Blue']) {
    for (const zone of PLAYER_ZONES) definitions.push(playerZone(side, zone));
    definitions.push(treasuryZone(side));
  }

  return definitions.map((definition, index) => {
    const guid = generatedTextGuid(index + 1);
    if (used.has(guid.toLowerCase())) throw new Error(`TTS table-layout text GUID collision: ${guid}.`);
    used.add(guid.toLowerCase());
    return makeTableText({
      ...definition,
      scale: definition.textScale,
    }, guid);
  });
}

function repositionUtilityObjects(save) {
  const positions = new Map([
    ['Red Battle Die', { x: -7.0, z: -10.4, rotation: 0 }],
    ['Red Player Token', { x: -5.0, z: -10.4, rotation: 0 }],
    ['Blue Battle Die', { x: 7.0, z: 10.4, rotation: 180 }],
    ['Blue Player Token', { x: 5.0, z: 10.4, rotation: 180 }],
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
    if (lines.length !== 22) throw new Error(`Expected 22 generated table-marking vector lines; found ${lines.length}.`);
    if (snaps.length !== 30) throw new Error(`Expected 30 generated table snap points; found ${snaps.length}.`);
    console.log(`Current TTS table-layout source check passed for ${release.version}: ${lines.length} marked outlines and ${snaps.length} snap points.`);
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
  console.log(`Applied ${result.vectorLineCount} table markings, ${result.snapPointCount} snap points, and ${result.textObjectCount} locked zone labels to ${relative(ROOT, versionedPath)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
