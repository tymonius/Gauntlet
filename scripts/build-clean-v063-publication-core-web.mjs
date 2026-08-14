import {
  AUTHORITY_SET_ID, RULEBOOK_SHA256, CANONICAL_SHA256, STARTERS_SHA256,
  RELEASE_DIR, CLEAN, RULEBOOK_SOURCE, CANONICAL_SOURCE, STARTERS_SOURCE, factionGuides,
  read, readBytes, hashFile, syncText, syncBytes, prune, copyText, currentize,
  publicAuthorityNote, publicFactionGuide, finish
} from './publication-utils.mjs';

if (hashFile(RULEBOOK_SOURCE) !== RULEBOOK_SHA256) throw new Error('Certified Rulebook hash drifted before publication.');
if (hashFile(CANONICAL_SOURCE) !== CANONICAL_SHA256) throw new Error('Canonical data hash drifted before publication.');
if (hashFile(STARTERS_SOURCE) !== STARTERS_SHA256) throw new Error('Starter data hash drifted before publication.');

syncText(`${RELEASE_DIR}/Gauntlet_v0.6.3_Rulebook.md`, publicAuthorityNote(read(RULEBOOK_SOURCE)));
for (const [label, route, authorityDir, file] of factionGuides) {
  const publishedName = label === 'Diplomats' ? 'Diplomat' : label === 'Financiers' ? 'Financier' : label;
  syncText(`${RELEASE_DIR}/faction-guides/${route}/Gauntlet_v0.6.3_${publishedName}_Faction_Guide.md`, publicFactionGuide(read(`${CLEAN}/faction-guides/${authorityDir}/${file}`)));
}
syncBytes(`${RELEASE_DIR}/Gauntlet_v0.6.3_Canonical_Data.json`, readBytes(CANONICAL_SOURCE));
syncBytes(`${RELEASE_DIR}/Gauntlet_v0.6.3_Starter_Decks.json`, readBytes(STARTERS_SOURCE));

prune('rulebook', new Set(['index.html','app.js','markdown.js','styles.css','publication.css']));
copyText(`${CLEAN}/browser-rulebook/markdown.js`, 'rulebook/markdown.js');
copyText(`${CLEAN}/browser-rulebook/styles.css`, 'rulebook/styles.css');
copyText(`${CLEAN}/browser-rulebook/publication.css`, 'rulebook/publication.css');
copyText(`${CLEAN}/browser-rulebook/index.html`, 'rulebook/index.html', (html) => currentize(html, 'Gauntlet v0.6.3 Browser Rulebook', 'Search and read the current canonical Gauntlet v0.6.3 Rulebook.', 'https://gauntlet.run/rulebook/')
  .replace('href="../../../../"', 'href="../"')
  .replace(/<div class="header-actions">.*?<\/div>/, '<div class="header-actions"><a href="../">Home</a><a href="../rules-arbiter/">Rules Arbiter</a><a href="../releases/v0.6.3-reconstructed/">Release package</a></div>')
  .replace('The complete certified clean-v0.6.3 Rulebook, rendered from the approved authority source for downstream review.', 'The complete canonical v0.6.3 Rulebook, rendered from the certified clean authority source.')
  .replaceAll('../rulebook/Gauntlet_v0.6.3_Rulebook.md', '../releases/v0.6.3-reconstructed/Gauntlet_v0.6.3_Rulebook.md')
  .replace('Reconstruction source', 'Canonical source')
  .replace(/<span class="reconstruction-note">[^<]*<\/span>/, '<span class="reconstruction-note">This browser view verifies the certified source before rendering.</span>')
  .replace(/<p><strong>Gauntlet clean v0\.6\.3<\/strong>[^<]*<code>[^<]*<\/code>\.<\/p>/, `<p><strong>Gauntlet v0.6.3</strong> · Current canonical playtest edition · authority <code>${AUTHORITY_SET_ID}</code>.</p>`));
copyText(`${CLEAN}/browser-rulebook/app.js`, 'rulebook/app.js', (app) => app
  .replace("const SOURCE_URL = '../rulebook/Gauntlet_v0.6.3_Rulebook.md';", `const SOURCE_URL = '/${RULEBOOK_SOURCE}';\nconst SOURCE_SHA256 = '${RULEBOOK_SHA256}';\nconst PUBLISHED_SOURCE_URL = '../releases/v0.6.3-reconstructed/Gauntlet_v0.6.3_Rulebook.md';`)
  .replace('async function loadRulebook() {', `async function sha256(bytes) {\n  const digest = await crypto.subtle.digest('SHA-256', bytes);\n  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join('');\n}\n\nfunction publicRulebookSource(source) {\n  return source\n    .replace('**Version 0.6.3 — Clean Reconstruction Candidate**', '**Version 0.6.3**')\n    .replace(/^> \\*\\*Authority candidate, not current\\/public rules\\.\\*\\*[^\\n]*\\n\\n/m, '');\n}\n\nasync function loadRulebook() {`)
  .replace("const markdown = await response.text();\n    const rendered = renderMarkdown(markdown);", "const bytes = await response.arrayBuffer();\n    const actualHash = await sha256(bytes);\n    if (actualHash !== SOURCE_SHA256) throw new Error(`Rulebook source hash mismatch: ${actualHash}`);\n    const markdown = publicRulebookSource(new TextDecoder().decode(bytes));\n    const rendered = renderMarkdown(markdown);")
  .replace('Clean v0.6.3 reconstruction · ${sectionCount} sections · authority ${AUTHORITY_SET_ID.slice(0, 8)}… · rendered from certified Markdown', 'v0.6.3 · ${sectionCount} sections · authority ${AUTHORITY_SET_ID.slice(0, 8)}… · verified canonical source')
  .replace('certified clean-v0.6.3 Markdown source', 'published v0.6.3 Rulebook source')
  .replace('${SOURCE_URL}', '${PUBLISHED_SOURCE_URL}'));

prune('card-reference', new Set(['index.html','app.js','site.css','styles.css','faction-colors.css','mobile-card-preview.css','mobile-card-preview.js']));
for (const file of ['site.css','styles.css','faction-colors.css','mobile-card-preview.css','mobile-card-preview.js']) copyText(`${CLEAN}/card-reference/${file}`, `card-reference/${file}`);
copyText(`${CLEAN}/card-reference/index.html`, 'card-reference/index.html', (html) => currentize(html, 'Gauntlet v0.6.3 Card Reference', 'Search all 128 canonical Gauntlet v0.6.3 cards and 25 Territories.', 'https://gauntlet.run/card-reference/')
  .replaceAll('../../../../', '../').replace(/Clean v0\.6\.3[^<]*reconstruction[^<]*/gi, 'Gauntlet v0.6.3').replace(/publication locked/gi, 'current canonical data'));
copyText(`${CLEAN}/card-reference/app.js`, 'card-reference/app.js', (app) => app
  .replace('const CANONICAL_DATA_SOURCE = "../complete-authority/canonical-structured-data.json";', `const CANONICAL_DATA_SOURCE = '/${CLEAN}/complete-authority/canonical-structured-data.json';`)
  .replace('`${state.version} clean authority · ${cardCount} playable cards + ${territoryCount} Territories loaded · publication locked`', '`${state.version} · ${cardCount} playable cards + ${territoryCount} Territories loaded · current canonical data`')
  .replace('Certified clean authority load failed', 'Canonical v0.6.3 authority load failed')
  .replace('certified clean v0.6.3 structured authority', 'canonical v0.6.3 structured authority'));

finish('Clean v0.6.3 core web publication');
