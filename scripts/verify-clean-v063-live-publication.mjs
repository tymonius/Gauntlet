const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GH_TOKEN;
const publishedSha = process.env.PUBLISHED_SHA;
if (!repo || !token || !publishedSha) throw new Error('GITHUB_REPOSITORY, GH_TOKEN, and PUBLISHED_SHA are required.');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function fetchRetry(url, options = {}, attempts = 10, delayMs = 3000) {
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

const workerBase = 'https://gauntlet-rules-assistant.tymon-scott.workers.dev';
const currentHealth = await (await fetchRetry(`${workerBase}/api/health`)).json();
if (!currentHealth.ok || currentHealth.version !== 'v0.6.3' || currentHealth.published !== true || currentHealth.reconstruction !== false || currentHealth.currentPublicRelease !== 'v0.6.3') {
  throw new Error(`Production Rules Arbiter is not current published v0.6.3: ${JSON.stringify(currentHealth)}`);
}
const historicalHealth = await (await fetchRetry(`${workerBase}/api/v061/health`)).json();
if (!historicalHealth.ok || historicalHealth.version !== 'v0.6.1') {
  throw new Error(`Historical v0.6.1 Rules Arbiter route failed: ${JSON.stringify(historicalHealth)}`);
}
console.log('Production Rules Arbiter reports v0.6.3 current while the explicit v0.6.1 route remains available.');

const githubHeaders = {
  Accept: 'application/vnd.github+json',
  Authorization: `Bearer ${token}`,
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'gauntlet-v063-publication-verifier',
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
const readText = async (url) => (await fetchRetry(`${url}${url.includes('?') ? '&' : '?'}${cacheBust}`)).text();
const [home, rulebook, deckbuilder, arbiter, manifestText] = await Promise.all([
  readText('https://gauntlet.run/'),
  readText('https://gauntlet.run/rulebook/'),
  readText('https://gauntlet.run/deckbuilder/'),
  readText('https://gauntlet.run/rules-arbiter/'),
  readText('https://gauntlet.run/releases/v0.6.3/Gauntlet_v0.6.3_Manifest.json'),
]);
const manifest = JSON.parse(manifestText);
if (!home.includes('Current canonical playtest edition · v0.6.3') || !home.includes('<dt>128</dt><dd>Playable cards</dd>')) throw new Error('gauntlet.run homepage is not current v0.6.3.');
if (!/Gauntlet v0\.6\.3 Browser Rulebook/.test(rulebook)) throw new Error('Public Browser Rulebook is not v0.6.3.');
if (!/Gauntlet v0\.6\.3 Deckbuilder/.test(deckbuilder)) throw new Error('Public Deckbuilder is not v0.6.3.');
if (!/Gauntlet v0\.6\.3 Rules Arbiter/.test(arbiter)) throw new Error('Public Rules Arbiter is not v0.6.3.');
if (manifest.release_version !== 'v0.6.3' || manifest.authority_set_id !== '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49') {
  throw new Error(`Unexpected public reconstructed manifest: ${JSON.stringify(manifest)}`);
}
console.log('gauntlet.run and production Rules Arbiter live verification passed for canonical reconstructed v0.6.3 publication.');
