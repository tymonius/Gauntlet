import {
  RULEBOOK_SHA256, CANONICAL_SHA256, STARTERS_SHA256,
  RELEASE_DIR, CLEAN, RULEBOOK_SOURCE, CANONICAL_SOURCE, STARTERS_SOURCE, factionGuides,
  read, readBytes, hashFile, syncText, syncBytes, failures,
  publicAuthorityNote, publicCanonicalData, publicFactionGuide, finish
} from './publication-utils.mjs';

if (hashFile(RULEBOOK_SOURCE) !== RULEBOOK_SHA256) throw new Error('Certified Rulebook hash drifted before publication.');
if (hashFile(CANONICAL_SOURCE) !== CANONICAL_SHA256) throw new Error('Canonical data hash drifted before publication.');
if (hashFile(STARTERS_SOURCE) !== STARTERS_SHA256) throw new Error('Starter data hash drifted before publication.');

// Publication owns semantic release artifacts. It does not regenerate the live
// Rulebook or Card Reference presentation from reconstruction-era web templates.
// Those current web implementations are version-controlled independently.
syncText(`${RELEASE_DIR}/Gauntlet_v0.6.3_Rulebook.md`, publicAuthorityNote(read(RULEBOOK_SOURCE)));
for (const [label, route, authorityDir, file] of factionGuides) {
  const publishedName = label === 'Diplomats' ? 'Diplomat' : label === 'Financiers' ? 'Financier' : label;
  syncText(`${RELEASE_DIR}/faction-guides/${route}/Gauntlet_v0.6.3_${publishedName}_Faction_Guide.md`, publicFactionGuide(read(`${CLEAN}/faction-guides/${authorityDir}/${file}`)));
}
syncText(`${RELEASE_DIR}/Gauntlet_v0.6.3_Canonical_Data.json`, JSON.stringify(publicCanonicalData(read(CANONICAL_SOURCE)), null, 2));
syncBytes(`${RELEASE_DIR}/Gauntlet_v0.6.3_Starter_Decks.json`, readBytes(STARTERS_SOURCE));

const liveRulebookApp = read('rulebook/app.js');
if (!liveRulebookApp.includes("normalizeV063LastStandText")) {
  failures.push('Live Browser Rulebook does not apply the PR #171 Last Stand publication terminology layer.');
}
if (!liveRulebookApp.includes(RULEBOOK_SHA256)) {
  failures.push('Live Browser Rulebook is not bound to the certified v0.6.3 Rulebook hash.');
}

for (const relative of [
  'rulebook/index.html',
  'rulebook/app.js',
  'rulebook/styles.css',
  'card-reference/index.html',
  'card-reference/app.js',
  'card-reference/site.css',
]) {
  try {
    read(relative);
  } catch {
    failures.push(`Missing current web implementation: ${relative}`);
  }
}

finish('Clean v0.6.3 semantic/core publication');
