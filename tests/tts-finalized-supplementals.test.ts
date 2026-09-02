import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildFinalizedExportPlan } from '../scripts/generate-tts-finalized-supplementals.mjs';

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

  it('captures finalized components only from the Card Design production authority', () => {
    const generator = readFileSync('scripts/generate-tts-finalized-supplementals.mjs', 'utf8');
    const componentRenderer = readFileSync('card-design/component-render.js', 'utf8');

    expect(generator).toContain('/card-design/component-render.html');
    expect(generator).toContain("return { kind: 'proposal', id: item.proposalId }");
    expect(generator).toContain("return { kind: 'supplemental', id: component.id }");
    expect(generator).toContain("url.searchParams.set('version', displayVersion)");
    expect(generator).not.toContain('/tts/finalized-supplemental-renderer/');
    expect(componentRenderer).toContain('const supportedKinds = new Set');
    expect(componentRenderer).toContain('"leader", "proposal", "reference", "rite", "ritual", "tracker", "supplemental"');
    expect(componentRenderer).toContain('versionOverride');
  });

  it('normalizes landscape Deed artwork into a standard portrait TTS image cell', () => {
    const generator = readFileSync('scripts/generate-tts-finalized-supplementals.mjs', 'utf8');
    expect(generator).toContain("wrapper.id = 'tts-portrait-card-cell'");
    expect(generator).toContain("width: '240px'");
    expect(generator).toContain("height: '336px'");
    expect(generator).toContain('LANDSCAPE_TTS_CELL_ROTATION_DEGREES');
    expect(generator).not.toContain('rotate(-90deg)');
    expect(generator).toContain("cellOrientation: 'portrait'");
    expect(generator).toContain("sidewaysCard: item.orientation === 'landscape'");
  });

  it('assembles landscape supplementals directly at their authoritative TTS orientation and snap eligibility', () => {
    const assembler = readFileSync('scripts/assemble-tts-supplemental-save.mjs', 'utf8');
    expect(assembler).toContain('const sideways = component.tts?.sidewaysCard === true');
    expect(assembler).toContain("const tabletopRotation = component.family === 'deed-card' ? 0 : (sideways ? 90 : 0)");
    expect(assembler).toContain('Transform: transform(0, 1, 0, tabletopRotation)');
    expect(assembler).toContain('SidewaysCard: sideways');
    expect(assembler).toContain("tags: Object.freeze([DEED_STACK_TAG, FACTION_ZONE_TAG])");
    expect(assembler).toContain("object.Transform.rotY = stackKind === 'deeds' ? 90 : 180");
    expect(assembler).not.toContain("stackKind === 'deeds' ? 270");
    expect(assembler).not.toContain('finalizeSupplementalObjectPresentation');
  });

  it('keeps the Capital Ledger popout above ordinary tabletop cards', () => {
    const assembler = readFileSync('scripts/assemble-tts-supplemental-save.mjs', 'utf8');
    expect(assembler).toContain('id="ledger-window"');
    expect(assembler).toContain('position="0 0 -500"');
    expect(assembler).toContain('rotation="0 0 180"');
    expect(assembler).not.toContain('position="0 0 -50"');
  });

  it('wires finalized exports into generation followed by authoritative save validation', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    const workflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');

    expect(packageJson.scripts['tts:finalized-supplementals:check']).toContain('--check');
    expect(packageJson.scripts['tts:package']).toContain('tts:finalized-supplementals');
    expect(packageJson.scripts['tts:package']).toContain('validate-current-authoritative-save.mjs');
    expect(packageJson.scripts['tts:save:finalize']).toBeUndefined();
    expect(workflow).toContain('Generate finalized Proposal, Ledger, and Deed components');
    expect(workflow).toContain('Validate authoritative current TTS save contract');
    expect(workflow).not.toContain('Finalize card and tracker physical presentation');
    expect(workflow).not.toContain('scripts/finalize-tts-save.mjs');
  });
});
