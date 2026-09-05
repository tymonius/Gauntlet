import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const SOURCE_AUTHORITY_PATHS = Object.freeze([
  'rulebook/player-facing/current-rulebook.md',
  'game-data/current-game.json',
]);
export const REFINEMENT_LEDGER_PATH = 'rules-assistant/refinement-resolution-ledger.json';
export const REFINEMENT_LEDGER_SCHEMA = 'gauntlet.rules-refinement-resolution-ledger.v1';

function normalize(value) {
  return String(value || '').replaceAll('\\', '/').replace(/^\.\//, '');
}

function text(value) {
  return String(value == null ? '' : value).trim();
}

function interactionIds(value) {
  return Array.isArray(value) ? value.map(text).filter(Boolean) : [];
}

function hasResolutionBinding(entry) {
  const binding = entry?.binding;
  return Boolean(
    text(binding?.authoritySetId)
    || text(binding?.behaviorRevision)
    || text(binding?.commit)
  );
}

export function validateResolutionLedger(ledger) {
  const failures = [];
  if (!ledger || ledger.schema !== REFINEMENT_LEDGER_SCHEMA || !Array.isArray(ledger.entries)) {
    return {
      ok: false,
      failures: ['Resolution ledger must use gauntlet.rules-refinement-resolution-ledger.v1 and contain an entries array.'],
      resolvedByInteractionId: new Map(),
    };
  }

  const entryIds = new Set();
  const resolvedByInteractionId = new Map();
  for (const entry of ledger.entries) {
    const id = text(entry?.id);
    const status = text(entry?.status);
    if (!id) failures.push('Every resolution entry requires a stable id.');
    else if (entryIds.has(id)) failures.push(`Duplicate resolution entry id: ${id}.`);
    else entryIds.add(id);

    if (!['pending', 'resolved', 'superseded'].includes(status)) {
      failures.push(`Resolution ${id || '(unnamed)'} has unsupported status ${status || '(blank)'}.`);
    }
    if (status !== 'resolved') continue;

    const ids = interactionIds(entry?.interactionIds);
    if (!ids.length) failures.push(`Resolved entry ${id || '(unnamed)'} must record at least one interaction ID.`);
    if (!text(entry?.rootCause)) failures.push(`Resolved entry ${id || '(unnamed)'} must record its root cause.`);
    if (!text(entry?.resolutionSurface)) failures.push(`Resolved entry ${id || '(unnamed)'} must record its resolution surface.`);
    if (!text(entry?.summary)) failures.push(`Resolved entry ${id || '(unnamed)'} must summarize the systemic fix.`);
    if (!text(entry?.resolvedAt)) failures.push(`Resolved entry ${id || '(unnamed)'} must record when the refinement was resolved.`);
    if (!hasResolutionBinding(entry)) {
      failures.push(`Resolved entry ${id || '(unnamed)'} must bind to an authoritySetId, behaviorRevision, or fix commit.`);
    }

    for (const interactionId of ids) {
      const existing = resolvedByInteractionId.get(interactionId);
      if (existing) failures.push(`Interaction ${interactionId} is resolved by both ${text(existing.id)} and ${id || '(unnamed)'}.`);
      else resolvedByInteractionId.set(interactionId, entry);
    }
  }

  return {
    ok: failures.length === 0,
    failures,
    resolvedByInteractionId,
  };
}

export function validateSourceFirstRefinements({ changedFiles = [], manifests = [], resolutionLedger = null } = {}) {
  const changed = new Set(changedFiles.map(normalize).filter(Boolean));
  const authorityChanges = SOURCE_AUTHORITY_PATHS.filter((file) => changed.has(file));
  const changedManifests = manifests.filter((entry) => {
    const manifestPath = normalize(entry?.path);
    return manifestPath && changed.has(manifestPath) && entry?.manifest?.schema === 'gauntlet.rules-refinement-manifest.v1';
  });
  const failures = [];
  const ledgerValidation = validateResolutionLedger(resolutionLedger);

  if ((changed.has(REFINEMENT_LEDGER_PATH) || changedManifests.length) && !ledgerValidation.ok) {
    failures.push({
      manifestPath: '',
      rootCause: '',
      reason: 'resolution_ledger_invalid',
      details: ledgerValidation.failures,
    });
  }

  if (changedManifests.length && !changed.has(REFINEMENT_LEDGER_PATH)) {
    failures.push({
      manifestPath: '',
      rootCause: '',
      reason: 'resolution_ledger_not_changed',
      details: [`Every new refinement manifest must update ${REFINEMENT_LEDGER_PATH} in the same PR.`],
    });
  }

  for (const entry of changedManifests) {
    const manifestPath = normalize(entry.path);
    const manifest = entry.manifest;
    const rootCause = text(manifest.rootCause);
    const reasonSignalCodes = Array.isArray(manifest?.remediation?.reasonSignalCodes)
      ? manifest.remediation.reasonSignalCodes.map(String)
      : [];

    if (manifest?.remediation?.sourceAuthorityRequired === true && !authorityChanges.length) {
      failures.push({
        manifestPath,
        rootCause,
        reason: 'source_authority_missing',
        reasonSignalCodes,
        details: [`Change at least one current authority source: ${SOURCE_AUTHORITY_PATHS.join(' or ')}.`],
      });
    }

    if (ledgerValidation.ok) {
      const ids = interactionIds(manifest?.cluster?.interactionIds);
      const missing = ids.filter((id) => {
        const resolution = ledgerValidation.resolvedByInteractionId.get(id);
        return !resolution || text(resolution.rootCause) !== rootCause;
      });
      if (missing.length) {
        failures.push({
          manifestPath,
          rootCause,
          reason: 'resolution_coverage_missing',
          missingInteractionIds: missing,
          details: ['Every affected interaction must have a resolved ledger entry for this root cause before the refinement PR can merge.'],
        });
      }
    }
  }

  return {
    ok: failures.length === 0,
    authorityChanges,
    resolutionLedgerChanged: changed.has(REFINEMENT_LEDGER_PATH),
    resolvedInteractionCount: ledgerValidation.ok ? ledgerValidation.resolvedByInteractionId.size : 0,
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

function loadResolutionLedger(root) {
  const absolute = path.join(root, REFINEMENT_LEDGER_PATH);
  if (!fs.existsSync(absolute)) return null;
  return JSON.parse(fs.readFileSync(absolute, 'utf8'));
}

export function runSourceFirstValidation({ root = process.cwd(), changedFilesPath } = {}) {
  if (!changedFilesPath) throw new Error('Pass --changed-files <json-file>.');
  const changedFiles = readChangedFiles(changedFilesPath);
  const manifests = loadChangedManifests(root, changedFiles);
  const resolutionLedger = loadResolutionLedger(root);
  const result = validateSourceFirstRefinements({ changedFiles, manifests, resolutionLedger });

  if (!result.ok) {
    console.error('Rules refinement source-first / resolution contract failed.');
    for (const failure of result.failures) {
      if (failure.manifestPath) console.error(`- ${failure.manifestPath}: ${failure.reason}.`);
      else console.error(`- ${failure.reason}.`);
      if (failure.reasonSignalCodes?.length) console.error(`  signals: ${failure.reasonSignalCodes.join(', ')}`);
      if (failure.missingInteractionIds?.length) console.error(`  missing interaction IDs: ${failure.missingInteractionIds.join(', ')}`);
      for (const detail of failure.details || []) console.error(`  ${detail}`);
    }
    process.exitCode = 1;
  } else if (manifests.length) {
    console.log(`Rules refinement source-first / resolution contract passed with ${result.resolvedInteractionCount} resolved interaction ID(s) in the ledger${result.authorityChanges.length ? ` and authority changes: ${result.authorityChanges.join(', ')}` : ''}.`);
  } else if (changedFiles.includes(REFINEMENT_LEDGER_PATH)) {
    console.log(`Rules refinement resolution ledger is valid with ${result.resolvedInteractionCount} resolved interaction ID(s).`);
  } else {
    console.log('No changed Rules Arbiter refinement manifests require source-first / resolution validation.');
  }

  return result;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  const index = process.argv.indexOf('--changed-files');
  const changedFilesPath = index >= 0 ? process.argv[index + 1] : '';
  runSourceFirstValidation({ changedFilesPath });
}
