import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
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

function importedSpecifiers(source: string): string[] {
  const specifiers: string[] = [];
  const patterns = [
    /\bfrom\s+['"]([^'"]+)['"]/g,
    /\bimport\s+['"]([^'"]+)['"]/g,
    /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /\brequire\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) specifiers.push(match[1]);
  }

  return specifiers;
}

const RETIRED_LEGACY_BARRELS = ['state', 'effects', 'cards', 'types'] as const;

function resolvesToGenericLegacyBarrel(
  path: string,
  specifier: string,
  directory: typeof RETIRED_LEGACY_BARRELS[number],
): boolean {
  if (!specifier.startsWith('.')) return false;

  const resolved = resolve(dirname(path), specifier);
  const barrel = resolve(`src/${directory}`);
  return resolved === barrel
    || resolved === resolve(barrel, 'index')
    || resolved === resolve(barrel, 'index.ts');
}

describe('digital engine boundary', () => {
  it('does not present legacy interactive runners as current engine entrypoints', () => {
    expect(packageJson.scripts['dev:cli']).toBeUndefined();
    expect(packageJson.scripts['dev:gui']).toBeUndefined();
    expect(packageJson.scripts['dev:legacy:cli']).toBe('tsx src/cli/dev-runner-v06.ts');
    expect(packageJson.scripts['dev:legacy:gui']).toBe('tsx src/gui/dev-server-v06.ts');

    expect(readdirSync('src/cli')).not.toContain('dev-runner.ts');
    expect(readdirSync('src/gui')).not.toContain('dev-server.ts');
    expect(existsSync('legacy/digital-engine-dev-runners/v056-cli-dev-runner.ts.txt')).toBe(true);
    expect(existsSync('legacy/digital-engine-dev-runners/v056-gui-dev-server.ts.txt')).toBe(true);
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
    expect(currentSource).not.toContain("from '../state'");
  });

  it('requires content consumers to choose current or an explicit version', () => {
    expect(readdirSync('src/content')).not.toContain('index.ts');

    const legacyConsumers = [
      'src/cards/intelligence.ts',
      'src/state/v06-setup.ts',
      'src/state/financiers.ts',
      'src/dev/mystics-options.ts',
      'src/state/inquisition-purge.ts',
      'src/state/mystics-conversion.ts',
      'src/state/inquisition-guilt-by-association.ts',
      'src/state/v06-setup.test.ts',
    ];

    for (const path of legacyConsumers) {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain("from '../content/v06'");
      expect(source).not.toMatch(/from ['"]\.\.\/content['"]/);
    }
  });
  it('has retired every generic legacy aggregate barrel', () => {
    for (const directory of RETIRED_LEGACY_BARRELS) {
      expect(readdirSync(`src/${directory}`)).not.toContain('index.ts');
    }
  });

  it('has no source or test imports that resolve to a retired generic legacy barrel', () => {
    const offenders: string[] = [];

    for (const path of [...sourceFilesUnder('src'), ...sourceFilesUnder('tests')]) {
      const source = readFileSync(path, 'utf8');
      for (const specifier of importedSpecifiers(source)) {
        for (const directory of RETIRED_LEGACY_BARRELS) {
          if (resolvesToGenericLegacyBarrel(path, specifier, directory)) {
            offenders.push(`${path}: ${specifier} -> src/${directory}`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it('keeps Military card definitions free of state-engine imports', () => {
    const militaryCards = readFileSync('src/cards/military.ts', 'utf8');
    expect(militaryCards).not.toMatch(/from ['"]\.\.\/state(?:\/|['"])/);
    expect(militaryCards).not.toContain('GameState');
    expect(existsSync('src/state/military-card-effects.ts')).toBe(true);
  });

  it('keeps the promoted v0.7.0 implementation isolated from legacy architecture', () => {
    const promotedSources = readdirSync('src/v070')
      .filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts'));

    const legacyImport = /from ['"]\.\.\/(?:state|dev|cards|effects|reconstruction)(?:\/|['"])/;
    const historicalContentImport = /from ['"]\.\.\/content\/v06(?:1|2|3|4)?['"]/;

    for (const name of promotedSources) {
      const source = readFileSync(`src/v070/${name}`, 'utf8');
      expect(source).not.toMatch(legacyImport);
      expect(source).not.toMatch(historicalContentImport);
    }
  });

});
