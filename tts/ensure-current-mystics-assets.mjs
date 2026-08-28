import { access, readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { resolveCurrentTtsRelease, ROOT } from '../scripts/tts-current-catalog.mjs';

const RITUAL_ID = 'mystics-ritual-of-ascension';

async function loadJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function packagedRiteIds(currentGame) {
  const currentIds = new Set((currentGame.mystics?.rites || []).map(rite => `mystics-rite-${rite.id}`));
  if (!currentIds.size || !currentGame.mystics?.ritual?.id) {
    throw new Error('Current-game Mystics authority must expose a Rite pool and one Ritual.');
  }
  const ids = (currentGame.componentContract?.components || [])
    .filter(component => component.family === 'rite-card' && component.productionStatus === 'ready')
    .map(component => component.id);
  if (!ids.length) throw new Error('Current component contract exposes no production-ready Mystics Rite components.');
  for (const id of ids) {
    if (!currentIds.has(id)) throw new Error(`Production Rite component ${id} is not present in the current Rite pool.`);
  }
  return ids;
}

async function missingCurrentMysticsAssets(outputRoot, manifest, currentGame) {
  const riteIds = packagedRiteIds(currentGame);
  const requiredIds = [...riteIds, RITUAL_ID];
  const missing = [];
  for (const id of requiredIds) {
    const record = (manifest.ready || []).find(candidate => candidate.id === id);
    if (!record?.tts?.faceFile || !record?.tts?.backFile) {
      missing.push(id);
      continue;
    }
    try {
      await Promise.all([
        access(join(outputRoot, record.tts.faceFile)),
        access(join(outputRoot, record.tts.backFile)),
      ]);
    } catch {
      missing.push(id);
    }
  }
  return missing;
}

async function main() {
  const release = await resolveCurrentTtsRelease();
  const manifestPath = join(release.outputRoot, 'supplemental-manifest.json');
  const [manifest, currentGame] = await Promise.all([
    loadJson(manifestPath),
    loadJson(join(ROOT, 'game-data/current-game.json')),
  ]);

  const missingBefore = await missingCurrentMysticsAssets(release.outputRoot, manifest, currentGame);
  if (!missingBefore.length) {
    console.log('Current Mystics TTS bridge is already complete; preserving seeded Rite/Ritual assets.');
    return;
  }

  console.log(`Current Mystics TTS bridge is incomplete (${missingBefore.join(', ')}); refreshing production-ready Rites and the Ritual before release staging.`);
  execFileSync(process.execPath, [join(ROOT, 'tts/render-current-mystics-assets.mjs')], {
    cwd: ROOT,
    stdio: 'inherit',
  });

  const refreshed = await loadJson(manifestPath);
  const missingAfter = await missingCurrentMysticsAssets(release.outputRoot, refreshed, currentGame);
  if (missingAfter.length) {
    throw new Error(`Current Mystics TTS bridge refresh did not restore: ${missingAfter.join(', ')}.`);
  }
  console.log('Current Mystics TTS bridge restored before release staging.');
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
