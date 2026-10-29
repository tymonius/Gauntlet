import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const historicalSuites = [
  "v071-action-discard-retrieval.test.mjs",
  "v071-ambiguous-referent-clarification.test.mjs",
  "v071-asset-replacement-review.test.mjs",
  "v071-battle-card-replacement-retrieval.test.mjs",
  "v071-battle-sequence-state.test.mjs",
  "v071-commandant-repel-review.test.mjs",
  "v071-contextual-query.test.mjs",
  "v071-copied-effect-retrieval-review.test.mjs",
  "v071-deed-cost-clarity-continuity.test.mjs",
  "v071-deed-purchase-eligibility-review.test.mjs",
  "v071-defender-advantage-retrieval.test.mjs",
  "v071-destination-continuity.test.mjs",
  "v071-fieldcraft-territory-state.test.mjs",
  "v071-fog-of-war-continuity.test.mjs",
  "v071-fortifications-tactic-choice-review.test.mjs",
  "v071-good-faith-reference-continuity.test.mjs",
  "v071-intelligence-interference.test.mjs",
  "v071-margin-loan-classification.test.mjs",
  "v071-multi-effect-order-retrieval.test.mjs",
  "v071-mystics-transmutation.test.mjs"
];

describe('Rules Assistant v071 retrieval and continuity QA boundary', () => {
  it('keeps historical v071 retrieval and continuity suites under QA tooling', () => {
    const qa = readdirSync('tools/rules-assistant/qa/tests');
    const backend = readdirSync('rules-assistant');
    for (const name of historicalSuites) {
      expect(qa).toContain(name);
      expect(backend).not.toContain(name);
    }
  });
  it('keeps the migrated suites in historical CI', () => {
    const workflow = readFileSync('.github/workflows/rules-arbiter-historical-regression.yml', 'utf8');
    expect(workflow).toContain('npx vitest run tools/rules-assistant/qa/tests/*.test.mjs');
  });
});
