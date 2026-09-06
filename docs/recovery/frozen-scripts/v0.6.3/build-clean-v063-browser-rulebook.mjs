import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outputDir = 'artifacts/reconstruction/clean-v0.6.3/browser-rulebook';
const rulebookPath = 'artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md';
const certificationPath = 'artifacts/reconstruction/clean-v0.6.3/complete-authority/authority-set.json';
const downstreamManifestPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/manifest.json';
const lifecyclePath = 'config/release-lifecycle.json';
const authoritySetId = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const rulebookSha256 = '7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643';
const downstreamCanonicalSha256 = '641c813366a8bcb52f9cb505ada640994d416024deed1f71a6ec59fb24ed2c4c';

const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const readJson = (relative) => JSON.parse(read(relative));
const hash = (content) => crypto.createHash('sha256').update(content).digest('hex');
const fileHash = (relative) => hash(fs.readFileSync(path.join(root, relative)));
const write = (relative, content) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, String(content).replace(/[ \t]+$/gm, '').replace(/\s+$/, '') + '\n', 'utf8');
};

const certification = readJson(certificationPath);
const downstream = readJson(downstreamManifestPath);
const lifecycle = readJson(lifecyclePath);
const rulebook = read(rulebookPath);

assert.equal(certification.target, 'clean-v0.6.3-complete');
assert.equal(certification.status, 'certified_on_manual_merge');
assert.equal(certification.authority_set_id, authoritySetId);
assert.equal(certification.publication_unlocked, false);
const certifiedRulebook = certification.authority_files.find((item) => item.path === rulebookPath);
assert(certifiedRulebook, 'Certified Rulebook is absent from the clean v0.6.3 authority set.');
assert.equal(certifiedRulebook.sha256, rulebookSha256);
assert.equal(fileHash(rulebookPath), rulebookSha256, 'Clean v0.6.3 Rulebook bytes drifted from certification.');
assert.equal(downstream.authority_set_id, authoritySetId);
assert(downstream.outputs.some((item) => item.path.endsWith('/canonical-data.json') && item.sha256 === downstreamCanonicalSha256), 'Merged clean canonical-data hash is not pinned by the downstream manifest.');
assert.equal(lifecycle.current_release, 'v0.6.1');
assert.equal(lifecycle.releases?.['v0.6.1']?.status, 'current');
assert.equal(lifecycle.releases?.['v0.6.3']?.status, 'withdrawn');
assert.equal(lifecycle.releases?.['v0.6.3']?.public_cutover, false);

for (const marker of [
  'Draw four cards',
  'Discard Pile',
  'Run the Gauntlet',
  'Last Stand',
  'Gambit/Tactic',
  'Bank:',
  'Manifest Destiny',
]) assert(rulebook.includes(marker), `Certified Rulebook is missing expected clean-v0.6.3 marker: ${marker}`);
assert(!rulebook.includes('Playable Deck'), 'Certified Rulebook contains retired Playable Deck wording.');

const baselinePaths = ['rulebook/app.js', 'rulebook/markdown.js', 'rulebook/styles.css', 'rulebook/publication.css'];
const uiBaseline = Object.fromEntries(baselinePaths.map((item) => [item, { git_role: 'v0.6.1-browser-ui-baseline-only', sha256: fileHash(item) }]));

let app = read('rulebook/app.js');
const assistantBlock = `  document.querySelector('[data-open-rules-assistant]')?.addEventListener('click', () => {\n    document.querySelector('.ga-rules-launcher')?.click();\n  });\n\n`;
assert(app.includes(assistantBlock), 'Public browser UI baseline no longer contains the expected Rules Arbiter launcher block.');
app = app
  .replace("const SOURCE_URL = '../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md';", "const SOURCE_URL = '../rulebook/Gauntlet_v0.6.3_Rulebook.md';")
  .replace("const PDF_URL = '../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.pdf';\n", `const AUTHORITY_SET_ID = '${authoritySetId}';\n`)
  .replace(assistantBlock, '')
  .replace('status.textContent = `Canonical v0.6.1 · ${sectionCount} sections · rendered from the official Markdown source`;', 'status.textContent = `Clean v0.6.3 reconstruction · ${sectionCount} sections · authority ${AUTHORITY_SET_ID.slice(0, 8)}… · rendered from certified Markdown`;')
  .replace('<p>Use the <a href="${PDF_URL}">official PDF</a> or <a href="${SOURCE_URL}">canonical Markdown source</a>.</p>', '<p>Use the <a href="${SOURCE_URL}">certified clean-v0.6.3 Markdown source</a>.</p>');
assert(!app.includes('PDF_URL'), 'Reconstruction app retained the unavailable PDF dependency.');
assert(!app.includes('data-open-rules-assistant'), 'Reconstruction app retained the unreconstructed Rules Arbiter dependency.');
assert(app.includes("../rulebook/Gauntlet_v0.6.3_Rulebook.md"));

let markdown = read('rulebook/markdown.js');
const imageRewriteA = "    return `../images/${unwrapped.slice('../../images/'.length)}`;";
const imageRewriteB = "    return `../${unwrapped}`;";
assert(markdown.includes(imageRewriteA) && markdown.includes(imageRewriteB), 'Markdown renderer image normalization baseline changed.');
markdown = markdown
  .replace(imageRewriteA, "    return `../../../../images/${unwrapped.slice('../../images/'.length)}`;")
  .replace(imageRewriteB, "    return `../../../../${unwrapped}`;");

const styles = `${read('rulebook/styles.css')}\n\n/* Reconstruction-only status treatment. */\n.reconstruction-banner { width: min(1380px, calc(100% - 40px)); margin: 1rem auto 0; padding: .75rem 1rem; position: relative; z-index: 2; border: 1px solid #9a6e21; background: #fff1c6; color: #4a3412; font-weight: 700; }\n.reconstruction-note { color: var(--muted); font-size: .9rem; }`;
const publicationCss = read('rulebook/publication.css');

const index = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <meta name="theme-color" content="#8f1f25" />
  <meta name="description" content="Searchable reconstruction browser for the certified clean Gauntlet v0.6.3 Rulebook." />
  <title>Gauntlet clean v0.6.3 Browser Rulebook — Reconstruction</title>
  <link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1" />
  <link rel="stylesheet" href="styles.css" />
  <link rel="stylesheet" href="publication.css" />
</head>
<body>
  <div class="reconstruction-banner">Clean v0.6.3 reconstruction candidate · not the current public release · publication remains locked.</div>
  <header class="rulebook-header">
    <a class="brand" href="../../../../" aria-label="Return to the Gauntlet home page"><span class="brand-mark" aria-hidden="true">G</span><span>Gauntlet</span></a>
    <div class="header-actions"><a href="../../../../rulebook/">Current public rules (v0.6.1)</a><a href="../../../../">Home</a></div>
  </header>

  <section class="rulebook-hero">
    <div class="hero-copy">
      <p class="eyebrow">Certified clean rules · version 0.6.3 · reconstruction only</p>
      <h1>Browser Rulebook</h1>
      <p class="hero-lede">The complete certified clean-v0.6.3 Rulebook, rendered from the approved authority source for downstream review.</p>
      <p class="source-status" data-rulebook-status aria-live="polite">Loading the certified clean-v0.6.3 Rulebook…</p>
    </div>
    <div class="hero-art" aria-hidden="true"><img src="../../../../images/sketches/hero sketch.png" alt="" decoding="async" /></div>
    <div class="hero-actions" aria-label="Rulebook actions">
      <a href="../rulebook/Gauntlet_v0.6.3_Rulebook.md">Certified Markdown</a>
      <button type="button" data-print-rulebook>Print browser view</button>
    </div>
  </section>

  <button class="toc-toggle" type="button" aria-expanded="false" aria-controls="rulebook-sidebar" data-toc-toggle>Contents and search</button>

  <main class="rulebook-shell">
    <aside id="rulebook-sidebar" class="rulebook-sidebar" data-rulebook-sidebar>
      <form class="rulebook-search" role="search" data-rulebook-search>
        <label for="rulebook-search-input">Search this rulebook</label>
        <div><input id="rulebook-search-input" type="search" placeholder="Gambit, Tactic, Assets, Last Stand…" autocomplete="off" /><button type="submit">Search</button></div>
        <p class="search-status" data-search-status aria-live="polite"></p>
      </form>
      <nav class="rulebook-toc" aria-label="Rulebook contents" data-rulebook-toc><span class="toc-loading">Loading contents…</span></nav>
      <div class="source-links">
        <strong>Reconstruction source</strong>
        <a href="../rulebook/Gauntlet_v0.6.3_Rulebook.md">Certified clean-v0.6.3 Markdown</a>
        <span class="reconstruction-note">PDF and Rules Arbiter surfaces are intentionally absent until their own clean downstream regeneration passes.</span>
      </div>
    </aside>
    <article class="rulebook-content" data-rulebook-content aria-busy="true">
      <div class="loading-card" role="status"><span class="loading-mark" aria-hidden="true">G</span><div><strong>Opening the Rulebook</strong><p>Loading the certified clean-v0.6.3 Markdown source.</p></div></div>
    </article>
  </main>

  <footer>
    <p><strong>Gauntlet clean v0.6.3</strong> · Reconstruction candidate · authority set <code>${authoritySetId}</code>.</p>
    <p>Current public playtest release remains v0.6.1. Copyright © 2026 Tymon Scott. All rights reserved.</p>
  </footer>

  <noscript><div class="noscript">JavaScript is required for the browser-rendered Rulebook. Read the <a href="../rulebook/Gauntlet_v0.6.3_Rulebook.md">certified clean-v0.6.3 Markdown source</a>.</div></noscript>
  <script type="module" src="app.js"></script>
</body>
</html>`;

write(`${outputDir}/index.html`, index);
write(`${outputDir}/app.js`, app);
write(`${outputDir}/markdown.js`, markdown);
write(`${outputDir}/styles.css`, styles);
write(`${outputDir}/publication.css`, publicationCss);

const sourceBoundary = `# Clean v0.6.3 Browser Rulebook — source boundary

This is a downstream reconstruction surface, not release authority and not a public cutover.

- Binding rules source: \`${rulebookPath}\`, bound by complete authority set \`${authoritySetId}\`.
- Complete authority provenance: \`${certificationPath}\` binds this Rulebook and the clean machine-readable authority set; Browser Rulebook rules content still comes only from the Rulebook Markdown.
- UI/renderer baseline only: the current public v0.6.1 \`rulebook/\` browser implementation. Its rules content, release labels, downloads, and Rules Arbiter integration are not inherited.
- Clean downstream canonical-data prerequisite: \`${downstreamManifestPath}\`, pinned by SHA-256 \`${downstreamCanonicalSha256}\`; this Browser Rulebook does not reinterpret card data.
- Withdrawn v0.6.2/v0.6.3 release documents and the historical \`v0.6.3/rulebook/\` page are not content authority.
- Rules Arbiter and regenerated PDF/print links are intentionally excluded until those later downstream surfaces are rebuilt.
- Public lifecycle remains v0.6.1 current; v0.6.3 remains withdrawn; publication remains locked.
`;
write(`${outputDir}/source-boundary.md`, sourceBoundary);

const validationStatus = `# Clean v0.6.3 Browser Rulebook — validation status

- Complete authority set: \`${authoritySetId}\`
- Certified Rulebook SHA-256: \`${rulebookSha256}\`
- Clean downstream canonical-data prerequisite SHA-256: \`${downstreamCanonicalSha256}\`
- Searchable browser uses the certified Rulebook directly rather than a copied or withdrawn v0.6.3 document.
- Public v0.6.1 browser is reused only as renderer/visual architecture.
- Rules Arbiter integration: intentionally absent pending its own reconstruction.
- PDF/print artifact links: intentionally absent pending print regeneration.
- Public cutover: **locked**.
`;
write(`${outputDir}/validation-status.md`, validationStatus);

const outputFiles = ['index.html', 'app.js', 'markdown.js', 'styles.css', 'publication.css', 'source-boundary.md', 'validation-status.md'];
const outputs = outputFiles.map((name) => {
  const relative = `${outputDir}/${name}`;
  const bytes = fs.readFileSync(path.join(root, relative));
  return { path: relative, sha256: hash(bytes), bytes: bytes.length, lines: bytes.toString('utf8').split('\n').length };
});
const manifest = {
  schema_version: 1,
  target: 'clean-v0.6.3-browser-rulebook',
  status: 'downstream_candidate_pending_merge_review',
  authority_set_id: authoritySetId,
  authority_certification: certificationPath,
  certified_rulebook: { path: rulebookPath, sha256: rulebookSha256 },
  downstream_prerequisite: { manifest: downstreamManifestPath, canonical_data_sha256: downstreamCanonicalSha256 },
  ui_baseline: uiBaseline,
  historical_v063_browser_role: 'ux_evidence_only_not_authority',
  historical_v063_browser_path: 'v0.6.3/rulebook/index.html',
  publication_unlocked: false,
  public_current_release: 'v0.6.1',
  rules_arbiter_integrated: false,
  pdf_links_integrated: false,
  outputs,
};
write(`${outputDir}/manifest.json`, JSON.stringify(manifest, null, 2));

console.log(`Built clean v0.6.3 Browser Rulebook reconstruction from certified authority ${authoritySetId.slice(0, 12)}… with ${outputs.length} hash-pinned browser/support outputs.`);
