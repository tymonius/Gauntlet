import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { AUTHORITY_SET_ID as authoritySetId, RELEASE_DIR as releaseDir, root, read, factionGuides } from './publication-utils.mjs';

const lifecycle = JSON.parse(read('config/release-lifecycle.json'));
const currentRelease = lifecycle.releases?.[lifecycle.current_release];
const legacyAliasPrefixes = (currentRelease?.legacy_package_aliases ?? []).map((value) => String(value).replace(/\/+$/, '') + '/');

const publicHtml = [
  'index.html','rulebook/index.html','card-reference/index.html','factions/index.html',
  ...factionGuides.map(([, route]) => `factions/${route}/index.html`),
  'start/index.html','deckbuilder/index.html','rules-arbiter/index.html',`${releaseDir}/index.html`,
];
for (const file of publicHtml) {
  const html = read(file);
  assert(!/noindex,nofollow/i.test(html), `${file} is still noindex.`);
  assert(!/not the current public release|publication remains locked|current public playtest release remains v0\.6\.1|reconstruction only|reconstruction candidate/i.test(html), `${file} retains reconstruction-only publication copy.`);
}
const home = read('index.html');
assert(home.includes('Current canonical playtest edition · v0.6.3'));
assert(home.includes('<dt>128</dt><dd>Playable cards</dd>'));
assert(home.includes("Run the Gauntlet by capturing the Territory at the opponent's end or by winning the opponent's Last Stand."));
assert(home.includes('releases/v0.6.3/'));
assert(home.includes('rules-arbiter/'));
assert(!home.includes('releases/v0.6.1/'));
assert(!/Current canonical playtest edition · v0\.6\.1/.test(home));
assert(!home.includes('Download the certified Rulebook'));

const requiredDeckbuilderFiles = [
  'index.html','app.js','styles.css','territories.css','territories.js',
  'starter-decks.css','starter-decks.js','starter-decks.json','starter-handoff.css','starter-handoff.js',
  'mobile-card-preview.css','mobile-card-preview.js','faction-components.js','leader-portrait-sources.js',
  'print.js','print-options.css','print-request.css','print-request.js','print-duplex.js','print-all-starters.js',
  'completed-factions.js','completed-supplementals.js','supplemental-data.js','v061-supplementals.js','v061-runtime.js',
];
for (const file of requiredDeckbuilderFiles) {
  assert(fs.existsSync(path.join(root, 'deckbuilder', file)), `Restored Deckbuilder capability file is missing: ${file}`);
}
const deckbuilderIndex = read('deckbuilder/index.html');
for (const feature of [
  'starter-decks.js','starter-handoff.js','mobile-card-preview.js','faction-components.js',
  'print.js','print-request.js','print-duplex.js','print-all-starters.js','v061-runtime.js',
]) assert(deckbuilderIndex.includes(feature), `Restored Deckbuilder does not load required feature: ${feature}`);
assert(deckbuilderIndex.includes('id="saveDeckButton"'), 'Restored Deckbuilder lost browser save/load controls.');
assert(deckbuilderIndex.includes('id="exportJsonButton"'), 'Restored Deckbuilder lost JSON export/import controls.');
assert(deckbuilderIndex.includes('id="printDeckButton"'), 'Restored Deckbuilder lost Print / PDF.');
assert(deckbuilderIndex.includes('id="cardPreview"'), 'Restored Deckbuilder lost card previews.');
assert(deckbuilderIndex.includes('id="territoryPreview"'), 'Restored Deckbuilder lost Territory previews.');

const cardReferenceIndex = read('card-reference/index.html');
const cardReferenceApp = read('card-reference/app.js');
assert(cardReferenceIndex.includes('Quick rules lookup · v0.6.3'));
assert(cardReferenceIndex.includes('128 playable cards and 25 Territories'));
assert(!cardReferenceIndex.includes('../browser-rulebook/'));
assert(!/certified clean|current public release:\s*v0\.6\.1/i.test(cardReferenceIndex));
assert(cardReferenceApp.includes("const RULEBOOK_URL = '../rulebook/';"));
assert(cardReferenceApp.includes("const PUBLIC_DATA_EXPORT = '../releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json';"));
assert(!cardReferenceApp.includes('../browser-rulebook/'));
assert(!cardReferenceApp.includes('publication remains locked'));
assert(!cardReferenceApp.includes('Authority set'));

const arbiterIndex = read('rules-arbiter/index.html');
const arbiterApp = read('rules-arbiter/app.js');
assert(arbiterIndex.includes('Rules support · v0.6.3'));
assert(!/downstream review only|current release remains v0\.6\.1|authority set/i.test(arbiterIndex));
assert(arbiterApp.includes('payload.published !== true'));
assert(arbiterApp.includes('payload.reconstruction !== false'));
assert(arbiterApp.includes('payload.currentPublicRelease !== CURRENT_PUBLIC_RELEASE'));
assert(arbiterApp.includes('return askLocal(question);'));
assert(!arbiterApp.includes('Reconstruction worker returned'));
assert(!arbiterApp.includes('../browser-rulebook/'));

const pointer = read('src/content/current.ts');
assert(pointer.includes("../reconstruction/clean-v063/content"));
assert(pointer.includes("../reconstruction/clean-v063/rules"));
assert(pointer.includes("CURRENT_RULES_VERSION = 'v0.6.3'"));
assert(!pointer.includes("'./v063'"));

const workerEntry = read('rules-assistant/worker-entry.js');
const worker = read('rules-assistant/worker-v063.js');
const corpus = read('rules-assistant/v063-public-corpus.js');
const widget = read('rules-assistant/widget.js');
assert(workerEntry.includes('import v061Worker from "./worker-v061.js";'));
assert(workerEntry.includes('import worker from "./worker-v063.js";'));
assert(workerEntry.includes('return v061Worker.fetch(rewriteVersionedPath(request), env, context);'));
assert(workerEntry.includes('The unversioned public Rules Arbiter follows the current canonical release.'));
assert(workerEntry.includes('Keep explicitly versioned v0.6.1 browser clients functional across the Pages/Worker cutover window.'));
assert(workerEntry.includes('if (requestedVersion === "v0.6.1") return v061Worker.fetch(request, env, context);'));
assert(worker.includes('currentPublicRelease: "v0.6.3"'));
assert(worker.includes('published: true'));
assert(worker.includes('reconstruction: false'));
assert(!worker.includes('rules-deterministic-v063'));
assert(corpus.includes('export const V063_RULES_VERSION = "v0.6.3";'));
assert(corpus.includes(authoritySetId));
assert(corpus.includes('corpus.published = true;'));
assert(corpus.includes('import { buildRulesCorpus } from "./local-search.js";'));
assert(corpus.includes('CLEAN_V063_RULEBOOK_SHA256'));
assert(corpus.includes('CLEAN_V063_CANONICAL_DATA_SHA256'));
assert(corpus.includes('crypto.subtle.digest'));
assert(corpus.includes('V063_PUBLISHED_RULEBOOK_PATH'));
assert(corpus.includes('releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md'));
assert(corpus.includes('rulebookBrowserUrl: `${base}/${CLEAN_V063_BROWSER_RULEBOOK_PATH}`'));
assert(widget.includes('version: "v0.6.3"'));
assert(widget.includes('loadV063RulesCorpus'));

const forbiddenCurrentText = ['artifacts/v0.6.3/release-candidate','artifacts/v0.6.3/print-candidate','"print_pdfs": 11'];
const publicationText = [read(`${releaseDir}/Gauntlet_v0.6.3_Manifest.json`), worker, pointer].join('\n');
for (const value of forbiddenCurrentText) assert(!publicationText.includes(value), `Published surface inherited withdrawn metadata: ${value}`);

try {
  const base = process.env.PUBLICATION_DIFF_BASE || execFileSync('git', ['merge-base', 'HEAD', 'origin/main'], { encoding: 'utf8' }).trim();
  const list = (args) => execFileSync('git', args, { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
  const changed = [...new Set([
    ...list(['diff','--name-only',`${base}...HEAD`]),
    ...list(['diff','--name-only']),
    ...list(['ls-files','--others','--exclude-standard']),
  ])].sort();
  const allowedFiles = new Set([
    '.github/workflows/publish-clean-v063.yml',
    '.github/workflows/validate-v063-cross-surface-closeout.yml',
    '.github/workflows/test-v061-browser-tools.yml',
    '.github/workflows/build-clean-v063-complete-authority.yml',
    '.github/workflows/build-clean-v063-browser-rulebook.yml',
    '.github/workflows/build-clean-v063-card-reference.yml',
    '.github/workflows/publish-v061-rulebook.yml',
    'scripts/publication-utils.mjs',
    'scripts/build-clean-v063-publication.mjs',
    'scripts/build-clean-v063-publication-core-web.mjs',
    'scripts/build-clean-v063-publication-navigation.mjs',
    'scripts/build-clean-v063-publication-arbiter-web.mjs',
    'scripts/build-clean-v063-publication-arbiter-worker.mjs',
    'scripts/build-clean-v063-publication-release.mjs',
    'scripts/render-clean-v063-publication.mjs',
    'scripts/validate-clean-v063-publication.mjs',
    'scripts/validate-clean-v063-publication-data.mjs',
    'scripts/validate-clean-v063-publication-surfaces.mjs',
    'scripts/verify-clean-v063-live-publication.mjs',
    'scripts/sync-v063-legacy-package-alias.mjs',
    'tests/standalone-new-player-onboarding.test.ts',
    'tests/current-rulebook-player-experience.test.ts',
    'tests/current-player-site-integrity.test.ts',
    'config/release-lifecycle.json','src/content/current.ts','index.html',
    'rules-assistant/worker-entry.js','rules-assistant/worker-v063.js','rules-assistant/v063-public-corpus.js','rules-assistant/widget.js',
  ]);
  const allowedPrefixes = ['rulebook/','card-reference/','factions/','start/','deckbuilder/','rules-arbiter/','v0.6.3/',`${releaseDir}/`, ...legacyAliasPrefixes];
  for (const file of changed) {
    assert(allowedFiles.has(file) || allowedPrefixes.some((prefix) => file.startsWith(prefix)), `Publication diff escaped allowed current/public surfaces: ${file}`);
    assert(!file.startsWith('releases/v0.6.2-withdrawn/'), 'Immutable withdrawn v0.6.2 release package was modified.');
    assert(!file.startsWith('releases/v0.6.3-withdrawn/'), 'Immutable withdrawn original v0.6.3 release package was modified.');
    assert(!file.startsWith('artifacts/reconstruction/clean-v0.6.3/'), 'Certified clean reconstruction source was modified during publication.');
    assert(!file.startsWith('artifacts/v0.6.3/'), 'Withdrawn v0.6.3 evidence was modified during publication.');
    assert(!file.startsWith('src/v063/'), 'Withdrawn historical digital implementation was modified during publication.');
    assert.notEqual(file, 'config/release-locks.json');
    assert.notEqual(file, 'config/reconstruction-version-plan.json');
  }
} catch (error) {
  if (error instanceof assert.AssertionError) throw error;
  console.warn('Publication diff firewall skipped because origin/main is unavailable.');
}
console.log('Validated current/public browser surfaces, restored player tools, canonical digital pointer, Rules Arbiter cutover compatibility, immutable withdrawn packages, and publication diff firewall.');
