import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  ROOT,
  cleanPublicPath,
  discoverIndexRoutes,
  loadPublicationBoundary,
} from './publication-boundary.mjs';

const contract = loadPublicationBoundary();
const siteArgIndex = process.argv.indexOf('--site');
const siteRoot = siteArgIndex >= 0 ? path.resolve(process.argv[siteArgIndex + 1] || '') : null;

assert.equal(contract.schemaVersion, 1, 'Unsupported publication-boundary schema.');
assert(Array.isArray(contract.pages?.publishedDirectories), 'pages.publishedDirectories must be an array.');
assert(Array.isArray(contract.pages?.sourceOnlyRepositoryRoots), 'pages.sourceOnlyRepositoryRoots must be an array.');
assert(Array.isArray(contract.materializedRoutes), 'materializedRoutes must be an array.');
assert(Array.isArray(contract.managedRoutes), 'managedRoutes must be an array.');
assert(Array.isArray(contract.versionedRoutes), 'versionedRoutes must be an array.');

const publishedDirectories = new Set(contract.pages.publishedDirectories);
const sourceOnlyRoots = new Set(contract.pages.sourceOnlyRepositoryRoots);
for (const root of sourceOnlyRoots) {
  assert(!publishedDirectories.has(root), `Source-only repository root is also directly published: ${root}`);
}

function repositoryPathExists(relative) {
  if (fs.existsSync(path.join(ROOT, relative))) return true;
  try {
    return Boolean(execFileSync('git', ['ls-tree', 'HEAD', '--', relative.replaceAll('\\', '/')], {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim());
  } catch {
    return false;
  }
}

const publicPaths = new Set();
const sourcePaths = new Set();
for (const mapping of contract.materializedRoutes) {
  cleanPublicPath(mapping.publicPath);
  assert.equal(typeof mapping.source, 'string', 'Every materialized route requires a source path.');
  assert(!path.isAbsolute(mapping.source) && !mapping.source.includes('..'), `Invalid materialized source: ${mapping.source}`);
  assert(repositoryPathExists(mapping.source), `Materialized route source is missing: ${mapping.source}`);
  assert(!publicPaths.has(mapping.publicPath), `Duplicate materialized public path: ${mapping.publicPath}`);
  assert(!sourcePaths.has(mapping.source), `Duplicate materialized source path: ${mapping.source}`);
  publicPaths.add(mapping.publicPath);
  sourcePaths.add(mapping.source);
}

const managedRoutes = contract.managedRoutes.map(cleanPublicPath);
assert.equal(new Set(managedRoutes).size, managedRoutes.length, 'managedRoutes contains duplicates.');
const managedRouteSet = new Set(managedRoutes);

for (const mapping of contract.materializedRoutes.filter(route => route.manageIndexRoutes)) {
  const discovered = discoverIndexRoutes(ROOT, mapping);
  const declared = managedRoutes.filter(route => route.startsWith(mapping.publicPath)).sort();
  assert.deepEqual(
    declared,
    discovered,
    `Managed route inventory does not exactly cover tracked index pages under ${mapping.source}.`,
  );
}

const lifecycle = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'release-lifecycle.json'), 'utf8'));
assert(lifecycle.current_release, 'release-lifecycle.json does not declare current_release.');
assert.equal(lifecycle.releases?.[lifecycle.current_release]?.status, 'current', 'current_release is not marked current.');

const staleCurrentClaims = [
  /current canonical public playtest release/i,
  /current canonical playtest release/i,
  /current canonical playtest edition/i,
  /the current public playtest edition/i,
  /current playtest release/i,
  /for current playtesting/i,
];

for (const route of contract.versionedRoutes) {
  cleanPublicPath(route.publicPath);
  assert.equal(route.publicPath, `/${route.version}/`, `Versioned route path does not match ${route.version}.`);
  const release = lifecycle.releases?.[route.version];
  assert(release, `Versioned public route ${route.version} has no release-lifecycle entry.`);
  assert(['current', 'historical', 'withdrawn'].includes(release.status), `Unsupported lifecycle status for ${route.version}: ${release.status}`);
  const landing = path.join(ROOT, route.source, 'index.html');
  assert(fs.existsSync(landing), `Versioned route landing source is missing: ${route.source}/index.html`);
  if (release.status !== 'current') {
    const html = fs.readFileSync(landing, 'utf8');
    for (const pattern of staleCurrentClaims) {
      assert(!pattern.test(html), `${route.version} landing still presents a non-current release as current: ${pattern}`);
    }
  }
}

function siteCandidate(urlPath) {
  const pathname = decodeURIComponent(String(urlPath).split(/[?#]/, 1)[0]);
  const clean = pathname.replace(/^\/+/, '');
  const candidate = path.join(siteRoot, clean);
  if (pathname.endsWith('/')) return path.join(candidate, 'index.html');
  if (fs.existsSync(candidate)) return candidate;
  return path.join(candidate, 'index.html');
}

function htmlRefs(html) {
  return [...html.matchAll(/\b(?:href|src)=(['"])(.*?)\1/gi)].map(match => match[2]);
}

function anchorRefs(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref=(['"])(.*?)\1/gi)].map(match => match[2]);
}

function normalizeRef(fromRoute, ref) {
  if (!ref || ref.startsWith('#') || /^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(ref)) return null;
  return new URL(ref, `https://gauntlet.invalid${fromRoute}`).pathname;
}

if (siteRoot) {
  assert(fs.existsSync(siteRoot) && fs.statSync(siteRoot).isDirectory(), `Staged Pages directory is missing: ${siteRoot}`);

  const allowedDirectories = new Set(contract.pages.publishedDirectories);
  for (const mapping of contract.materializedRoutes) {
    allowedDirectories.add(mapping.publicPath.replace(/^\/+/, '').split('/', 1)[0]);
  }
  const requiredRootFiles = new Set(contract.pages.rootFiles?.required || []);
  const generatedRootFiles = new Set(contract.pages.rootFiles?.generated || []);
  const allowedExtensions = new Set(contract.pages.rootFiles?.allowedExtensions || []);

  for (const entry of fs.readdirSync(siteRoot, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      assert(allowedDirectories.has(entry.name), `Unexpected top-level Pages directory: ${entry.name}`);
    } else if (entry.isFile()) {
      const allowed = requiredRootFiles.has(entry.name)
        || generatedRootFiles.has(entry.name)
        || allowedExtensions.has(path.extname(entry.name).toLowerCase());
      assert(allowed, `Unexpected top-level Pages file: ${entry.name}`);
    } else {
      throw new Error(`Unsupported top-level Pages entry type: ${entry.name}`);
    }
  }

  for (const root of sourceOnlyRoots) {
    assert(!fs.existsSync(path.join(siteRoot, root)), `Source-only repository root leaked into Pages: ${root}`);
  }
  for (const file of requiredRootFiles) {
    assert(fs.existsSync(path.join(siteRoot, file)), `Required Pages root file is missing: ${file}`);
  }
  for (const mapping of contract.materializedRoutes) {
    const target = path.join(siteRoot, mapping.publicPath.replace(/^\/+|\/+$/g, ''));
    assert(fs.existsSync(target), `Materialized Pages route is missing: ${mapping.publicPath}`);
  }

  const managedRoots = contract.materializedRoutes
    .filter(route => route.manageIndexRoutes)
    .map(route => route.publicPath);
  const checkedReferences = new Set();
  for (const route of managedRoutes) {
    const indexPath = siteCandidate(route);
    assert(fs.existsSync(indexPath), `Managed Pages route is missing: ${route}`);
    const html = fs.readFileSync(indexPath, 'utf8');

    for (const ref of htmlRefs(html)) {
      const normalized = normalizeRef(route, ref);
      if (!normalized || checkedReferences.has(normalized)) continue;
      const candidate = siteCandidate(normalized);
      assert(fs.existsSync(candidate), `${route} reference ${ref} resolves to missing staged path ${normalized}`);
      checkedReferences.add(normalized);
    }

    for (const ref of anchorRefs(html)) {
      const normalized = normalizeRef(route, ref);
      if (!normalized || !normalized.endsWith('/')) continue;
      if (managedRoots.some(root => normalized.startsWith(root))) {
        assert(managedRouteSet.has(normalized), `${route} links to undeclared managed route ${normalized}`);
      }
    }
  }

  console.log(
    `Publication boundary passed for staged Pages: ${managedRoutes.length} managed routes, ` +
    `${checkedReferences.size} local references, ${allowedDirectories.size} allowed top-level directories.`,
  );
} else {
  console.log(
    `Publication boundary passed for repository sources: ${contract.materializedRoutes.length} source/public mappings, ` +
    `${managedRoutes.length} managed routes, ${contract.versionedRoutes.length} lifecycle-bound version routes.`,
  );
}
