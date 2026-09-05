import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_AUTHORITY_PATHS = Object.freeze([
  'rulebook/player-facing/current-rulebook.md',
  'game-data/current-game.json',
]);

function normalize(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '');
}

export function validateSourceFirstRefinements({ changedFiles = [], manifests = [] } = {}) {
  const changed = new Set(changedFiles.map(normalize).filter(Boolean));
  const authorityChanges = SOURCE_AUTHORITY_PATHS.filter((file) => changed.has(file));
  const failures = [];

  for (const entry of manifests) {
    const manifestPath = normalize(entry?.path);
    const manifest = entry?.manifest;
    if (!manifestPath || !changed.has(manifestPath)) continue;
    if (manifest?.schema !== 'gauntlet.rules-refinement-manifest.v1') continue;
    if (manifest?.remediation?.sourceAuthorityRequired !== true) continue;

    if (!authorityChanges.length) {
      failures.push({
        manifestPath,
        rootCause: String(manifest.rootCause || ''),
        reasonSignalCodes: Array.isArray(manifest?.remediation?.reasonSignalCodes)
          ? manifest.remediation.reasonSignalCodes.map(String)
          : [],
      });
    }
  }

  return {
    ok: failures.length === 0,
    authorityChanges,
    failures,
  };
}

function readChangedFiles(filePath) {
  const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!Array.isArray(parsed)) throw new Error('Changed-files input must be a JSON array.');
  return parsed.map(normalize).filter(Boolean);
}

function loadChangedManifests(root, changedFiles) {
  return changedFiles
    .filter((file) => file.startsWith('artifacts/rules-refinement/') && file.endsWith('.json'))
    .map((file) => {
      const absolute = path.join(root, file);
      if (!fs.existsSync(absolute)) return null;
      return { path: file, manifest: JSON.parse(fs.readFileSync(absolute, 'utf8')) };
    })
    .filter(Boolean);
}

export function runSourceFirstValidation({ root = process.cwd(), changedFilesPath } = {}) {
  if (!changedFilesPath) throw new Error('Pass --changed-files <json-file>.');
  const changedFiles = readChangedFiles(changedFilesPath);
  const manifests = loadChangedManifests(root, changedFiles);
  const result = validateSourceFirstRefinements({ changedFiles, manifests });

  if (!result.ok) {
    console.error('Rules refinement source-first contract failed.');
    for (const failure of result.failures) {
      console.error(`- ${failure.manifestPath} requires source-authority remediation.`);
      if (failure.reasonSignalCodes.length) {
        console.error(`  signals: ${failure.reasonSignalCodes.join(', ')}`);
      }
    }
    console.error(`Change at least one current authority source in the same PR: ${SOURCE_AUTHORITY_PATHS.join(' or ')}.`);
    process.exitCode = 1;
  } else if (manifests.length) {
    console.log(`Rules refinement source-first contract passed${result.authorityChanges.length ? ` with authority changes: ${result.authorityChanges.join(', ')}` : ''}.`);
  } else {
    console.log('No changed Rules Arbiter refinement manifests require source-first validation.');
  }

  return result;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const index = process.argv.indexOf('--changed-files');
  const changedFilesPath = index >= 0 ? process.argv[index + 1] : '';
  runSourceFirstValidation({ changedFilesPath });
}
