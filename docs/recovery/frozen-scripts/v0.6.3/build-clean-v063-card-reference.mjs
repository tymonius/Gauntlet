import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputDir = 'artifacts/reconstruction/clean-v0.6.3/card-reference';
const authoritySetId = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const canonicalPath = 'artifacts/reconstruction/clean-v0.6.3/complete-authority/canonical-structured-data.json';
const canonicalSha256 = '9b79203f38d99d79202ccd834f8794a345513503505f1910b71665973dbb7851';

const out = (name) => path.join(root, outputDir, name);
fs.mkdirSync(path.join(root, outputDir), { recursive: true });

for (const [source, target] of [
  ['site.css', 'site.css'],
  ['card-reference/styles.css', 'styles.css'],
  ['card-reference/faction-colors.css', 'faction-colors.css'],
  ['card-reference/mobile-card-preview.css', 'mobile-card-preview.css'],
  ['card-reference/mobile-card-preview.js', 'mobile-card-preview.js'],
]) {
  fs.copyFileSync(path.join(root, source), out(target));
}

for (const required of ['index.html', 'app.js']) {
  if (!fs.existsSync(out(required))) throw new Error(`Missing reconstruction renderer: ${outputDir}/${required}`);
}

const manifest = {
  schema_version: 1,
  target: 'clean-v0.6.3-card-reference',
  status: 'downstream_candidate_pending_merge_review',
  authority_set_id: authoritySetId,
  authority_certification: 'artifacts/reconstruction/clean-v0.6.3/complete-authority/authority-set.json',
  canonical_structured_data: {
    path: canonicalPath,
    sha256: canonicalSha256,
  },
  ui_baseline: {
    role: 'public_v0.6.1_renderer_only_not_content_authority',
    files: [
      'site.css',
      'card-reference/index.html',
      'card-reference/app.js',
      'card-reference/styles.css',
      'card-reference/faction-colors.css',
      'card-reference/mobile-card-preview.css',
      'card-reference/mobile-card-preview.js',
    ],
  },
  outputs: [
    `${outputDir}/index.html`,
    `${outputDir}/app.js`,
    `${outputDir}/site.css`,
    `${outputDir}/styles.css`,
    `${outputDir}/faction-colors.css`,
    `${outputDir}/mobile-card-preview.css`,
    `${outputDir}/mobile-card-preview.js`,
    `${outputDir}/source-boundary.md`,
    `${outputDir}/validation-status.md`,
  ],
  playable_cards: 128,
  territories: 25,
  factions: 6,
  public_card_reference_modified: false,
  publication_unlocked: false,
  public_current_release: 'v0.6.1',
};

fs.writeFileSync(out('manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
fs.writeFileSync(out('source-boundary.md'), `# Clean v0.6.3 Card Reference source boundary\n\n## Binding gameplay source\n\nThis reconstruction reads the certified clean v0.6.3 structured authority directly at runtime:\n\n- \`${canonicalPath}\`\n- SHA-256: \`${canonicalSha256}\`\n- complete authority set: \`${authoritySetId}\`\n\nThe complete authority set is the content authority. The public v0.6.1 Card Reference is reused only as a UI/renderer baseline and is not content authority. The withdrawn v0.6.3 candidate and release-candidate payloads are not loaded.\n\n## Reconstruction behavior\n\nThe Card Reference exposes all 128 playable cards and 25 Territories from the clean structured authority, preserving six faction allegiances, stable IDs, effect labels, rules notes, Unique state, and Territory Arena state. The adapter explicitly verifies Second Line at \`neutral-reserves\` and Smuggler's Run at \`territory-smuggler-s-pass\`.\n\n## Publication firewall\n\nThe reconstruction lives only under \`${outputDir}/\`, is \`noindex,nofollow\`, and carries no production analytics tag. It does not modify the public \`card-reference/\` route, \`src/content/current.ts\`, release lifecycle state, print/TTS surfaces, or publication pointers. v0.6.1 remains the current public release and publication remains locked.\n`);
fs.writeFileSync(out('validation-status.md'), `# Clean v0.6.3 Card Reference validation status\n\nStatus before merge: **candidate**.\n\nThe dedicated gate must prove that the complete authority set and canonical structured-data hash are exact; the runtime adapter accepts exactly 128 playable cards, 25 Territories, and six factions; Second Line and Smuggler's Run retain their stable IDs; copied presentation assets remain byte-identical to the current Card Reference UI baseline; the reconstruction is noindex and analytics-free; withdrawn candidate data is not referenced; the public v0.6.1 Card Reference and current-release pointer remain untouched; and the diff stays confined to this reconstruction, its gate, and the analytics exclusion required for the noindex page.\n`);

console.log(`Materialized clean v0.6.3 Card Reference metadata and UI baseline assets in ${outputDir}.`);
