#!/usr/bin/env node
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';
import { ROOT } from '../current-game-authority.mjs';

const LIVE_SOURCE_DIRS = Object.freeze([
  'card-design',
  'card-reference',
  'deckbuilder',
  'factions',
  'playtest',
  'rulebook',
  'rules-arbiter',
  'scripts',
  'start',
  'tts',
  'workers',
]);

const SOURCE_EXTENSIONS = new Set(['.html', '.js', '.mjs']);
const EXCLUDED_DIRECTORIES = new Set(['generated', 'node_modules']);
const EXCLUDED_PATH_PREFIXES = Object.freeze([
  'scripts/card-authority/',
]);

const LEGACY_RENDER_ROUTES = Object.freeze([
  'card-review-render.html',
  'territory-review-render.html',
  'component-render.html',
  'card-back-render.html',
  'card-showcase-embed.html',
  'card-review-render.js',
  'territory-review-render.js',
]);

const RENDER_BEHAVIOR_PARAMETERS = Object.freeze([
  'kind',
  'side',
  'orientation',
  'template',
  'rules',
  'version',
  'fit',
  'printArtwork',
  'releaseTarget',
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function normalized(path) {
  return path.split('\\').join('/');
}

function isSourcePath(path) {
  const value = normalized(path);
  return SOURCE_EXTENSIONS.has(extname(value))
    && !/(?:^|\/)[^/]+\.(?:test|spec)\.(?:js|mjs)$/.test(value)
    && !EXCLUDED_PATH_PREFIXES.some(prefix => value.startsWith(prefix));
}

async function collectSourceFiles(directory, output) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRECTORIES.has(entry.name)) await collectSourceFiles(absolute, output);
      continue;
    }
    const path = normalized(relative(ROOT, absolute));
    if (isSourcePath(path)) output.push(path);
  }
}

export async function discoverPhysicalFaceConsumers() {
  const candidates = [];

  for (const entry of await readdir(ROOT, { withFileTypes: true })) {
    if (entry.isFile()) {
      const path = normalized(entry.name);
      if (isSourcePath(path)) candidates.push(path);
    }
  }

  for (const directory of LIVE_SOURCE_DIRS) {
    await collectSourceFiles(resolve(ROOT, directory), candidates);
  }

  const consumers = [];
  for (const path of [...new Set(candidates)].sort()) {
    const source = await readFile(resolve(ROOT, path), 'utf8');
    if (source.includes('face-render.html') || LEGACY_RENDER_ROUTES.some(route => source.includes(route))) {
      consumers.push(Object.freeze({ path, source }));
    }
  }
  return Object.freeze(consumers);
}

function faceRouteWindows(source) {
  const windows = [];
  let offset = 0;
  while (true) {
    const index = source.indexOf('face-render.html', offset);
    if (index < 0) break;
    windows.push(source.slice(Math.max(0, index - 400), Math.min(source.length, index + 800)));
    offset = index + 'face-render.html'.length;
  }
  return windows;
}

export function validateConsumerSource(path, source) {
  for (const legacy of LEGACY_RENDER_ROUTES) {
    invariant(!source.includes(legacy), `${path} still references retired renderer route ${legacy}.`);
  }

  const windows = faceRouteWindows(source);
  invariant(windows.length > 0, `${path} does not route physical faces through face-render.html.`);

  const suppliesIdentity = source.includes('face-render.html?id=')
    || /searchParams\.set\(['"]id['"]/.test(source);
  invariant(suppliesIdentity, `${path} reaches the canonical renderer without supplying canonical face identity.`);

  for (const window of windows) {
    for (const parameter of RENDER_BEHAVIOR_PARAMETERS) {
      const direct = new RegExp(`[?&]${parameter}=`);
      const setter = new RegExp(`searchParams\\.set\\(['"]${parameter}['"]`);
      invariant(
        !direct.test(window) && !setter.test(window),
        `${path} supplies renderer behavior parameter ${parameter} instead of only canonical face identity.`,
      );
    }
  }

  return Object.freeze({ path, routeMentions: windows.length });
}

export async function validateConsumerContract() {
  const discovered = await discoverPhysicalFaceConsumers();
  const results = discovered.map(({ path, source }) => validateConsumerSource(path, source));
  return Object.freeze({
    consumers: results.length,
    routes: results.reduce((sum, result) => sum + result.routeMentions, 0),
    paths: Object.freeze(results.map(result => result.path)),
    results: Object.freeze(results),
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const result = await validateConsumerContract();
  console.log(JSON.stringify(result, null, 2));
}
