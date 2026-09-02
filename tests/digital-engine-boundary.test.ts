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

  it('pins legacy Intelligence runtime modules to the v0.6 type API', () => {
    const intelligenceSources = [
      'src/state/apply-exfiltration.ts',
      'src/state/apply-fog-of-war.ts',
      'src/state/apply-fog-overlay.ts',
      'src/state/apply-intelligence.ts',
      'src/state/apply-intercepted-orders.ts',
      'src/state/apply-operational-reassessment.ts',
      'src/state/apply-post-reveal.ts',
      'src/state/apply-reconnaissance.ts',
      'src/state/apply-sleeper-network.ts',
      'src/state/apply-spies.ts',
      'src/state/apply-subversion-asset.ts',
      'src/state/battle-observation.ts',
      'src/state/intelligence-action-cards.ts',
      'src/state/intelligence-battle.ts',
      'src/state/intelligence-exfiltration-battle.ts',
      'src/state/intelligence-fog-of-war-battle.ts',
      'src/state/intelligence-fog-overlay.ts',
      'src/state/intelligence-intercepted-orders-battle.ts',
      'src/state/intelligence-leaders.ts',
      'src/state/intelligence-mission-triggers.ts',
      'src/state/intelligence-missions.ts',
      'src/state/intelligence-operational-reassessment-battle.ts',
      'src/state/intelligence-post-reveal-flow.ts',
      'src/state/intelligence-post-reveal.ts',
      'src/state/intelligence-pre-reveal.ts',
      'src/state/intelligence-reactive-assets.ts',
      'src/state/intelligence-reconnaissance-battle.ts',
      'src/state/intelligence-simple-battle-effects.ts',
      'src/state/intelligence-sleeper-network.ts',
      'src/state/intelligence-spies-battle.ts',
      'src/state/intelligence-subversion-asset.ts',
      'src/state/intelligence-subversion-battle.ts',
      'src/state/intelligence-treason.ts',
    ];

    for (const path of intelligenceSources) {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain("from '../types/v06'");
      expect(source).not.toMatch(/from ['"]\.\.\/types['"]/);
    }
  });

  it('pins legacy Diplomat runtime modules to the v0.6 type API', () => {
    const diplomatSources = [
      'src/state/diplomat-cards.ts',
      'src/state/diplomat-persistent.ts',
      'src/state/diplomat-terms.ts',
    ];

    for (const path of diplomatSources) {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain("from '../types/v06'");
      expect(source).not.toMatch(/from ['"]\.\.\/types['"]/);
    }
  });

  it('pins legacy Financier runtime modules to the v0.6 type API', () => {
    const financierSources = [
      'src/state/financier-acquisition-cards.ts',
      'src/state/financier-battle-cards.ts',
      'src/state/financier-cards.ts',
      'src/state/financier-integration.ts',
      'src/state/financier-pre-dice.ts',
      'src/state/financiers.ts',
    ];

    for (const path of financierSources) {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain("from '../types/v06'");
      expect(source).not.toMatch(/from ['"]\.\.\/types['"]/);
    }
  });

  it('pins legacy Mystics runtime modules to the v0.6 type API', () => {
    const mysticsSources = [
      'src/state/apply-grave-ward.ts',
      'src/state/apply-mystics.ts',
      'src/state/mystics-accursed-wager.ts',
      'src/state/mystics-black-covenant.ts',
      'src/state/mystics-circle-of-bones.ts',
      'src/state/mystics-conversion.ts',
      'src/state/mystics-dark-omens.ts',
      'src/state/mystics-fates-toll.ts',
      'src/state/mystics-grave-ward.ts',
      'src/state/mystics-necromancy.ts',
      'src/state/mystics-paths-of-shadow.ts',
      'src/state/mystics-rend-the-veil.ts',
      'src/state/mystics-rite-integration.ts',
      'src/state/mystics-ritual.ts',
      'src/state/mystics-soul-for-soul.ts',
      'src/state/mystics-spirit-hollow.ts',
      'src/state/mystics-witchcraft.ts',
    ];

    for (const path of mysticsSources) {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain("from '../types/v06'");
      expect(source).not.toMatch(/from ['"]\.\.\/types['"]/);
    }
  });

  it('pins legacy Inquisition runtime modules to the v0.6 type API', () => {
    const inquisitionSources = [
      'src/state/apply-inquisition.ts',
      'src/state/inquisition-accusation.ts',
      'src/state/inquisition-act-of-faith.ts',
      'src/state/inquisition-burning-at-the-stake.ts',
      'src/state/inquisition-confession.ts',
      'src/state/inquisition-core.ts',
      'src/state/inquisition-divine-mercy.ts',
      'src/state/inquisition-excommunication.ts',
      'src/state/inquisition-guilt-by-association.ts',
      'src/state/inquisition-hellfire.ts',
      'src/state/inquisition-heresy.ts',
      'src/state/inquisition-leaders.ts',
      'src/state/inquisition-no-martyrs.ts',
      'src/state/inquisition-penance.ts',
      'src/state/inquisition-purge.ts',
      'src/state/inquisition-tyranny.ts',
    ];

    for (const path of inquisitionSources) {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain("from '../types/v06'");
      expect(source).not.toMatch(/from ['"]\.\.\/types['"]/);
    }
  });

  it('pins legacy Military runtime modules to the v0.6 type API', () => {
    const militarySources = [
      'src/state/military-interactions.ts',
      'src/state/military-timing.ts',
    ];

    for (const path of militarySources) {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain("from '../types/v06'");
      expect(source).not.toMatch(/from ['"]\.\.\/types['"]/);
    }
  });

  it('pins shared legacy state support modules to the v0.6 type API', () => {
    const supportSources = [
      'src/state/apply-neutral.ts',
      'src/state/apply.ts',
      'src/state/battle-cancellation.ts',
      'src/state/battle-effect-replay.ts',
      'src/state/battle-hand-restrictions.ts',
      'src/state/battle-reveal.ts',
      'src/state/leader-abilities.ts',
      'src/state/territory-overlays.ts',
      'src/state/territory-printed-effects.ts',
      'src/state/v06-setup.ts',
    ];

    for (const path of supportSources) {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain("from '../types/v06'");
      expect(source).not.toMatch(/from ['"]\.\.\/types['"]/);
    }
  });

  it('pins legacy Neutral runtime modules to the v0.6 type API', () => {
    const neutralSources = [
      'src/state/neutral-advance-guard.ts',
      'src/state/neutral-arcane-knowledge.ts',
      'src/state/neutral-armistice.ts',
      'src/state/neutral-assimilation.ts',
      'src/state/neutral-bombardment.ts',
      'src/state/neutral-capital-punishment.ts',
      'src/state/neutral-conscription.ts',
      'src/state/neutral-consolidation.ts',
      'src/state/neutral-contingency-plan.ts',
      'src/state/neutral-contraband.ts',
      'src/state/neutral-counterintelligence.ts',
      'src/state/neutral-counterworks.ts',
      'src/state/neutral-court-martial.ts',
      'src/state/neutral-decoys-battle.ts',
      'src/state/neutral-decoys.ts',
      'src/state/neutral-disruption.ts',
      'src/state/neutral-entrenchment.ts',
      'src/state/neutral-fealty.ts',
      'src/state/neutral-foothold.ts',
      'src/state/neutral-forced-march.ts',
      'src/state/neutral-fortifications.ts',
      'src/state/neutral-illegal-occupation.ts',
      'src/state/neutral-insurrection.ts',
      'src/state/neutral-invasion.ts',
      'src/state/neutral-liberation.ts',
      'src/state/neutral-new-recruits.ts',
      'src/state/neutral-palisade-wall.ts',
      'src/state/neutral-pathfinders.ts',
      'src/state/neutral-protracted-siege.ts',
      'src/state/neutral-rallying-cry.ts',
      'src/state/neutral-redemption.ts',
      'src/state/neutral-reinforcements.ts',
      'src/state/neutral-requisition.ts',
      'src/state/neutral-reserves.ts',
      'src/state/neutral-resistance.ts',
      'src/state/neutral-resourcefulness.ts',
      'src/state/neutral-revolution.ts',
      'src/state/neutral-rousing-speech.ts',
      'src/state/neutral-sabotage.ts',
      'src/state/neutral-salvage.ts',
      'src/state/neutral-scorched-earth.ts',
      'src/state/neutral-scouting-report.ts',
      'src/state/neutral-sedition.ts',
      'src/state/neutral-sequestration.ts',
      'src/state/neutral-stand-ground.ts',
      'src/state/neutral-strategic-withdrawal.ts',
      'src/state/neutral-supplies.ts',
      'src/state/neutral-tactical-planning.ts',
      'src/state/neutral-valor.ts',
    ];

    for (const path of neutralSources) {
      const source = readFileSync(path, 'utf8');
      expect(source).toContain("from '../types/v06'");
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
