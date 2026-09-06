import {
  AUTHORITY_SET_ID, RULEBOOK_SHA256, CANONICAL_SHA256, STARTERS_SHA256,
  RELEASE_DIR, CLEAN, RULEBOOK_SOURCE, CANONICAL_SOURCE, STARTERS_SOURCE, factionGuides,
  read, exists, syncText, publicGeneratedReference, finish
} from './publication-utils.mjs';

// Current digital pointer selects the clean v0.6.3 implementation, not the withdrawn src/v063 tree.
syncText('src/content/current.ts', `export {\n  CLEAN_V063_RULES_VERSION,\n  CLEAN_V063_AUTHORITY_TARGET,\n  cleanV063Content,\n  loadCleanV063Content,\n} from '../reconstruction/clean-v063/content';\nexport * from '../reconstruction/clean-v063/rules';\nexport * from '../reconstruction/clean-v063/cards';\nexport const CURRENT_RULES_VERSION = 'v0.6.3' as const;`);

// Release lifecycle changes currentness while preserving the original v0.6.3 package as locked evidence.
const lifecycle = JSON.parse(read('config/release-lifecycle.json'));
lifecycle.current_release = 'v0.6.3';
lifecycle.releases['v0.6.1'] = { ...(lifecycle.releases['v0.6.1'] || {}), status: 'historical' };
lifecycle.releases['v0.6.2'] = { ...(lifecycle.releases['v0.6.2'] || {}), status: 'withdrawn', artifacts_preserved: true, public_cutover: false };
const priorV063 = { ...(lifecycle.releases['v0.6.3'] || {}) };
delete priorV063.reason;
lifecycle.releases['v0.6.3'] = {
  ...priorV063,
  status: 'current',
  artifacts_preserved: true,
  public_cutover: true,
  historical_package_path: 'releases/v0.6.3/',
  current_reconstructed_package_path: `${RELEASE_DIR}/`,
  authority_set_id: AUTHORITY_SET_ID,
};
syncText('config/release-lifecycle.json', JSON.stringify(lifecycle, null, 2));

// Homepage publication copy and links.
let home = read('index.html')
  .replace('Current canonical playtest edition · v0.6.1', 'Current canonical playtest edition · v0.6.3')
  .replace('<div><dt>122</dt><dd>Playable cards</dd></div>', '<div><dt>128</dt><dd>Playable cards</dd></div>')
  .replace('Capture the opponent\'s final territory, advance beyond the column, and win the final battle.', 'Run the Gauntlet by capturing the Territory at the opponent\'s end or by forcing the opponent to make a Last Stand and winning the resulting battle.')
  .replace('from the canonical v0.6.1 sources.', 'from the canonical v0.6.3 sources.')
  .replace('complete v0.6.1 rules', 'complete v0.6.3 rules')
  .replace('<h3>v0.6.1 Deckbuilder</h3>', '<h3>v0.6.3 Deckbuilder</h3>')
  .replace('href="releases/v0.6.1/"', `href="${RELEASE_DIR}/"`)
  .replace('<h3>v0.6.1 Release</h3>', '<h3>v0.6.3 Release</h3>')
  .replace('Download the official rulebook, references, archived printables, canonical data, and manifest.', 'Download the certified Rulebook, faction guides, card reference, starter catalog, canonical data, exports, and manifest.')
  .replace('href="releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.pdf"', `href="${RELEASE_DIR}/Gauntlet_v0.6.3_Rulebook.pdf"`)
  .replaceAll('releases/v0.6.1/', `${RELEASE_DIR}/`)
  .replace(/v0\.6\.1/g, 'v0.6.3')
  .replace('<a href="#updates">Project updates</a>', '<a href="rules-arbiter/">Rules Arbiter</a>\n      <a href="#updates">Project updates</a>');
syncText('index.html', home);

// Publication manifest and release landing page. PDF hashes are filled by the renderer.
const releaseManifest = {
  schema_version: 1,
  release_version: 'v0.6.3',
  name: 'Third Playtest Revision — Clean Reconstruction',
  status: 'current_pending_live_verification',
  authority_set_id: AUTHORITY_SET_ID,
  publication_date: '2026-08-14',
  historical_withdrawn_package_preserved_at: 'releases/v0.6.3/',
  current_package_path: `${RELEASE_DIR}/`,
  binding_sources: {
    rulebook: { path: RULEBOOK_SOURCE, sha256: RULEBOOK_SHA256 },
    canonical_data: { path: CANONICAL_SOURCE, sha256: CANONICAL_SHA256 },
    approved_starters: { path: STARTERS_SOURCE, sha256: STARTERS_SHA256 },
  },
  counts: { playable_cards: 128, territories: 25, factions: 6, leaders: 12, starter_decks: 12, print_pdfs: 9, json_exports: 3 },
  public_defaults: { website: 'v0.6.3', browser_tools: 'v0.6.3', rules_arbiter: 'v0.6.3', digital_rules: 'v0.6.3' },
  public_routes: { start: '/start/', rulebook: '/rulebook/', card_reference: '/card-reference/', factions: '/factions/', deckbuilder: '/deckbuilder/', rules_arbiter: '/rules-arbiter/' },
  json_exports: [
    'Gauntlet_v0.6.3_Canonical_Data.json',
    'Gauntlet_v0.6.3_Starter_Decks.json',
    'Gauntlet_v0.6.3_Deck_Export_Schema.json',
  ],
  pdf_outputs: [],
  post_merge_verification: { gauntlet_run: 'pending_after_merge', production_workers: 'pending_after_merge', publication_complete_only_after_both_pass: true },
};
syncText(`${RELEASE_DIR}/Gauntlet_v0.6.3_Manifest.json`, JSON.stringify(releaseManifest, null, 2));

// This landing page is itself sealed into the manifest. Include production analytics and
// standard site icons before the renderer records payload hashes so later sync checks are no-ops.
const googleTag = `  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-8YYYZJGGPE"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-8YYYZJGGPE');
  </script>`;
const faviconLinks = `  <link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1" />`;
const releaseIndex = `<!doctype html>\n<html lang="en"><head>\n${googleTag}\n<meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" />\n${faviconLinks}\n<meta name="description" content="Gauntlet v0.6.3 clean reconstructed release package." /><link rel="canonical" href="https://gauntlet.run/${RELEASE_DIR}/" /><title>Gauntlet v0.6.3 Release</title><link rel="stylesheet" href="../../site.css" /></head><body><header class="site-header"><a class="brand" href="../../"><span class="brand-mark">G</span><span>Gauntlet</span></a><nav><a href="../../start/">Start</a><a href="../../rulebook/">Rulebook</a><a href="../../deckbuilder/">Deckbuilder</a><a href="../../card-reference/">Card Reference</a></nav></header><main class="section"><p class="eyebrow">Current canonical playtest release</p><h1>Gauntlet v0.6.3</h1><p>This package is materialized from the certified clean reconstruction authority set <code>${AUTHORITY_SET_ID}</code>. The original withdrawn <code>releases/v0.6.3/</code> package remains preserved as historical evidence and is not this current package.</p><h2>Print documents</h2><ul><li><a href="Gauntlet_v0.6.3_Rulebook.pdf">Rulebook PDF</a> · <a href="Gauntlet_v0.6.3_Rulebook.md">Markdown</a></li>${factionGuides.map(([label, route]) => `<li><a href="Gauntlet_v0.6.3_${label}_Faction_Guide.pdf">${label} Faction Guide PDF</a> · <a href="faction-guides/${route}/Gauntlet_v0.6.3_${label === 'Diplomats' ? 'Diplomat' : label === 'Financiers' ? 'Financier' : label}_Faction_Guide.md">Markdown</a></li>`).join('')}<li><a href="Gauntlet_v0.6.3_Card_and_Territory_Reference.pdf">Card and Territory Reference PDF</a></li><li><a href="Gauntlet_v0.6.3_Starter_Deck_Catalog.pdf">Starter Deck Catalog PDF</a></li></ul><h2>Data and exports</h2><ul><li><a href="Gauntlet_v0.6.3_Canonical_Data.json">Canonical Data JSON</a></li><li><a href="Gauntlet_v0.6.3_Starter_Decks.json">Approved Starter Decks JSON</a></li><li><a href="Gauntlet_v0.6.3_Deck_Export_Schema.json">Deck Export Schema JSON</a></li><li><a href="Gauntlet_v0.6.3_Manifest.json">Release Manifest</a></li></ul></main><footer><p>Copyright © 2026 Tymon Scott. All rights reserved.</p></footer></body></html>`;
syncText(`${RELEASE_DIR}/index.html`, releaseIndex);

// The print/export builder owns the exact reference/catalog semantics; copy its generated Markdown/JSON when available.
const generated = `${CLEAN}/print-export/generated`;
if (exists(`${generated}/markdown/Gauntlet_clean-v0.6.3_Card_and_Territory_Reference.md`)) {
  syncText(`${RELEASE_DIR}/Gauntlet_v0.6.3_Card_and_Territory_Reference.md`, publicGeneratedReference(read(`${generated}/markdown/Gauntlet_clean-v0.6.3_Card_and_Territory_Reference.md`), 'cards'));
  syncText(`${RELEASE_DIR}/Gauntlet_v0.6.3_Starter_Deck_Catalog.md`, publicGeneratedReference(read(`${generated}/markdown/Gauntlet_clean-v0.6.3_Starter_Deck_Catalog.md`), 'starters'));
  const deckSchema = JSON.parse(read(`${generated}/json/Gauntlet_clean-v0.6.3_Deck_Export_Schema.json`));
  deckSchema.version = 'v0.6.3-deck-export';
  deckSchema.publication_unlocked = true;
  deckSchema.current_public_release = 'v0.6.3';
  syncText(`${RELEASE_DIR}/Gauntlet_v0.6.3_Deck_Export_Schema.json`, JSON.stringify(deckSchema, null, 2));
}

finish('Clean v0.6.3 release metadata/homepage');
