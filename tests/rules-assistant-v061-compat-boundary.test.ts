import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

describe('Rules Arbiter v061 compatibility boundary', () => {
  it('archives the v061 Worker without retaining a backend-root source alias', () => {
    expect(readdirSync('legacy/rules-assistant/v061')).toContain('worker-v061.js');
    expect(readdirSync('rules-assistant')).not.toContain('worker-v061.js');
  });

  it('retains explicit routing and dependent shared Workers', () => {
    expect(read('rules-assistant/worker-entry.js')).toContain('import v061Worker from "../legacy/rules-assistant/v061/worker-v061.js";');
    expect(read('rules-assistant/smart-worker.js')).toContain('../legacy/rules-assistant/v061/worker-v061.js');
    expect(read('rules-assistant/reliable-worker.js')).toContain('../legacy/rules-assistant/v061/worker-v061.js');
  });

  it('resolves v061 helpers from archived v062 implementations', () => {
    expect(read('legacy/rules-assistant/v062/worker-v062.js')).toContain('from "../v061/worker-v061.js"');
    expect(read('legacy/rules-assistant/v062/worker-v062-candidate.js')).toContain('from "../v061/worker-v061.js"');
  });

  it('retains the maintained legacy-base dependency and deployment syntax checks', () => {
    const worker = read('legacy/rules-assistant/v061/worker-v061.js');
    expect(worker).toContain('from "../../../rules-assistant/worker.js"');
    expect(worker).toContain('from "../../../rules-assistant/local-search.js"');
    const workflow = read('.github/workflows/deploy-rules-arbiter.yml');
    expect(workflow).toContain('"legacy/rules-assistant/v061/**"');
    expect(workflow).toContain('node --check legacy/rules-assistant/v061/worker-v061.js');
  });
});
