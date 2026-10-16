import { readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('Rules Assistant QA test migration tranche', () => {
  it('separates v071 and v072 regression tests from the runtime root', () => {
    const root = readdirSync('rules-assistant');
    const dest = readdirSync('tests/rules-assistant');
    for(const name of [
      'v071-answer-verifier.test.mjs',
      'v071-scope-precheck.test.mjs',
      'v071-gate3-c-remediation.test.mjs',
      'v071-r13-classification-boundary.test.mjs',
      'v071-qa-foundation.test.mjs',
      'v071-authorized-qa-bypass.test.mjs',
      'v071-inline-source-markers.test.mjs',
      'v071-card-face-authority.test.mjs',
      'v072-release-corpus.test.mjs',
    ]) {
      expect(dest).toContain(name);
      expect(root).not.toContain(name);
    }
  });
});
