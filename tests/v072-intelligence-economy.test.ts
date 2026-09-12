import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const authority = JSON.parse(
  fs.readFileSync(path.join(root, 'game-data/current-game.json'), 'utf8'),
);
const design = JSON.parse(
  fs.readFileSync(path.join(root, 'docs/v0.7.2-intelligence-intel-generation.json'), 'utf8'),
);
const rulebook = fs.readFileSync(
  path.join(root, 'rulebook/player-facing/current-rulebook.md'),
  'utf8',
);
const guide = fs.readFileSync(
  path.join(root, 'rulebook/faction-guides/intelligence.md'),
  'utf8',
);
const missionReference = fs.readFileSync(
  path.join(root, 'card-design/reference-copy/v0.7.0/intelligence-mission-reference.md'),
  'utf8',
);

function collectNamedSections(
  value: unknown,
  name: string,
  output: Array<Record<string, unknown>> = [],
): Array<Record<string, unknown>> {
  if (!value || typeof value !== 'object') return output;
  if (!Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    if (row.name === name) output.push(row);
    for (const child of Object.values(row)) collectNamedSections(child, name, output);
    return output;
  }
  for (const child of value) collectNamedSections(child, name, output);
  return output;
}

function findIntelligenceFactionRules(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  if (!Array.isArray(value)) {
    const row = value as Record<string, unknown>;
    const actions = row.faction_features_1_action;
    if (Array.isArray(actions)
      && actions.includes('Start Mission')
      && actions.includes('Complete Special Operation')) {
      return row;
    }
    for (const child of Object.values(row)) {
      const found = findIntelligenceFactionRules(child);
      if (found) return found;
    }
    return null;
  }
  for (const child of value) {
    const found = findIntelligenceFactionRules(child);
    if (found) return found;
  }
  return null;
}

describe('v0.7.2 Intelligence economy authority', () => {
  it('registers the approved design as current-development provenance', () => {
    expect(authority.provenance.currentDevelopmentInputs.v072IntelligenceEconomy)
      .toBe('/docs/v0.7.2-intelligence-intel-generation.json');
    expect(design.gameplayBehaviorChanged).toBe(true);
    expect(design.turnStartIntel.effect)
      .toBe('Gain Intel equal to your Operation Progress.');
  });

  it('makes recurring Intel and completed-Mission Progress explicit in duplicated authority summaries', () => {
    const intelSections = collectNamedSections(authority, 'Intel')
      .filter(row => row.classification === 'Resource');
    const progressSections = collectNamedSections(authority, 'Operation Progress')
      .filter(row => row.classification === 'Progression');

    expect(intelSections.length).toBeGreaterThanOrEqual(2);
    expect(intelSections.every(row =>
      String(row.text).includes(
        'At the start of your turn, gain Intel equal to your Operation Progress.',
      )
    )).toBe(true);

    expect(progressSections.length).toBeGreaterThanOrEqual(2);
    expect(progressSections.every(row =>
      String(row.text).includes('records completed normal Missions')
      && String(row.text).includes('is not normally spent')
    )).toBe(true);
  });

  it('encodes Operational Capacity with the approved qualifying and excluded procedures', () => {
    const rules = findIntelligenceFactionRules(authority);
    expect(rules).not.toBeNull();
    expect(rules?.turn_start_intel)
      .toBe('At the start of your turn, gain Intel equal to your Operation Progress.');
    expect(rules?.operational_capacity).toBe(design.operationalCapacity.rule);
    expect(rules?.operational_capacity_qualifying_features)
      .toEqual(design.operationalCapacity.qualifyingFeatures);
    expect(rules?.operational_capacity_excluded_features)
      .toEqual(['Abort Mission']);

    const capacity = collectNamedSections(authority, 'Operational Capacity');
    expect(capacity).toHaveLength(1);
    expect(capacity[0]?.profile).toBe('Automatic');
    expect(capacity[0]?.text).toBe(design.operationalCapacity.rule);
  });

  it('teaches the same rule in the maintained rulebook, faction guide, and table reference', () => {
    for (const surface of [rulebook, guide, missionReference]) {
      const plainSurface = surface.replace(/\*\*/g, '');
      expect(plainSurface).toMatch(
        /At the start of your turn, gain Intel equal to your (?:current )?Operation Progress/,
      );
      expect(surface).toContain('Operational Capacity');
      expect(surface).toMatch(/Abort(?: Mission)? does (?:\*\*)?not(?:\*\*)? qualify/i);
    }

    expect(rulebook).toContain(
      '**Operational Capacity — Automatic.** If you used your normal Action during Opening',
    );
    expect(rulebook).toContain(
      'Starting and completing Missions and Special Operations remain 1 Action Faction Features.',
    );
  });
});
