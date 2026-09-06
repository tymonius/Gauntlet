import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const lifecycle = JSON.parse(fs.readFileSync(path.join(root, 'config', 'release-lifecycle.json'), 'utf8'));
const version = String(lifecycle.current_release || '');
const release = lifecycle.releases?.[version];

if (!version || !release) throw new Error('Release lifecycle does not define a current release.');
if (release.status !== 'current' || release.public_cutover !== true) {
  throw new Error(`${version} is not an approved current public release.`);
}

function repositoryPath(label, value, expression) {
  const normalized = String(value || '').replace(/\\/g, '/').replace(/^\.\//, '');
  if (!expression.test(normalized) || normalized.includes('..')) {
    throw new Error(`${version} has an invalid ${label}: ${JSON.stringify(value)}.`);
  }
  if (!fs.existsSync(path.join(root, normalized))) {
    throw new Error(`${version} ${label} does not exist: ${normalized}.`);
  }
  return normalized;
}

function endpointPath(label, value) {
  const normalized = String(value || '');
  if (!/^\/api\/[a-z0-9/_-]+$/i.test(normalized) || normalized.includes('//') || normalized.includes('..')) {
    throw new Error(`${version} has an invalid ${label}: ${JSON.stringify(value)}.`);
  }
  return normalized;
}

const packageRoot = String(release.current_package_path || '').replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
if (!/^releases\/v\d+\.\d+\.\d+$/.test(packageRoot) || packageRoot !== `releases/${version}`) {
  throw new Error(`${version} has an invalid current package path: ${JSON.stringify(release.current_package_path)}.`);
}

const arbiter = release.publication?.rules_arbiter;
if (!arbiter || typeof arbiter !== 'object' || Array.isArray(arbiter)) {
  throw new Error(`${version} does not define a Rules Arbiter publication adapter.`);
}
const workerSource = repositoryPath('Rules Arbiter worker source', arbiter.worker_source, /^rules-assistant\/[a-z0-9][a-z0-9.-]*\.js$/i);
const serviceBase = new URL(String(arbiter.service_base_url || ''));
if (serviceBase.protocol !== 'https:' || serviceBase.username || serviceBase.password || serviceBase.pathname !== '/' || serviceBase.search || serviceBase.hash) {
  throw new Error(`${version} has an invalid Rules Arbiter service base URL.`);
}
const serviceBaseUrl = serviceBase.href.replace(/\/$/, '');
const healthPath = endpointPath('Rules Arbiter health path', arbiter.health_path);
const corpusHealthPath = endpointPath('Rules Arbiter corpus-health path', arbiter.corpus_health_path);
const healthUrl = new URL(healthPath, `${serviceBaseUrl}/`).href;
const corpusHealthUrl = new URL(corpusHealthPath, `${serviceBaseUrl}/`).href;

const worker = fs.readFileSync(path.join(root, workerSource), 'utf8');
const revisionMatch = worker.match(/export const BEHAVIOR_REVISION\s*=\s*["']([^"']+)["']/);
if (!revisionMatch) throw new Error(`Could not read BEHAVIOR_REVISION from ${workerSource}.`);
if (!/^[a-z0-9][a-z0-9._-]{0,127}$/i.test(revisionMatch[1])) {
  throw new Error(`${workerSource} has an invalid BEHAVIOR_REVISION.`);
}

const manifestPath = `${packageRoot}/Gauntlet_${version}_Manifest.json`;
const manifest = JSON.parse(fs.readFileSync(path.join(root, manifestPath), 'utf8'));
if (manifest.release_version !== version || !/^[a-f0-9]{64}$/i.test(String(manifest.authority_set_id || ''))) {
  throw new Error(`${manifestPath} does not identify the current release authority set.`);
}

const plan = {
  version,
  workerSource,
  serviceBaseUrl,
  healthUrl,
  corpusHealthUrl,
  behaviorRevision: revisionMatch[1],
  manifestPath,
  authoritySetId: manifest.authority_set_id,
};

if (process.argv.includes('--plan')) {
  console.log(JSON.stringify(plan));
  process.exit(0);
}

if (process.env.GITHUB_OUTPUT) {
  fs.appendFileSync(process.env.GITHUB_OUTPUT, [
    `version=${plan.version}`,
    `worker_source=${plan.workerSource}`,
    `service_base_url=${plan.serviceBaseUrl}`,
    `health_url=${plan.healthUrl}`,
    `corpus_health_url=${plan.corpusHealthUrl}`,
    `behavior_revision=${plan.behaviorRevision}`,
    `manifest_path=${plan.manifestPath}`,
    `authority_set_id=${plan.authoritySetId}`,
    '',
  ].join('\n'));
}

console.log(`Resolved the current ${version} live-publication adapter.`);
