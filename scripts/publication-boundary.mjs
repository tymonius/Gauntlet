import fs from 'node:fs';
import path from 'node:path';

export const ROOT = process.cwd();
export const CONTRACT_PATH = path.join(ROOT, 'config', 'publication-boundary.json');

export function loadPublicationBoundary(root = ROOT) {
  const contractPath = path.join(root, 'config', 'publication-boundary.json');
  return JSON.parse(fs.readFileSync(contractPath, 'utf8'));
}

export function cleanPublicPath(publicPath) {
  const value = String(publicPath || '');
  if (!value.startsWith('/') || !value.endsWith('/')) {
    throw new Error(`Public route must begin and end with "/": ${value}`);
  }
  if (value.includes('..') || value.includes('?') || value.includes('#')) {
    throw new Error(`Public route contains unsupported traversal or state: ${value}`);
  }
  return value;
}

export function cleanPublicFilePath(publicPath) {
  const value = String(publicPath || '');
  if (!value.startsWith('/') || value.endsWith('/')) {
    throw new Error(`Public file path must begin with "/" and name a file: ${value}`);
  }
  if (value.includes('..') || value.includes('?') || value.includes('#')) {
    throw new Error(`Public file path contains unsupported traversal or state: ${value}`);
  }
  return value;
}

export function publicPathTarget(destinationRoot, publicPath) {
  const clean = cleanPublicPath(publicPath).replace(/^\/+|\/+$/g, '');
  return clean ? path.join(destinationRoot, clean) : destinationRoot;
}

export function publicFileTarget(destinationRoot, publicPath) {
  const clean = cleanPublicFilePath(publicPath).replace(/^\/+/, '');
  return path.join(destinationRoot, clean);
}

export function materializePublicRoutes({
  root = ROOT,
  destinationRoot = root,
  contract = loadPublicationBoundary(root),
  cleanTargets = true,
  skipMissingSources = false,
} = {}) {
  const materialized = [];
  for (const route of contract.materializedRoutes || []) {
    const source = path.join(root, route.source);
    if (!fs.existsSync(source)) {
      if (skipMissingSources) continue;
      throw new Error(`Public-route source is missing: ${route.source}`);
    }
    const destination = publicPathTarget(destinationRoot, route.publicPath);
    if (path.resolve(source) === path.resolve(destination)) {
      throw new Error(`Public-route source and destination must remain independent: ${route.source}`);
    }
    if (cleanTargets) fs.rmSync(destination, { recursive: true, force: true });
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.cpSync(source, destination, { recursive: true });
    materialized.push(route.publicPath);
  }
  return materialized;
}

export function materializePublicFiles({
  root = ROOT,
  destinationRoot = root,
  contract = loadPublicationBoundary(root),
  skipMissingSources = false,
} = {}) {
  const materialized = [];
  for (const file of contract.materializedFiles || []) {
    const source = path.join(root, file.source);
    if (!fs.existsSync(source)) {
      if (skipMissingSources) continue;
      throw new Error(`Public-file source is missing: ${file.source}`);
    }
    if (!fs.statSync(source).isFile()) {
      throw new Error(`Public-file source must be a file: ${file.source}`);
    }
    const destination = publicFileTarget(destinationRoot, file.publicPath);
    if (path.resolve(source) === path.resolve(destination)) {
      throw new Error(`Public-file source and destination must remain independent: ${file.source}`);
    }
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.copyFileSync(source, destination);
    materialized.push(file.publicPath);
  }
  return materialized;
}

export function sourcePathForPublicPath(contract, urlPath) {
  const pathname = decodeURIComponent(String(urlPath || '').split(/[?#]/, 1)[0]);
  const clean = pathname.replace(/^\/+/, '');
  const fileMapping = (contract.materializedFiles || []).find((mapping) => mapping.publicPath === pathname);
  if (fileMapping) return fileMapping.source;

  const mappings = [...(contract.materializedRoutes || [])]
    .sort((a, b) => b.publicPath.length - a.publicPath.length);

  for (const mapping of mappings) {
    const prefix = mapping.publicPath.replace(/^\/+/, '');
    if (clean === prefix.replace(/\/$/, '') || clean.startsWith(prefix)) {
      const remainder = clean.slice(prefix.length);
      return path.join(mapping.source, remainder);
    }
  }
  return clean;
}

export function discoverIndexRoutes(root, mapping) {
  const sourceRoot = path.join(root, mapping.source);
  const discovered = [];

  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.isFile() && entry.name === 'index.html') {
        const relativeDirectory = path.relative(sourceRoot, path.dirname(target)).replaceAll('\\', '/');
        const suffix = relativeDirectory && relativeDirectory !== '.' ? `${relativeDirectory}/` : '';
        discovered.push(`${mapping.publicPath}${suffix}`.replace(/\/{2,}/g, '/'));
      }
    }
  }

  visit(sourceRoot);
  return discovered.sort();
}
