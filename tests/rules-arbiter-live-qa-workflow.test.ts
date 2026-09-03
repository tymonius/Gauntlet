import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const workflow = readFileSync('.github/workflows/v071-rules-arbiter-live-qa.yml', 'utf8');
const worker = readFileSync('rules-assistant/worker-v071.js', 'utf8');

describe('v0.7.1 live Rules Arbiter QA deployment gate', () => {
  it('derives the expected behavior revision from the Worker source instead of duplicating it', () => {
    const workerRevision = worker.match(/export const BEHAVIOR_REVISION = "([^"]+)"/)?.[1];
    expect(workerRevision).toBeTruthy();
    expect(workflow).toContain('readFileSync("rules-assistant/worker-v071.js", "utf8")');
    expect(workflow).toContain('const revisionMatch = workerSource.match(/export const BEHAVIOR_REVISION = "([^"]+)"/)');
    expect(workflow).not.toContain('EXPECTED_BEHAVIOR_REVISION:');
    expect(workflow).not.toContain(`EXPECTED_BEHAVIOR_REVISION: ${workerRevision}`);
  });
});
