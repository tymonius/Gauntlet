import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const lifecyclePath = path.join(root, 'config', 'release-lifecycle.json');
const lifecycle = JSON.parse(fs.readFileSync(lifecyclePath, 'utf8'));
const version = lifecycle.current_release;
const release = lifecycle.releases?.[version];

if (!version || !release) throw new Error('Release lifecycle does not define a current release.');
if (release.status !== 'current' || release.public_cutover !== true) {
  throw new Error(`${version} is not an approved current public release.`);
}

const normalizeRepositoryPath = (label, value) => {
  const normalized = String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
  if (!/^scripts\/[a-z0-9][a-z0-9.-]*\.mjs$/i.test(normalized) || normalized.includes('..')) {
    throw new Error(`${version} has an invalid ${label}: ${JSON.stringify(value)}.`);
  }
  if (!fs.existsSync(path.join(root, normalized))) {
    throw new Error(`${version} ${label} does not exist: ${normalized}.`);
  }
  return normalized;
};

const sourceBuilder = normalizeRepositoryPath('publication source builder', release.publication?.source_builder);
const bookletRenderer = normalizeRepositoryPath('Rulebook booklet renderer', release.publication?.rulebook_booklet_renderer);
const releaseRoot = String(release.current_package_path || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
if (!/^releases\/v\d+\.\d+\.\d+$/.test(releaseRoot) || releaseRoot !== `releases/${version}`) {
  throw new Error(`${version} has an invalid current package path: ${JSON.stringify(release.current_package_path)}.`);
}
const bookletPath = `${releaseRoot}/Gauntlet_${version}_Rulebook_Booklet.pdf`;
const manifestPath = `${releaseRoot}/Gauntlet_${version}_Manifest.json`;
const plan = { version, releaseRoot, sourceBuilder, bookletRenderer, bookletPath, manifestPath };

if (process.argv.includes('--plan')) {
  console.log(JSON.stringify(plan));
  process.exit(0);
}

const run = script => {
  const result = spawnSync(process.execPath, [script], { cwd: root, env: process.env, stdio: 'inherit' });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${script} failed with exit code ${result.status}.`);
};

run(sourceBuilder);
run(bookletRenderer);

for (const required of [bookletPath, manifestPath]) {
  if (!fs.existsSync(path.join(root, required))) throw new Error(`Current Rulebook booklet build omitted ${required}.`);
}

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\nrelease_root=${releaseRoot}\nbooklet_path=${bookletPath}\nmanifest_path=${manifestPath}\n`);
}

console.log(`Rendered the current ${version} Rulebook booklet through lifecycle-selected publication adapters.`);
