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
  'User-Agent': 'gauntlet-v070-publication-verifier',
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
const readText = async url => (await fetchRetry(`${url}${url.includes('?') ? '&' : '?'}${cacheBust}`)).text();
const [home, releaseLanding, rulebook, manifestText, canonicalText, startersText] = await Promise.all([
  readText('https://gauntlet.run/'),
  readText('https://gauntlet.run/v0.7.0/'),
  readText('https://gauntlet.run/rulebook/'),
  readText('https://gauntlet.run/releases/v0.7.0/Gauntlet_v0.7.0_Manifest.json'),
  readText('https://gauntlet.run/releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json'),
  readText('https://gauntlet.run/releases/v0.7.0/Gauntlet_v0.7.0_Starter_Decks.json'),
]);

const manifest = JSON.parse(manifestText);
const canonical = JSON.parse(canonicalText);
const starters = JSON.parse(startersText);

if (!home.includes('Current canonical playtest edition · v0.7.0') || !home.includes('<dt>142</dt><dd>Playable cards</dd>')) {
  throw new Error('gauntlet.run homepage is not current v0.7.0.');
}
if (!releaseLanding.includes('Gauntlet v0.7.0') || !releaseLanding.includes('Illustrated Cards &amp; Tabletop Simulator') && !releaseLanding.includes('Illustrated Cards & Tabletop Simulator')) {
  throw new Error('v0.7.0 release landing page is not deployed.');
}
if (!/Gauntlet v0\.7\.0 Browser Rulebook/.test(rulebook)) {
  throw new Error('Public Browser Rulebook is not v0.7.0.');
}
if (manifest.release_version !== 'v0.7.0' || manifest.status !== 'current' || !manifest.authority_set_id) {
  throw new Error(`Unexpected public v0.7.0 manifest: ${JSON.stringify(manifest)}`);
}
if (canonical.release_version !== 'v0.7.0' || canonical.source_version !== 'v0.6.4-candidate' || canonical.gameplay?.cards?.length !== 142 || canonical.gameplay?.territories?.length !== 25) {
  throw new Error('Public v0.7.0 canonical data does not match the promoted candidate source bundle.');
}
if (starters.release_version !== 'v0.7.0' || starters.decks?.length !== 12) {
  throw new Error('Public v0.7.0 starter Deck data is incomplete.');
}

const bookletUrl = 'https://gauntlet.run/releases/v0.7.0/Gauntlet_v0.7.0_Rulebook_Booklet.pdf';
const booklet = await fetchRetry(`${bookletUrl}?${cacheBust}`);
if (!String(booklet.headers.get('content-type') || '').toLowerCase().includes('pdf')) {
  throw new Error(`Public v0.7.0 Rulebook booklet did not resolve as PDF: ${booklet.headers.get('content-type')}`);
}
console.log('gauntlet.run live verification passed for v0.7.0 publication.');
