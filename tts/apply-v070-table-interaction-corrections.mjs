import { readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from '../scripts/tts-current-catalog.mjs';

const TABLE_TEXT_NOTE_PREFIX = 'gauntlet:table-layout:';
const SUPPLEMENTAL_GUID_NOTE_PREFIX = 'gauntlet:supplemental:';
const SUPPLEMENTAL_STACK_NOTE_PREFIX = 'gauntlet:supplemental-stack:';
const TERRITORY_TAG = 'gauntlet-territory';
const DEED_TAG = 'gauntlet-deed';

const PRIMARY_TERRITORY_Z = Object.freeze([-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]);
const EXPANSION_TERRITORY_Z = Object.freeze([-10.5, 10.5]);
const ALL_TERRITORY_Z = Object.freeze([...EXPANSION_TERRITORY_Z.slice(0, 1), ...PRIMARY_TERRITORY_Z, ...EXPANSION_TERRITORY_Z.slice(1)]);
const DEED_X = Object.freeze([-4.35, 4.35]);

const TABLE_MARK_Y = 1.01;
const TERRITORY_SLOT_WIDTH = 3.8;
const TERRITORY_SLOT_DEPTH = 2.75;
const LABEL_GAP = 0.34;

const OUTLINE_SHADOW_COLOR = Object.freeze({ r: 0.12, g: 0.085, b: 0.055 });
const OUTLINE_COLOR = Object.freeze({ r: 0.83, g: 0.69, b: 0.40 });
const LABEL_SHADOW_COLOR = Object.freeze({ r: 0.08, g: 0.055, b: 0.035 });
const LABEL_COLOR = Object.freeze({ r: 0.99, g: 0.91, b: 0.70 });

/* Coordinates are authored from Red's perspective and mirrored for Blue.
   The Hand is intentionally only one card wide: it is a real hidden TTS hand
   zone rather than a public card-layout area. The Graveyard is isolated at the
   outside edge so removed cards read as genuinely out of play. */
const PLAYER_ZONES = Object.freeze([
  { id: 'leader-trackers', label: 'Leader + Tracker(s)', x: -12.5, z: -14.1, width: 11.0, depth: 4.4, fontSize: 30, textScale: 0.27, snapLayout: 'leader' },
  { id: 'draw', label: 'Draw Pile', x: -5.2, z: -14.1, width: 2.9, depth: 4.4, fontSize: 29, textScale: 0.26, snapLayout: 'pile' },
  { id: 'discard', label: 'Discard Pile', x: -1.9, z: -14.1, width: 2.9, depth: 4.4, fontSize: 28, textScale: 0.25, snapLayout: 'pile' },
  { id: 'hand', label: 'Hand', x: 1.4, z: -14.1, width: 2.9, depth: 4.4, fontSize: 31, textScale: 0.28, snapLayout: null },
  { id: 'graveyard', label: 'Graveyard', x: 16.0, z: -14.1, width: 2.9, depth: 4.4, fontSize: 28, textScale: 0.25, snapLayout: 'pile' },
  { id: 'asset-bank', label: 'Asset Bank', x: -12.5, z: -6.7, width: 11.0, depth: 8.4, fontSize: 30, textScale: 0.27, snapLayout: 'assets' },
  { id: 'faction-zone', label: 'Faction Zone', x: 12.2, z: -6.4, width: 11.0, depth: 10.8, fontSize: 30, textScale: 0.27, snapLayout: 'faction' },
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

  // Asset Bank cards are landscape Territories/Assets (3.5 x 2.5 tabletop
  // footprint), so use a 3 x 3 grid with deliberate air between cards.
  if (layout === 'assets') {
    const offsets = [];
    for (const z of [-2.8, 0, 2.8]) {
      for (const x of [-3.7, 0, 3.7]) offsets.push([x, z]);
    }
    return offsets;
  }

  // Faction components are overwhelmingly portrait cards (2.5 x 3.5). Four
  // columns by three rows fit without the overlap visible in the first QA save.
  if (layout === 'faction') {
    const offsets = [];
    for (const z of [-3.6, 0, 3.6]) {
      for (const x of [-4.125, -1.375, 1.375, 4.125]) offsets.push([x, z]);
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

  // Manifest Destiny may create temporary outer Territory positions, but they
  // should not look like permanent board slots. Keep their invisible snaps and
  // omit only the visual slot markings.
  for (const z of PRIMARY_TERRITORY_Z) {
    lines.push(...outlinedRectangle(0, z, TERRITORY_SLOT_WIDTH, TERRITORY_SLOT_DEPTH));
  }
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
  return `zi${index.toString(36).padStart(4, '0')}`.slice(-6);
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

function applyLayout(save) {
  save.ObjectStates = (save.ObjectStates || []).filter(
    object => !String(object?.GMNotes || '').startsWith(TABLE_TEXT_NOTE_PREFIX),
  );
  save.VectorLines = buildVectorLines();
  save.SnapPoints = buildSnapPoints();
  save.ObjectStates.push(...buildTextObjects());
}

function applyHiddenHands(save) {
  const handZone = PLAYER_ZONES.find(zone => zone.id === 'hand');
  if (!handZone) throw new Error('Table layout does not define a Hand zone.');

  save.Hands ||= {};
  save.Hands.Enable = true;
  save.Hands.DisableUnused = true;
  // TTS HidingType.Default: only the owning player can see cards in the zone.
  save.Hands.Hiding = 0;
  save.Hands.HandTransforms = ['Red', 'Blue'].map(side => {
    const placed = playerZone(side, handZone);
    return {
      Color: side,
      Transform: transform(
        placed.x,
        1.5,
        placed.z,
        playerFacingCardRotation(side),
        1.45,
        2,
        2,
      ),
    };
  });
}

function isTerritoryCard(object) {
  return object?.Name === 'CardCustom' && /(?:Arena )?Territory$/u.test(String(object.Description || ''));
}

function correctTerritoryFlipBehavior(save) {
  let corrected = 0;
  walkObjects(save.ObjectStates, object => {
    if (!isTerritoryCard(object)) return;
    addTag(object, TERRITORY_TAG);
    object.Transform ||= transform();
    object.Transform.rotY = 90;
    object.Transform.scaleX = 1;
    object.Transform.scaleY = 1;
    object.Transform.scaleZ = 1;

    // The face artwork is already quarter-turned inside its portrait TTS sheet
    // cell. Keeping the tabletop Y rotation but disabling SidewaysCard makes F
    // use the normal card flip axis, preventing the face-down back from ending
    // up inverted relative to the Territory face.
    object.SidewaysCard = false;
    corrected += 1;
  });
  return corrected;
}

function makeSupplementalStack(cards, { key, nickname, description, sideways }, guid) {
  if (!Array.isArray(cards) || cards.length < 2) throw new Error(`Supplemental stack ${key} needs at least two cards.`);
  const customDeck = {};
  for (const card of cards) {
    if (card?.Name !== 'CardCustom' || !Number.isFinite(Number(card.CardID))) {
      throw new Error(`Supplemental stack ${key} contains a non-card object.`);
    }
    Object.assign(customDeck, card.CustomDeck || {});
  }

  return {
    Name: 'DeckCustom',
    Transform: transform(0, 1, 0, sideways ? 90 : 0),
    Nickname: nickname,
    Description: description,
    GMNotes: `${SUPPLEMENTAL_STACK_NOTE_PREFIX}${key}`,
    ColorDiffuse: color(),
    Locked: false,
    Grid: true,
    Snap: true,
    Autoraise: true,
    Sticky: true,
    Tooltip: true,
    GridProjection: false,
    HideWhenFaceDown: false,
    Hands: false,
    LuaScript: '',
    LuaScriptState: '',
    XmlUI: '',
    GUID: guid(),
    DeckIDs: cards.map(card => Number(card.CardID)),
    SidewaysCard: Boolean(sideways),
    CustomDeck: customDeck,
    ContainedObjects: cards,
  };
}

function stackFamilyInBag(bag, definition, guid) {
  const objects = bag.ContainedObjects || [];
  const matching = objects.filter(definition.predicate);
  if (!matching.length) return 0;
  if (matching.length !== definition.expectedCount) {
    throw new Error(`${bag.Nickname} has ${matching.length} ${definition.key} cards; expected ${definition.expectedCount}.`);
  }
  const firstIndex = objects.findIndex(definition.predicate);
  bag.ContainedObjects = objects.filter(object => !definition.predicate(object));
  bag.ContainedObjects.splice(firstIndex, 0, makeSupplementalStack(matching, definition, guid));
  return 1;
}

function stackBaggedCardFamilies(save) {
  const guid = makeContinuationGuidFactory(save);
  const definitions = [
    {
      key: 'proposals',
      nickname: 'Proposals',
      description: 'Diplomat Proposal/Treaty cards',
      expectedCount: 9,
      sideways: false,
      predicate: object => object?.Name === 'CardCustom' && /· proposal-treaty-card$/u.test(String(object.Description || '')),
    },
    {
      key: 'deeds',
      nickname: 'Deeds',
      description: 'Financier Deed cards',
      expectedCount: 8,
      sideways: true,
      predicate: object => object?.Name === 'CardCustom' && /· deed-card$/u.test(String(object.Description || '')),
    },
    {
      key: 'rites-rituals',
      nickname: 'Rites + Ritual',
      description: 'Mystics Rites and Ritual of Ascension',
      expectedCount: 4,
      sideways: false,
      predicate: object => object?.Name === 'CardCustom' && /· (?:rite-card|ritual-card)$/u.test(String(object.Description || '')),
    },
  ];

  const stackCounts = new Map(definitions.map(definition => [definition.key, 0]));
  for (const bag of (save.ObjectStates || []).filter(object => object?.Name === 'Bag')) {
    for (const definition of definitions) {
      stackCounts.set(
        definition.key,
        stackCounts.get(definition.key) + stackFamilyInBag(bag, definition, guid),
      );
    }
  }

  const expectedStarterStacks = { proposals: 2, deeds: 2, 'rites-rituals': 2 };
  for (const [key, expected] of Object.entries(expectedStarterStacks)) {
    if (stackCounts.get(key) !== expected) {
      throw new Error(`Generated save contains ${stackCounts.get(key)} ${key} starter stacks; expected ${expected}.`);
    }
  }
  return Object.fromEntries(stackCounts);
}

function faceDownPlayableDecks(save) {
  let count = 0;
  for (const bag of (save.ObjectStates || []).filter(object => object?.Name === 'Bag')) {
    const decks = (bag.ContainedObjects || []).filter(object => (
      object?.Name === 'DeckCustom'
      && / Deck — \d+ cards$/u.test(String(object.Nickname || ''))
    ));
    if (decks.length !== 1) throw new Error(`${bag.Nickname} should contain exactly one playable Deck stack; found ${decks.length}.`);
    const deck = decks[0];
    deck.Transform ||= transform();
    deck.Transform.rotZ = 180;
    deck.Hands = true;
    for (const card of deck.ContainedObjects || []) card.Hands = true;
    count += 1;
  }
  if (count !== 12) throw new Error(`Expected 12 face-down starter Deck stacks; corrected ${count}.`);
  return count;
}

function appendCorrectionNote(save) {
  const note = 'TTS interaction corrections: Asset Bank snaps use a non-overlapping 3x3 landscape grid; Faction Zone snaps use a non-overlapping 4x3 portrait grid; each player Hand is a one-card owner-hidden TTS hand zone; starter Deck stacks emerge face down; Proposals, Deeds, and Mystics Rites/Ritual are bagged as family stacks; Territory flipping uses the normal card axis; Graveyards are isolated at the outer edge; Manifest Destiny expansion positions retain invisible snaps but no permanent slot markings.';
  for (const field of ['Note', 'Rules']) {
    const current = String(save[field] || '').trim();
    if (!current.includes(note)) save[field] = `${current}\n\n${note}`.trim();
  }
}

async function main() {
  const release = await resolveCurrentTtsRelease();
  const versionedName = `Gauntlet_${release.version}_TTS_Review_Scaffold.json`;
  const versionedPath = join(release.outputRoot, versionedName);
  const save = JSON.parse(await readFile(versionedPath, 'utf8'));

  applyLayout(save);
  applyHiddenHands(save);
  const territoryCount = correctTerritoryFlipBehavior(save);
  const playableDeckCount = faceDownPlayableDecks(save);
  const stackCounts = stackBaggedCardFamilies(save);
  appendCorrectionNote(save);

  const text = jsonText(save);
  await writeFile(versionedPath, text);
  await writeFile(join(CURRENT_ALIAS_ROOT, 'Gauntlet_TTS_Review_Scaffold.json'), text);

  console.log(
    `Applied v0.7.0 table/interaction corrections to ${relative(ROOT, versionedPath)}: `
    + `${save.SnapPoints.length} table snaps, ${territoryCount} Territory flip-axis corrections, `
    + `${playableDeckCount} face-down playable Decks, ${JSON.stringify(stackCounts)} family stacks, `
    + `${save.Hands.HandTransforms.length} owner-hidden one-card Hand zones.`,
  );
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
