import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildReadinessReport,
  evaluateComponentReadiness,
  evaluateStarterAssembly,
} from '../scripts/check-tts-release-readiness.mjs';

describe('TTS release readiness reporting', () => {
  it('treats the Universal Reference as the remaining shared-component blocker while accepting finalized export bridges', () => {
    const contract = {
      sharedComponents: [
        { id: 'player-token', name: 'Player Token', productionStatus: 'ready' },
        { id: 'universal-reference', name: 'Universal Reference Card', productionStatus: 'design-pending' },
      ],
      components: [
        { id: 'diplomats-proposal-test', name: 'Test Proposal', family: 'proposal-treaty-card', designStatus: 'final', productionStatus: 'export-pending' },
        { id: 'financiers-deed', name: 'Deed Card', family: 'deed-card', designStatus: 'final', productionStatus: 'export-pending' },
      ],
    };
    const manifest = {
      ready: [
        { id: 'diplomats-proposal-test' },
        { id: 'financiers-deed' },
      ],
    };

    const result = evaluateComponentReadiness(contract, manifest);
    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0].id).toBe('universal-reference');
    expect(result.expectedGenerated).toEqual(['diplomats-proposal-test', 'financiers-deed']);
  });

  it('validates every matching faction component quantity inside each starter Bag', () => {
    const starterManifest = {
      decks: [
        { id: 'banker', name: 'Banker Starter', leader: { name: 'Banker' }, factionId: 'financiers' },
        { id: 'general', name: 'General Starter', leader: { name: 'General' }, factionId: 'military' },
      ],
    };
    const supplementalManifest = {
      ready: [
        { id: 'financiers-deed', name: 'Deed Card', faction: 'financiers', quantity: 2 },
        { id: 'military-command-tracker', name: 'Command Tracker', faction: 'military', quantity: 1 },
      ],
    };
    const save = {
      ObjectStates: [
        {
          Name: 'Bag',
          Nickname: 'Banker Starter — Banker',
          ContainedObjects: [
            { Name: 'CardCustom', GMNotes: 'gauntlet:supplemental:financiers-deed' },
            { Name: 'CardCustom', GMNotes: 'gauntlet:supplemental:financiers-deed' },
          ],
        },
        {
          Name: 'Bag',
          Nickname: 'General Starter — General',
          ContainedObjects: [
            { Name: 'Custom_Tile', GMNotes: 'gauntlet:supplemental:military-command-tracker' },
          ],
        },
      ],
    };

    const result = evaluateStarterAssembly(starterManifest, supplementalManifest, save);
    expect(result.blockers).toEqual([]);
    expect(result.expectedCopies).toBe(3);
    expect(result.assembledCopies).toBe(3);
  });

  it('keeps machine blockers separate from the required manual Tabletop Simulator playthrough', () => {
    const report = buildReadinessReport({
      release: { version: 'v0.7.0' },
      contract: { sharedComponents: [], components: [] },
      supplementalManifest: { ready: [], readyCount: 0 },
      starterManifest: { decks: [] },
      save: { SaveName: 'Gauntlet v0.7.0 — TTS Review Scaffold', ObjectStates: [] },
    });

    expect(report.machineReady).toBe(true);
    expect(report.warnings.some(item => item.id === 'review-scaffold-name')).toBe(true);
    expect(report.manualReleaseChecks.some(item => /full remote two-player game/i.test(item))).toBe(true);
  });

  it('wires non-strict readiness reporting into packaging while reserving strict mode for release closeout', () => {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(packageJson.scripts['tts:release:status']).toBe('node scripts/check-tts-release-readiness.mjs');
    expect(packageJson.scripts['tts:release:strict']).toContain('--strict');
    expect(packageJson.scripts['tts:package']).toContain('tts:release:status');
  });
});
