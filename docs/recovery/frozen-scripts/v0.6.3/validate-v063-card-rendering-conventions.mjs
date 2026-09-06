import { readFileSync } from 'node:fs';

const rendererPath = process.env.V063_CARD_RENDERER ?? 'card-design/playable-card-renderer.js';
const source = readFileSync(rendererPath, 'utf8');

const match = source.match(/const COMPACT_INSTRUCTION_PATTERN = (\/.*\/g);/);
if (!match) throw new Error('Unable to locate COMPACT_INSTRUCTION_PATTERN in card renderer.');

const pattern = Function(`"use strict"; return (${match[1]});`)();
const exactSamples = [
  '+1 Action',
  '−1 Reserve',
  '+1 Tactic',
  '+2 Cards',
  '+1 Tactic from Hand',
  '+1 Tactic from those cards',
  '+1 Tactic using that card',
  'Retreat +1',
  'Advance Front Line 1',
  'Command = 2'
];

for (const sample of exactSamples) {
  pattern.lastIndex = 0;
  const matches = [...sample.matchAll(pattern)];
  if (matches.length !== 1 || matches[0][0] !== sample) {
    throw new Error(`Renderer does not emphasize the complete compact instruction: ${sample}`);
  }
}

for (const sample of [
  '+1 Tactic from Reserve',
  '+1 Tactic using some unrelated prose'
]) {
  pattern.lastIndex = 0;
  const matchResult = pattern.exec(sample);
  if (matchResult?.[0] === sample) {
    throw new Error(`Renderer over-extends compact-instruction emphasis: ${sample}`);
  }
}

if (!source.includes("catalog?.gameVersion === 'v0.6.3'")) {
  throw new Error('Compact-instruction emphasis is not gated to v0.6.3 rendering.');
}

if (!source.includes("catalog?.gameVersion === 'v0.6.3' && String(card.name).length > 21")) {
  throw new Error('Long-title treatment is not gated to v0.6.3 rendering at the approved threshold.');
}
if (!source.includes("? ' long-title'")) {
  throw new Error('Renderer does not apply the existing long-title class to qualifying v0.6.3 cards.');
}

if (!source.includes('Gambit/<br>Tactic')) {
  throw new Error('Gambit/Tactic is not stacked as Gambit/ over Tactic in the renderer.');
}
if (!source.includes('aria-label="Gambit or Tactic"')) {
  throw new Error('Stacked Gambit/Tactic heading lacks its prose accessibility label.');
}

console.log(`Validated ${exactSamples.length} compact-instruction rendering forms, v0.6.3 long-title treatment, and stacked Gambit/Tactic presentation.`);
