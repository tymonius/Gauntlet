import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
  findV063LastStandTerminologyViolations,
  normalizeV063LastStandOnlyText,
  normalizeV063LastStandText,
  normalizeV063LastStandValue,
} from '../rules-assistant/v063-last-stand-language.js';

const root = process.cwd();
const read = (relative: string) => fs.readFileSync(path.join(root, relative), 'utf8').replace(/\r\n/g, '\n');
const sha256 = (relative: string) => crypto.createHash('sha256').update(read(relative), 'utf8').digest('hex');

const currentTextSurfaces = [
  'docs/Archive/v0.6.3-development/Gauntlet_v0.6.3_Cross_Surface_Closeout_Matrix.md',
  'docs/Archive/v0.6.3-development/Gauntlet_v0.6.3_General_Card_Rules_Candidate.md',
  'docs/Archive/v0.6.3-development/Gauntlet_v0.6.3_Implementation_Ledger.md',
  'docs/Archive/v0.6.3-development/Gauntlet_v0.6.3_Shared_Rules_Candidate.md',
  'docs/Archive/v0.6.3-development/Gauntlet_v0.6.3_Shared_Rules_Test_Matrix.md',
  'index.html',
  'start/index.html',
  'factions/military/index.html',
  'releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md',
  'releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json',
  'rules-assistant/rules-deterministic-v063.js',
];

describe('PR #171 Last Stand terminology', () => {
  it('defines the semantic contract and is idempotent', () => {
    const legacy = [
      "win your opponent's Last Stand",
      "initiate a Last Stand",
      "force the opponent into a Last Stand and win it",
      "Conduct the Last Stand",
      "The final Territory does not need to be controlled or already captured before that Last Stand can be initiated.",
    ].join('\n');
    const normalized = normalizeV063LastStandOnlyText(legacy);

    expect(normalized).toContain('force your opponent to make a Last Stand and win the resulting battle');
    expect(normalized).toContain('force the opponent to make a Last Stand');
    expect(normalized).toContain('Conduct the resulting battle');
    expect(normalized).toContain('before the opponent can be forced to make a Last Stand');
    expect(findV063LastStandTerminologyViolations(normalized)).toEqual([]);
    expect(normalizeV063LastStandOnlyText(normalized)).toBe(normalized);
  });

  it.each(currentTextSurfaces)('%s contains only the approved terminology', (relative) => {
    const text = read(relative);
    expect(normalizeV063LastStandOnlyText(text), `${relative} would still be changed by the PR #171 normalizer`).toBe(text);
    expect(findV063LastStandTerminologyViolations(text), relative).toEqual([]);
  });

  it('normalizes structured canonical data recursively', () => {
    const legacy = { victory: "win the opponent's Last Stand", nested: [{ access: 'initiate the Last Stand' }] };
    const normalized = normalizeV063LastStandValue(legacy) as typeof legacy;
    expect(normalized.victory).toBe('force the opponent to make a Last Stand and win the resulting battle');
    expect(normalized.nested[0].access).toBe('force the opponent to make a Last Stand');
  });

  it('keeps certified recovered authority bytes immutable while publication normalizes them', () => {
    const rulebookPath = 'artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md';
    const canonicalPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json';

    expect(sha256(rulebookPath)).toBe('7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643');
    expect(sha256(canonicalPath)).toBe('641c813366a8bcb52f9cb505ada640994d416024deed1f71a6ec59fb24ed2c4c');

    expect(findV063LastStandTerminologyViolations(normalizeV063LastStandOnlyText(read(rulebookPath)))).toEqual([]);
    expect(findV063LastStandTerminologyViolations(normalizeV063LastStandOnlyText(read(canonicalPath)))).toEqual([]);
  });

  it('composes the broader player-facing Rulebook corrections in the public prose normalizer', () => {
    const legacy = [
      'Both routes are the normal shared victory condition. Rules and player-facing text may distinguish the **capture route** from the **Last Stand battle route**, but both are running the Gauntlet.',
      'During an Denouement, you may spend 1 Action.',
      '**Asset is the only banked-card effect heading in v0.6.3.**',
    ].join('\n');
    const normalized = normalizeV063LastStandText(legacy);

    expect(normalized).toContain('The capture route and Last Stand battle route both count as running the Gauntlet.');
    expect(normalized).toContain('During Denouement, you may spend 1 Action.');
    expect(normalized).toContain('**Asset is the only banked-card effect heading.**');
    expect(normalizeV063LastStandText(normalized)).toBe(normalized);
  });

  it('keeps published browser authority verified while preserving v0.6.3 corpus verification', () => {
    const rulebookApp = read('rulebook/app.js');
    const corpus = read('rules-assistant/v063-public-corpus.js');

    expect(rulebookApp).toContain("const RELEASE_MANIFEST_URL = '../releases/v0.7.1/Gauntlet_v0.7.1_Manifest.json';");
    expect(rulebookApp).toContain('actualHash !== rulebook.sha256');
    expect(rulebookApp).not.toContain('normalizeV063LastStandText(source)');
    expect(corpus).toContain('if (rulebookHash !== CLEAN_V063_RULEBOOK_SHA256)');
    expect(corpus).toContain('if (canonicalHash !== CLEAN_V063_CANONICAL_DATA_SHA256)');
    expect(corpus.indexOf('validateV063Inputs({ rulebookMarkdown, canonicalData });')).toBeLessThan(corpus.indexOf('normalizeV063LastStandValue(canonicalData)'));
  });

  it('does not allow publication scripts to regenerate current web presentation from reconstruction templates', () => {
    const core = read('docs/recovery/frozen-scripts/v0.6.3/build-clean-v063-publication-core-web.mjs');
    const arbiter = read('docs/recovery/frozen-scripts/v0.6.3/build-clean-v063-publication-arbiter-web.mjs');

    expect(core).not.toContain("prune('rulebook'");
    expect(core).not.toContain("prune('card-reference'");
    expect(arbiter).not.toContain("prune('rules-arbiter'");
    expect(core).toContain('publicAuthorityNote(read(RULEBOOK_SOURCE))');
    expect(core).toContain('publicCanonicalData(read(CANONICAL_SOURCE))');
  });
});
