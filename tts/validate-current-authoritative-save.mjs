import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { resolveCurrentTtsRelease, ROOT } from '../scripts/tts-current-catalog.mjs';
import { trackerPresentation } from '../scripts/tts-supplemental-geometry.mjs';

const SUPPLEMENTAL_GUID_NOTE_PREFIX = 'gauntlet:supplemental:';
const SUPPLEMENTAL_STACK_NOTE_PREFIX = 'gauntlet:supplemental-stack:';
const STARTER_KIT_NOTE_PREFIX = 'gauntlet:starter-kit:';
const INTERNAL_TEMPLATE_NOTE_PREFIX = 'gauntlet:internal:deck-import-template:';
const STARTER_DECK_NOTE_PREFIX = 'gauntlet:starter-deck:';
const STARTER_TERRITORY_STACK_NOTE_PREFIX = 'gauntlet:starter-territories:';
const PLAYER_TOKEN_NOTE_PREFIX = 'gauntlet:starter-utility:player-token:';
const BATTLE_DIE_NOTE_PREFIX = 'gauntlet:starter-utility:battle-die:';
const PRIVATE_PARKING_NOTE_PREFIX = 'gauntlet:private-parking:';
const TERRITORY_TAG = 'gauntlet-territory';
const TERRITORY_OVERLAY_TAG = 'gauntlet-territory-overlay';
const DEED_TAG = 'gauntlet-deed';
const PLAYABLE_CARD_NOTE_PREFIX = 'gauntlet:playable-card:';
const TERRITORY_SLOT_CARD_IDS = new Set(['neutral-manifest-destiny']);
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
    if (String(object?.GMNotes || '').startsWith(INTERNAL_TEMPLATE_NOTE_PREFIX)) continue;
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
  const tableUrl = String(save.TableURL || '');
  const skyUrl = String(save.SkyURL || '');
  if (save.Table !== 'Table_Custom' || save.Sky !== 'Sky_Museum') {
    throw new Error('Authoritative TTS save is not using the custom campaign table / museum-lit panorama environment.');
  }
  if (!/^https:\/\/github\.com\/tymonius\/Gauntlet\/releases\/download\//i.test(tableUrl)
    || !tableUrl.endsWith('_TTS_Environment_Table.png')) {
    throw new Error('Campaign table image must use the published GitHub Release environment asset.');
  }
  if (!/^https:\/\/github\.com\/tymonius\/Gauntlet\/releases\/download\//i.test(skyUrl)
    || !skyUrl.endsWith('_TTS_Environment_Panorama.png')) {
    throw new Error('Command-tent panorama must use the published GitHub Release environment asset.');
  }
  if (tableUrl.includes('raw.githubusercontent.com') || skyUrl.includes('raw.githubusercontent.com')) {
    throw new Error('Raw branch URLs are forbidden for TTS environment images.');
  }
}

function validateTableWorkspace(save) {
  if ((save.VectorLines || []).length !== 40) {
    throw new Error(`Expected 40 visible table outline lines; found ${save.VectorLines?.length || 0}. Both visible Hand parking guides must remain present; only Manifest Destiny extensions are invisible.`);
  }
  if ((save.SnapPoints || []).length !== 78) throw new Error(`Expected 78 final table snaps; found ${save.SnapPoints?.length || 0}.`);

  const whiteLeaderOutlines = (save.VectorLines || []).filter(line => {
    const xs = (line.points3 || []).map(point => Number(point.x));
    const zs = (line.points3 || []).map(point => Number(point.z));
    return xs.length === 4 && zs.length === 4
      && close(Math.min(...xs), -17.55) && close(Math.max(...xs), -6.95)
      && close(Math.min(...zs), -20.35) && close(Math.max(...zs), -11.45);
  });
  const greenLeaderOutlines = (save.VectorLines || []).filter(line => {
    const xs = (line.points3 || []).map(point => Number(point.x));
    const zs = (line.points3 || []).map(point => Number(point.z));
    return xs.length === 4 && zs.length === 4
      && close(Math.min(...xs), 6.95) && close(Math.max(...xs), 17.55)
      && close(Math.min(...zs), 11.45) && close(Math.max(...zs), 20.35);
  });
  if (whiteLeaderOutlines.length !== 2 || greenLeaderOutlines.length !== 2) {
    throw new Error('Leader & References outlines must fit the fully extended nested tracker assembly for both players.');
  }

  const whiteLeaderXs = [-16.3, -13.6, -10.9, -8.2];
  const greenLeaderXs = whiteLeaderXs.map(x => -x);
  if (whiteLeaderXs.some(x => !close(findSnap(save, x, -18.6)?.Rotation?.y, 180))
    || greenLeaderXs.some(x => !close(findSnap(save, x, 18.6)?.Rotation?.y, 0))) {
    throw new Error('Leader & References snaps must sit at the player-side bottom of each workspace so tracker travel extends inward/upward.');
  }

  const territory = save.SnapPoints.filter(point => point.Tags?.includes(TERRITORY_TAG));
  const deeds = save.SnapPoints.filter(point => point.Tags?.includes(DEED_TAG));
  const faction = save.SnapPoints.filter(point => point.Tags?.includes(FACTION_ZONE_TAG));
  const deedStackMagnets = save.SnapPoints.filter(point => point.Tags?.includes(DEED_STACK_TAG));

  if (territory.length !== 8 || territory.some(point => point.Rotation !== undefined)) {
    throw new Error('Territory table snaps must constrain position only so Y rotation remains available to indicate control.');
  }
  if (deeds.length !== 16 || deeds.some(point => !close(Math.abs(point.Position?.x), 4.35) || point.Rotation !== undefined)) {
    throw new Error('Deed table snaps must constrain position only at ±4.35 so Y rotation remains available to indicate ownership.');
  }
  if (faction.length !== 24) throw new Error(`Expected 24 Faction Zone card snaps; found ${faction.length}.`);
  if (deedStackMagnets.length) throw new Error('Deed stacks must use ordinary Faction Zone magnets; dedicated Deed-stack magnets are forbidden.');
  if (faction.filter(point => Number(point.Position?.z) < 0).some(point => !close(point.Rotation?.y, 180))) {
    throw new Error('White/south Faction Zone card snaps are not facing the White seat.');
  }
  if (faction.filter(point => Number(point.Position?.z) > 0).some(point => !close(point.Rotation?.y, 0))) {
    throw new Error('Green/north Faction Zone card snaps are not facing the Green seat.');
  }

  const whiteWorkspace = [[-1.55, -13.55], [1.55, -13.55], [0, -18.25], [17.15, -17.75]];
  const greenWorkspace = whiteWorkspace.map(([x, z]) => [-x, -z]);
  if (whiteWorkspace.some(([x, z]) => !close(findSnap(save, x, z)?.Rotation?.y, 180))) {
    throw new Error('One or more White/south Draw/Discard/Hand/Graveyard snaps are not facing the White seat.');
  }
  if (greenWorkspace.some(([x, z]) => !close(findSnap(save, x, z)?.Rotation?.y, 0))) {
    throw new Error('One or more Green/north Draw/Discard/Hand/Graveyard snaps are not facing the Green seat.');
  }

  const labels = (save.ObjectStates || []).filter(object => String(object?.GMNotes || '').startsWith('gauntlet:table-layout:'));
  if (labels.length !== 28) throw new Error(`Expected 28 visible table-label objects; found ${labels.length}.`);
  const whiteLeaderLabel = labels.find(object => object.GMNotes === 'gauntlet:table-layout:white-leader-references:label');
  const greenLeaderLabel = labels.find(object => object.GMNotes === 'gauntlet:table-layout:green-leader-references:label');
  if (!whiteLeaderLabel || !close(whiteLeaderLabel.Transform?.posZ, -20.69, 0.01)
    || !greenLeaderLabel || !close(greenLeaderLabel.Transform?.posZ, 20.69, 0.01)) {
    throw new Error('Leader & References labels must remain on the map-side of the table artwork.');
  }
  const handLabels = labels.filter(object => object.Text?.Text === 'Hand');
  if (handLabels.length !== 4) throw new Error(`Expected visible Hand parking labels/shadows for both players; found ${handLabels.length}.`);
  const whiteHandLabel = labels.find(object => object.GMNotes === 'gauntlet:table-layout:white-hand:label');
  const greenHandLabel = labels.find(object => object.GMNotes === 'gauntlet:table-layout:green-hand:label');
  if (!whiteHandLabel || !close(whiteHandLabel.Transform?.posZ, -20.59, 0.01)
    || !greenHandLabel || !close(greenHandLabel.Transform?.posZ, 20.59, 0.01)) {
    throw new Error('Visible Hand parking labels are not in the expected player workspaces.');
  }
}

function validateHandsAndSeats(save) {
  if (save.Hands?.Enable !== true || save.Hands?.DisableUnused !== false || save.Hands?.HandTransforms?.length !== 2) {
    throw new Error('Expected exactly two enabled serialized TTS hand transforms.');
  }
  if (save.Hands?.Hiding !== 0) throw new Error('TTS Hand hiding must remain at the default player-private setting.');

  const white = save.Hands.HandTransforms.find(hand => hand.Color === 'White');
  const green = save.Hands.HandTransforms.find(hand => hand.Color === 'Green');
  if (!white || !green) throw new Error('Missing White or Green hand transform.');

  const expectedHands = [
    [white, 'White', -23.25, 0, -18.25],
    [green, 'Green', 23.25, 180, 18.25],
  ];
  for (const [hand, side, z, rotY, parkingZ] of expectedHands) {
    if (!close(hand.Transform?.posX, 0) || !close(hand.Transform?.posY, 4) || !close(hand.Transform?.posZ, z) || !close(hand.Transform?.rotY, rotY)
      || !close(hand.Transform?.scaleX, 12) || !close(hand.Transform?.scaleY, 6) || !close(hand.Transform?.scaleZ, 4)) {
      throw new Error(`${side} Reserve hand transform does not match the outward-only geometry.`);
    }
    if (zoneContainsPoint(hand.Transform, 0, parkingZ)) {
      throw new Error(`${side} Reserve Hand zone overlaps the tabletop parking snap.`);
    }
  }

  // Reserve must not swallow ordinary public workspaces.
  for (const [hand, side, publicPoints] of [
    [white, 'White', [[-1.55, -13.55], [1.55, -13.55], [17.15, -17.75]]],
    [green, 'Green', [[1.55, 13.55], [-1.55, 13.55], [-17.15, 17.75]]],
  ]) {
    if (publicPoints.some(([x, z]) => zoneContainsPoint(hand.Transform, x, z))) {
      throw new Error(`${side} private Hand zone overlaps Draw, Discard, or Graveyard.`);
    }
  }

  const objects = allObjects(save);
  const handTriggers = objects.filter(object => object?.Name === 'HandTrigger');
  if (handTriggers.length) {
    throw new Error(`Found ${handTriggers.length} duplicate HandTrigger ObjectStates. Hands.HandTransforms is the serialized TTS hand-zone authority.`);
  }
  const fogVolumes = objects.filter(object => object?.Name === 'FogOfWarTrigger');
  const parkingZones = fogVolumes.filter(object => String(object.GMNotes || '').startsWith(PRIVATE_PARKING_NOTE_PREFIX));
  if (parkingZones.length !== 2 || fogVolumes.length !== 2) {
    throw new Error(`Expected exactly two player-private tabletop parking Hidden Zones; found ${parkingZones.length} parking / ${fogVolumes.length} total hidden zones.`);
  }
  for (const [side, z, rotY] of [['White', -19, 0], ['Green', 19, 180]]) {
    const zone = parkingZones.find(object => object.FogColor === side);
    if (!zone || zone.GMNotes !== `${PRIVATE_PARKING_NOTE_PREFIX}${side.toLowerCase()}`
      || zone.FogReverseHiding !== false || zone.FogSeethrough !== true || zone.FogHidePointers !== true || zone.Hands !== false
      || !close(zone.Transform?.posX, 0) || !close(zone.Transform?.posY, 3) || !close(zone.Transform?.posZ, z)
      || !close(zone.Transform?.rotY, rotY) || !close(zone.Transform?.scaleX, 7)
      || !close(zone.Transform?.scaleY, 6) || !close(zone.Transform?.scaleZ, 6.5)) {
      throw new Error(`${side} tabletop parking Hidden Zone is missing or malformed.`);
    }
  }

  const handEligible = objects.filter(object => object?.Name === 'CardCustom' || object?.Name === 'DeckCustom');
  if (!handEligible.length || handEligible.some(object => object.Hands !== true)) {
    throw new Error('Every CardCustom and DeckCustom must participate in the TTS hand system.');
  }

  const lua = String(save.LuaScript || '');
  if (lua.includes('gauntletSeatCamera') || lua.includes('Player[color].lookAt(')) {
    throw new Error('Authoritative save must not rotate or commandeer a seated player camera.');
  }
}

function validateBagsAndUtilities(save, manifest) {
  const bags = (save.ObjectStates || []).filter(object => (
    object?.Name === 'Bag'
    && String(object?.GMNotes || '').startsWith(STARTER_KIT_NOTE_PREFIX)
  ));
  if (bags.length !== 12) throw new Error(`Expected 12 starter Bags; found ${bags.length}.`);

  const looseUtilities = save.ObjectStates.filter(object => object?.Name === 'PlayerPawn' || object?.Name === 'Die_6');
  if (looseUtilities.length) throw new Error(`Found ${looseUtilities.length} loose utility objects.`);

  const supplementalById = new Map((manifest?.ready || []).map((component, index) => [component.id, { component, index }]));
  const byFaction = new Map();
  for (const bag of bags) {
    if (!close(bag.Transform?.rotY, 180)) throw new Error(`${bag.Nickname} starter Bag does not use the host-facing stored orientation established by TTS testing.`);
    for (const object of bag.ContainedObjects || []) {
      if (!object?.Transform) continue;
      const stackKind = String(object.GMNotes || '').replace(SUPPLEMENTAL_STACK_NOTE_PREFIX, '');
      const expectedRotation = stackKind === 'deeds' ? 90 : 180;
      if (!close(object.Transform.rotY, expectedRotation)) {
        throw new Error(`${bag.Nickname} contains ${object.Nickname || object.GUID} at stored rotation ${object.Transform.rotY}; expected host-facing ${expectedRotation}.`);
      }
    }

    const objects = bag.ContainedObjects || [];
    const token = objects.filter(object => object?.Name === 'PlayerPawn' && String(object.GMNotes || '').startsWith(PLAYER_TOKEN_NOTE_PREFIX));
    const die = objects.filter(object => object?.Name === 'Die_6' && String(object.GMNotes || '').startsWith(BATTLE_DIE_NOTE_PREFIX));
    if (token.length !== 1 || die.length !== 1) throw new Error(`${bag.Nickname} must contain exactly one faction token and one faction die.`);
    if (!sameColor(token[0].ColorDiffuse, bag.ColorDiffuse) || !sameColor(die[0].ColorDiffuse, bag.ColorDiffuse)) {
      throw new Error(`${bag.Nickname} token/die colors do not match the bag faction color.`);
    }

    const leader = objects.filter(object => object?.Name === 'CardCustom' && /Leader$/u.test(String(object.Description || '')));
    const playableDeck = objects.filter(object => object?.Name === 'DeckCustom' && String(object.GMNotes || '').startsWith(STARTER_DECK_NOTE_PREFIX));
    const territoryStacks = objects.filter(object => object?.Name === 'DeckCustom' && String(object.GMNotes || '').startsWith(STARTER_TERRITORY_STACK_NOTE_PREFIX));
    if (leader.length !== 1 || playableDeck.length !== 1 || territoryStacks.length !== 1) {
      throw new Error(`${bag.Nickname} must contain exactly one Leader, one playable Deck, and one Territory stack.`);
    }
    const territoryStack = territoryStacks[0];
    if (territoryStack.SidewaysCard !== true || territoryStack.ContainedObjects?.length !== 3) {
      throw new Error(`${bag.Nickname} Territory package must be one sideways three-card stack.`);
    }
    if (territoryStack.ContainedObjects.some(card => (
      card?.Name !== 'CardCustom'
      || !/(?:Arena )?Territory$/u.test(String(card.Description || ''))
      || !close(card.Transform?.rotY, 180)
    ))) {
      throw new Error(`${bag.Nickname} Territory stack members are missing or not stored host-facing.`);
    }

    const rank = object => {
      if (object === leader[0]) return 0;
      const notes = String(object?.GMNotes || '');
      if (notes.startsWith(SUPPLEMENTAL_GUID_NOTE_PREFIX)) {
        const id = notes.slice(SUPPLEMENTAL_GUID_NOTE_PREFIX.length);
        const record = supplementalById.get(id);
        if (record?.component?.representation === 'sliding-tracker') return 1;
        if (record?.component?.family === 'reference-card') return 2;
        return 3;
      }
      if (notes.startsWith(SUPPLEMENTAL_STACK_NOTE_PREFIX)) return 3;
      if (notes.startsWith(STARTER_DECK_NOTE_PREFIX)) return 4;
      if (notes.startsWith(STARTER_TERRITORY_STACK_NOTE_PREFIX)) return 5;
      if (object?.Name === 'PlayerPawn' || object?.Name === 'Die_6') return 6;
      return 99;
    };
    const ranks = objects.map(rank);
    const extractionRanks = [...ranks].reverse();
    if (extractionRanks[0] !== 0 || extractionRanks.some(value => value === 99)
      || extractionRanks.some((value, index) => index > 0 && value < extractionRanks[index - 1])) {
      throw new Error(`${bag.Nickname} native TTS extraction order must be Leader → trackers → reference cards → other supplementals → Deck → Territory stack → utilities.`);
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
function validateDeckImportTemplates(save) {
  const templates = (save.ObjectStates || []).filter(object => (
    object?.Name === 'Bag'
    && String(object?.GMNotes || '').startsWith(INTERNAL_TEMPLATE_NOTE_PREFIX)
  ));
  if (templates.length !== 12) {
    throw new Error(`Expected 12 internal Deck import templates; found ${templates.length}.`);
  }

  const ids = new Set();
  const guids = new Set();
  for (const template of templates) {
    if (template.Locked !== true || template.DragSelectable !== false || template.Tooltip !== false) {
      throw new Error('Internal Deck import templates must remain locked, non-selectable, and non-interactive.');
    }
    if (!close(template.Transform?.posZ, 100) || Number(template.Transform?.scaleX) > 0.11) {
      throw new Error('Internal Deck import templates must remain parked safely off-table at tiny scale.');
    }

    const starterId = String(template.GMNotes || '').slice(INTERNAL_TEMPLATE_NOTE_PREFIX.length);
    if (!starterId || ids.has(starterId)) {
      throw new Error(`Duplicate or invalid internal starter template ${starterId || 'missing'}.`);
    }
    ids.add(starterId);

    const guid = String(template.GUID || '').toLowerCase();
    if (!/^[0-9a-f]{6}$/u.test(guid) || guids.has(guid)) {
      throw new Error(`Internal starter template ${starterId} has an invalid or duplicate GUID.`);
    }
    guids.add(guid);

    const deck = (template.ContainedObjects || []).find(object => String(object?.GMNotes || '').startsWith(STARTER_DECK_NOTE_PREFIX));
    const territories = (template.ContainedObjects || []).find(object => String(object?.GMNotes || '').startsWith(STARTER_TERRITORY_STACK_NOTE_PREFIX));
    if (!deck || !territories) throw new Error(`Internal starter template ${starterId} is missing its Deck or Territory prototype.`);
    if ((deck.ContainedObjects || []).length !== 1 || (territories.ContainedObjects || []).length !== 1) {
      throw new Error(`Internal starter template ${starterId} was not pruned to one Deck and one Territory prototype card.`);
    }

    const rites = (template.ContainedObjects || []).find(object => object?.GMNotes === `${SUPPLEMENTAL_STACK_NOTE_PREFIX}rites-rituals`);
    if (rites && (rites.ContainedObjects || []).length !== 1) {
      throw new Error(`Internal Mystics starter template ${starterId} was not pruned to one Rite prototype card.`);
    }
  }

  const lua = String(save.LuaScript || '');
  const luaBytes = Buffer.byteLength(lua, 'utf8');
  if (luaBytes > 100_000) throw new Error(`Global Lua is too large for stable TTS loading: ${luaBytes} bytes.`);
  if (!lua.includes('getObjectFromGUID(guid)') || !lua.includes('templateObject.getData()')) {
    throw new Error('Deck importer Global Lua is not using direct GUID/getData template access.');
  }
  if (lua.includes('getAllObjects()') || lua.includes('.getJSON()')) {
    throw new Error('Deck importer must not scan or JSON-serialize all template objects at runtime.');
  }
  if (lua.includes('"template":{')) {
    throw new Error('Deck importer must not serialize starter template object trees into Global Lua.');
  }

  const configuredGuids = [...lua.matchAll(/"templateGuid":"([0-9a-f]{6})"/gu)].map(match => match[1]);
  if (configuredGuids.length !== 12 || configuredGuids.some(guid => !guids.has(guid))) {
    throw new Error('Deck importer Global Lua does not map all 12 starter kits to their direct internal template GUIDs.');
  }

  const spawnStates = [...lua.matchAll(/"spawnState":\{/gu)];
  if (spawnStates.length !== 12) {
    throw new Error(`Deck importer Global Lua must carry 12 starter Bag spawn-state records; found ${spawnStates.length}.`);
  }
  for (const required of [
    'function gauntletRestoreStarterBagState',
    'bagData.Transform.scaleX = tonumber(transform.scaleX) or 1',
    'bagData.Transform.scaleY = tonumber(transform.scaleY) or 1',
    'bagData.Transform.scaleZ = tonumber(transform.scaleZ) or 1',
    'bagData.Locked = state.locked == true',
    'bagData.DragSelectable = state.dragSelectable ~= false',
  ]) {
    if (!lua.includes(required)) throw new Error(`Deck importer is missing starter Bag spawn-state restoration: ${required}`);
  }
}


function validateFamilyStacks(bags) {
  const expectations = new Map([
    ['proposals', { count: 2, cards: 9, sideways: false, rotY: 180, tags: [FACTION_ZONE_TAG] }],
    ['deeds', { count: 2, cards: 8, sideways: true, rotY: 90, tags: [DEED_STACK_TAG, FACTION_ZONE_TAG] }],
    ['rites-rituals', { count: 2, cards: 4, sideways: false, rotY: 180, tags: [FACTION_ZONE_TAG] }],
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

function validateCapitalLedgers(save) {
  const objects = allObjects(save);
  const ledgers = objects.filter(object => (
    object?.Name === 'CardCustom'
    && object.GMNotes === 'gauntlet:supplemental:financiers-capital-ledger'
  ));
  if (ledgers.length !== 2) {
    throw new Error(`Expected two interactive Financiers Capital Ledgers; found ${ledgers.length}.`);
  }

  for (const ledger of ledgers) {
    const lua = String(ledger.LuaScript || '');
    const xml = String(ledger.XmlUI || '');
    for (const required of [
      'local STARTING_BALANCE = 2',
      'local ROWS_PER_PAGE = 11',
      'function addLedgerEntry',
      'function undoLedgerEntry',
      'function turnLedgerPage',
      'function onSave()',
      'function onLoad(savedData)',
      'self.setName("Capital Ledger — Balance: "',
      'if totalBalance() + delta < 0 then',
    ]) {
      if (!lua.includes(required)) throw new Error(`Capital Ledger is missing required persistent ledger behavior: ${required}`);
    }
    for (const required of [
      'id="ledger-window"',
      'position="0 0 -500"',
      'rotation="0 0 180"',
      'id="ledger-current-balance"',
      'onClick="addLedgerEntry"',
      'onClick="undoLedgerEntry"',
      'onClick="turnLedgerPage"',
    ]) {
      if (!xml.includes(required)) throw new Error(`Capital Ledger is missing required public ledger UI: ${required}`);
    }
    const rowCount = [...xml.matchAll(/id="ledger-row-\d+-entry"/gu)].length;
    if (rowCount !== 11) throw new Error(`Capital Ledger page must expose exactly 11 transaction rows; found ${rowCount}.`);
  }

  const capitalCounters = objects.filter(object => (
    object?.Name === 'Counter'
    && /capital/iu.test(`${object.Nickname || ''} ${object.Description || ''} ${object.GMNotes || ''}`)
  ));
  if (capitalCounters.length) {
    throw new Error('Financier Capital must be tracked through the interactive Capital Ledger, not a separate visible Counter.');
  }
}

function validateTerritoriesDeedsAndFactionEligibility(save, manifest) {
  const objects = allObjects(save);
  const territories = objects.filter(object => (
    object?.Name === 'CardCustom'
    && hasTag(object, TERRITORY_TAG)
    && /(?:Arena )?Territory$/u.test(String(object.Description || ''))
  ));
  if (!territories.length) throw new Error('No tagged Territory cards found.');
  for (const card of territories) {
    if (card.SidewaysCard !== true) throw new Error(`Territory ${card.Nickname || card.GUID} is not marked SidewaysCard.`);
    if (!close(card.Transform?.rotX, 0) || !close(card.Transform?.rotY, 180) || !close(card.Transform?.rotZ, 0)) {
      throw new Error(`Territory ${card.Nickname || card.GUID} must begin at the host-facing stored rotation while board snaps leave control rotation free.`);
    }
    const lua = String(card.LuaScript || '');
    if (lua.includes('function tryRotate(spin, flip')
      || lua.includes('setRotationSmooth({x = flip')
      || lua.includes('use_rotation_value_flip')) {
      throw new Error(`Territory ${card.Nickname || card.GUID} still carries an obsolete flip-axis override; native TTS flipping must remain authoritative.`);
    }
    const overlaySnaps = (card.AttachedSnapPoints || []).filter(point => point?.Tags?.includes(TERRITORY_OVERLAY_TAG));
    if (overlaySnaps.length !== 1
      || !close(overlaySnaps[0].Position?.x, 0) || !close(overlaySnaps[0].Position?.y, 0.25) || !close(overlaySnaps[0].Position?.z, 0)
      || !close(overlaySnaps[0].Rotation?.x, 0) || !close(overlaySnaps[0].Rotation?.y, 0) || !close(overlaySnaps[0].Rotation?.z, 0)) {
      throw new Error(`Territory ${card.Nickname || card.GUID} is missing its orientation-following Overlay snap.`);
    }
  }

  for (const card of objects.filter(object => object?.Name === 'CardCustom')) {
    const notes = String(card.GMNotes || '');
    const id = notes.startsWith(PLAYABLE_CARD_NOTE_PREFIX) ? notes.slice(PLAYABLE_CARD_NOTE_PREFIX.length) : null;
    if (TERRITORY_SLOT_CARD_IDS.has(id) && !hasTag(card, TERRITORY_TAG)) {
      throw new Error(`${id} must be eligible for Territory table snaps when it becomes a Territory.`);
    }
    if (TERRITORY_OVERLAY_CARD_IDS.has(id) && !hasTag(card, TERRITORY_OVERLAY_TAG)) {
      throw new Error(`${id} must be eligible for attached Territory Overlay snaps.`);
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

    if (!hasTag(object, FACTION_ZONE_TAG)) {
      throw new Error(`Tracker ${id} is missing generic Faction Zone snap eligibility.`);
    }
    if (object.Sticky !== true) {
      throw new Error(`Tracker ${id} must be Sticky so covers snapped above it move with the tracker.`);
    }
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
  const bags = validateBagsAndUtilities(save, manifest);
  validateDeckImportTemplates(save);
  validateFamilyStacks(bags);
  validateCapitalLedgers(save);
  validateTerritoriesDeedsAndFactionEligibility(save, manifest);
  validateTrackers(save, manifest);

  console.log(`Authoritative ${release.version} TTS save contract passed for ${relative(ROOT, path)}.`);
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
