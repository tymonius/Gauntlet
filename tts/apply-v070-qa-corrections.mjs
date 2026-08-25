import { readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from '../scripts/tts-current-catalog.mjs';

const TABLE_TEXT_NOTE_PREFIX = 'gauntlet:table-layout:';
const SUPPLEMENTAL_GUID_NOTE_PREFIX = 'gauntlet:supplemental:';
const TERRITORY_TAG = 'gauntlet-territory';
const DEED_TAG = 'gauntlet-deed';
const TRACKER_TABLETOP_SCALE = 1.5;

const TABLE_URL = 'https://raw.githubusercontent.com/tymonius/Gauntlet/release/v0.7.0-cutover/tts/assets/environment/campaign-map-table.jpg';
const SKY_URL = 'https://raw.githubusercontent.com/tymonius/Gauntlet/release/v0.7.0-cutover/tts/assets/environment/command-tent-panorama.jpg';

const PRIMARY_TERRITORY_Z = Object.freeze([-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]);
const EXPANSION_TERRITORY_Z = Object.freeze([-10.5, 10.5]);
const ALL_TERRITORY_Z = Object.freeze([-10.5, ...PRIMARY_TERRITORY_Z, 10.5]);
const DEED_X = Object.freeze([-4.35, 4.35]);

const TABLE_MARK_Y = 1.01;
const TERRITORY_SLOT_WIDTH = 3.8;
const TERRITORY_SLOT_DEPTH = 2.75;
const LABEL_GAP = 0.34;

const OUTLINE_SHADOW_COLOR = Object.freeze({ r: 0.12, g: 0.085, b: 0.055 });
const OUTLINE_COLOR = Object.freeze({ r: 0.83, g: 0.69, b: 0.40 });
const SECONDARY_OUTLINE_COLOR = Object.freeze({ r: 0.49, g: 0.41, b: 0.28 });
const LABEL_SHADOW_COLOR = Object.freeze({ r: 0.08, g: 0.055, b: 0.035 });
const LABEL_COLOR = Object.freeze({ r: 0.99, g: 0.91, b: 0.70 });

/* Coordinates are authored from the Red player's perspective and mirrored for
   Blue. The upper row is sized around actual card footprints. The Leader area
   deliberately has four card stations because Financiers and Intelligence can
   require the largest public Leader/reference assemblies. */
const PLAYER_ZONES = Object.freeze([
  { id: 'leader-trackers', label: 'Leader + Tracker(s)', x: -12.5, z: -14.1, width: 11.0, depth: 4.4, fontSize: 30, textScale: 0.27, snapLayout: 'leader' },
  { id: 'draw', label: 'Draw Pile', x: -5.2, z: -14.1, width: 2.9, depth: 4.4, fontSize: 29, textScale: 0.26, snapLayout: 'pile' },
  { id: 'discard', label: 'Discard Pile', x: -1.9, z: -14.1, width: 2.9, depth: 4.4, fontSize: 28, textScale: 0.25, snapLayout: 'pile' },
  { id: 'graveyard', label: 'Graveyard', x: 1.4, z: -14.1, width: 2.9, depth: 4.4, fontSize: 28, textScale: 0.25, snapLayout: 'pile' },
  { id: 'hand', label: 'Hand', x: 8.4, z: -14.1, width: 10.4, depth: 4.4, fontSize: 31, textScale: 0.28, snapLayout: 'hand' },
  { id: 'asset-bank', label: 'Asset Bank', x: -12.5, z: -6.9, width: 9.6, depth: 8.0, fontSize: 30, textScale: 0.27, snapLayout: 'assets' },
  { id: 'faction-zone', label: 'Faction Zone', x: 12.2, z: -6.7, width: 10.2, depth: 9.2, fontSize: 30, textScale: 0.27, snapLayout: 'faction' },
]);

const FACTION_COLORS = Object.freeze({
  military: { r: 0.620, g: 0.149, b: 0.173 },
  diplomats: { r: 0.149, g: 0.310, b: 0.569 },
  financiers: { r: 0.133, g: 0.439, b: 0.267 },
  intelligence: { r: 0.157, g: 0.157, b: 0.153 },
  mystics: { r: 0.365, g: 0.204, b: 0.494 },
  inquisition: { r: 0.651, g: 0.478, b: 0.153 },
});

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function color(r = 1, g = 1, b = 1) {
  return { r, g, b };
}

function vector(x = 0, y = 0, z = 0) {
  return { x, y, z };
}

function walkObjects(objects, visit) {
  for (const object of objects || []) {
    visit(object);
    walkObjects(object?.ContainedObjects, visit);
  }
}

function addTag(object, tag) {
  const tags = new Set(Array.isArray(object?.Tags) ? object.Tags : []);
  tags.add(tag);
  object.Tags = [...tags].sort();
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
  return [
    rectangleLine(x, z, width, depth, OUTLINE_SHADOW_COLOR, secondary ? 0.075 : 0.105, TABLE_MARK_Y - 0.006),
    rectangleLine(x, z, width, depth, foreground, secondary ? 0.032 : 0.048, TABLE_MARK_Y + 0.006),
  ];
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
  return side === 'Blue' ? 0 : 180;
}

function pointInPlayerZone(side, zone, offsetX = 0, offsetZ = 0) {
  const sign = side === 'Blue' ? -1 : 1;
  return vector((zone.x + offsetX) * sign, 0, (zone.z + offsetZ) * sign);
}

function snap(position, rotationY, tags = null) {
  const result = { Position: position, Rotation: vector(0, rotationY, 0) };
  if (tags?.length) result.Tags = tags;
  return result;
}

function zoneSnapOffsets(layout) {
  if (layout === 'leader') return [
    [-3.75, 0],
    [-1.25, 0],
    [1.25, 0],
    [3.75, 0],
  ];
  if (layout === 'pile') return [[0, 0]];
  if (layout === 'hand') return [
    [-3.55, 0],
    [-1.78, 0],
    [0, 0],
    [1.78, 0],
    [3.55, 0],
  ];
  if (layout === 'assets') {
    const offsets = [];
    for (const z of [-1.70, 1.70]) {
      for (const x of [-3.00, -1.00, 1.00, 3.00]) offsets.push([x, z]);
    }
    return offsets;
  }
  if (layout === 'faction') {
    const offsets = [];
    for (const z of [-2.80, 0, 2.80]) {
      for (const x of [-3.15, -1.05, 1.05, 3.15]) offsets.push([x, z]);
    }
    return offsets;
  }
  return [];
}

function buildVectorLines() {
  const lines = [];
  for (const side of ['Red', 'Blue']) {
    for (const zone of PLAYER_ZONES) {
      const placed = playerZone(side, zone);
      lines.push(...outlinedRectangle(placed.x, placed.z, placed.width, placed.depth));
    }
  }
  for (const z of PRIMARY_TERRITORY_Z) lines.push(...outlinedRectangle(0, z, TERRITORY_SLOT_WIDTH, TERRITORY_SLOT_DEPTH));
  for (const z of EXPANSION_TERRITORY_Z) lines.push(...outlinedRectangle(0, z, TERRITORY_SLOT_WIDTH, TERRITORY_SLOT_DEPTH, SECONDARY_OUTLINE_COLOR, true));
  return lines;
}

function buildSnapPoints() {
  const snaps = [];
  for (const z of ALL_TERRITORY_Z) snaps.push(snap(vector(0, 0, z), 90, [TERRITORY_TAG]));
  for (const z of ALL_TERRITORY_Z) {
    for (const x of DEED_X) snaps.push(snap(vector(x, 0, z), 90, [DEED_TAG]));
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

function generatedTextGuid(index) {
  return `zt${index.toString(36).padStart(4, '0')}`.slice(-6);
}

function makeTableText(definition, guid) {
  const sideOffset = definition.rotationY === 180 ? -0.035 : 0.035;
  const shadow = definition.shadow;
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

function trackerLua(component, localScale) {
  const tag = String(component.tts?.snapTag || '').trim();
  const points = component.tts?.snapPoints || [];
  const definitions = points.map(point => {
    const travel = Number(point.offset);
    if (!Number.isFinite(travel) || travel < 0) throw new Error(`Invalid tracker travel for ${component.id}: ${point.offset}`);
    const z = -(travel / localScale);
    return `    { position = {0, 0.12, ${Number(z.toFixed(5))}}, rotation = {0, 0, 0}, rotation_snap = true, tags = {${JSON.stringify(tag)}} }`;
  });
  return [
    'function onLoad()',
    '  self.setSnapPoints({',
    definitions.join(',\n'),
    '  })',
    'end',
    '',
  ].join('\n');
}

function correctTrackers(save, supplementalManifest) {
  const trackers = new Map((supplementalManifest.ready || [])
    .filter(component => component.representation === 'sliding-tracker')
    .map(component => [component.id, component]));
  let corrected = 0;

  walkObjects(save.ObjectStates, object => {
    const notes = String(object?.GMNotes || '');
    if (!notes.startsWith(SUPPLEMENTAL_GUID_NOTE_PREFIX)) return;
    const id = notes.slice(SUPPLEMENTAL_GUID_NOTE_PREFIX.length);
    const component = trackers.get(id);
    if (!component || object.Name !== 'Custom_Tile') return;

    const scale = Number(object.Transform?.scaleZ) || TRACKER_TABLETOP_SCALE;
    const tag = String(component.tts?.snapTag || '').trim();
    object.AttachedSnapPoints = (component.tts?.snapPoints || []).map(point => ({
      Position: vector(0, 0.12, -(Number(point.offset) / scale)),
      Rotation: vector(0, 0, 0),
      RotationSnap: true,
      Tags: [tag],
    }));
    object.LuaScript = trackerLua(component, scale);
    object.LuaScriptState = '';
    corrected += 1;
  });
  return corrected;
}

function correctCardOrientationAndTags(save) {
  let deeds = 0;
  walkObjects(save.ObjectStates, object => {
    const description = String(object?.Description || '');
    if (object?.Name === 'CardCustom' && /Territory$/u.test(description)) addTag(object, TERRITORY_TAG);

    const notes = String(object?.GMNotes || '');
    if (notes === `${SUPPLEMENTAL_GUID_NOTE_PREFIX}financiers-deed`) {
      object.SidewaysCard = true;
      object.Transform ||= {};
      object.Transform.rotY = 90;
      object.Transform.scaleX = 1;
      object.Transform.scaleY = 1;
      object.Transform.scaleZ = 1;
      addTag(object, DEED_TAG);
      deeds += 1;
    }
  });
  return deeds;
}

function colorAndParkStarterBags(save, starterManifest) {
  const factions = ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition'];
  let moved = 0;
  for (let factionIndex = 0; factionIndex < factions.length; factionIndex += 1) {
    const faction = factions[factionIndex];
    const starters = (starterManifest.decks || []).filter(starter => starter.factionId === faction);
    const z = -12 + factionIndex * 4.8;
    starters.forEach((starter, leaderIndex) => {
      const nickname = `${starter.name} — ${starter.leader.name}`;
      const bag = (save.ObjectStates || []).find(object => object?.Name === 'Bag' && object?.Nickname === nickname);
      if (!bag) throw new Error(`Unable to find starter bag ${nickname}.`);
      const x = leaderIndex === 0 ? -20.5 : 20.5;
      bag.Transform ||= {};
      bag.Transform.posX = x;
      bag.Transform.posY = 1.4;
      bag.Transform.posZ = z;
      bag.Transform.rotY = leaderIndex === 0 ? 90 : 270;
      bag.ColorDiffuse = { ...FACTION_COLORS[faction] };
      moved += 1;
    });
  }
  return moved;
}

function parkUtilityObjects(save) {
  const positions = new Map([
    ['Red Battle Die', { x: -18.0, z: -10.0, rotation: 0 }],
    ['Red Player Token', { x: -18.0, z: -7.7, rotation: 0 }],
    ['Blue Battle Die', { x: 18.0, z: 10.0, rotation: 180 }],
    ['Blue Player Token', { x: 18.0, z: 7.7, rotation: 180 }],
  ]);
  for (const object of save.ObjectStates || []) {
    const target = positions.get(object?.Nickname);
    if (!target || !object.Transform) continue;
    object.Transform.posX = target.x;
    object.Transform.posZ = target.z;
    object.Transform.rotY = target.rotation;
  }
}

function applyEnvironment(save) {
  save.Table = 'Table_Custom';
  save.TableURL = TABLE_URL;
  save.Sky = 'Sky_Field';
  save.SkyURL = SKY_URL;
}

function applyLayout(save) {
  save.ObjectStates = (save.ObjectStates || []).filter(
    object => !String(object?.GMNotes || '').startsWith(TABLE_TEXT_NOTE_PREFIX),
  );
  save.VectorLines = buildVectorLines();
  save.SnapPoints = buildSnapPoints();
  save.ObjectStates.push(...buildTextObjects());
}

async function main() {
  const release = await resolveCurrentTtsRelease();
  const versionedName = `Gauntlet_${release.version}_TTS_Review_Scaffold.json`;
  const versionedPath = join(release.outputRoot, versionedName);
  const [save, supplementalManifest, starterManifest] = await Promise.all([
    readFile(versionedPath, 'utf8').then(JSON.parse),
    readFile(join(release.outputRoot, 'supplemental-manifest.json'), 'utf8').then(JSON.parse),
    readFile(join(release.outputRoot, 'starter-deck-manifest.json'), 'utf8').then(JSON.parse),
  ]);

  const trackerCount = correctTrackers(save, supplementalManifest);
  const deedCount = correctCardOrientationAndTags(save);
  const bagCount = colorAndParkStarterBags(save, starterManifest);
  parkUtilityObjects(save);
  applyLayout(save);
  applyEnvironment(save);

  const note = 'v0.7.0 QA corrections: tracker covers reveal values upward from the tracker bottom edge; the Leader/reference workspace has four card stations; Deeds and Deed snaps are landscape; starter bags use faction colors and are parked beyond the active board; the campaign-map table and command-tent panorama are part of the generated scaffold.';
  for (const field of ['Note', 'Rules']) {
    const current = String(save[field] || '').trim();
    if (!current.includes(note)) save[field] = `${current}\n\n${note}`.trim();
  }

  const text = jsonText(save);
  await writeFile(versionedPath, text);
  await writeFile(join(CURRENT_ALIAS_ROOT, 'Gauntlet_TTS_Review_Scaffold.json'), text);
  console.log(`Applied v0.7.0 QA corrections to ${relative(ROOT, versionedPath)}: ${trackerCount} trackers, ${deedCount} Deeds, ${bagCount} faction-colored starter bags, ${save.SnapPoints.length} table snaps.`);
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
