import { readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';

const SUPPLEMENTAL_GUID_NOTE_PREFIX = 'gauntlet:supplemental:';
const STALE_SCAFFOLD_NOTE = 'This scaffold intentionally does not yet include faction-specific supplemental trackers or secondary components. Rules remain manual.';
const ASSEMBLED_SCAFFOLD_NOTE = 'Faction supplemental components with a production-ready TTS export are included in each matching starter kit. Rules remain manual.';
const STANDARD_CARD_SHORT_EDGE = 2.5;
const STANDARD_CARD_LONG_EDGE = 3.5;
// Custom_Tile and CardCustom use different native tabletop scales. The first
// in-game QA pass showed the tracker at roughly two-thirds of a normal card's
// linear size even though its generated image has the correct 5:7 aspect. Keep
// that aspect untouched and enlarge the tile uniformly in the tabletop plane.
// This is deliberately a QA calibration constant and must be confirmed in TTS.
const TRACKER_TABLETOP_SCALE = 1.5;
const ROUNDED_RECTANGLE_TILE_TYPE = 3;

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function walkObjects(objects, visit) {
  for (const object of objects || []) {
    visit(object);
    walkObjects(object?.ContainedObjects, visit);
  }
}

function refreshSaveInstructions(save) {
  for (const field of ['Note', 'Rules']) {
    const value = String(save[field] || '');
    if (value.includes(STALE_SCAFFOLD_NOTE)) save[field] = value.replace(STALE_SCAFFOLD_NOTE, ASSEMBLED_SCAFFOLD_NOTE);
  }
}

function normalizeLandscapeCardPresentation(object) {
  if (object?.Name !== 'CardCustom' || object.SidewaysCard !== true) return false;
  if (!object.Transform || typeof object.Transform !== 'object') {
    throw new Error(`Landscape card ${object.Nickname || object.GUID || 'unknown'} has no Transform.`);
  }

  // Landscape cards are ordinary cards, not a larger format. Their TTS card
  // sheets are normalized to the same portrait cell aspect as the main Deck;
  // the object is then rotated on the tabletop. Do not compensate by shrinking
  // the CardCustom transform: scale 1 is the physical-size invariant.
  object.Transform.scaleX = 1;
  object.Transform.scaleY = 1;
  object.Transform.scaleZ = 1;
  object.Transform.rotY = 90;
  return true;
}

function trackerComponents(supplementalManifest) {
  return new Map((supplementalManifest.ready || [])
    .filter(component => component.representation === 'sliding-tracker')
    .map(component => [component.id, component]));
}

function normalizeTrackerTilePresentation(object, trackers) {
  const notes = String(object?.GMNotes || '');
  if (!notes.startsWith(SUPPLEMENTAL_GUID_NOTE_PREFIX)) return false;
  const id = notes.slice(SUPPLEMENTAL_GUID_NOTE_PREFIX.length);
  const component = trackers.get(id);
  if (!component) return false;
  if (object.Name !== 'Custom_Tile') {
    throw new Error(`Sliding tracker ${id} must resolve to a Custom_Tile object before physical-size finalization.`);
  }

  const width = Number(component.tts?.widthScale || component.physicalScale?.cardWidth || 0);
  const height = Number(component.tts?.heightScale || component.physicalScale?.cardHeight || 0);
  if (Math.abs(width - STANDARD_CARD_SHORT_EDGE) > 0.001 || Math.abs(height - STANDARD_CARD_LONG_EDGE) > 0.001) {
    throw new Error(`Sliding tracker ${id} declares ${width || '?'} x ${height || '?'} physical sizing; expected the card-like ${STANDARD_CARD_SHORT_EDGE} x ${STANDARD_CARD_LONG_EDGE} design aspect.`);
  }
  if (!object.Transform || typeof object.Transform !== 'object') {
    throw new Error(`Sliding tracker ${id} has no Transform.`);
  }
  if (!object.CustomImage?.CustomTile) {
    throw new Error(`Sliding tracker ${id} has no CustomImage.CustomTile definition.`);
  }

  // The first in-game QA pass confirmed that the existing tracker aspect ratio
  // is correct; it is simply too small. Preserve Stretch=true and the existing
  // 2.5 width metadata, enlarge uniformly in X/Z, and use TTS's rounded-rectangle
  // tile shape so the physical piece has card-like corners.
  object.CustomImage.WidthScale = STANDARD_CARD_SHORT_EDGE;
  object.CustomImage.CustomTile.Type = ROUNDED_RECTANGLE_TILE_TYPE;
  object.CustomImage.CustomTile.Stretch = true;
  object.Transform.scaleX = TRACKER_TABLETOP_SCALE;
  object.Transform.scaleY = 1;
  object.Transform.scaleZ = TRACKER_TABLETOP_SCALE;
  return true;
}

export function finalizeSupplementalObjectPresentation(save, supplementalManifest) {
  const sidewaysComponents = (supplementalManifest.ready || [])
    .filter(component => component.representation === 'card' && component.tts?.sidewaysCard === true);
  const sidewaysById = new Map(sidewaysComponents.map(component => [component.id, component]));
  const counts = new Map(sidewaysComponents.map(component => [component.id, 0]));
  const trackers = trackerComponents(supplementalManifest);
  const trackerCounts = new Map([...trackers.keys()].map(id => [id, 0]));
  let sidewaysCount = 0;

  walkObjects(save.ObjectStates, object => {
    const notes = String(object?.GMNotes || '');
    if (!notes.startsWith(SUPPLEMENTAL_GUID_NOTE_PREFIX)) return;
    const id = notes.slice(SUPPLEMENTAL_GUID_NOTE_PREFIX.length);
    if (!sidewaysById.has(id)) return;
    if (object.Name !== 'CardCustom') {
      throw new Error(`Landscape supplemental ${id} must resolve to a CardCustom object before orientation finalization.`);
    }
    object.SidewaysCard = true;
    counts.set(id, (counts.get(id) || 0) + 1);
    sidewaysCount += 1;
  });

  for (const component of sidewaysComponents) {
    const quantity = Number(component.quantity || 0);
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new Error(`Landscape supplemental ${component.id} has invalid quantity ${component.quantity}.`);
    }
    const count = counts.get(component.id) || 0;
    if (count === 0) {
      throw new Error(`Final TTS save contains no assembled copies of landscape supplemental ${component.id}.`);
    }
    if (count % quantity !== 0) {
      throw new Error(`Final TTS save contains ${count} copies of landscape supplemental ${component.id}; expected a whole number of ${quantity}-copy starter packages.`);
    }
  }

  let landscapeCardCount = 0;
  let trackerCount = 0;
  walkObjects(save.ObjectStates, object => {
    if (normalizeLandscapeCardPresentation(object)) landscapeCardCount += 1;
    if (normalizeTrackerTilePresentation(object, trackers)) {
      const id = String(object.GMNotes).slice(SUPPLEMENTAL_GUID_NOTE_PREFIX.length);
      trackerCounts.set(id, (trackerCounts.get(id) || 0) + 1);
      trackerCount += 1;
    }
  });

  for (const [id, component] of trackers) {
    const quantity = Number(component.quantity || 0);
    const count = trackerCounts.get(id) || 0;
    if (count === 0) throw new Error(`Final TTS save contains no assembled copies of sliding tracker ${id}.`);
    if (!Number.isInteger(quantity) || quantity <= 0 || count % quantity !== 0) {
      throw new Error(`Final TTS save contains ${count} copies of sliding tracker ${id}; expected a whole number of ${quantity || '?'}-copy starter packages.`);
    }
  }

  refreshSaveInstructions(save);
  return { save, sidewaysCount, landscapeCardCount, trackerCount };
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const release = await resolveCurrentTtsRelease();
  if (checkOnly) {
    console.log(`Current TTS save-finalization source check passed for ${release.version}.`);
    return;
  }

  const manifest = JSON.parse(await readFile(join(release.outputRoot, 'supplemental-manifest.json'), 'utf8').catch(error => {
    if (error.code === 'ENOENT') throw new Error('TTS save finalization requires the supplemental manifest. Run npm run tts:finalized-supplementals first.');
    throw error;
  }));
  const versionedName = `Gauntlet_${release.version}_TTS_Review_Scaffold.json`;
  const versionedPath = join(release.outputRoot, versionedName);
  const save = JSON.parse(await readFile(versionedPath, 'utf8').catch(error => {
    if (error.code === 'ENOENT') throw new Error('TTS save finalization requires the assembled review scaffold. Run npm run tts:save:assemble first.');
    throw error;
  }));

  const result = finalizeSupplementalObjectPresentation(save, manifest);
  const text = jsonText(result.save);
  await writeFile(versionedPath, text);
  await writeFile(join(CURRENT_ALIAS_ROOT, 'Gauntlet_TTS_Review_Scaffold.json'), text);
  console.log(`Finalized ${result.sidewaysCount} landscape supplemental card objects, normalized ${result.landscapeCardCount} landscape cards to standard CardCustom scale/orientation, and normalized ${result.trackerCount} rounded card-like tracker tiles in ${relative(ROOT, versionedPath)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
