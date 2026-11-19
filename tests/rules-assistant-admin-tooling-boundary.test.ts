import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');

const adminSources = [
  'admin-page.js',
  'admin-import-page.js',
  'admin-incremental-export-page.js',
  'admin-intelligence-page.js',
  'admin-triage-page.js',
  'admin-scaffold-page.js',
  'admin-refinement-runtime.js',
  'admin-shared.js',
  'review-export-checkpoint.js',
  'review-export.js',
  'review-intelligence.js',
];

describe('Rules Assistant admin tooling boundary', () => {
  it('owns private review/export implementation under tools', () => {
    for (const file of adminSources) {
      expect(existsSync(`tools/rules-assistant/admin/${file}`), file).toBe(true);
      expect(existsSync(`rules-assistant/${file}`), file).toBe(false);
    }
  });

  it('keeps deployed Worker entrypoints in the backend boundary while importing admin tooling', () => {
    const entry = read('rules-assistant/worker-entry.js');
    const refinement = read('rules-assistant/admin-refinement-worker.js');
    const worker = read('legacy/rules-assistant/v060/worker-v060.js');
    expect(existsSync('rules-assistant/worker.js')).toBe(false);

    expect(entry).toContain('../tools/rules-assistant/admin/admin-intelligence-page.js');
    expect(entry).toContain('../tools/rules-assistant/admin/review-export.js');
    expect(entry).toContain('../tools/rules-assistant/admin/review-intelligence.js');
    expect(refinement).toContain('../tools/rules-assistant/admin/admin-refinement-runtime.js');
    expect(refinement).toContain('../tools/rules-assistant/admin/admin-scaffold-page.js');
    expect(worker).toContain('../../../tools/rules-assistant/admin/admin-page.js');
    expect(worker).toContain('../../../tools/rules-assistant/admin/admin-shared.js');
    for (const file of ['review-export.js', 'review-export-checkpoint.js', 'review-intelligence.js']) {
      const source = read(`tools/rules-assistant/admin/${file}`);
      expect(source).toContain('from "./admin-shared.js"');
      expect(source).not.toContain('from "../../../rules-assistant/worker.js"');
    }
    const shared = read('tools/rules-assistant/admin/admin-shared.js');
    expect(shared).toContain('export async function isAdminAuthorized');
    expect(shared).toContain('export function interactionsToCsv');
    expect(worker).not.toContain('async function safeEqual(');
    expect(worker).not.toContain('function csvCell(');
  });

  it('routes admin-tooling changes through Worker deployment validation', () => {
    const workflow = read('.github/workflows/deploy-rules-arbiter.yml');
    expect(workflow).toContain('"tools/rules-assistant/admin/**"');
    expect(workflow).toContain('node --check tools/rules-assistant/admin/review-export.js');
    expect(workflow).toContain('node --check tools/rules-assistant/admin/review-intelligence.js');
    expect(workflow).toContain('node --check tools/rules-assistant/admin/review-export-checkpoint.js');
    expect(workflow).toContain('node --check tools/rules-assistant/admin/admin-shared.js');
    expect(workflow).toContain('tools/rules-assistant/admin/tests/admin-shared.test.mjs');
  });
});
