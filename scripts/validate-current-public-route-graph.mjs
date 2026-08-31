import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const contractPath = path.join(root, 'config', 'current-public-routes.json');
const remoteBase = process.env.GAUNTLET_PUBLIC_BASE_URL?.replace(/\/+$/, '') || null;
const cacheBust = process.env.GAUNTLET_CONTRACT_BUST || '';

function readContract() {
  assert(fs.existsSync(contractPath), 'Current public-route contract is missing.');
  return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
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
    const match = output.split('\n', 1)[0].match(/^\d+\s+(blob|tree)\s+[0-9a-f]+\t/);
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
    assert(fs.existsSync(target), `Required route input was not checked out: ${urlPath} -> ${relative}`);
    return fs.readFileSync(target);
  }
  const response = await fetch(remoteUrl(urlPath), { redirect: 'follow', cache: 'no-store' });
  assert(response.ok, `${urlPath} returned HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
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

function routeForIndexPath(indexPath) {
  const normalized = indexPath.replaceAll('\\', '/');
  assert(normalized.endsWith('/index.html') || normalized === 'index.html', `Not an index route: ${indexPath}`);
  const prefix = normalized === 'index.html' ? '' : normalized.slice(0, -'index.html'.length);
  return `/${prefix}`.replace(/\/{2,}/g, '/');
}

function walkIndexFiles(directory) {
  const discovered = [];
  if (!fs.existsSync(directory)) return discovered;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) discovered.push(...walkIndexFiles(target));
    else if (entry.isFile() && entry.name === 'index.html') discovered.push(path.relative(root, target));
  }
  return discovered;
}

const contract = readContract();
assert.equal(contract.schema_version, 1, 'Unsupported current public-route contract schema.');
assert(Array.isArray(contract.managed_roots) && contract.managed_roots.length > 0, 'Current public-route contract has no managed roots.');
assert(Array.isArray(contract.routes) && contract.routes.length > 0, 'Current public-route contract has no routes.');

const managedRoots = contract.managed_roots.map(String);
const routes = contract.routes.map(String);
const routeSet = new Set(routes);

assert.equal(routeSet.size, routes.length, 'Current public-route contract contains duplicate routes.');
for (const route of [...managedRoots, ...routes]) {
  assert(route.startsWith('/') && route.endsWith('/'), `Public route must be root-relative and end in "/": ${route}`);
  assert(!route.includes('?') && !route.includes('#'), `Public route inventory must not encode query/hash state: ${route}`);
}
for (const route of routes) {
  assert(managedRoots.some(managedRoot => route.startsWith(managedRoot)), `Route is outside every managed root: ${route}`);
}

if (!remoteBase) {
  for (const managedRoot of managedRoots) {
    const managedDirectory = path.join(root, managedRoot.replace(/^\/+|\/+$/g, ''));
    const discoveredRoutes = walkIndexFiles(managedDirectory).map(routeForIndexPath).sort();
    const declaredRoutes = routes.filter(route => route.startsWith(managedRoot)).sort();
    assert.deepEqual(
      declaredRoutes,
      discoveredRoutes,
      `Current route inventory does not exactly cover tracked index pages under ${managedRoot}`,
    );
  }
}

const checkedReferences = new Set();
for (const route of routes) {
  const html = (await getBytes(route)).toString('utf8');

  for (const ref of htmlRefs(html)) {
    const normalized = normalizeRef(route, ref);
    if (!normalized) continue;
    if (!checkedReferences.has(normalized)) {
      if (remoteBase) await getBytes(normalized);
      else {
        const relative = localPath(normalized);
        assert(repositoryPathExists(relative), `${route} reference ${ref} resolves to missing ${relative}`);
      }
      checkedReferences.add(normalized);
    }
  }

  for (const ref of anchorRefs(html)) {
    const normalized = normalizeRef(route, ref);
    if (!normalized || !normalized.endsWith('/')) continue;
    for (const managedRoot of managedRoots) {
      if (normalized.startsWith(managedRoot)) {
        assert(routeSet.has(normalized), `${route} links to undeclared current route ${normalized}`);
      }
    }
  }
}

console.log(
  `Current public-route graph passed${remoteBase ? ` against ${remoteBase}` : ' against the repository'}: ` +
  `${routes.length} declared routes across ${managedRoots.length} managed root(s), ${checkedReferences.size} local references resolved.`,
);
