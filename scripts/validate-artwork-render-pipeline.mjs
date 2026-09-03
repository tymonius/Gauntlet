#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const contracts = [
  {
    path: 'card-design/face-render.mjs',
    requires: [
      'loadRenderGame',
      'resolveFaceSpec',
      'rendererForTemplate(spec.template)',
      'await applyCanonicalArtwork(spec, result)',
    ],
  },
  {
    path: 'card-design/card-review.js',
    requires: ['/card-design/face-render.html?id='],
  },
  {
    path: 'card-design/proposal-card.js',
    requires: ['/card-design/face-render.html?id='],
  },
  {
    path: 'card-design/rite-card.js',
    requires: ['/card-design/face-render.html?id='],
  },
  {
    path: 'card-design/supplemental-card.js',
    requires: ['/card-design/face-render.html?id='],
  },
  {
    path: 'card-reference/app.js',
    requires: [
      '../card-design/face-render.html?id=',
      'PRODUCTION_SURFACES',
    ],
  },
  {
    path: 'deckbuilder/production-print.js',
    requires: ['/card-design/face-render.html?id='],
  },
  {
    path: 'deckbuilder/rendered-card-preview.js',
    requires: ['../card-design/face-render.html?id='],
  },
  {
    path: 'deckbuilder/territories.js',
    requires: ['../card-design/face-render.html?id='],
  },
  {
    path: 'scripts/generate-tts-card-assets.mjs',
    requires: ['/card-design/face-render.html?id='],
  },
  {
    path: 'scripts/generate-tts-leader-assets.mjs',
    requires: ['/card-design/face-render.html'],
  },
  {
    path: 'scripts/generate-tts-territory-assets.mjs',
    requires: ['/card-design/face-render.html?id='],
  },
  {
    path: 'scripts/generate-tts-supplemental-assets.mjs',
    requires: ['/card-design/face-render.html'],
  },
  {
    path: 'scripts/generate-tts-finalized-supplementals.mjs',
    requires: ['/card-design/face-render.html'],
  },
  {
    path: 'scripts/tts-sliding-trackers.mjs',
    requires: ['/card-design/face-render.html'],
  },
];

const productionConsumers = [
  'card-design/card-review.js',
  'card-design/proposal-card.js',
  'card-design/rite-card.js',
  'card-design/supplemental-card.js',
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
];

const retiredProductionRoutes = [
  'card-review-render.html?',
  'territory-review-render.html?',
  'component-render.html?',
  'card-back-render.html?',
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

for (const path of productionConsumers) {
  const source = await readFile(join(ROOT, path), 'utf8');
  for (const retired of retiredProductionRoutes) {
    if (source.includes(retired)) {
      failures.push(`${path} still depends on retired production route ${retired}`);
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
console.log('Card Design review, Card Reference, Deckbuilder, printing, and TTS consume the unified canonical face route.');
