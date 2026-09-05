import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const exists = relative => fs.existsSync(path.join(root, relative));

const brandPath = 'brand.css';
const correctionsPath = 'legacy/v0.6.1-rulebook-publication/rulebook-production/publication-corrections.css';
const approvedCoverPath = 'legacy/v0.6.1-rulebook-publication/rulebook-design/build_proofs.py';
const brand = read(brandPath);
const corrections = read(correctionsPath);
const approvedCover = read(approvedCoverPath);

const layers = Array.from({ length: 8 }, (_, index) => `assets/wordmark/gauntlet-wordmark-layer-${index + 1}.svg`);
for (const layer of layers) {
  assert(exists(layer), `Missing canonical wordmark layer: ${layer}`);
  assert(brand.includes(`url("/${layer}")`), `Shared brand treatment does not reference canonical wordmark layer: ${layer}`);
}
assert(brand.includes('--gauntlet-wordmark-ratio: 1871.79 / 493.58;'), 'Shared brand treatment lost the canonical wordmark aspect ratio.');
assert(corrections.includes('@import url("../../../brand.css");'), 'Rulebook publication corrections do not import the shared canonical brand treatment.');

const coverRule = corrections.match(/\.front-cover h1\s*\{([\s\S]*?)\n\}/)?.[1] ?? '';
assert(coverRule, 'Rulebook publication corrections are missing the front-cover wordmark rule.');
for (const required of [
  'aspect-ratio: var(--gauntlet-wordmark-ratio);',
  'background-image: var(--gauntlet-wordmark-images);',
  'background-size: contain;',
  'color: transparent;',
  'font-size: 0;',
]) {
  assert(coverRule.includes(required), `Rulebook cover wordmark rule is missing: ${required}`);
}

// Keep the approved production template's semantic document title intact; the
// v0.6.3 publication layer changes only its visual rendering to the official mark.
assert(approvedCover.includes('<h1>Gauntlet</h1>'), 'Approved cover template no longer retains the semantic Gauntlet h1.');

console.log(`Validated official Gauntlet wordmark on the v0.6.3 Rulebook cover using ${layers.length} canonical SVG layers.`);
