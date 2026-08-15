import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  STANDARD_CARD_HEADINGS,
  normalizeV063CardsForPresentation,
} from '../card-design/v063-card-heading-normalizer.js';

const canonicalPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json';
const generalRulesPath = 'docs/Gauntlet_v0.6.3_General_Card_Rules_Candidate.md';
const canonical = JSON.parse(readFileSync(canonicalPath, 'utf8'));
const generalRules = readFileSync(generalRulesPath, 'utf8');
const normalizedCards = normalizeV063CardsForPresentation(canonical.cards);
const cards = new Map(normalizedCards.map((card: any) => [card.id, card]));

const retiredOnStandardCards = ['Text', 'Placement', 'Aftermath', 'Accepted', 'Refused'];

function labels(id: string) {
  const card: any = cards.get(id);
  if (!card) throw new Error(`Missing card ${id}`);
  return card.effects.map((effect: any) => effect.label);
}

describe('v0.6.3 standard-card heading vocabulary', () => {
  it('uses only the approved standard-card headings in the rendered projection', () => {
    const present = new Set(normalizedCards.flatMap((card: any) => card.effects.map((effect: any) => effect.label)));
    expect([...present].filter((label) => !STANDARD_CARD_HEADINGS.includes(String(label)))).toEqual([]);
    for (const retired of retiredOnStandardCards) expect(present.has(retired)).toBe(false);
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

  it('keeps Accepted and Refused as inline outcomes on ordinary cards', () => {
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

  it('documents Terms, Reaction, and Sanctions as shared card procedures', () => {
    expect(generalRules).toContain('## 5. Terms, Reactions, and Sanctions');
    expect(generalRules).toContain('A **Terms** effect is used at the point printed on the card while its owner is offering Terms.');
    expect(generalRules).toContain('A **Reaction** is played from Hand when its printed trigger occurs.');
    expect(generalRules).toContain('you may play a Sanction from your Hand at no cost unless that Sanction says otherwise');
    expect(generalRules).toContain('They are not separate standard-card effect headings.');
  });

  it('leaves the reconstructed authority source immutable', () => {
    const original = new Map(canonical.cards.map((card: any) => [card.id, card]));
    expect(original.get('neutral-bombardment')?.effects?.[0]?.label).toBe('Placement');
    expect(original.get('inquisition-martyrdom')?.effects?.[0]?.label).toBe('Aftermath');
  });
});
