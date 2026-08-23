import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildFinalizedExportPlan } from '../scripts/generate-tts-finalized-supplementals.mjs';
import { finalizeSupplementalObjectPresentation } from '../scripts/finalize-tts-save.mjs';

function defaultTransform() {
  return {
    posX: 0,
    posY: 1,
    posZ: 0,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    scaleX: 1,
    scaleY: 1,
    scaleZ: 1,
  };
}

describe('finalized TTS supplemental exports', () => {
  it('covers all final export-pending Proposal, Ledger, and Deed components from current authority', async () => {
    const plan = await buildFinalizedExportPlan();
    const proposals = plan.components.filter(item => item.component.family === 'proposal-treaty-card');
    const ledgers = plan.components.filter(item => item.component.family === 'ledger');
    const deeds = plan.components.filter(item => item.component.family === 'deed-card');

    expect(proposals).toHaveLength(9);
    expect(proposals.every(item => item.renderer === 'proposal-card' && item.backPolicy === 'twoSided')).toBe(true);
    expect(ledgers).toHaveLength(1);
    expect(ledgers[0].renderer).toBe('capital-ledger');
    expect(ledgers[0].backPolicy).toBe('twoSided');
    expect(deeds).toHaveLength(1);
    expect(deeds[0].component.quantity).toBe(8);
    expect(deeds[0].orientation).toBe('landscape');
    expect(deeds[0].backPolicy).toBe('standardBack');
  });

  it('reuses the complete production rendering lifecycle instead of defining a second visual system', () => {
    const shell = readFileSync('tts/finalized-supplemental-renderer/index.html', 'utf8');
    const renderer = readFileSync('tts/finalized-supplemental-renderer/renderer.js', 'utf8');

    expect(renderer).toContain("from '/card-design/proposal-card.js'");
    expect(renderer).toContain("from '/card-design/capital-ledger.js'");
    expect(renderer).toContain("from '/card-design/deed-card.js'");
    expect(renderer).toContain('proposalFace(');
    expect(renderer).toContain('capitalLedgerMarkup(');
    expect(renderer).toContain('deedCardMarkup(');

    expect(shell).toContain('/card-design/card-design-refinement.css');
    expect(shell).toContain('/card-design/supplemental-refinements.css');
    expect(shell).toContain('/tts/artwork-direction-overrides.js');
    expect(shell).toContain('/tts/artwork-crop.js');
    expect(shell).toContain('/card-design/card-design.js');
    expect(renderer).toContain('prepareProductionCard(');
    expect(renderer).toContain('GauntletArtworkCrop.apply(');
    expect(renderer).toContain('title is clipped');
    expect(renderer).toContain('rules are clipped');
  });

  it('orients landscape supplemental cards generically from manifest metadata', () => {
    const save = {
      ObjectStates: [
        {
          Name: 'Bag',
          ContainedObjects: [
            {
              Name: 'CardCustom',
              GMNotes: 'gauntlet:supplemental:financiers-deed',
              SidewaysCard: false,
              Transform: defaultTransform(),
            },
            {
              Name: 'CardCustom',
              GMNotes: 'gauntlet:supplemental:financiers-deed',
              SidewaysCard: false,
              Transform: defaultTransform(),
            },
          ],
        },
      ],
    };
    const manifest = {
      ready: [
        {
          id: 'financiers-deed',
          quantity: 2,
          representation: 'card',
          tts: { sidewaysCard: true },
        },
      ],
    };

    const result = finalizeSupplementalObjectPresentation(save, manifest);
    expect(result.sidewaysCount).toBe(2);
    expect(save.ObjectStates[0].ContainedObjects.every(object => object.SidewaysCard === true)).toBe(true);
    expect(save.ObjectStates[0].ContainedObjects.every(object => object.Transform.rotY === 90)).toBe(true);
  });

  it('wires finalized exports into checks, packaging, and TTS CI', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const workflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');

    expect(packageJson.scripts['tts:finalized-supplementals:check']).toContain('--check');
    expect(packageJson.scripts['tts:package']).toContain('tts:finalized-supplementals');
    expect(packageJson.scripts['tts:package']).toContain('tts:save:finalize');
    expect(workflow).toContain('Generate finalized Proposal, Ledger, and Deed components');
    expect(workflow).toContain('Finalize supplemental object presentation');
  });
});
