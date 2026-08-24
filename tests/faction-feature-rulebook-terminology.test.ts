import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { applyReleaseCandidateRulebook } from '../rulebook/release-candidate.js';
import { applyFactionFeatureTerminology } from '../rulebook/faction-feature-terminology.js';

const read = (path: string) => readFileSync(path, 'utf8');
const baseRulebook = read('releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md');
const manifest = JSON.parse(read('game-data/current-game.json'));
const rules = JSON.parse(read('docs/v0.6.4-rules.json'));
const proposals = JSON.parse(read('docs/v0.6.4-diplomat-proposals.json'));
const arcaneSymbol = JSON.parse(read('docs/v0.6.4-arcane-symbol.json'));

const currentGame = {
  ...manifest,
  ruleChanges: rules,
  proposals: proposals.proposals,
  arcaneSymbol,
};

describe('Faction Feature Rulebook terminology', () => {
  it('projects the current component taxonomy across Chapter 5 and all faction rules', () => {
    const candidate = applyReleaseCandidateRulebook(baseRulebook, currentGame);
    const rulebook = applyFactionFeatureTerminology(candidate);

    expect(rulebook).toContain('# 5. Actions, Faction Features, Leader Abilities, and Assets');
    expect(rulebook).toContain('A **Faction Feature** is a named rule, option, procedure, passive effect, or special mechanic shared by a faction.');
    expect(rulebook).toContain('A **Leader Ability** is supplied specifically by your chosen Leader.');
    expect(rulebook).toContain('- **1 Action:** Using the Feature or Ability spends one Action.');
    expect(rulebook).toContain('- **No Action:** The Feature or Ability may be used at its stated timing without spending an Action.');
    expect(rulebook).toContain('- **Automatic:** The Feature or Ability applies when its stated condition or timing occurs.');

    expect(rulebook).toContain('Names such as **Terms**, **Purge**, **Mission**, **Rite**, and **Surveillance** remain the names of faction mechanics.');
    expect(rulebook).toContain('Terms are a Diplomat Faction Feature used during Onset');

    expect(rulebook).toContain('| Leader Ability | Orders; each Leader has their own Orders with printed Command costs and timings. |');
    expect(rulebook).toContain('**Orders** are Leader Abilities, not Faction Features.');

    expect(rulebook).toContain('| Faction Features | Terms — No Action · During Onset; Leverage — No Action · Before dice after refused Terms. |');
    expect(rulebook).toContain('**Terms** and **Leverage** are Diplomat Faction Features marked **No Action**.');

    expect(rulebook).toContain('at least one Action must be spent on a Financier Faction Feature marked 1 Action');
    expect(rulebook).toContain('**Hostile Takeover — Executive Leader Ability:**');
    expect(rulebook).toContain('**Line of Credit** is the Banker\'s Leader Ability.');

    expect(rulebook).toContain('**Surveillance** and **Interference** are shared Faction Features marked **No Action**.');
    expect(rulebook).toContain('**Fieldcraft** and **Mission Control** are Leader Abilities.');

    expect(rulebook).toContain('Mystics have the following Faction Features marked **1 Action · Denouement**:');
    expect(rulebook).toContain('**Invocation** and **Transmutation** are Faction Features marked **No Action**; **Convergence** is **Automatic**.');

    expect(rulebook).toContain('**Purge is an Inquisition Faction Feature marked 1 Action · Opening or Denouement · Once per turn.**');
    expect(rulebook).toContain('Final Judgment is the Grand Inquisitor\'s Leader Ability.');

    expect(rulebook).toContain('**Faction Feature:** A named faction-specific rule, option, procedure, passive effect, or special mechanic shared by a faction.');
    expect(rulebook).toContain('**Leader Ability:** A mechanic supplied specifically by the chosen Leader.');

    expect(rulebook).not.toMatch(/\bFaction Actions?\b/u);
    expect(rulebook).not.toMatch(/\bFaction Abilit(?:y|ies)\b/u);
    expect(rulebook).not.toMatch(/\bfaction procedure\b/iu);
  });
});
