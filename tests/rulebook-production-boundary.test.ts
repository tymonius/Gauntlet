import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

const read = (path: string) => fs.readFileSync(path, 'utf8');

const adapter = read('scripts/build-rulebook-production.py');
const historicalAdapter = read('scripts/build-v063-rulebook-production.py');
const currentAdapter = read('scripts/render-current-rulebook-booklet.mjs');
const lifecycle = JSON.parse(read('config/release-lifecycle.json'));
const currentWorkflow = read('.github/workflows/build-current-rulebook-booklet.yml');
const historicalWorkflow = read('.github/workflows/build-historical-v063-booklet.yml');
const publishWorkflow = read('.github/workflows/publish-current-rulebook-booklet.yml');
const qualityGate = read('.github/workflows/pr-quality-gate.yml');
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

  it('selects current booklet adapters from release lifecycle instead of a version-pinned workflow', () => {
    const currentRelease = lifecycle.releases[lifecycle.current_release];
    const plan = JSON.parse(execFileSync(process.execPath, ['scripts/render-current-rulebook-booklet.mjs', '--plan'], { encoding: 'utf8' }));
    expect(currentRelease.publication.source_builder).toBe('scripts/build-v071-release-source.mjs');
    expect(currentRelease.publication.rulebook_booklet_renderer).toBe('scripts/render-v071-booklet.mjs');
    expect(plan).toMatchObject({
      version: lifecycle.current_release,
      releaseRoot: currentRelease.current_package_path.replace(/\/$/, ''),
      sourceBuilder: currentRelease.publication.source_builder,
      bookletRenderer: currentRelease.publication.rulebook_booklet_renderer,
    });
    expect(currentAdapter).toContain('lifecycle.current_release');
    expect(currentAdapter).toContain('release.publication?.source_builder');
    expect(currentAdapter).toContain('release.publication?.rulebook_booklet_renderer');
    expect(currentAdapter).not.toContain("const RELEASE_VERSION = 'v0.7.1'");
    expect(currentWorkflow).toContain('node scripts/render-current-rulebook-booklet.mjs');
    expect(currentWorkflow).not.toContain('build-v063-rulebook-production.py');
    expect(currentWorkflow).not.toContain('render-clean-v063-booklet.mjs');
    expect(currentWorkflow).not.toContain('v0.7.1');
    expect(publishWorkflow).toContain('./.github/workflows/build-current-rulebook-booklet.yml');
    expect(publishWorkflow).not.toContain('v0.6.3');
    expect(qualityGate).toContain("uses: ./.github/workflows/build-current-rulebook-booklet.yml");
    expect(qualityGate).toContain("uses: ./.github/workflows/build-historical-v063-booklet.yml");
  });

  it('retains v0.6.3 as a fixed historical compatibility entrypoint', () => {
    expect(historicalAdapter).toContain('"v0.6.3"');
    expect(historicalAdapter).toContain('".v063-player-facing-input.md"');
    expect(historicalAdapter).toContain('"build-rulebook-production.py"');
    expect(historicalWorkflow).toContain('Build historical v0.6.3 Rulebook booklet');
    expect(historicalWorkflow).toContain('scripts/render-clean-v063-booklet.mjs');
    expect(historicalWorkflow).not.toContain('gauntlet-current-rulebook-booklet');
  });
});
