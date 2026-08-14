import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const canonicalPath = 'artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Canonical_Data.json';
const rulebookPath = 'artifacts/v0.6.3/release-candidate/Gauntlet_v0.6.3_Rulebook.md';
const canonical = JSON.parse(readFileSync(canonicalPath, 'utf8'));
const rulebook = readFileSync(rulebookPath, 'utf8');
const cards = new Map(canonical.cards.map((card: any) => [card.id, card]));

const standardHeadings = [
  'Action',
  'Asset',
  'Gambit',
  'Tactic',
  'Gambit/Tactic',
  'Mission',
  'Overlay',
  'Terms',
  'Sanctions',
  'Reaction',
];

const retiredOnStandardCards = ['Text', 'Placement', 'Aftermath', 'Accepted', 'Refused'];

function labels(id: string) {
  const card: any = cards.get(id);
  if (!card) throw new Error(`Missing card ${id}`);
  return card.effects.map((effect: any) => effect.label);
}

describe('v0.6.3 standard-card heading vocabulary', () => {
  it('uses only the approved standard-card headings', () => {
    const present = new Set(canonical.cards.flatMap((card: any) => card.effects.map((effect: any) => effect.label)));
    expect([...present].filter((label) => !standardHeadings.includes(String(label)))).toEqual([]);
    for (const retired of retiredOnStandardCards) expect(present.has(retired)).toBe(false);
    expect(canonical.card_rules.effect_headings.standard_card_headings).toEqual(standardHeadings);
  });

  it('normalizes Overlay placement and persistent text', () => {
    expect(labels('neutral-bombardment')).toEqual(['Action', 'Overlay', 'Gambit/Tactic']);
    expect(labels('intelligence-fog-of-war')).toEqual(['Action', 'Overlay', 'Gambit/Tactic', 'Mission']);
  });

  it('uses Sanctions as the Sanction procedure heading', () => {
    expect(labels('diplomats-sanctions-blockade')).toEqual(['Sanctions', 'Overlay']);
    expect(labels('diplomats-sanctions-censure')).toEqual(['Sanctions', 'Asset']);
    expect(labels('diplomats-sanctions-embargo')).toEqual(['Sanctions', 'Asset']);
  });

  it('uses Reaction for direct triggered plays from Hand', () => {
    expect(labels('inquisition-martyrdom')).toEqual(['Reaction']);
    expect(labels('diplomats-demilitarized-zone')).toEqual(['Reaction', 'Overlay']);
  });

  it('keeps Accepted and Refused as inline Terms outcomes on ordinary cards', () => {
    expect(labels('diplomats-diplomatic-latitude')).toEqual(['Terms']);
    expect(labels('diplomats-good-faith')).toEqual(['Asset']);
    expect(labels('diplomats-gunboat-diplomacy')).toEqual(['Terms', 'Gambit/Tactic']);
    expect(labels('diplomats-nonbinding-resolution')).toEqual(['Terms']);
    expect(labels('diplomats-trade-concessions')).toEqual(['Terms', 'Gambit/Tactic']);

    for (const id of [
      'diplomats-diplomatic-latitude',
      'diplomats-good-faith',
      'diplomats-gunboat-diplomacy',
      'diplomats-nonbinding-resolution',
      'diplomats-trade-concessions',
    ]) {
      const card: any = cards.get(id);
      const text = card.effects.map((effect: any) => effect.text).join('\n');
      expect(text).toContain('Accepted —');
      expect(text).toContain('Refused —');
    }
  });

  it('defines Terms, Reaction, and Sanctions shared procedures', () => {
    expect(canonical.card_rules.terms_effect.action_required_by_default).toBe(false);
    expect(canonical.card_rules.reaction.play_from_hand_at_printed_trigger).toBe(true);
    expect(canonical.card_rules.reaction.action_required_by_default).toBe(false);
    expect(canonical.card_rules.sanctions.play_from_hand).toBe(true);
    expect(canonical.card_rules.sanctions.action_required_by_default).toBe(false);
    expect(canonical.card_rules.sanctions.cost_by_default).toBe('none');
    expect(canonical.card_rules.sanctions.card_text_may_override_timing_or_procedure).toBe(true);
  });

  it('states the shared procedures in the release-candidate Rulebook', () => {
    expect(rulebook).toContain('**Terms:** use at the printed point while offering Terms');
    expect(rulebook).toContain('**Reaction:** play from Hand when its printed trigger occurs');
    expect(rulebook).toContain('you may play a Sanction from your Hand at no cost unless that Sanction says otherwise');
    expect(rulebook).toContain('They are not separate standard-card effect headings.');
  });
});
