import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/verify-current-live-publication.yml', 'utf8');
const plan = JSON.parse(execFileSync(process.execPath, ['scripts/resolve-current-live-publication.mjs', '--plan'], { encoding: 'utf8' }));

describe('current live-publication boundary', () => {
  it('resolves current Rules Arbiter deployment details through the lifecycle adapter', () => {
    expect(plan).toMatchObject({
      version: 'v0.7.1',
      workerSource: 'rules-assistant/worker-v071.js',
      healthUrl: 'https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/health',
      corpusHealthUrl: 'https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/v071/corpus-health',
      manifestPath: 'releases/v0.7.1/Gauntlet_v0.7.1_Manifest.json',
    });
    expect(plan.behaviorRevision).toMatch(/^v071-/);
    expect(plan.authoritySetId).toMatch(/^[a-f0-9]{64}$/);
  });

  it('keeps current workflow identity independent of a release-specific Worker', () => {
    expect(workflow).toContain('scripts/resolve-current-live-publication.mjs');
    expect(workflow).toContain('steps.release.outputs.health_url');
    expect(workflow).toContain('steps.release.outputs.corpus_health_url');
    expect(workflow).not.toContain('rules-assistant/worker-v071.js');
    expect(workflow).not.toContain('/api/v071/corpus-health');
    expect(workflow).not.toContain("steps.release.outputs.version == 'v0.7.1'");
  });
});
