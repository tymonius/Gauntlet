import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = 'v0.7.0';
const QA_PATH = path.join(root, 'tts', 'release-qa', `${VERSION}.json`);

function fail(message) {
  throw new Error(`v0.7.0 TTS manual-QA gate: ${message}`);
}

function collectChecks(checks) {
  if (!checks || typeof checks !== 'object' || Array.isArray(checks)) {
    fail('checks must be an object grouped by QA area.');
  }

  const entries = [];
  for (const [group, groupChecks] of Object.entries(checks)) {
    if (!groupChecks || typeof groupChecks !== 'object' || Array.isArray(groupChecks)) {
      fail(`checks.${group} must be an object.`);
    }
    for (const [check, value] of Object.entries(groupChecks)) {
      if (typeof value !== 'boolean') fail(`checks.${group}.${check} must be boolean.`);
      entries.push({ group, check, value });
    }
  }
  return entries;
}

export function validateV070TtsManualQa(qa) {
  if (qa?.schemaVersion !== 2) fail(`unsupported schemaVersion ${qa?.schemaVersion ?? 'missing'}.`);
  if (qa?.gameVersion !== VERSION) fail(`gameVersion is ${qa?.gameVersion || 'missing'}; expected ${VERSION}.`);

  const checks = collectChecks(qa.checks);
  if (checks.length < 19) fail(`only ${checks.length} manual checks are declared; expected the complete 19-check v0.7.0 record.`);

  const incomplete = checks.filter(entry => entry.value !== true);
  if (incomplete.length) {
    fail(`publication remains blocked by ${incomplete.length} incomplete check(s): ${incomplete.map(entry => `${entry.group}.${entry.check}`).join(', ')}.`);
  }

  if (qa.approvedForWorkshop !== true) {
    fail('approvedForWorkshop must be true after successful in-game and remote-player QA.');
  }

  if (!Array.isArray(qa.notes)) fail('notes must be an array.');

  return { version: VERSION, checkCount: checks.length };
}

export function loadAndValidateV070TtsManualQa() {
  if (!fs.existsSync(QA_PATH)) fail(`missing ${path.relative(root, QA_PATH)}.`);
  const qa = JSON.parse(fs.readFileSync(QA_PATH, 'utf8'));
  return validateV070TtsManualQa(qa);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = loadAndValidateV070TtsManualQa();
    console.log(`v0.7.0 TTS manual-QA gate passed: ${result.checkCount} checks complete and Workshop approval recorded.`);
  } catch (error) {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  }
}
