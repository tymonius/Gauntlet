import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

const root = process.cwd();
const remoteBase = process.env.GAUNTLET_PUBLIC_BASE_URL?.replace(/\/+$/, '') || null;
const cacheBust = process.env.GAUNTLET_CONTRACT_BUST || '';
const factions = ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition'];

function publicPath(value) {
  if (!value) return null;
  return `/${String(value).replace(/^\/+/, '')}`;
}

function localPath(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/, 1)[0]).replace(/^\//, '');
  if (!clean) return 'index.html';
  const candidate = path.join(root, clean);
  if (urlPath.endsWith('/') || (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory())) {
    return path.join(clean, 'index.html');
  }
  return clean;
}

function remoteUrl(urlPath) {
  const url = new URL(`${remoteBase}${urlPath}`);
  if (cacheBust) url.searchParams.set('contract', cacheBust);
  return url;
}

async function getBytes(urlPath) {
  if (!remoteBase) {
    const relative = localPath(urlPath);
    assert(fs.existsSync(path.join(root, relative)), `Missing public resource ${urlPath} -> ${relative}`);
    return fs.readFileSync(path.join(root, relative));
  }
  const response = await fetch(remoteUrl(urlPath), { redirect: 'follow', cache: 'no-store' });
  assert(response.ok, `${urlPath} returned HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function getText(urlPath) {
  return (await getBytes(urlPath)).toString('utf8');
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function htmlRefs(html) {
  return [...html.matchAll(/\b(?:href|src)=(['"])(.*?)\1/gi)].map((match) => match[2]);
}

function normalizeRef(fromRoute, ref) {
  if (!ref || ref.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(ref)) return null;
  return new URL(ref, `https://gauntlet.invalid${fromRoute}`).pathname;
}

const lifecycle = JSON.parse(await getText('/config/release-lifecycle.json'));
const currentVersion = lifecycle.current_release;
assert(currentVersion, 'Release lifecycle does not define current_release.');
const currentRelease = lifecycle.releases?.[currentVersion];
assert(currentRelease, `Release lifecycle has no entry for ${currentVersion}.`);
assert.equal(currentRelease.status, 'current', `${currentVersion} is not marked current.`);
assert.equal(currentRelease.public_cutover, true, `${currentVersion} is not marked for public cutover.`);

const releaseRoot = publicPath(currentRelease.current_reconstructed_package_path || currentRelease.current_package_path);
assert(releaseRoot, `${currentVersion} does not define its current package path.`);
const normalizedReleaseRoot = releaseRoot.endsWith('/') ? releaseRoot : `${releaseRoot}/`;
const historicalRootValue = currentRelease.historical_package_path;
const historicalRoot = historicalRootValue
  ? `${publicPath(historicalRootValue).replace(/\/+$/, '')}/`
  : null;
const manifestPath = `${normalizedReleaseRoot}Gauntlet_${currentVersion}_Manifest.json`;

const manifest = JSON.parse(await getText(manifestPath));
assert.equal(manifest.release_version, currentVersion, 'Current release manifest version disagrees with release lifecycle.');
assert.equal(publicPath(manifest.current_package_path).replace(/\/+$/, '/'), normalizedReleaseRoot, 'Current package pointer drifted.');
if (currentRelease.authority_set_id) {
  assert.equal(manifest.authority_set_id, currentRelease.authority_set_id, 'Release authority identity disagrees with lifecycle metadata.');
}
for (const [surface, version] of Object.entries(manifest.public_defaults ?? {})) {
  assert.equal(version, currentVersion, `Public default ${surface} points to ${version} instead of ${currentVersion}.`);
}

const bookletEntry = manifest.pdf_outputs?.find((item) => item.key === 'rulebook-booklet');
assert(bookletEntry, 'Current release manifest is missing the printable Rulebook booklet.');
const bookletPath = `${normalizedReleaseRoot}${bookletEntry.path}`;
const bookletBytes = await getBytes(bookletPath);
assert.equal(bookletBytes.length, bookletEntry.bytes, 'Published booklet byte count does not match the manifest.');
assert.equal(sha256(bookletBytes), bookletEntry.sha256, 'Published booklet hash does not match the manifest.');
const bookletPdf = await PDFDocument.load(bookletBytes);
assert.equal(bookletPdf.getPageCount(), bookletEntry.pages, 'Published booklet page count does not match the manifest.');

const routeValues = Object.values(manifest.public_routes ?? {}).filter((route) => typeof route === 'string');
const corePages = [
  '/',
  ...routeValues,
  ...factions.map((slug) => `/factions/${slug}/`),
];
const uniqueCorePages = [...new Set(corePages)];
const pages = new Map();
for (const route of uniqueCorePages) {
  const html = await getText(route);
  pages.set(route, html);
  if (historicalRoot) {
    assert(!html.includes(historicalRoot), `${route} links to historical/withdrawn package ${historicalRoot}.`);
  }
}

const rulebookRoute = manifest.public_routes?.rulebook || '/rulebook/';
const rulebook = pages.get(rulebookRoute) ?? await getText(rulebookRoute);
const rulebookRefs = htmlRefs(rulebook).map((ref) => normalizeRef(rulebookRoute, ref)).filter(Boolean);
assert(rulebookRefs.includes(bookletPath), 'Rulebook does not expose the current printable booklet.');
const readerEntry = manifest.pdf_outputs?.find((item) => item.key === 'rulebook');
if (readerEntry) {
  assert(!rulebookRefs.includes(`${normalizedReleaseRoot}${readerEntry.path}`), 'Rulebook still exposes a competing Reader PDF action.');
}
const markdownEntry = manifest.payload_files?.find((item) => /_Rulebook\.md$/i.test(item.path));
if (markdownEntry) {
  assert(!rulebookRefs.includes(`${normalizedReleaseRoot}${markdownEntry.path}`), 'Rulebook still exposes a competing Markdown download action.');
}
assert(!rulebook.includes('data-print-rulebook'), 'Rulebook still exposes browser printing as a competing print path.');

for (const slug of factions) {
  const symbolPath = `/images/faction-symbols/${slug}.svg`;
  await getBytes(symbolPath);
  for (const route of ['/', manifest.public_routes?.start || '/start/', manifest.public_routes?.factions || '/factions/']) {
    assert(pages.get(route)?.includes(symbolPath), `${route} does not use the canonical ${slug} faction symbol.`);
  }
  const factionRoute = `/factions/${slug}/`;
  assert(pages.get(factionRoute)?.includes(symbolPath), `Faction guide ${slug} does not use its canonical symbol.`);
}

const designTokens = await getText('/design-tokens.css');
const startStyles = await getText('/start/styles.css');
const definedFontTokens = new Set([...designTokens.matchAll(/(--font-[a-z0-9-]+)\s*:/gi)].map((match) => match[1]));
const usedFontTokens = new Set([...startStyles.matchAll(/var\((--font-[a-z0-9-]+)/gi)].map((match) => match[1]));
for (const token of usedFontTokens) {
  assert(definedFontTokens.has(token), `Start Playing references undefined typography token ${token}.`);
}

const localReferences = new Set();
for (const [route, html] of pages) {
  for (const ref of htmlRefs(html)) {
    const normalized = normalizeRef(route, ref);
    if (normalized) localReferences.add(normalized);
  }
}
for (const normalized of localReferences) {
  if (remoteBase) {
    await getBytes(normalized);
  } else {
    const relative = localPath(normalized);
    assert(fs.existsSync(path.join(root, relative)), `Public reference ${normalized} resolves to missing ${relative}`);
  }
}

console.log(`Current public contract passed${remoteBase ? ` against ${remoteBase}` : ' against the repository'}: ${currentVersion}, booklet integrity, resolvable player links, canonical faction symbols, and defined typography tokens.`);
