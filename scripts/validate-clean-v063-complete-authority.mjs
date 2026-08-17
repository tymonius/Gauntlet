import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outDir = 'artifacts/reconstruction/clean-v0.6.3/complete-authority';
const manifestPath = `${outDir}/authority-set.json`;
const canonicalPath = `${outDir}/canonical-structured-data.json`;
const cardPath = `${outDir}/cards.json`;
const territoryPath = `${outDir}/territories.json`;
const ledgerPath = `${outDir}/provenance-ledger.json`;
const snapshotPath = 'artifacts/reconstruction/evidence/v0.6.3/issue-405-finalized-card-tracker.md';
const snapshotMetadataPath = 'artifacts/reconstruction/evidence/v0.6.3/issue-405-finalized-card-tracker.json';
const downstreamPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json';
const lifecyclePath = 'config/release-lifecycle.json';
const candidatesPath = 'config/reconstruction-decision-candidates.json';

const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8').replace(/\r\n/g, '\n');
const json = (rel) => JSON.parse(read(rel));
const sha256 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');
const provenanceKeys = new Set([
  'source', 'source_candidate', 'v063_source', 'governing_sources',
  'inherits_from', 'release_manifest', 'provenance', 'authority_set_id',
]);
const topLevelProcessKeys = new Set([
  'version', 'name', 'date', 'status', 'publication_unlocked', 'authority_set_id',
  'authority', 'structural_baseline', 'evidence_payload', 'structured_authority', 'governing_sources',
  'starter_decks', 'normalization', 'release_manifest', 'inherits_from',
]);

function stripProvenance(value) {
  if (Array.isArray(value)) return value.map(stripProvenance);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !provenanceKeys.has(key))
    .map(([key, child]) => [key, stripProvenance(child)]));
}

function gameplayPayload(value) {
  const clean = stripProvenance(structuredClone(value));
  for (const key of topLevelProcessKeys) delete clean[key];
  return clean;
}

for (const rel of [manifestPath, canonicalPath, cardPath, territoryPath, ledgerPath, snapshotPath, snapshotMetadataPath]) {
  assert(fs.existsSync(path.join(root, rel)), `Missing complete-authority artifact: ${rel}`);
}

const manifest = json(manifestPath);
const canonical = json(canonicalPath);
const cardAuthority = json(cardPath);
const territoryAuthority = json(territoryPath);
const ledger = json(ledgerPath);
const snapshot = read(snapshotPath);
const snapshotMetadata = json(snapshotMetadataPath);
const lifecycle = json(lifecyclePath);
const candidates = json(candidatesPath);

assert.equal(manifest.target, 'clean-v0.6.3-complete');
assert.equal(manifest.status, 'certified_on_manual_merge');
assert.equal(manifest.publication_unlocked, false);
assert.equal(manifest.public_current_release, 'v0.6.1');
assert.equal(manifest.source_guards?.withdrawn_v062_canonical_hidden_during_pipeline, true);
assert.equal(manifest.source_guards?.old_v063_release_candidate_used_as_content_source, false);
assert.equal(manifest.source_guards?.stale_governance_traceability_used_as_authority, false);

for (const entry of manifest.authority_files ?? []) {
  assert.equal(sha256(read(entry.path)), entry.sha256, `Authority hash drifted: ${entry.path}`);
}
const computedAuthorityId = sha256((manifest.authority_files ?? [])
  .map((entry) => `${entry.path}:${entry.sha256}`)
  .join('\n'));
assert.equal(manifest.authority_set_id, computedAuthorityId, 'Complete authority-set ID drifted.');
for (const entry of manifest.evidence_files ?? []) {
  assert.equal(sha256(read(entry.path)), entry.sha256, `Evidence hash drifted: ${entry.path}`);
}

assert.equal(snapshotMetadata.source_comment_id, 5221286097);
assert.equal(snapshotMetadata.snapshot_path, snapshotPath);
assert.equal(snapshotMetadata.snapshot_sha256, sha256(snapshot));
assert.equal(snapshotMetadata.role.includes('offline'), true);

assert.equal(canonical.target, 'clean-v0.6.3-canonical-structured-authority');
assert.equal(canonical.publication_unlocked, false);
assert.equal(cardAuthority.count, 128);
assert.equal(cardAuthority.cards?.length, 128);
assert.equal(territoryAuthority.count, 25);
assert.equal(territoryAuthority.territories?.length, 25);
assert.deepEqual(cardAuthority.cards, canonical.gameplay.cards, 'Card projection drifted from canonical structured authority.');
assert.deepEqual(territoryAuthority.territories, canonical.gameplay.territories, 'Territory projection drifted from canonical structured authority.');

const counts = cardAuthority.cards.reduce((map, card) => {
  map[card.allegiance] = (map[card.allegiance] ?? 0) + 1;
  return map;
}, {});
assert.deepEqual(counts, {
  Mystics: 13,
  Inquisition: 13,
  Neutral: 50,
  Intelligence: 13,
  Military: 13,
  Financiers: 13,
  Diplomats: 13,
});
assert.equal(cardAuthority.cards.find((card) => card.id === 'neutral-reserves')?.name, 'Second Line');
assert.equal(territoryAuthority.territories.find((territory) => territory.id === 'territory-smuggler-s-pass')?.name, "Smuggler's Run");

const downstream = json(downstreamPath);
assert.deepEqual(
  canonical.gameplay,
  gameplayPayload(downstream),
  'Committed complete authority no longer matches the existing clean-v0.6.3 downstream gameplay payload.',
);
assert.equal(manifest.equality_target.path, downstreamPath);
assert.equal(manifest.equality_target.sha256, sha256(read(downstreamPath)));
assert.equal(manifest.equality_target.result, 'full_gameplay_payload_semantically_identical');

assert.equal(ledger.target, 'clean-v0.6.3-complete-authority');
assert.equal(ledger.publication_unlocked, false);
assert.equal(ledger.approval_bridge?.pr, 606);
assert.equal(ledger.approval_bridge?.merge_commit, 'e84e27958c7f6d8d4bd0390bdbac456b40adef1b');
assert.equal(ledger.decision_registry?.records?.length, candidates.decisions?.length);
assert(ledger.decision_registry.records.every((entry) => entry.historical_human_adoption_status === 'pending'));
assert(ledger.decision_registry.records.every((entry) => entry.approved_reconstruction_disposition !== 'pending'));
assert(ledger.non_authority_sources?.some((entry) => entry.path === 'governance/traceability.json'));
assert(ledger.non_authority_sources?.some((entry) => entry.path === 'artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Canonical_Data.json'));
assert(ledger.non_authority_sources?.some((entry) => entry.path === 'releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Canonical_Data.json'));

const forbiddenContentSource = 'artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Canonical_Data.json';
assert(!read(canonicalPath).includes(forbiddenContentSource), 'Historical v0.6.3 release candidate leaked into canonical authority.');
assert(!read(cardPath).includes(forbiddenContentSource), 'Historical v0.6.3 release candidate leaked into card authority.');
assert(!read(territoryPath).includes(forbiddenContentSource), 'Historical v0.6.3 release candidate leaked into Territory authority.');

const trackedCards = parseTracker(snapshot);
assert.equal(trackedCards.length, 21, 'Frozen #405 snapshot must contain exactly 21 finalized cards.');
const byName = new Map(cardAuthority.cards.map((card) => [card.name, card]));
for (const tracked of trackedCards) {
  const card = byName.get(tracked.name);
  assert(card, `Frozen #405 snapshot names unknown card: ${tracked.name}`);
  const actual = (card.effects ?? []).map((effect) => ({ label: effect.label, text: normalizeText(effect.text) }));
  const expected = tracked.effects.map((effect) => ({ label: effect.label, text: normalizeText(effect.text) }));
  assert.deepEqual(actual, expected, `Frozen #405 snapshot drift for ${tracked.name}.`);
}

assert.equal(lifecycle.current_release, 'v0.6.1');
assert.equal(lifecycle.releases?.['v0.6.2']?.status, 'withdrawn');
assert.equal(lifecycle.releases?.['v0.6.3']?.status, 'withdrawn');

console.log(`Validated clean-v0.6.3 complete authority ${manifest.authority_set_id}: 128 cards, 25 Territories, ${candidates.decisions?.length ?? 0} normalized provenance records, 21 frozen bespoke card sections, and zero gameplay drift.`);

function parseTracker(body) {
  const lines = body.replace(/\r/g, '').split('\n');
  const cards = [];
  let currentCard = null;
  let currentEffect = null;

  const flushEffect = () => {
    if (!currentCard || !currentEffect) return;
    currentEffect.text = trimBlankLines(currentEffect.lines).map(stripFormatting).join('\n');
    delete currentEffect.lines;
    currentCard.effects.push(currentEffect);
    currentEffect = null;
  };
  const flushCard = () => {
    flushEffect();
    if (currentCard) {
      if (!currentCard.effects.length) throw new Error(`Tracker section ${currentCard.name} has no effect text.`);
      cards.push(currentCard);
    }
    currentCard = null;
  };

  for (const line of lines) {
    const cardHeading = line.match(/^##\s+(.+?)\s*$/);
    if (cardHeading) {
      flushCard();
      currentCard = { name: cardHeading[1].trim(), effects: [] };
      continue;
    }
    if (!currentCard) continue;
    const effectHeading = line.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
    if (effectHeading) {
      flushEffect();
      currentEffect = { label: effectHeading[1].trim(), lines: effectHeading[2] ? [effectHeading[2]] : [] };
      continue;
    }
    if (currentEffect) currentEffect.lines.push(line);
  }
  flushCard();
  return cards;
}

function stripFormatting(line) {
  return line.replace(/\*\*/g, '').replace(/[ \t]+$/g, '');
}

function trimBlankLines(lines) {
  const result = [...lines];
  while (result.length && !result[0].trim()) result.shift();
  while (result.length && !result.at(-1).trim()) result.pop();
  return result;
}

function normalizeText(value) {
  return String(value ?? '')
    .replace(/\r/g, '')
    .split('\n')
    .map((line) => line.replace(/[ \t]+$/g, ''))
    .join('\n')
    .trim();
}
