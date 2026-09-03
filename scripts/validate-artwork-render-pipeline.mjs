#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const contracts = [
  {
    path: 'card-design/face-render.mjs',
    requires: [
      "resolveFaceSpec(game, faceIdFromLocation())",
      'rendererForTemplate(spec.template)',
      'await loadProductionFonts()',
      'await applyCanonicalArtwork(spec, result)',
      'window.GauntletArtworkCrop.apply',
      'document.body.dataset.gameplayAuthority',
      'document.body.dataset.visualAuthority',
    ],
  },
  {
    path: 'card-design/face-spec.mjs',
    requires: [
      'FACE_TEMPLATE_CONTRACTS',
      'artworkCandidates(card, faction)',
      'territoryArtworkCandidates(territory)',
      'composition: artDirectionSpec(game, card.id)',
      'composition: artDirectionSpec(game, territory.id)',
      'productionReady: issues.length === 0',
    ],
  },
  {
    path: 'card-design/face-template-registry.mjs',
    requires: [
      'playable',
      'territory',
      'leader',
      'reference',
      'tracker',
      'proposal',
      'ledger',
      'deed',
      'rite',
      'ritual',
      "'standard-back'",
    ],
  },
  {
    path: 'deckbuilder/production-print.js',
    requires: [
      '/card-design/face-render.html?id=',
      'faceRenderSource(`card:${cardId}`)',
      'faceRenderSource(`territory:${territoryId}`)',
      'faceRenderSource(`back:${safeFaction}`)',
    ],
  },
  {
    path: 'card-reference/app.js',
    requires: [
      '../card-design/face-render.html?id=',
      'PRODUCTION_SURFACES',
    ],
  },
  {
    path: 'scripts/generate-tts-card-assets.mjs',
    requires: ['/card-design/face-render.html'],
  },
  {
    path: 'scripts/generate-tts-territory-assets.mjs',
    requires: ['/card-design/face-render.html'],
  },
  {
    path: 'scripts/generate-tts-supplemental-assets.mjs',
    requires: ['/card-design/face-render.html'],
  },
  {
    path: 'scripts/generate-tts-finalized-supplementals.mjs',
    requires: ['/card-design/face-render.html'],
  },
];

const failures = [];
for (const contract of contracts) {
  const source = await readFile(join(ROOT, contract.path), 'utf8');
  for (const required of contract.requires) {
    if (!source.includes(required)) {
      failures.push(`${contract.path} must consume unified face authority via ${required}`);
    }
  }
}

if (failures.length) {
  console.error('Artwork render pipeline contract failed:\n');
  for (const failure of failures) console.error(`- ${failure}`);
  console.error('\nAll physical-face consumers must resolve canonical FaceSpec authority and render through face-render.html.');
  process.exit(1);
}

console.log('Artwork render pipeline contract passed.');
console.log('FaceSpec owns face identity, artwork composition, template dependencies, and provenance.');
console.log('Card Design owns the one physical-face renderer; Card Reference, Deckbuilder, and TTS consume it.');
