import { readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';

const SUPPLEMENTAL_GUID_NOTE_PREFIX = 'gauntlet:supplemental:';
const STALE_SCAFFOLD_NOTE = 'This scaffold intentionally does not yet include faction-specific supplemental trackers or secondary components. Rules remain manual.';
const ASSEMBLED_SCAFFOLD_NOTE = 'Faction supplemental components with a production-ready TTS export are included in each matching starter kit. Rules remain manual.';

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

export function finalizeSupplementalObjectPresentation(save, supplementalManifest) {
  const sidewaysComponents = (supplementalManifest.ready || [])
    .filter(component => component.representation === 'card' && component.tts?.sidewaysCard === true);
  const sidewaysById = new Map(sidewaysComponents.map(component => [component.id, component]));
  const counts = new Map(sidewaysComponents.map(component => [component.id, 0]));
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

  refreshSaveInstructions(save);
  return { save, sidewaysCount };
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
  console.log(`Finalized ${result.sidewaysCount} landscape supplemental card objects in ${relative(ROOT, versionedPath)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
