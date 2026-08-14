import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { PDFDocument } from 'pdf-lib';

const root = process.cwd();
const remoteBase = process.env.GAUNTLET_PUBLIC_BASE_URL?.replace(/\/+$/, '') || null;
const releaseRoot = '/releases/v0.6.3-reconstructed/';
const manifestPath = `${releaseRoot}Gauntlet_v0.6.3_Manifest.json`;
const bookletPath = `${releaseRoot}Gauntlet_v0.6.3_Rulebook_Booklet.pdf`;
const withdrawnReleaseRoot = '/releases/v0.6.3/';
const factions = ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition'];
const corePages = [
  '/',
  '/start/',
  '/rulebook/',
  '/card-reference/',
  '/factions/',
  ...factions.map((slug) => `/factions/${slug}/`),
  '/deckbuilder/',
  '/rules-arbiter/',
];

function localPath(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/, 1)[0]).replace(/^\//, '');
  if (!clean) return 'index.html';
  const candidate = path.join(root, clean);
  if (urlPath.endsWith('/') || (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory())) {
    return path.join(clean, 'index.html');
  }
  return clean;
}

async function getBytes(urlPath) {
  if (!remoteBase) {
    const relative = localPath(urlPath);
    assert(fs.existsSync(path.join(root, relative)), `Missing public resource ${urlPath} -> ${relative}`);
    return fs.readFileSync(path.join(root, relative));
  }
  const response = await fetch(`${remoteBase}${urlPath}`, { redirect: 'follow' });
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

const manifest = JSON.parse(await getText(manifestPath));
assert.equal(manifest.release_version, 'v0.6.3', 'Current release manifest is not v0.6.3.');
assert.equal(manifest.current_package_path, 'releases/v0.6.3-reconstructed/', 'Current package pointer drifted.');
const bookletEntry = manifest.pdf_outputs?.find((item) => item.key === 'rulebook-booklet');
assert(bookletEntry, 'Current release manifest is missing the rulebook booklet.');
assert.equal(`${releaseRoot}${bookletEntry.path}`, bookletPath, 'Manifest booklet path does not match the public booklet path.');

const bookletBytes = await getBytes(bookletPath);
assert.equal(bookletBytes.length, bookletEntry.bytes, 'Published booklet byte count does not match the manifest.');
assert.equal(sha256(bookletBytes), bookletEntry.sha256, 'Published booklet hash does not match the manifest.');
const bookletPdf = await PDFDocument.load(bookletBytes);
assert.equal(bookletPdf.getPageCount(), bookletEntry.pages, 'Published booklet page count does not match the manifest.');

const pages = new Map();
for (const route of corePages) {
  const html = await getText(route);
  pages.set(route, html);
  assert(!html.includes(withdrawnReleaseRoot), `${route} links to the withdrawn v0.6.3 package.`);
}

const rulebook = pages.get('/rulebook/');
const rulebookRefs = htmlRefs(rulebook).map((ref) => normalizeRef('/rulebook/', ref)).filter(Boolean);
assert(rulebookRefs.includes(bookletPath), 'Rulebook does not expose the current printable booklet.');
assert(!rulebookRefs.includes(`${releaseRoot}Gauntlet_v0.6.3_Rulebook.pdf`), 'Rulebook still exposes the old Reader PDF action.');
assert(!rulebookRefs.includes(`${releaseRoot}Gauntlet_v0.6.3_Rulebook.md`), 'Rulebook still exposes the Markdown download action.');
assert(!rulebook.includes('data-print-rulebook'), 'Rulebook still exposes browser printing as a competing print path.');

for (const slug of factions) {
  const symbolPath = `/images/faction-symbols/${slug}.svg`;
  await getBytes(symbolPath);
  for (const route of ['/', '/start/', '/factions/']) {
    assert(pages.get(route).includes(symbolPath), `${route} does not use the canonical ${slug} faction symbol.`);
  }
  assert(pages.get(`/factions/${slug}/`).includes(symbolPath), `Faction guide ${slug} does not use its canonical symbol.`);
}

const designTokens = await getText('/design-tokens.css');
const startStyles = await getText('/start/styles.css');
const definedFontTokens = new Set([...designTokens.matchAll(/(--font-[a-z0-9-]+)\s*:/gi)].map((match) => match[1]));
const usedFontTokens = new Set([...startStyles.matchAll(/var\((--font-[a-z0-9-]+)/gi)].map((match) => match[1]));
for (const token of usedFontTokens) {
  assert(definedFontTokens.has(token), `Start Playing references undefined typography token ${token}.`);
}

if (!remoteBase) {
  for (const [route, html] of pages) {
    for (const ref of htmlRefs(html)) {
      const normalized = normalizeRef(route, ref);
      if (!normalized) continue;
      const relative = localPath(normalized);
      assert(fs.existsSync(path.join(root, relative)), `${route} -> ${ref} resolves to missing ${relative}`);
    }
  }
}

console.log(`Current public contract passed${remoteBase ? ` against ${remoteBase}` : ' against the repository'}: release v0.6.3, booklet integrity, player links, faction symbols, and defined typography tokens.`);
