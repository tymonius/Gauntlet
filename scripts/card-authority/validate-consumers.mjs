#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT } from '../current-game-authority.mjs';

export const CARD_AUTHORITY_CONSUMERS = Object.freeze([
  'card-design/card-review.js',
  'card-design/supplemental-card.js',
  'card-design/proposal-card.js',
  'card-design/rite-card.js',
  'card-reference/app.js',
  'deckbuilder/production-print.js',
  'deckbuilder/rendered-card-preview.js',
  'deckbuilder/territories.js',
  'scripts/generate-tts-card-assets.mjs',
  'scripts/generate-tts-leader-assets.mjs',
  'scripts/generate-tts-territory-assets.mjs',
  'scripts/generate-tts-supplemental-assets.mjs',
  'scripts/generate-tts-finalized-supplementals.mjs',
  'scripts/tts-sliding-trackers.mjs',
]);

const LEGACY_RENDER_ROUTES = Object.freeze([
  'card-review-render.html',
  'territory-review-render.html',
  'component-render.html',
  'card-back-render.html',
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
]);

function invariant(condition, message) {
  if (!condition) throw new Error(message);
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
  const windows = faceRouteWindows(source);
  invariant(windows.length > 0, `${path} does not route physical faces through face-render.html.`);

  for (const legacy of LEGACY_RENDER_ROUTES) {
    invariant(!source.includes(legacy), `${path} still references retired renderer route ${legacy}.`);
  }

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
  const results = [];
  for (const path of CARD_AUTHORITY_CONSUMERS) {
    const source = await readFile(resolve(ROOT, path), 'utf8');
    results.push(validateConsumerSource(path, source));
  }
  return Object.freeze({
    consumers: results.length,
    routes: results.reduce((sum, result) => sum + result.routeMentions, 0),
    results: Object.freeze(results),
  });
}

if (process.argv[1] && import.meta.url === new URL(`file://${resolve(process.argv[1])}`).href) {
  const result = await validateConsumerContract();
  console.log(JSON.stringify(result, null, 2));
}
