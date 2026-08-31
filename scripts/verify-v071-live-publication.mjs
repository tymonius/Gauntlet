import crypto from 'node:crypto';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN;
const publishedSha = process.env.PUBLISHED_SHA;
if (!repo || !token || !publishedSha) throw new Error('GITHUB_REPOSITORY, GH_TOKEN, and PUBLISHED_SHA are required.');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function fetchRetry(url, options = {}, attempts = 12, delayMs = 3000) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, options);
      if (response.ok) return response;
      lastError = new Error(`${options.method || 'GET'} ${url} -> ${response.status} ${await response.text()}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await sleep(delayMs);
  }
  throw lastError;
}

const githubHeaders = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'gauntlet-v071-publication-verifier',
};

await fetchRetry(`https://api.github.com/repos/${repo}/pages/builds`, { method: 'POST', headers: githubHeaders }, 3, 2000);
console.log(`Requested GitHub Pages build for ${publishedSha}.`);

let built = false;
for (let attempt = 1; attempt <= 60; attempt += 1) {
  const latest = await (await fetchRetry(`https://api.github.com/repos/${repo}/pages/builds/latest`, { headers: githubHeaders }, 3, 2000)).json();
  console.log(`Pages build attempt ${attempt}: status=${latest.status || ''} commit=${latest.commit || ''}`);
  if (latest.commit === publishedSha && latest.status === 'built') { built = true; break; }
  if (latest.commit === publishedSha && latest.status === 'errored') throw new Error(`Pages build errored: ${JSON.stringify(latest)}`);
  await sleep(10000);
}
if (!built) throw new Error(`GitHub Pages did not report ${publishedSha} built within the verification window.`);

const cacheBust = `publication=${encodeURIComponent(publishedSha)}`;
const fetchPublic = url => fetchRetry(`${url}${url.includes('?') ? '&' : '?'}${cacheBust}`);
const readText = async url => (await fetchPublic(url)).text();
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');

const urls = {
  home: 'https://gauntlet.run/',
  release: 'https://gauntlet.run/v0.7.1/',
  start: 'https://gauntlet.run/start/',
  cardReference: 'https://gauntlet.run/card-reference/',
  deckbuilder: 'https://gauntlet.run/deckbuilder/',
  arbiter: 'https://gauntlet.run/rules-arbiter/',
  browser: 'https://gauntlet.run/rulebook/',
  rulebook: 'https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md',
  manifest: 'https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Manifest.json',
  canonical: 'https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json',
  starters: 'https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Starter_Decks.json',
  provenance: 'https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Source_Provenance.json',
  anatomy: 'https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Card_Anatomy.png',
  arcaneTrait: 'https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Arcane_Trait_Mark.png',
  booklet: 'https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Rulebook_Booklet.pdf',
};

const [
  home,
  releaseLanding,
  startPage,
  cardReferencePage,
  deckbuilderPage,
  arbiterPage,
  browserRulebook,
  rulebookText,
  manifestText,
  canonicalText,
  startersText,
  provenanceText,
] = await Promise.all([
  readText(urls.home),
  readText(urls.release),
  readText(urls.start),
  readText(urls.cardReference),
  readText(urls.deckbuilder),
  readText(urls.arbiter),
  readText(urls.browser),
  readText(urls.rulebook),
  readText(urls.manifest),
  readText(urls.canonical),
  readText(urls.starters),
  readText(urls.provenance),
]);

const manifest = JSON.parse(manifestText);
const canonical = JSON.parse(canonicalText);
const starters = JSON.parse(startersText);
const provenance = JSON.parse(provenanceText);

if (!home.includes('Current canonical playtest edition · v0.7.1') || !home.includes('<dt>142</dt><dd>Playable cards</dd>')) {
  throw new Error('gauntlet.run homepage is not current v0.7.1.');
}
if (!releaseLanding.includes('Gauntlet v0.7.1') || !releaseLanding.includes('Mystics Rites &amp; Deck Import') && !releaseLanding.includes('Mystics Rites & Deck Import')) {
  throw new Error('v0.7.1 release landing page is not deployed.');
}
for (const [label, source, required] of [
  ['Start Playing', startPage, ['canonical v0.7.1', 'Current playtest edition: v0.7.1']],
  ['Card Reference', cardReferencePage, ['Current v0.7.1 production card reference.', 'v0.7.1 Release']],
  ['Deckbuilder', deckbuilderPage, ['Gauntlet v0.7.1 Deckbuilder', 'canonical v0.7.1', 'v0.7.1 release']],
  ['Rules Arbiter', arbiterPage, ['Gauntlet v0.7.1 Rules Arbiter', 'Rules support · v0.7.1']],
]) {
  for (const value of required) {
    if (!source.includes(value)) throw new Error(`${label} is missing v0.7.1 identity: ${value}`);
  }
}
if (!/Gauntlet v0\.7\.0 Browser Rulebook/.test(browserRulebook)) {
  throw new Error('Public Browser Rulebook is not v0.7.1.');
}
if (
  manifest.release_version !== 'v0.7.1'
  || manifest.status !== 'current'
  || !manifest.authority_set_id
  || !/^\d{4}-\d{2}-\d{2}$/.test(manifest.publication_date || '')
) {
  throw new Error(`Unexpected public v0.7.1 manifest: ${JSON.stringify(manifest)}`);
}
for (const key of ['website', 'rulebook', 'browser_tools', 'rules_arbiter', 'digital_rules']) {
  if (manifest.public_defaults?.[key] !== 'v0.7.1') throw new Error(`Public manifest default ${key} is not v0.7.1.`);
}
if (
  provenance.release_version !== 'v0.7.1'
  || provenance.source_version !== 'v0.7.1'
  || provenance.authority_set_id !== manifest.authority_set_id
  || provenance.current_game_authority !== 'game-data/current-game.json'
  || provenance.current_rulebook_authority !== 'rulebook/player-facing/current-rulebook.md'
) {
  throw new Error('Public v0.7.1 provenance does not match the manifest authority.');
}
if (
  canonical.release_version !== 'v0.7.1'
  || canonical.source_version !== 'v0.7.1'
  || canonical.gameplay?.cards?.length !== 142
  || canonical.gameplay?.territories?.length !== 25
  || canonical.gameplay?.factions?.length !== 6
  || canonical.leaders?.length !== 12
) {
  throw new Error('Public v0.7.1 canonical data does not match the promoted current-game authority.');
}
if (!canonical.faction_feature_taxonomy?.actionProfiles?.['1 Action'] || !canonical.faction_features) {
  throw new Error('Public v0.7.1 canonical data is missing the Faction Feature taxonomy.');
}
const diplomats = canonical.gameplay.factions.find(faction => faction.id === 'diplomats');
if (diplomats?.factionRules?.peace_treaty_threshold !== 6) {
  throw new Error('Public v0.7.1 canonical Peace Treaty threshold is not six.');
}
if (
  !rulebookText.includes('Ratify six different Proposals')
  || !rulebookText.includes('if six different Proposals are ratified')
  || rulebookText.includes('Ratify five different Proposals')
  || rulebookText.includes('if five different Proposals are ratified')
) {
  throw new Error('Public v0.7.1 Rulebook Peace Treaty threshold is not synchronized to six.');
}
if (!canonical.leaders.every(leader => Array.isArray(leader.sections) && leader.sections.every(section => !Array.isArray(section) && section.classification && section.name))) {
  throw new Error('Public v0.7.1 canonical Leader data is not using structured sections.');
}
const intelligence = canonical.gameplay.factions.find(faction => faction.id === 'intelligence');
if (intelligence?.resource !== 'Intel (no maximum)' || intelligence?.progression !== 'Operation Progress') {
  throw new Error('Public Intelligence Resource/Progression classifications are stale.');
}
const mystics = canonical.gameplay.factions.find(faction => faction.id === 'mystics');
if (mystics?.resource !== null || mystics?.progression !== 'Rites') {
  throw new Error('Public Mystics Resource/Progression classifications are stale.');
}
const retired = /\bpending(?:-|\s+)battles?\b|\bFaction Actions?\b|\bFaction Abilit(?:y|ies)\b|\bfaction procedure\b/i;
if (retired.test(rulebookText)) throw new Error('Public v0.7.1 Rulebook contains retired terminology.');
if (retired.test(JSON.stringify(canonical))) throw new Error('Public v0.7.1 canonical data contains retired terminology.');
if (!rulebookText.includes('## Card anatomy') || !rulebookText.includes('![Card anatomy diagram]') || !rulebookText.includes('![Arcane trait mark example]') || !rulebookText.includes('Terms occur during Onset')) {
  throw new Error('Public v0.7.1 Rulebook is missing current Card Anatomy or Onset content.');
}
if (starters.release_version !== 'v0.7.1' || starters.decks?.length !== 12) {
  throw new Error('Public v0.7.1 starter Deck data is incomplete.');
}

const textBindings = [
  ['rulebook', rulebookText],
  ['canonical_data', canonicalText],
  ['approved_starters', startersText],
  ['source_provenance', provenanceText],
];
for (const [key, value] of textBindings) {
  const binding = manifest.binding_sources?.[key];
  if (!binding?.sha256 || sha256(Buffer.from(value, 'utf8')) !== binding.sha256) {
    throw new Error(`Public ${key} does not match its manifest SHA-256 binding.`);
  }
}

const anatomyResponse = await fetchPublic(urls.anatomy);
const anatomyType = String(anatomyResponse.headers.get('content-type') || '').toLowerCase();
const anatomyBytes = Buffer.from(await anatomyResponse.arrayBuffer());
if (!anatomyType.includes('image') || anatomyBytes.length < 10000) {
  throw new Error(`Public Card Anatomy figure is invalid: type=${anatomyType} bytes=${anatomyBytes.length}.`);
}
if (sha256(anatomyBytes) !== manifest.binding_sources?.card_anatomy_figure?.sha256) {
  throw new Error('Public Card Anatomy figure does not match its manifest SHA-256 binding.');
}

const arcaneTraitResponse = await fetchPublic(urls.arcaneTrait);
const arcaneTraitType = String(arcaneTraitResponse.headers.get('content-type') || '').toLowerCase();
const arcaneTraitBytes = Buffer.from(await arcaneTraitResponse.arrayBuffer());
if (!arcaneTraitType.includes('image') || arcaneTraitBytes.length < 5000) {
  throw new Error(`Public Arcane trait-mark figure is invalid: type=${arcaneTraitType} bytes=${arcaneTraitBytes.length}.`);
}
if (sha256(arcaneTraitBytes) !== manifest.binding_sources?.arcane_trait_figure?.sha256) {
  throw new Error('Public Arcane trait-mark figure does not match its manifest SHA-256 binding.');
}

const bookletResponse = await fetchPublic(urls.booklet);
const bookletType = String(bookletResponse.headers.get('content-type') || '').toLowerCase();
const bookletBytes = Buffer.from(await bookletResponse.arrayBuffer());
if (!bookletType.includes('pdf')) {
  throw new Error(`Public v0.7.1 Rulebook booklet did not resolve as PDF: ${bookletType}`);
}
if (sha256(bookletBytes) !== manifest.pdf_outputs?.[0]?.sha256) {
  throw new Error('Public v0.7.1 Rulebook booklet does not match its manifest SHA-256 binding.');
}

if (!browserRulebook.includes('data-ruleset-switch hidden')) {
  throw new Error('Public Browser Rulebook does not hide the ruleset switch when no distinct candidate exists.');
}
const workerHealth = await fetchRetry(
  'https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/health',
  {},
  30,
  3000,
);
const workerPayload = await workerHealth.json();
if (
  workerPayload?.ok !== true
  || workerPayload?.version !== 'v0.7.1'
  || workerPayload?.currentPublicRelease !== 'v0.7.1'
  || workerPayload?.published !== true
) {
  throw new Error(`Current Rules Arbiter Worker is not v0.7.1: ${JSON.stringify(workerPayload)}`);
}

const historicalWorkerHealth = await fetchRetry(
  'https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/v063/health',
  {},
  12,
  3000,
);
const historicalPayload = await historicalWorkerHealth.json();
if (historicalPayload?.version !== 'v0.6.3' || historicalPayload?.currentPublicRelease !== 'v0.6.3') {
  throw new Error(`Historical v0.6.3 Rules Arbiter route is not preserved: ${JSON.stringify(historicalPayload)}`);
}

console.log('gauntlet.run live verification passed for v0.7.1 publication with bound Rulebook, canonical data, provenance, print-adapted Card Anatomy figures, booklet, and Rules Arbiter assets.');
