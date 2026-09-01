import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CURRENT_RULES_VERSION } from '../src/content/current';

const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const lifecycle = JSON.parse(readFileSync('config/release-lifecycle.json', 'utf8'));
const currentManifest = JSON.parse(
  readFileSync(`releases/${lifecycle.current_release}/Gauntlet_${lifecycle.current_release}_Manifest.json`, 'utf8'),
);
const engineReadme = readFileSync('src/README.md', 'utf8');

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
  it('requires legacy state consumers to opt into the v0.6 state API', () => {
    expect(readdirSync('src/state')).not.toContain('index.ts');

    const stateConsumers = [
      'src/cli/dev-runner-v06.ts',
      'src/gui/dev-server-v06.ts',
      'src/dev/battle-reveal-options.ts',
      'src/dev/inquisition-options.ts',
      'src/dev/mystics-options.ts',
      'src/dev/neutral-options.ts',
      'src/dev/guided-options.ts',
      'src/content/v06.test.ts',
      'src/dev/guided-options.test.ts',
      'src/dev/neutral-options.test.ts',
    ];

    for (const path of stateConsumers) {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain("from '../state/v06'");
      expect(source).not.toMatch(/from ['"]\.\.\/state['"]/);
    }
  });

  it('requires legacy effect consumers to opt into the v0.6 effect API', () => {
    expect(readdirSync('src/effects')).not.toContain('index.ts');

    const effectConsumers = [
      'src/dev/battle-reveal-options.ts',
      'src/state/battle-reveal.ts',
      'src/state/actions.ts',
      'src/types/neutral.ts',
      'src/state/reducer.ts',
      'src/state/neutral-contingency-plan.test.ts',
      'src/state/neutral-counterintelligence.test.ts',
    ];

    for (const path of effectConsumers) {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain("from '../effects/v06'");
      expect(source).not.toMatch(/from ['"]\.\.\/effects['"]/);
    }
  });

  it('keeps the generic card barrel as a deprecated v0.6 compatibility shim only', () => {
    const cardIndex = readFileSync('src/cards/index.ts', 'utf8');
    expect(cardIndex).toContain('@deprecated');
    expect(cardIndex).toContain("export * from './v06';");
    expect(cardIndex).not.toContain("export * from './military'");
    expect(cardIndex).not.toContain("export * from './intelligence'");
  });

  it('keeps the generic type barrel as a deprecated v0.6 compatibility shim only', () => {
    const typeIndex = readFileSync('src/types/index.ts', 'utf8');
    expect(typeIndex).toContain('@deprecated');
    expect(typeIndex).toContain("export * from './v06';");
    expect(typeIndex).not.toContain("export * from './game'");
    expect(typeIndex).not.toContain("export * from './battle'");
  });

  it('pins legacy development surfaces to explicit v0.6 aggregate APIs', () => {
    const devConsumers = [
      'src/cli/dev-runner-v06.ts',
      'src/gui/dev-server-v06.ts',
      'src/dev/battle-reveal-options.ts',
      'src/dev/guided-options.test.ts',
      'src/dev/guided-options.ts',
      'src/dev/inquisition-options.ts',
      'src/dev/intelligence-battle-options.ts',
      'src/dev/intelligence-options.ts',
      'src/dev/mystics-options.ts',
      'src/dev/neutral-options.test.ts',
      'src/dev/neutral-options.ts',
    ];

    for (const path of devConsumers) {
      const source = readFileSync(path, 'utf8');
      expect(source).not.toMatch(/from ['"]\.\.\/types['"]/);
    }
  });

  it('pins legacy card-definition modules to the v0.6 type API', () => {
    const cardSources = [
      'src/cards/intelligence.ts',
      'src/cards/diplomats.ts',
      'src/cards/neutral-audit-containment.ts',
      'src/cards/financiers.ts',
      'src/cards/military.ts',
      'src/cards/playability.ts',
    ];

    for (const path of cardSources) {
      const source = readFileSync(path, 'utf8');
      expect(source).not.toMatch(/from ['"]\.\.\/types['"]/);
    }
  });

  it('pins foundational legacy state modules to the v0.6 type API', () => {
    const stateCoreSources = [
      'src/state/initialize.ts',
      'src/state/validation.ts',
      'src/state/views.ts',
      'src/state/actions.ts',
      'src/state/reducer.ts',
      'src/state/draw.ts',
      'src/state/pipeline.ts',
      'src/state/win.ts',
      'src/state/resources.ts',
      'src/state/banked-assets.ts',
      'src/state/asset-facing.ts',
      'src/state/v06-board.ts',
      'src/state/battle-dice.ts',
    ];

    for (const path of stateCoreSources) {
      const source = readFileSync(path, 'utf8');
      expect(source).not.toMatch(/from ['"]\.\.\/types['"]/);
    }
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
