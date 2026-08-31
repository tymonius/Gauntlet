#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const contracts = [
  {
    path: 'card-design/index.html',
    requires: [
      'current-card-catalog.js',
      '../tts/artwork-crop.js',
    ],
  },
  {
    path: 'card-design/card-review-render.js',
    requires: [
      '/tts/artwork-direction-overrides.js',
      '/tts/artwork-crop.js',
    ],
  },
  {
    path: 'card-design/territory-review-render.js',
    requires: [
      '/tts/artwork-direction-overrides.js',
      '/tts/artwork-crop.js',
    ],
  },
  {
    path: 'tts/renderer/index.html',
    requires: [
      '/tts/artwork-direction-overrides.js',
      '/tts/artwork-crop.js',
    ],
  },
  {
    path: 'tts/territory-renderer/index.html',
    requires: [
      '/tts/artwork-direction-overrides.js',
      '/tts/artwork-crop.js',
    ],
  },
  {
    path: 'card-reference/app.js',
    requires: [
      '../card-design/card-review-render.html?card=',
      '../card-design/territory-review-render.html?territory=',
    ],
  },
];

const failures = [];
for (const contract of contracts) {
  const source = await readFile(join(ROOT, contract.path), 'utf8');
  for (const required of contract.requires) {
    if (!source.includes(required)) {
      failures.push(`${contract.path} must use shared artwork rendering via ${required}`);
    }
  }
}

if (failures.length) {
  console.error('Artwork render pipeline contract failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nRendered-card surfaces must consume the shared composition source instead of maintaining output-specific positioning.');
  process.exit(1);
}

console.log('Artwork render pipeline contract passed.');
console.log('Saved card compositions propagate through /card-design, Card Reference, and TTS renderers.');
console.log('Future card-rendering surfaces (including Deckbuilder viewing/printing) should reuse the canonical card/territory review renderers or this same shared override + crop pipeline.');
