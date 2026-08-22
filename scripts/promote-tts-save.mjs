import { readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { CURRENT_ALIAS_ROOT, resolveCurrentTtsRelease, ROOT } from './tts-current-catalog.mjs';

const REVIEW_SENTENCE = 'Tabletop Simulator review scaffold.';
const FINAL_SENTENCE = 'Tabletop Simulator mod.';
const REQUIRED_QA_CHECKS = Object.freeze(['tableSetup', 'factionComponents', 'fullGame']);

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function requireVersion(value, expected, label) {
  if (String(value || '').trim() !== expected) {
    throw new Error(`${label} targets ${value || 'missing'}; expected ${expected}.`);
  }
}

export function validatePromotionGate({ release, readiness, qa }) {
  const version = String(release?.version || '').trim();
  if (!version) throw new Error('TTS promotion requires a resolved release version.');

  requireVersion(readiness?.gameVersion, version, 'TTS release-readiness report');
  if (readiness?.machineReady !== true) {
    const blockers = Array.isArray(readiness?.blockers) ? readiness.blockers : [];
    const details = blockers.map(blocker => blocker?.id).filter(Boolean).join(', ');
    throw new Error(`TTS save cannot be promoted until machine readiness passes${details ? `; blockers: ${details}` : ''}.`);
  }

  if (qa?.schemaVersion !== 1) throw new Error('TTS manual-QA record has an unsupported schemaVersion.');
  requireVersion(qa?.gameVersion, version, 'TTS manual-QA record');
  for (const check of REQUIRED_QA_CHECKS) {
    if (qa?.checks?.[check] !== true) throw new Error(`TTS manual-QA check is incomplete: ${check}.`);
  }
  if (qa?.approvedForWorkshop !== true) throw new Error('TTS manual-QA record is not approved for Workshop promotion.');

  return { version, checks: [...REQUIRED_QA_CHECKS] };
}

export function promoteSaveIdentity(save, version) {
  const promoted = structuredClone(save);
  promoted.SaveName = `Gauntlet ${version}`;

  for (const field of ['Note', 'Rules']) {
    const value = String(promoted[field] || '');
    promoted[field] = value
      .replace(`Gauntlet ${version} ${REVIEW_SENTENCE}`, `Gauntlet ${version} ${FINAL_SENTENCE}`)
      .replace(/review scaffold/gi, 'mod');
  }

  return promoted;
}

async function readJson(path, missingHint) {
  return JSON.parse(await readFile(path, 'utf8').catch(error => {
    if (error.code === 'ENOENT') throw new Error(`${missingHint}: ${relative(ROOT, path)}`);
    throw error;
  }));
}

async function main() {
  const checkOnly = process.argv.includes('--check');
  const release = await resolveCurrentTtsRelease();
  const qaPath = join(ROOT, 'tts', 'release-qa', `${release.version}.json`);
  const qa = await readJson(qaPath, 'Missing versioned TTS manual-QA record');

  if (checkOnly) {
    if (qa.schemaVersion !== 1) throw new Error('TTS manual-QA record has an unsupported schemaVersion.');
    requireVersion(qa.gameVersion, release.version, 'TTS manual-QA record');
    for (const check of REQUIRED_QA_CHECKS) {
      if (typeof qa?.checks?.[check] !== 'boolean') throw new Error(`TTS manual-QA record must declare boolean check ${check}.`);
    }
    if (typeof qa.approvedForWorkshop !== 'boolean') throw new Error('TTS manual-QA record must declare approvedForWorkshop as a boolean.');
    console.log(`TTS save-promotion source check passed for ${release.version}; manual QA status is ${qa.status || 'unspecified'}.`);
    return;
  }

  const readinessPath = join(release.outputRoot, 'tts-release-readiness.json');
  const reviewName = `Gauntlet_${release.version}_TTS_Review_Scaffold.json`;
  const reviewPath = join(release.outputRoot, reviewName);
  const [readiness, save] = await Promise.all([
    readJson(readinessPath, 'Run npm run tts:release:status before promotion'),
    readJson(reviewPath, 'Run npm run tts:package before promotion'),
  ]);

  validatePromotionGate({ release, readiness, qa });
  const promoted = promoteSaveIdentity(save, release.version);
  const finalName = `Gauntlet_${release.version}_TTS_Mod.json`;
  const finalPath = join(release.outputRoot, finalName);
  const text = jsonText(promoted);

  await writeFile(finalPath, text);
  await writeFile(join(CURRENT_ALIAS_ROOT, 'Gauntlet_TTS_Mod.json'), text);
  console.log(`Promoted QA-approved TTS save to ${relative(ROOT, finalPath)}.`);
  console.log(`Review scaffold preserved at ${relative(ROOT, reviewPath)}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}

export { REQUIRED_QA_CHECKS };
