import { execFileSync } from 'node:child_process';
import { describe, expect, test } from 'vitest';

describe('v0.7.0 digital card behavior authority', () => {
  test('audits every released printed effect surface against reachable engine evidence', () => {
    const output = execFileSync(
      process.execPath,
      ['scripts/card-authority/validate-digital-behavior.mjs'],
      { encoding: 'utf8' },
    );
    const reviewOutput = execFileSync(
      process.execPath,
      ['scripts/card-authority/build-digital-behavior-review-bundle.mjs'],
      { encoding: 'utf8' },
    );

    process.stdout.write(output);
    process.stdout.write(reviewOutput);
    expect(output).toContain('v0.7.0 digital behavior audit:');
    expect(output).toContain('printed effect surfaces');
    expect(output).toContain('authority digest:');
    expect(output).toContain('classification digest:');
    expect(reviewOutput).toContain('Digital behavior review bundle:');
  });
});
