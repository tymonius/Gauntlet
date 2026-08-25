import { execFileSync } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from '../scripts/tts-current-catalog.mjs';

const TERRITORY_TAG = 'gauntlet-territory';
const DEED_TAG = 'gauntlet-deed';
const FACTION_ZONE_TAG = 'gauntlet-faction-zone';
const DEED_STACK_TAG = 'gauntlet-deed-stack';
const HAND_TRIGGER_NOTE_PREFIX = 'gauntlet:hand-trigger:';
const SUPPLEMENTAL_STACK_NOTE_PREFIX = 'gauntlet:supplemental-stack:';
const PLAYER_TOKEN_NOTE_PREFIX = 'gauntlet:starter-utility:player-token:';
const BATTLE_DIE_NOTE_PREFIX = 'gauntlet:starter-utility:battle-die:';

function walk(objects, visit) {
  for (const object of objects || []) {
    visit(object);
    walk(object?.ContainedObjects, visit);
  }
}

function hasTag(object, tag) {
  return Array.isArray(object?.Tags) && object.Tags.includes(tag);
}

function removeTag(object, tag) {
  if (!Array.isArray(object?.Tags)) return;
  object.Tags = object.Tags.filter(value => value !== tag);
  if (!object.Tags.length) delete object.Tags;
}

function sameColor(a, b) {
  return ['r', 'g', 'b'].every(channel => Math.abs(Number(a?.[channel]) - Number(b?.[channel])) < 0.0001);
}

function cleanFactionEligibility(save) {
  let removed = 0;
  walk(save.ObjectStates, object => {
    if (!hasTag(object, FACTION_ZONE_TAG)) return;
    if (!hasTag(object, TERRITORY_TAG) && !hasTag(object, DEED_TAG)) return;
    removeTag(object, FACTION_ZONE_TAG);
    removed += 1;
  });
  return removed;
}

function validateHands(save) {
  const triggers = (save.ObjectStates || []).filter(object => object?.Name === 'HandTrigger');
  if (triggers.length !== 2) throw new Error(`Expected 2 live HandTrigger objects; found ${triggers.length}.`);
  for (const color of ['Red', 'Blue']) {
    const trigger = triggers.find(object => object.Nickname === `${color} Hand`);
    if (!trigger) throw new Error(`Missing ${color} HandTrigger.`);
    if (!String(trigger.GMNotes || '').startsWith(HAND_TRIGGER_NOTE_PREFIX)) {
      throw new Error(`${color} HandTrigger lacks Gauntlet hand metadata.`);
    }
  }
  if (save.Hands?.Enable !== true || save.Hands?.HandTransforms?.length !== 2) {
    throw new Error('Top-level TTS Hands configuration does not match the two live HandTrigger objects.');
  }
  return triggers.length;
}

function validateStarterUtilities(save) {
  const topLevelUtilities = (save.ObjectStates || []).filter(object => (
    object?.Name === 'Die_6' || object?.Name === 'PlayerPawn'
  ));
  if (topLevelUtilities.length) {
    throw new Error(`Faction utilities must live inside starter Bags; found ${topLevelUtilities.length} loose table utilities.`);
  }

  const bags = (save.ObjectStates || []).filter(object => object?.Name === 'Bag');
  if (bags.length !== 12) throw new Error(`Expected 12 starter Bags; found ${bags.length}.`);

  let tokens = 0;
  let dice = 0;
  for (const bag of bags) {
    const contained = bag.ContainedObjects || [];
    const token = contained.filter(object => (
      object?.Name === 'PlayerPawn'
      && String(object.GMNotes || '').startsWith(PLAYER_TOKEN_NOTE_PREFIX)
    ));
    const die = contained.filter(object => (
      object?.Name === 'Die_6'
      && String(object.GMNotes || '').startsWith(BATTLE_DIE_NOTE_PREFIX)
    ));
    if (token.length !== 1 || die.length !== 1) {
      throw new Error(`${bag.Nickname || bag.GUID} must contain exactly one faction Player Token and one faction Battle Die.`);
    }
    if (!sameColor(token[0].ColorDiffuse, bag.ColorDiffuse) || !sameColor(die[0].ColorDiffuse, bag.ColorDiffuse)) {
      throw new Error(`${bag.Nickname || bag.GUID} utility colors do not match the starter Bag faction color.`);
    }
    const tokenFaction = String(token[0].GMNotes).slice(PLAYER_TOKEN_NOTE_PREFIX.length);
    const dieFaction = String(die[0].GMNotes).slice(BATTLE_DIE_NOTE_PREFIX.length);
    if (!tokenFaction || tokenFaction !== dieFaction) {
      throw new Error(`${bag.Nickname || bag.GUID} token/die faction metadata disagree.`);
    }
    tokens += token.length;
    dice += die.length;
  }
  return { bags: bags.length, tokens, dice };
}

function validateDeeds(save) {
  const deedSnaps = (save.SnapPoints || []).filter(point => point.Tags?.includes(DEED_TAG));
  if (deedSnaps.length !== 16) throw new Error(`Expected 16 Deed snaps; found ${deedSnaps.length}.`);
  if (deedSnaps.some(point => Number(point.Rotation?.y) !== 0)) {
    throw new Error('Deed slot snaps must use native landscape y-rotation 0.');
  }

  let cards = 0;
  let stacks = 0;
  walk(save.ObjectStates, object => {
    if (hasTag(object, DEED_TAG) && object.Name === 'CardCustom') {
      cards += 1;
      if (object.SidewaysCard !== false || Number(object.Transform?.rotY) !== 0) {
        throw new Error(`Deed ${object.Nickname || object.GUID} is not native-landscape in play.`);
      }
    }
    if (String(object?.GMNotes || '') === `${SUPPLEMENTAL_STACK_NOTE_PREFIX}deeds`) {
      stacks += 1;
      if (!hasTag(object, DEED_STACK_TAG) || Number(object.Transform?.rotY) !== 90) {
        throw new Error('Deed starter stack is not parked portrait with its dedicated tag.');
      }
    }
  });
  if (!cards || stacks !== 2) throw new Error(`Unexpected Deed package: ${cards} cards / ${stacks} stacks.`);
  return { cards, stacks };
}

function validateLayout(save) {
  const territorySnaps = (save.SnapPoints || []).filter(point => point.Tags?.includes(TERRITORY_TAG));
  if (territorySnaps.length !== 8) throw new Error(`Expected 8 Territory snaps; found ${territorySnaps.length}.`);

  const labels = (save.ObjectStates || [])
    .filter(object => object?.Name === '3DText')
    .map(object => object.Text?.Text)
    .filter(Boolean);
  if (!labels.includes('Leader & References')) throw new Error('Round-three Leader & References label is missing.');
  if (labels.includes('Leader + Tracker(s)')) throw new Error('Stale Leader + Tracker(s) label survived round-three layout.');

  const expectedAssetXs = new Set(['-16.275','-13.625','-10.975','-8.325','-14.950','-12.300','-9.650']);
  const redAssetSnaps = (save.SnapPoints || []).filter(point => (
    expectedAssetXs.has(Number(point.Position?.x).toFixed(3))
    && [Number((-5.15 - 1.82).toFixed(2)), Number((-5.15 + 1.82).toFixed(2))].includes(Number(Number(point.Position?.z).toFixed(2)))
  ));
  if (redAssetSnaps.length !== 7) throw new Error(`Expected 7 Red Asset Bank snaps; found ${redAssetSnaps.length}.`);
}

function validateTrackers(save) {
  let count = 0;
  walk(save.ObjectStates, object => {
    if (object?.Name !== 'Custom_Tile' || !String(object.GMNotes || '').startsWith('gauntlet:supplemental:')) return;
    if (!Array.isArray(object.AttachedSnapPoints) || object.AttachedSnapPoints.length < 2) return;
    if (!String(object.LuaScript || '').includes('getBoundsNormalized')) return;
    if (!String(object.LuaScript || '').includes('localLength')) return;
    count += 1;
  });
  if (count < 1) throw new Error('No live-bounds sliding trackers were found in the corrected save.');
  return count;
}

async function main() {
  const release = await resolveCurrentTtsRelease();
  const name = `Gauntlet_${release.version}_TTS_Review_Scaffold.json`;
  const path = join(release.outputRoot, name);
  const save = JSON.parse(await readFile(path, 'utf8'));

  const removedFactionTags = cleanFactionEligibility(save);
  const hands = validateHands(save);
  const utilities = validateStarterUtilities(save);
  const deeds = validateDeeds(save);
  validateLayout(save);
  const trackers = validateTrackers(save);

  const text = `${JSON.stringify(save, null, 2)}\n`;
  await writeFile(path, text);
  await writeFile(join(CURRENT_ALIAS_ROOT, 'Gauntlet_TTS_Review_Scaffold.json'), text);
  console.log(
    `Validated ${relative(ROOT, path)}: ${hands} HandTriggers, ${utilities.bags} starter Bags with `
    + `${utilities.tokens} faction tokens/${utilities.dice} faction dice, ${deeds.cards} landscape Deeds, `
    + `${deeds.stacks} portrait Deed stacks, ${trackers} live-bounds trackers; removed ${removedFactionTags} invalid faction-zone tags.`,
  );

  // Round three intentionally validates the state it produced. Immediately
  // afterward, apply the cumulative regression correction that restores the
  // working landscape-card, tracker, and hand behavior without weakening the
  // round-three structural checks above.
  execFileSync(process.execPath, ['tts/apply-v070-qa-round4.mjs'], { stdio: 'inherit' });
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
