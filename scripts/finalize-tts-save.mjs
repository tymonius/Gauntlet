import { readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';

const SUPPLEMENTAL_GUID_NOTE_PREFIX = 'gauntlet:supplemental:';
const STALE_SCAFFOLD_NOTE = 'This scaffold intentionally does not yet include faction-specific supplemental trackers or secondary components. Rules remain manual.';
const ASSEMBLED_SCAFFOLD_NOTE = 'Faction supplemental components with a production-ready TTS export are included in each matching starter kit. Rules remain manual.';
const STANDARD_CARD_SHORT_EDGE = 2.5;
const STANDARD_CARD_LONG_EDGE = 3.5;
const LANDSCAPE_CARD_SCALE = STANDARD_CARD_SHORT_EDGE / STANDARD_CARD_LONG_EDGE;

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

function normalizeLandscapeCardSize(object) {
  if (object?.Name !== 'CardCustom' || object.SidewaysCard !== true) return false;
  if (!object.Transform || typeof object.Transform !== 'object') {
    throw new Error(`Landscape card ${object.Nickname || object.GUID || 'unknown'} has no Transform.`);
  }

  // TTS derives a landscape custom card's native footprint from the landscape
  // face-cell aspect ratio. SidewaysCard changes card presentation/ALT zoom; it
  // does not make a 560x400 cell physically equivalent to a 400x560 portrait
  // card. Normalize X/Z by 2.5/3.5 so every landscape card occupies the same
  // 3.5 x 2.5 tabletop footprint as a normal 2.5 x 3.5 card rotated 90 degrees.
  object.Transform.scaleX = LANDSCAPE_CARD_SCALE;
  object.Transform.scaleY = 1;
  object.Transform.scaleZ = LANDSCAPE_CARD_SCALE;
  return true;
}

function trackerComponents(supplementalManifest) {
  return new Map((supplementalManifest.ready || [])
    .filter(component => component.representation === 'sliding-tracker')
    .map(component => [component.id, component]));
}

function normalizeTrackerTileSize(object, trackers) {
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
    throw new Error(`Sliding tracker ${id} declares ${width || '?'} x ${height || '?'} physical sizing; expected ${STANDARD_CARD_SHORT_EDGE} x ${STANDARD_CARD_LONG_EDGE}.`);
  }
  if (!object.CustomImage?.CustomTile) {
    throw new Error(`Sliding tracker ${id} has no CustomImage.CustomTile definition.`);
  }

  object.CustomImage.WidthScale = STANDARD_CARD_SHORT_EDGE;
  // With Stretch=true TTS forces a symmetric tile and destroys the 400x560
  // tracker aspect ratio. Preserve aspect instead: width 2.5 then naturally
  // yields the intended 3.5-card-height tracker.
  object.CustomImage.CustomTile.Stretch = false;
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
    if (normalizeLandscapeCardSize(object)) landscapeCardCount += 1;
    if (normalizeTrackerTileSize(object, trackers)) {
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
  console.log(`Finalized ${result.sidewaysCount} landscape supplemental card objects, normalized ${result.landscapeCardCount} landscape cards to the standard 3.5 x 2.5 footprint, and normalized ${result.trackerCount} card-sized tracker tiles in ${relative(ROOT, versionedPath)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
