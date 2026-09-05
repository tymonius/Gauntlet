import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CURRENT_RULES_VERSION } from '../src/content/current';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const lifecycle = JSON.parse(readFileSync('config/release-lifecycle.json', 'utf8'));
const currentManifest = JSON.parse(
  readFileSync(`releases/${lifecycle.current_release}/Gauntlet_${lifecycle.current_release}_Manifest.json`, 'utf8'),
);
const engineReadme = readFileSync('src/README.md', 'utf8');

function sourceFilesUnder(root: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory()) {
      files.push(...sourceFilesUnder(path));
      continue;
    }

    if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) files.push(path);
  }

  return files;
}

describe('digital engine boundary', () => {
  it('keeps the old playable v0.6 runners explicitly archived', () => {
    expect(packageJson.scripts['dev:cli']).toBeUndefined();
    expect(packageJson.scripts['dev:gui']).toBeUndefined();
    expect(packageJson.scripts['dev:legacy:cli']).toBe('tsx legacy/digital-engine-v06/cli/dev-runner-v06.ts');
    expect(packageJson.scripts['dev:legacy:gui']).toBe('tsx legacy/digital-engine-v06/gui/dev-server-v06.ts');

    expect(existsSync('legacy/digital-engine-v06/cli/dev-runner-v06.ts')).toBe(true);
    expect(existsSync('legacy/digital-engine-v06/gui/dev-server-v06.ts')).toBe(true);
    expect(readdirSync('src/cli')).not.toContain('dev-runner-v06.ts');
    expect(readdirSync('src/gui')).not.toContain('dev-server-v06.ts');
    expect(existsSync('legacy/digital-engine-dev-runners/v056-cli-dev-runner.ts.txt')).toBe(true);
    expect(existsSync('legacy/digital-engine-dev-runners/v056-gui-dev-server.ts.txt')).toBe(true);
  });

  it('quarantines the old playable v0.6 architecture outside active src', () => {
    for (const directory of ['cards', 'dev', 'effects', 'state', 'types']) {
      expect(existsSync(`src/${directory}`)).toBe(false);
      expect(existsSync(`legacy/digital-engine-v06/${directory}`)).toBe(true);
    }
  });

  it('distinguishes the published digital-rules target from the promoted implementation baseline', () => {
    const publishedTarget = currentManifest.public_defaults?.digital_rules;
    expect(publishedTarget).toBe(lifecycle.current_release);

    expect(engineReadme).toContain(`current published digital-rules target is ${publishedTarget}`);
    expect(engineReadme).toContain(`implemented promoted engine baseline is still ${CURRENT_RULES_VERSION}`);

    if (CURRENT_RULES_VERSION !== publishedTarget) {
      expect(engineReadme).toContain('implementation lag');
    }
  });

  it('keeps historical procedure libraries outside the promoted current API boundary', () => {
    const currentSource = readFileSync('src/content/current.ts', 'utf8');
    expect(currentSource).not.toMatch(/from ['"]\.\/v06/);
    expect(currentSource).not.toMatch(/from ['"]\.\.\/v06[234]/);
    expect(currentSource).not.toContain('/reconstruction/');
    expect(currentSource).not.toContain('digital-engine-v06');
  });

  it('keeps active source independent from the archived v0.6 package', () => {
    const offenders = sourceFilesUnder('src').filter((path) =>
      readFileSync(path, 'utf8').includes('legacy/digital-engine-v06'),
    );

    expect(offenders).toEqual([]);
  });

  it('keeps the promoted v0.7.0 implementation isolated from historical content adapters', () => {
    const promotedSources = sourceFilesUnder('src/v070')
      .filter((path) => !/\.(?:test|spec)\.[cm]?[jt]sx?$/.test(path));
    const historicalContentImport = /from ['"]\.\.\/content\/v06(?:1|2|3|4)?['"]/;

    for (const path of promotedSources) {
      const source = readFileSync(path, 'utf8');
      expect(source).not.toContain('legacy/digital-engine-v06');
      expect(source).not.toMatch(historicalContentImport);
    }
  });

  it('keeps archived tests outside routine CI changed-test discovery', () => {
    const workflow = readFileSync('.github/workflows/test.yml', 'utf8');
    expect(workflow).toContain('digital-engine-(?:reconstruction|migration|v06)');
    expect(workflow).toContain('!archivedEngineSnapshot.test(file) && testPattern.test(file)');
  });
});
