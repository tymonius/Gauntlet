import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const runner = readFileSync('scripts/run-v071-live-rules-qa.mjs', 'utf8');
const benchmark = JSON.parse(
  readFileSync('rules-assistant/evals/rules-arbiter-evals.v071.json', 'utf8')
);

describe('Rules Arbiter representative smoke and Chief Justice voice QA', () => {
  it('uses ten deliberately representative smoke cases instead of the first ten benchmark rows', () => {
    expect(benchmark.smokeCaseIds).toHaveLength(10);
    expect(new Set(benchmark.smokeCaseIds).size).toBe(10);

    const byId = new Map(benchmark.cases.map((item: any) => [item.id, item]));
    const smoke = benchmark.smokeCaseIds.map((id: string) => byId.get(id));
    expect(smoke.every(Boolean)).toBe(true);

    const categories = new Set(smoke.map((item: any) => item.category));
    for (const category of [
      'core',
      'military',
      'diplomats',
      'financiers',
      'intelligence',
      'mystics',
      'inquisition',
      'cards',
      'live-regression',
      'conversation'
    ]) {
      expect(categories.has(category)).toBe(true);
    }

    expect(smoke.some((item: any) => item.expectedClassification === 'inferred')).toBe(true);
    expect(runner).toContain('benchmark.smokeCaseIds');
    expect(runner).not.toContain('benchmark.cases.slice(0, caseLimit)');
  });

  it('treats Starting Territory determination as an inference from explicit setup steps', () => {
    const item = benchmark.cases.find((candidate: any) => candidate.id === 'core-setup-starting-territory');
    expect(item.expectedClassification).toBe('inferred');
    expect(item.expectedSourcePatterns).toContain(
      "Place each Player Token on the Territory at that player's end"
    );
    expect(item.expectedSourcePatterns).not.toContain('Starting Territory');
  });

  it('scores objective Chief Justice voice failures without adding another paid model call', () => {
    expect(benchmark.dimensions).toContain('Chief Justice voice');
    expect(runner).toContain('function inspectChiefJusticeVoice(answer)');
    expect(runner).toContain('voice: answer opens with canned or conspicuously modern conversational filler');
    expect(runner).toContain('voice: answer uses prohibited faux-legal or archaic language');
    expect(runner).toContain('voice: answer roleplays the Chief Justice or addresses the player as a litigant');
    expect(runner).toContain('failedCases: voiceFailed.length');
    expect(runner).toContain('warnedCases: voiceWarned.length');
    expect(runner).not.toMatch(/api\.openai\.com/i);
  });
});
