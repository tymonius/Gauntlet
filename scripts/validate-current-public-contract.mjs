import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { PDFDocument } from 'pdf-lib';

const root = process.cwd();
const remoteBase = process.env.GAUNTLET_PUBLIC_BASE_URL?.replace(/\/+$/, '') || null;
const cacheBust = process.env.GAUNTLET_CONTRACT_BUST || '';
const factions = ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition'];

function publicPath(value) {
  if (!value) return null;
  return `/${String(value).replace(/^\/+/, '')}`;
}

function gitEntry(relative) {
  if (remoteBase || !relative) return null;
  try {
    const output = execFileSync('git', ['ls-tree', 'HEAD', '--', relative.replaceAll('\\', '/')], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    if (!output) return null;
    const first = output.split('\n', 1)[0];
    const match = first.match(/^\d+\s+(blob|tree)\s+[0-9a-f]+\t/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

function repositoryPathExists(relative) {
  return fs.existsSync(path.join(root, relative)) || Boolean(gitEntry(relative));
}

function localPath(urlPath) {
  const clean = decodeURIComponent(urlPath.split(/[?#]/, 1)[0]).replace(/^\//, '');
  if (!clean) return 'index.html';
  const candidate = path.join(root, clean);
  const directory = (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) || gitEntry(clean) === 'tree';
  if (urlPath.endsWith('/') || directory) return path.join(clean, 'index.html');
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
    const target = path.join(root, relative);
    assert(fs.existsSync(target), `Required contract input was not checked out: ${urlPath} -> ${relative}`);
    return fs.readFileSync(target);
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

function normalizeNavigationRef(fromRoute, ref) {
  if (!ref || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(ref)) return null;
  const url = new URL(ref, `https://gauntlet.invalid${fromRoute}`);
  return `${url.pathname}${url.hash}`;
}

function primaryNavigationLinks(html, route) {
  const nav = html.match(/<nav\b[^>]*aria-label=(['"])Primary navigation\1[^>]*>([\s\S]*?)<\/nav>/i);
  assert(nav, `${route} is missing the canonical primary navigation element.`);
  return [...nav[2].matchAll(/<a\b[^>]*href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)].map((match) => ({
    href: normalizeNavigationRef(route, match[2]),
    label: match[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
  }));
}
function footerNavigationLinks(html, route) {
  const footer = html.match(/<footer\b[^>]*data-gauntlet-footer=(['"])standard\1[^>]*>([\s\S]*?)<\/footer>/i);
  assert(footer, `${route} is missing the canonical site footer.`);
  const nav = footer[2].match(/<nav\b[^>]*aria-label=(['"])Footer navigation\1[^>]*>([\s\S]*?)<\/nav>/i);
  assert(nav, `${route} canonical site footer is missing Footer navigation.`);
  return [...nav[2].matchAll(/<a\b[^>]*href=(['"])(.*?)\1[^>]*>([\s\S]*?)<\/a>/gi)].map((match) => ({
    href: /^https?:/i.test(match[2]) ? match[2] : normalizeNavigationRef(route, match[2]),
    label: match[3].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim(),
  }));
}

function validateCanonicalFooter(html, route) {
  assert(html.includes('/site-footer.css'), `${route} does not load the shared site-footer stylesheet.`);
  assert(html.includes('/images/Gauntlet.svg'), `${route} footer does not use the canonical Gauntlet wordmark.`);
  assert(html.includes('/images/branding/tds-games-mark.svg'), `${route} footer does not use the TDS Games mark.`);
  assert(html.includes('Published by TDS Games'), `${route} footer is missing the TDS Games publisher line.`);
  assert(html.includes('An imprint of Misty Hollow Enterprises'), `${route} footer is missing the parent-imprint line.`);
  assert(html.includes('Copyright © 2026 Tymon Scott. All rights reserved.'), `${route} footer is missing the canonical copyright notice.`);
  const footerLinks = footerNavigationLinks(html, route);
  assert.deepEqual(
    footerLinks,
    canonicalFooterNavigation,
    `${route} footer navigation drifted from the canonical site footer.`,
  );
  const primaryHrefs = new Set(canonicalPrimaryNavigation.map(({ href }) => href));
  assert(
    !footerLinks.some(({ href }) => primaryHrefs.has(href)),
    `${route} footer repeats a canonical primary-navigation destination.`,
  );
}

function validateModernPublicPage(html, route) {
  const expectedCanonical = new URL(route, 'https://gauntlet.run').href;
  assert(/<meta\s+name=(['"])description\1\s+content=(['"])[^'"]+\2/i.test(html), `${route} is missing a meta description.`);
  assert(html.includes(`rel="canonical" href="${expectedCanonical}"`), `${route} canonical URL drifted from ${expectedCanonical}.`);
  assert(html.includes('property="og:title"'), `${route} is missing Open Graph title metadata.`);
  assert(html.includes('property="og:description"'), `${route} is missing Open Graph description metadata.`);
  assert(html.includes('property="og:image"'), `${route} is missing Open Graph image metadata.`);
  assert(html.includes('name="twitter:card" content="summary_large_image"'), `${route} is missing Twitter card metadata.`);
  assert(html.includes('/site-polish.css'), `${route} does not load shared public-site polish styles.`);
  const skipTarget = html.match(/class=(['"])skip-link\1[^>]*href=(['"])#([^'"]+)\2/i)?.[3];
  assert(skipTarget, `${route} is missing the skip-to-content link.`);
  const mainMatch = html.match(new RegExp(`<main\\b[^>]*id=(["'])${skipTarget}\\1[^>]*>`, 'i'))?.[0];
  assert(mainMatch, `${route} skip link does not target its main landmark.`);
  assert(/\\btabindex=(["'])-1\\1/i.test(mainMatch), `${route} skip target is not programmatically focusable.`);
  assert(html.includes('site-edition-badge'), `${route} is missing the current-edition indicator.`);
  assert(html.includes('/analytics-consent.js'), `${route} does not use opt-in analytics consent.`);
  assert(!html.includes('googletagmanager.com/gtag/js?id='), `${route} loads Google Analytics before consent.`);
}

function brandHomeRef(html, route) {
  const brand = html.match(/<a\b[^>]*class=(['"])[^'"]*\bbrand\b[^'"]*\1[^>]*>/i)?.[0];
  assert(brand, `${route} is missing the shared brand link.`);
  assert(/\baria-label=(['"])Gauntlet home\1/i.test(brand), `${route} brand link must use the shared accessible name.`);
  const href = brand.match(/\bhref=(['"])(.*?)\1/i)?.[2];
  return normalizeNavigationRef(route, href);
}

const canonicalPrimaryNavigation = [
  { href: '/start/', label: 'Start' },
  { href: '/#game', label: 'Game' },
  { href: '/rulebook/', label: 'Rules' },
  { href: '/factions/', label: 'Factions' },
  { href: '/deckbuilder/', label: 'Deckbuilder' },
  { href: '/card-reference/', label: 'Card Reference' },
  { href: '/rules-arbiter/', label: 'Rules Arbiter' },
];
const canonicalFooterNavigation = [
  { href: '/about/', label: 'About' },
  { href: '/faq/', label: 'FAQ' },
  { href: '/contact/', label: 'Contact' },
  { href: 'https://steamcommunity.com/sharedfiles/filedetails/?id=3790840635', label: 'Tabletop Simulator' },
  { href: '/privacy/', label: 'Privacy' },
];

// Footer exceptions must be explicit and justified. Printed playtest artifacts such as
// /playtest/player-mat/ and /playtest/sheet/ are intentionally outside the public-page
// contract because their footers are part of the document itself rather than site chrome.
const canonicalFooterExceptions = new Map();
const footerOnlyRoutes = [
  '/playtest/',
  '/playtest/analysis/',
  '/playtest/analysis/integrity/',
  '/playtest/batch/',
  '/playtest/feedback/',
  '/playtest/guide/',
  '/playtest/host/',
  '/playtest/onboarding/',
  '/playtest/retrospective/',
  '/playtest/session/',
  '/playtest/tracked/',
];
const consentPlaytestRoutes = [
  '/playtest/analysis/',
  '/playtest/analysis/integrity/',
  '/playtest/feedback/',
  '/playtest/guide/',
  '/playtest/host/',
  '/playtest/onboarding/',
  '/playtest/retrospective/',
  '/playtest/tracked/',
];

const lifecycle = JSON.parse(await getText('/config/release-lifecycle.json'));
const currentVersion = lifecycle.current_release;
assert(currentVersion, 'Release lifecycle does not define current_release.');
const currentRelease = lifecycle.releases?.[currentVersion];
assert(currentRelease, `Release lifecycle has no entry for ${currentVersion}.`);
assert.equal(currentRelease.status, 'current', `${currentVersion} is not marked current.`);
assert.equal(currentRelease.public_cutover, true, `${currentVersion} is not marked for public cutover.`);

const releaseRoot = publicPath(currentRelease.current_package_path);
assert(releaseRoot, `${currentVersion} does not define its current package path.`);
const normalizedReleaseRoot = releaseRoot.endsWith('/') ? releaseRoot : `${releaseRoot}/`;
const historicalRootValue = currentRelease.historical_package_path;
const historicalRoot = historicalRootValue ? `${publicPath(historicalRootValue).replace(/\/+$/, '')}/` : null;
const manifestPath = `${normalizedReleaseRoot}Gauntlet_${currentVersion}_Manifest.json`;
const manifestBytes = await getBytes(manifestPath);
const manifest = JSON.parse(manifestBytes.toString('utf8'));
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
const releaseLandingRoute = `/${currentVersion}/`;
const changelogRoute = '/changelog/';
const siteInfoRoutes = ['/about/', '/faq/', '/privacy/', '/contact/', '/accessibility/', '/press/'];
const withdrawnVersionRoutes = Object.entries(lifecycle.releases ?? {})
  .filter(([, release]) => release?.status === 'withdrawn')
  .flatMap(([version]) => [`/${version}/`, `/releases/${version}/`]);
const withdrawnPackageRoutes = Object.values(lifecycle.releases ?? {})
  .map((release) => release?.historical_package_path)
  .filter(Boolean)
  .map((packagePath) => `${publicPath(packagePath).replace(/\/+$/, '')}/`);
const removedLegacyPackageRoutes = [
  '/releases/v0.6.2/',
  '/releases/v0.6.3-reconstructed/',
];
const forbiddenReleaseRoutes = [...new Set([
  ...withdrawnVersionRoutes,
  ...withdrawnPackageRoutes,
  ...removedLegacyPackageRoutes,
])];
const corePages = [
  '/',
  releaseLandingRoute,
  changelogRoute,
  ...siteInfoRoutes,
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

  const normalizedRefs = htmlRefs(html)
    .map((ref) => normalizeRef(route, ref))
    .filter(Boolean);
  for (const forbiddenRoute of forbiddenReleaseRoutes) {
    assert(
      !normalizedRefs.some((ref) => ref === forbiddenRoute || ref.startsWith(forbiddenRoute)),
      `${route} links to withdrawn or removed release route ${forbiddenRoute}.`,
    );
  }
}

for (const [route, html] of pages) {
  assert.deepEqual(
    primaryNavigationLinks(html, route),
    canonicalPrimaryNavigation,
    `${route} primary navigation drifted from the canonical global header.`,
  );
  assert.equal(brandHomeRef(html, route), '/', `${route} brand link does not return to the site root.`);
  if (!canonicalFooterExceptions.has(route)) {
    validateCanonicalFooter(html, route);
  }
  validateModernPublicPage(html, route);
}

for (const route of footerOnlyRoutes) {
  const html = await getText(route);
  if (!canonicalFooterExceptions.has(route)) {
    validateCanonicalFooter(html, route);
  }
  if (consentPlaytestRoutes.includes(route)) {
    assert(html.includes('/analytics-consent.js'), `${route} does not use opt-in analytics consent.`);
    assert(!html.includes('googletagmanager.com/gtag/js?id='), `${route} loads Google Analytics before consent.`);
    const skipTarget = html.match(/class=(['"])skip-link\1[^>]*href=(['"])#([^'"]+)\2/i)?.[3];
    assert(skipTarget, `${route} is missing the skip-to-content link.`);
    const mainMatch = html.match(new RegExp(`<main\\b[^>]*id=(["'])${skipTarget}\\1[^>]*>`, 'i'))?.[0];
    assert(mainMatch && /\\btabindex=(["'])-1\\1/i.test(mainMatch), `${route} skip target is not focusable.`);
  }
}

const notFoundPage = await getText('/404.html');
assert(notFoundPage.includes('name="robots" content="noindex,follow"'), '404 page must remain out of search indexes.');
assert.deepEqual(primaryNavigationLinks(notFoundPage, '/404.html'), canonicalPrimaryNavigation, '404 primary navigation drifted.');
assert.equal(brandHomeRef(notFoundPage, '/404.html'), '/', '404 brand link does not return to the site root.');
validateCanonicalFooter(notFoundPage, '/404.html');
assert(notFoundPage.includes('/analytics-consent.js'), '404 page does not use opt-in analytics consent.');
assert(!notFoundPage.includes('googletagmanager.com/gtag/js?id='), '404 page loads Google Analytics before consent.');

const contactThanks = await getText('/contact/thanks/');
assert(contactThanks.includes('name="robots" content="noindex,follow"'), 'Contact confirmation page must remain out of search indexes.');
assert.deepEqual(primaryNavigationLinks(contactThanks, '/contact/thanks/'), canonicalPrimaryNavigation, 'Contact confirmation primary navigation drifted.');
assert.equal(brandHomeRef(contactThanks, '/contact/thanks/'), '/', 'Contact confirmation brand link does not return to the site root.');
validateCanonicalFooter(contactThanks, '/contact/thanks/');
assert(contactThanks.includes('/analytics-consent.js'), 'Contact confirmation page does not use opt-in analytics consent.');
assert(!contactThanks.includes('googletagmanager.com/gtag/js?id='), 'Contact confirmation page loads Google Analytics before consent.');

const robots = await getText('/robots.txt');
assert(robots.includes('Sitemap: https://gauntlet.run/sitemap.xml'), 'robots.txt does not advertise the canonical sitemap.');

const sitemap = await getText('/sitemap.xml');
for (const route of ['/', ...siteInfoRoutes, releaseLandingRoute, changelogRoute, ...routeValues, ...factions.map((slug) => `/factions/${slug}/`)]) {
  const expectedUrl = new URL(route, 'https://gauntlet.run').href;
  assert(sitemap.includes(`<loc>${expectedUrl}</loc>`), `sitemap.xml is missing ${expectedUrl}.`);
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
    assert(repositoryPathExists(relative), `Public reference ${normalized} resolves to missing ${relative}`);
  }
}

console.log(`Current public contract passed${remoteBase ? ` against ${remoteBase}` : ' against the repository'}: ${currentVersion}, canonical global header navigation, release landing/changelog, booklet integrity, resolvable player links, canonical faction symbols, withdrawn/removed-route isolation, and defined typography tokens.`);
