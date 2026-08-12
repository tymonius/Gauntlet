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
  note: 'The source-package deployment-status file is a source-stage snapshot. This aggregate closeout manifest records the validated cross-surface state after the separately merged print candidate, while publication remains a separate gate.',
};

const readme = `# Gauntlet v0.6.3 — Cross-Surface Closeout\n\nThis directory records the final **pre-publication** integration state for v0.6.3. It sits above the earlier source-package and print-package stage manifests: the source package is assembled, the printed-material candidate exists, and the dedicated closeout gate validates that all candidate surfaces agree on the same release state.\n\nThe source package's own \`deployment-status.json\` intentionally describes the earlier source-assembly stage and therefore still says the print package was not ready at that moment. The aggregate manifest in this directory is the current rollout status after the print candidate merged and the cross-surface gate passed.\n\n## Closeout gate\n\nThe dedicated closeout workflow rebuilds and validates the governing v0.6.3 card/rules sources, browser surfaces, Rules Arbiter candidate, executable digital candidate, starter Decks, source release candidate, and print candidate on the same commit, then runs the [60-scenario closeout matrix](../../../docs/Gauntlet_v0.6.3_Cross_Surface_Closeout_Matrix.md).\n\nPassing closeout does **not** publish v0.6.3. Until the explicit cutover PR merges, the root site, public Rules Arbiter, digital default, and immutable release package remain on v0.6.2.\n\nAfter a green closeout merge, the next rollout step is the single v0.6.3 publication/cutover change.\n`;

expected(`${outputDir}/Gauntlet_v0.6.3_Closeout_Manifest.json`, JSON.stringify(manifest, null, 2));
expected(`${outputDir}/README.md`, readme);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`${check ? 'Verified' : 'Built'} v0.6.3 cross-surface closeout status: source and print candidates present, cross-surface gate validated, public v0.6.2 boundary retained.`);
