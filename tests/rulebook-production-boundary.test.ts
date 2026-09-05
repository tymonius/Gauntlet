import fs from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => fs.readFileSync(path, 'utf8');

const adapter = read('scripts/build-rulebook-production.py');
const historicalAdapter = read('scripts/build-v063-rulebook-production.py');
const currentRenderers = [
  read('scripts/render-v070-booklet.mjs'),
  read('scripts/render-v071-booklet.mjs'),
];
const materializationWorkflows = [
  read('.github/workflows/materialize-v070-release-package.yml'),
  read('.github/workflows/materialize-v071-release-package.yml'),
];

describe('Rulebook production ownership', () => {
  it('makes release identity and source explicit in the maintained adapter', () => {
    expect(adapter).toContain('parser.add_argument("--source"');
    expect(adapter).toContain('parser.add_argument("--version"');
    expect(adapter).toContain('required=True');
    expect(adapter).not.toContain('CURRENT_RULEBOOK');
    expect(adapter).not.toContain('PLAYER_RULEBOOK_INPUT');
  });

  it('keeps current release renderers independent of the v0.6.3 wrapper and paths', () => {
    for (const renderer of currentRenderers) {
      expect(renderer).toContain("'scripts/build-rulebook-production.py'");
      expect(renderer).toContain("'--version', RELEASE_VERSION");
      expect(renderer).toContain("'.player-facing-input.md'");
      expect(renderer).not.toContain('build-v063-rulebook-production.py');
      expect(renderer).not.toContain('.v063-player-facing-input.md');
    }
  });

  it('routes current workflows through the version-neutral adapter and canonical publication source', () => {
    for (const workflow of materializationWorkflows) {
      expect(workflow).toContain('scripts/build-rulebook-production.py');
      expect(workflow).toContain('legacy/v0.6.1-rulebook-publication/**');
      expect(workflow).not.toContain('scripts/build-v063-rulebook-production.py');
      expect(workflow).not.toContain('scripts/run-v063-rulebook-renderer.mjs');
      expect(workflow).not.toMatch(/^\s*-\s*rulebook-production\/\*\*/m);
    }
  });

  it('retains v0.6.3 as a fixed historical compatibility entrypoint', () => {
    expect(historicalAdapter).toContain('"v0.6.3"');
    expect(historicalAdapter).toContain('".v063-player-facing-input.md"');
    expect(historicalAdapter).toContain('"build-rulebook-production.py"');
  });
});
