import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const PLAN_PATH = 'config/reconstruction-version-plan.json';
const CERT_DIR = 'artifacts/reconstruction/clean-v0.6.2/certification';
const MANIFEST_PATH = `${CERT_DIR}/authority-set.json`;
const REVIEW_PATH = `${CERT_DIR}/semantic-certification.md`;
const RULEBOOK_PATH = 'artifacts/reconstruction/clean-v0.6.2/rulebook/Gauntlet_v0.6.2_Rulebook.md';
const FACTION_ROOT = 'artifacts/reconstruction/clean-v0.6.2/faction-guides';

const factions = [
  { chapter: 13, slug: 'military', label: 'Military', file: 'Gauntlet_v0.6.2_Military_Faction_Guide.md' },
  { chapter: 14, slug: 'diplomat', label: 'Diplomats', file: 'Gauntlet_v0.6.2_Diplomat_Faction_Guide.md' },
  { chapter: 15, slug: 'financier', label: 'Financiers', file: 'Gauntlet_v0.6.2_Financier_Faction_Guide.md' },
  { chapter: 16, slug: 'intelligence', label: 'Intelligence', file: 'Gauntlet_v0.6.2_Intelligence_Faction_Guide.md' },
  { chapter: 17, slug: 'mystics', label: 'Mystics', file: 'Gauntlet_v0.6.2_Mystics_Faction_Guide.md' },
  { chapter: 18, slug: 'inquisition', label: 'Inquisition', file: 'Gauntlet_v0.6.2_Inquisition_Faction_Guide.md' },
];

const authorityFiles = [
  RULEBOOK_PATH,
  ...factions.map(({ slug, file }) => `${FACTION_ROOT}/${slug}/${file}`),
];

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const sha256 = (text) => crypto.createHash('sha256').update(text, 'utf8').digest('hex');
const fail = (message) => {
  throw new Error(`clean-v062-certification: ${message}`);
};

function normalizeIntegratedFaction(text) {
  return text
    .replaceAll('Do not create immediate or additional Action Opportunities or Action Windows.', 'Do not create additional Action phases or implicit same-phase Action permissions.')
    .replaceAll('Do not create immediate or additional Action phases or Action Windows.', 'Do not create additional Action phases or implicit same-phase Action permissions.')
    .replaceAll('Action Windows', 'Action phases')
    .replaceAll('Action Window', 'Action phase')
    .replaceAll('Action windows', 'Action phases')
    .replaceAll('Action window', 'Action phase')
    .replaceAll('using the Front Line rules in Section 6.', 'using the Front Line rules in Chapter 8.')
    .replaceAll('Follow the Action rules in Section 2.', 'Follow the Action rules in Chapter 5.')
    .replaceAll('The pending-battle and Terms procedure in Section 4 occurs before the battle reaches Onset.', 'The pending-battle and Terms procedure in Chapter 7 occurs before the battle reaches Onset.')
    .replaceAll('During an Denouement', 'During Denouement')
    .replaceAll('during an Denouement', 'during Denouement')
    .replace('### How it works\n', '## How it works\n')
    .replace('### Complete rules\n', '## Complete rules\n')
    .replace('### Faction Actions\n', '## Faction Actions\n');
}

function factionChapter({ chapter, slug, label, file }) {
  const guide = read(`${FACTION_ROOT}/${slug}/${file}`);
  const start = guide.search(/^# 1\. /m);
  const canonical = guide.search(/^# \d+\. Canonical /m);
  if (start < 0 || canonical < 0 || canonical <= start) fail(`cannot isolate authority sections for ${label}`);
  const body = guide.slice(start, canonical).trimEnd();
  const lines = body.split('\n');
  const rendered = [];
  let firstTop = true;
  for (const line of lines) {
    const top = /^# \d+\. (.+)$/.exec(line);
    if (top) {
      if (firstTop) {
        rendered.push(`# ${chapter}. ${label}`);
        firstTop = false;
      } else {
        rendered.push(`## ${top[1]}`);
      }
      continue;
    }
    if (line.startsWith('### ')) {
      rendered.push(`#${line}`);
      continue;
    }
    if (line.startsWith('## ')) {
      rendered.push(`#${line}`);
      continue;
    }
    rendered.push(line);
  }
  return normalizeIntegratedFaction(rendered.join('\n').trimEnd());
}

const rulebook = read(RULEBOOK_PATH);
for (const faction of factions) {
  const expected = factionChapter(faction);
  if (!rulebook.includes(expected)) fail(`Rulebook Part III does not exactly embed approved ${faction.label} authority sections after the approved integration normalization`);
}

const factionReview = read(`${FACTION_ROOT}/semantic-review.md`);
const rulebookReview = read('artifacts/reconstruction/clean-v0.6.2/rulebook/semantic-review.md');
if (!factionReview.includes('candidate ready for human merge review')) fail('missing faction semantic-review record');
if (!rulebookReview.includes('reviewed authority candidate; manual PR merge remains the human approval event')) fail('missing Rulebook semantic-review record');

const files = authorityFiles.map((file) => {
  const text = read(file);
  return {
    path: file,
    sha256: sha256(text),
    bytes: Buffer.byteLength(text, 'utf8'),
    lines: text.split('\n').length,
  };
});
const authoritySetId = sha256(files.map((entry) => `${entry.path}:${entry.sha256}`).join('\n'));

const manifest = {
  schema_version: 1,
  target: 'clean-v0.6.2',
  status: 'certified_on_merge',
  authority_set_id: authoritySetId,
  authority_base: 'v0.6.1',
  authority_files: files,
  approvals: {
    faction_authority_pr: 609,
    faction_authority_merge_commit: 'ded1206b7bd9a83b4d32ce3f2ef063ee609d8461',
    rulebook_authority_pr: 611,
    rulebook_authority_merge_commit: '5c8181c9a70af9dfdcd8b91153c80b6b6943e52e',
    certification_effect: 'Manual merge of the PR introducing this certification record applies the certified state on main.',
  },
  semantic_review_records: [
    `${FACTION_ROOT}/semantic-review.md`,
    'artifacts/reconstruction/clean-v0.6.2/rulebook/semantic-review.md',
    REVIEW_PATH,
  ],
  forbidden_authority_sources: [
    'releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Rulebook.md',
    'releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Faction_and_Component_Guide.md',
  ],
  publication_unlocked: false,
  clean_v063_authority_build_unlocked_on_merge: true,
};

const plan = JSON.parse(read(PLAN_PATH));
const v062 = plan.targets?.['clean-v0.6.2'];
const v063 = plan.targets?.['clean-v0.6.3'];
if (!v062 || !v063) fail('version plan is missing clean-v0.6.2 or clean-v0.6.3');
if (plan.publication_unlocked !== false) fail('publication must remain locked');
if (!['authority_build_approved', 'authority_certified'].includes(v062.status)) fail(`unexpected clean-v0.6.2 status ${v062.status}`);
if (!['blocked_on_clean_v062', 'authority_build_approved'].includes(v063.status)) fail(`unexpected clean-v0.6.3 status ${v063.status}`);

v062.status = 'authority_certified';
v062.certification = {
  basis: 'Manual merge of the clean v0.6.2 authority certification PR on main',
  faction_authority_pr: 609,
  faction_authority_merge_commit: 'ded1206b7bd9a83b4d32ce3f2ef063ee609d8461',
  rulebook_authority_pr: 611,
  rulebook_authority_merge_commit: '5c8181c9a70af9dfdcd8b91153c80b6b6943e52e',
  manifest: MANIFEST_PATH,
  authority_set_id: authoritySetId,
};
v063.status = 'authority_build_approved';
v063.authority_build_unlocked = true;
v063.unlock = {
  basis: 'certified_clean_v0.6.2_authority',
  manifest: MANIFEST_PATH,
  authority_set_id: authoritySetId,
  publication_unlocked: false,
};

const review = `# Clean v0.6.2 authority-set semantic certification

**Status:** certified on manual merge of this certification PR  
**Authority set:** \`${authoritySetId}\`  
**Public/current release remains:** v0.6.1  
**Publication:** locked

## Certified authority set

This certification binds exactly seven authority documents: the reconstructed self-contained Rulebook and the six reconstructed faction guides approved through PR #609 and PR #611. Their SHA-256 hashes are recorded in \`${MANIFEST_PATH}\`.

The certification validator recomputes every hash and reconstructs each faction chapter from its dedicated guide using the Rulebook integration transform plus the approved integration-only normalization. The resulting text must appear exactly in Part III of the certified Rulebook. This makes the shared Rulebook and dedicated faction authorities one coherent, pinned authority set rather than seven independently approved documents.

## Semantic boundary rechecked

- v0.6.2 setup remains draw four, keep three, place the fourth face down beneath the Draw Pile, then arrange Territories with the opening Hand known.
- Tokens begin before their own-end Territory.
- Turn structure remains Capture → Draw → Opening → Movement → Denouement → Cleanup.
- Faction Actions and Faction Abilities remain distinct.
- Pending battle → Terms → Onset remains the pre-battle sequence.
- Front Line, Defensive Edge, and the straight unmodified Tiebreak Roll remain the shared control/tie model.
- Normal victory remains cumulative: the opponent's final Territory must enter the attacker's Front Line before the normal Last Stand victory can occur.
- All twelve Leader ownership mappings remain intact through the exact Part III integration check.
- Reserves and Smuggler's Pass remain the v0.6.2 identities.

## Cross-version and publication boundary

Certification does not publish v0.6.2. The public/current release remains v0.6.1, and both historical v0.6.2 and v0.6.3 packages remain withdrawn.

Merging this certification unlocks **clean v0.6.3 authority construction only**. Clean v0.6.3 must derive from this certified authority set and apply only its verified deltas. The withdrawn v0.6.3 Rulebook and combined guide remain evidence only, and publication remains separately locked.
`;

fs.mkdirSync(path.join(ROOT, CERT_DIR), { recursive: true });
fs.writeFileSync(path.join(ROOT, MANIFEST_PATH), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(path.join(ROOT, REVIEW_PATH), review);
fs.writeFileSync(path.join(ROOT, PLAN_PATH), `${JSON.stringify(plan, null, 2)}\n`);

console.log(`Certified clean v0.6.2 authority-set candidate ${authoritySetId}; clean v0.6.3 authority construction is unlocked on merge; publication remains locked.`);
