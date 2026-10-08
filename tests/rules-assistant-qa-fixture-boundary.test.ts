import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Rules Assistant QA fixture boundary', () => {
  it('separates executable fixtures from retained audit evidence', () => {
    expect(existsSync('rules-assistant/evals')).toBe(false);
    expect(existsSync('tools/rules-assistant/qa/evals')).toBe(true);
    expect(existsSync('artifacts/rules-qa/audits')).toBe(true);

    const fixtures = readdirSync('tools/rules-assistant/qa/evals');
    const audits = readdirSync('artifacts/rules-qa/audits');
    expect(fixtures.length).toBeGreaterThan(0);
    expect(audits.length).toBeGreaterThan(0);
    expect(fixtures.every((name) => name.endsWith('.json'))).toBe(true);
    expect(audits.every((name) => name.endsWith('.md'))).toBe(true);
  });

  it('preserves current, candidate, and historical benchmark families', () => {
    for (const file of [
      'rules-arbiter-evals.v061.json',
      'rules-arbiter-evals.v071.json',
      'rules-arbiter-v072-candidate-regression-replay.json',
      'rules-arbiter-v072-final-regression-replay.json',
    ]) {
      expect(existsSync(`tools/rules-assistant/qa/evals/${file}`), file).toBe(true);
    }
  });

  it('routes maintained QA consumers to the tooling fixture path', () => {
    for (const file of [
      'scripts/run-v071-live-rules-qa.mjs',
      'scripts/run-v072-live-rules-qa.mjs',
      'scripts/run-v071-semantic-rules-qa.mjs',
      'scripts/ingest-rules-regression-candidates.mjs',
      'scripts/scaffold-rules-refinement-pr.mjs',
      '.github/workflows/v072-final-rules-arbiter-qa.yml',
      '.github/workflows/v072-candidate-rules-arbiter-regression-replay.yml',
    ]) {
      const source = read(file);
      expect(source, file).toContain('tools/rules-assistant/qa/evals/');
      expect(source, file).not.toContain('rules-assistant/evals/');
    }
  });
});
