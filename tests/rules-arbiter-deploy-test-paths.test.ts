import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('deployed Rules Arbiter test-path contract', () => {
  it('executes only maintained, present QA test suites in the production deployment gate', () => {
    const workflow = readFileSync('.github/workflows/deploy-rules-arbiter.yml', 'utf8');
    const paths = [...workflow.matchAll(/(?:^|\s)(tools\/rules-assistant\/qa\/tests\/[a-z0-9-]+\.test\.mjs)(?=\s|$)/gm)]
      .map((match) => match[1]);
    expect(paths).toHaveLength(8);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of paths) expect(existsSync(path), path).toBe(true);
    expect(workflow).not.toMatch(/(?:^|\s)rules-assistant\/[a-z0-9-]+\.test\.mjs(?=\s|$)/m);
    expect(workflow).toContain('npx vitest run');
    expect(workflow).toContain('node --check rules-assistant/admin-refinement-worker.js');
  });

  it('preserves the real deployment and health checks after the executable test gate', () => {
    const workflow = readFileSync('.github/workflows/deploy-rules-arbiter.yml', 'utf8');
    expect(workflow).toContain('run: npx wrangler deploy --config rules-assistant/wrangler.toml');
    expect(workflow).toContain('Verify production health');
    expect(workflow).toContain('Verify frozen v0.7.2 health and corpus');
  });
});
