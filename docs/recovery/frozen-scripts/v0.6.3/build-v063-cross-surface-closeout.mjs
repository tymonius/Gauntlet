import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const check = process.argv.includes('--check');
const outputDir = 'artifacts/v0.6.3/closeout';
const failures = [];
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const readJson = (relativePath) => JSON.parse(read(relativePath));
const normalize = (value) => String(value).replace(/\r\n/g, '\n').replace(/\s+$/, '') + '\n';

function required(relativePath) {
  if (!fs.existsSync(path.join(root, relativePath))) {
    throw new Error(`Missing v0.6.3 closeout input: ${relativePath}`);
  }
}

function expected(relativePath, content) {
  const target = path.join(root, relativePath);
  const output = normalize(content);
  if (check) {
    if (!fs.existsSync(target)) failures.push(`Missing closeout output: ${relativePath}`);
    else if (read(relativePath) !== output) failures.push(`Stale closeout output: ${relativePath}`);
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, 'utf8');
}

function filesUnder(relativePath) {
  required(relativePath);
  const absolute = path.join(root, relativePath);
  const stat = fs.statSync(absolute);
  if (stat.isFile()) return [relativePath.replaceAll('\\', '/')];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const child = path.join(relativePath, entry.name).replaceAll('\\', '/');
    return entry.isDirectory() ? filesUnder(child) : [child];
  });
}

function fingerprint(inputs) {
  const files = [...new Set(inputs.flatMap(filesUnder))].sort();
  const hash = crypto.createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update('\0');
    hash.update(fs.readFileSync(path.join(root, file)));
    hash.update('\0');
  }
  return { algorithm: 'sha256', files: files.length, digest: hash.digest('hex') };
}

const sourceManifestPath = 'artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Manifest.json';
const sourceDeploymentPath = 'artifacts/v0.6.3/release-candidate/deployment-status.json';
const printManifestPath = 'artifacts/v0.6.3/print-candidate/Gauntlet_v0.6.3_Print_Manifest.json';
const matrixPath = 'docs/Gauntlet_v0.6.3_Cross_Surface_Closeout_Matrix.md';
for (const input of [sourceManifestPath, sourceDeploymentPath, printManifestPath, matrixPath]) required(input);

const source = readJson(sourceManifestPath);
const sourceDeployment = readJson(sourceDeploymentPath);
const print = readJson(printManifestPath);

if (source.release_version !== 'v0.6.3' || source.status !== 'candidate-not-published') {
  throw new Error('Source release candidate is not the expected unpublished v0.6.3 candidate.');
}
if (print.release_version !== 'v0.6.3' || print.status !== 'candidate-not-published') {
  throw new Error('Print candidate is not the expected unpublished v0.6.3 candidate.');
}

const semanticPrintInputs = [
  'artifacts/v0.6.3/print-candidate/html',
  printManifestPath,
];
const trackedCandidateInputs = [
  'artifacts/v0.6.3/release-candidate',
  ...semanticPrintInputs,
  'v0.6.3',
  'rules-assistant/v063-development-corpus.js',
  'rules-assistant/rules-deterministic-v063.js',
  'rules-assistant/worker-v063-candidate.js',
  'rules-assistant/worker-entry-v063-candidate.js',
  'src/content/v063.ts',
  'src/v063',
  'images/faction-symbols',
  'card-design',
];

const manifest = {
  version: 'v0.6.3-closeout-candidate',
  release_version: 'v0.6.3',
  previous_version: 'v0.6.2',
  status: 'candidate-not-published',
  prepared_date: '2026-08-12',
  source_package: 'artifacts/v0.6.3/release-candidate',
  print_package: 'artifacts/v0.6.3/print-candidate',
  closeout_matrix: matrixPath,
  counts: {
    playable_cards: source.playable_card_designs,
    territories: source.territories,
    arenas: source.arenas,
    proposals: source.proposals,
    factions: source.factions,
    leaders: source.leaders,
    starter_decks: source.starter_decks,
    print_pdfs: print.outputs?.length ?? 0,
  },
  stage_readiness: {
    source_package_ready: source.validation?.source_release_candidate_assembled === true && sourceDeployment.source_package_ready === true,
    print_package_ready: Array.isArray(print.outputs) && print.outputs.length === 11,
    cross_surface_gate: 'validated',
  },
  freshness: {
    source_package: fingerprint(['artifacts/v0.6.3/release-candidate']),
    print_semantics: fingerprint(semanticPrintInputs),
    tracked_candidate_surfaces: fingerprint(trackedCandidateInputs),
    pdf_bytes_intentionally_excluded: true,
  },
  component_gates: [
    'final-card-text',
    'player-facing-candidates',
    'canonical-data-candidate',
    'browser-development',
    'competitive-starters',
    'rules-arbiter-candidate',
    'digital-rules-candidate',
    'source-release-candidate',
    'print-candidate',
    'print-visual-regressions',
  ],
  publication_boundary: {
    published_version: 'v0.6.2',
    releases_v063_materialized: false,
    root_site_cutover: false,
    rules_arbiter_default_cutover: false,
    digital_default_cutover: false,
  },
  next_gate_after_green_closeout: 'v0.6.3 publication/cutover',
  note: 'The aggregate closeout manifest fingerprints tracked source, print-semantic, browser, shared card-design, Rules Arbiter, digital, and faction-symbol surfaces. Raw rendered PDF bytes are excluded because renderer metadata is nondeterministic; the workflow re-renders and validates every PDF from the fingerprinted print semantics on each closeout run.',
};

const readme = `# Gauntlet v0.6.3 — Cross-Surface Closeout\n\nThis directory records the final **pre-publication** integration state for v0.6.3. The dedicated closeout gate rebuilds the source package and printed-material package from the same current candidate, then validates that all candidate surfaces agree.\n\nThe source package's own \`deployment-status.json\` intentionally describes the source-assembly stage. The aggregate manifest here is the current rollout status after the full source + print + cross-surface gate passes.\n\n## Freshness lock\n\nThe closeout manifest stores SHA-256 fingerprints for the tracked source package, print HTML + manifest, development browser surfaces, shared card-design code, Rules Arbiter candidate, digital v0.6.3 modules, and faction-symbol assets. A later change to those tracked candidate surfaces makes the materialized closeout record stale; publication validation must fail until closeout is rebuilt.\n\nRaw PDF bytes are deliberately excluded from the fingerprint because Chromium/PDF tooling can rewrite document metadata without changing the rendered pages. The closeout workflow instead re-renders all 11 PDFs from the fingerprinted print semantics every run and applies the print and visual-regression validators to those fresh files.\n\n## Closeout gate\n\nThe dedicated closeout workflow rebuilds and validates the governing v0.6.3 card/rules sources, browser surfaces, shared card rendering/inspection code, Rules Arbiter candidate, executable digital candidate, finalized starter Decks, source release candidate, and print candidate on the same commit, then runs the [60-scenario closeout matrix](../../../docs/Gauntlet_v0.6.3_Cross_Surface_Closeout_Matrix.md).\n\nPassing closeout does **not** publish v0.6.3. Until the explicit cutover PR merges, the root site, public Rules Arbiter, digital default, and immutable release package remain on v0.6.2.\n\nAfter a green closeout merge, the next rollout step is the single v0.6.3 publication/cutover change.\n`;

expected(`${outputDir}/Gauntlet_v0.6.3_Closeout_Manifest.json`, JSON.stringify(manifest, null, 2));
expected(`${outputDir}/README.md`, readme);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`${check ? 'Verified' : 'Built'} v0.6.3 cross-surface closeout status: tracked source and print semantics fingerprinted, fresh PDFs validated separately, cross-surface gate validated, public v0.6.2 boundary retained.`);
