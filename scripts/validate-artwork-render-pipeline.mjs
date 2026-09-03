#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const contracts = [
  {
    path: 'card-design/card-review-render.js',
    requires: [
      'loadRenderContext',
      '/card-design/artwork-crop.js',
      '/card-design/playable-card-renderer.js',
      'renderContext.artDirectionFor(card.id)',
    ],
  },
  {
    path: 'card-design/territory-review-render.js',
    requires: [
      'loadRenderContext',
      '/card-design/artwork-crop.js',
      '/card-design/territory-card-renderer.js',
      'renderContext.artDirectionFor(territory.id)',
    ],
  },
  {
    path: 'card-design/component-render.js',
    requires: [
      'loadCanonicalRenderContext',
      'renderContext.artDirectionFor(artworkId)',
      'surfaceCssSize(orientation)',
      'await applyCanonicalArtworkDirection(card)',
    ],
  },
  {
    path: 'card-design/component-render.html',
    requires: ['/card-design/artwork-crop.js'],
  },
  {
    path: 'tts/renderer/index.html',
    requires: ['/card-design/card-review-render.html'],
  },
  {
    path: 'tts/territory-renderer/index.html',
    requires: ['/card-design/territory-review-render.html'],
  },
  {
    path: 'tts/supplemental-renderer/index.html',
    requires: ['/card-design/component-render.html'],
  },
  {
    path: 'tts/finalized-supplemental-renderer/index.html',
    requires: ['/card-design/component-render.html'],
  },
  {
    path: 'tts/back-renderer/index.html',
    requires: ['/card-design/card-back-render.html'],
  },
  {
    path: 'card-reference/app.js',
    requires: [
      '../card-design/card-review-render.html?card=',
      '../card-design/territory-review-render.html?territory=',
      '../card-design/component-render.html?',
      'PRODUCTION_SURFACES',
    ],
  },
];

const failures = [];
for (const contract of contracts) {
  const source = await readFile(join(ROOT, contract.path), 'utf8');
  for (const required of contract.requires) {
    if (!source.includes(required)) {
      failures.push(`${contract.path} must consume canonical render authority via ${required}`);
    }
  }
}

if (failures.length) {
  console.error('Artwork render pipeline contract failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nCard-like output surfaces must consume Card Design authority instead of maintaining parallel render logic.');
  process.exit(1);
}

console.log('Artwork render pipeline contract passed.');
console.log('Card Design owns face rendering, artwork composition, and physical card geometry.');
console.log('Card Reference, Deckbuilder, and TTS consume canonical render surfaces.');
