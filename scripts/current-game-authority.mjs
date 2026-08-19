import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const CURRENT_GAME_MANIFEST_SOURCE = 'game-data/current-game.json';

let manifestPromise = null;

function repositoryPath(source) {
  const value = String(source || '').trim().replace(/^\/+/, '');
  if (!value) throw new Error('Current-game authority declared an empty source path.');
  return value;
}

export async function loadCurrentGameManifest() {
  if (!manifestPromise) {
    manifestPromise = readFile(join(ROOT, CURRENT_GAME_MANIFEST_SOURCE), 'utf8')
      .then(JSON.parse)
      .then(manifest => {
        if (manifest?.schemaVersion !== 1 || manifest?.authority !== 'current-game') {
          throw new Error('Invalid current-game authority manifest.');
        }
        return manifest;
      })
      .catch(error => {
        manifestPromise = null;
        throw error;
      });
  }
  return manifestPromise;
}

export async function resolveCurrentSourcePath(key) {
  const manifest = await loadCurrentGameManifest();
  const source = repositoryPath(manifest.sources?.[key]);
  return { manifest, source, absolutePath: join(ROOT, source) };
}

export async function readCurrentJsonSource(key) {
  const { manifest, source, absolutePath } = await resolveCurrentSourcePath(key);
  const data = JSON.parse(await readFile(absolutePath, 'utf8'));
  return { manifest, source, data };
}
