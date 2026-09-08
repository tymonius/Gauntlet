import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const authority = JSON.parse(fs.readFileSync(path.join(root, 'game-data/current-game.json'), 'utf8'));
const design = JSON.parse(fs.readFileSync(path.join(root, 'docs/v0.7.2-timing-and-capture-cleanup.json'), 'utf8'));
const rulebook = fs.readFileSync(path.join(root, 'rulebook/player-facing/current-rulebook.md'), 'utf8');

const card = (id: string) => authority.gameplay.cards.find((entry: any) => entry.id === id);
const effect = (id: string, label: string) => card(id)?.effects?.find((entry: any) => entry.label === label)?.text;

function objectsById(value: any, id: string, output: any[] = []): any[] {
  if (!value || typeof value !== 'object') return output;
  if (value.id === id) output.push(value);
  for (const child of Object.values(value)) objectsById(child, id, output);
  return output;
}

function namedText(value: any, name: string, output: string[] = []): string[] {
  if (!value || typeof value !== 'object') return output;
  if (value.name === name && typeof value.text === 'string') output.push(value.text);
  for (const child of Object.values(value)) namedText(child, name, output);
  return output;
}

describe('v0.7.2 release candidate integration', () => {
  it('promotes current development without modifying the frozen v0.7.1 package', () => {
    expect(authority.version).toBe('v0.7.2-candidate');
    expect(authority.displayVersion).toBe('v0.7.2-candidate');
    expect(authority.status).toBe('active-development');
    expect(authority.provenance.currentDevelopmentInputs.v072TimingAndCaptureCleanup)
      .toBe('/docs/v0.7.2-timing-and-capture-cleanup.json');
    expect(rulebook).toContain('**Version 0.7.2 Candidate**');
    expect(rulebook).not.toContain('**Version 0.7.1**');
  });

  it('applies every approved phase-restricted Action to visible text and metadata', () => {
    for (const change of design.actionTimingChanges) {
      expect(card(change.cardId)?.action_phase).toBe(change.actionPhase);
      if (change.textChange !== false) {
        expect(effect(change.cardId, change.effect)).toBe(change.text);
        expect(card(change.cardId)?.action).toBe(change.text);
      }
    }
  });

  it('applies Capture wording to cards and convenience fields', () => {
    for (const change of design.captureTerminologyChanges.filter((entry: any) => entry.cardId && !entry.replacement)) {
      expect(effect(change.cardId, change.effect)).toBe(change.text);
      const field = change.effect === 'Gambit/Tactic' ? 'gambit_tactic' : change.effect.toLowerCase();
      expect(card(change.cardId)?.[field]).toBe(change.text);
    }
    expect(effect('military-shock-and-awe', 'Gambit/Tactic'))
      .toContain('Consolidate — Capture that Territory, if able; Command = 2.');
    expect(card('military-shock-and-awe')?.gambit_tactic)
      .toContain('Consolidate — Capture that Territory, if able; Command = 2.');
  });

  it('updates duplicated Leader and Proposal authority', () => {
    const fortify = design.captureTerminologyChanges.find((entry: any) => entry.name === 'Fortify');
    const hostile = design.captureTerminologyChanges.find((entry: any) => entry.name === 'Hostile Takeover');
    const recognition = design.captureTerminologyChanges.find((entry: any) => entry.proposalId === 'diplomatic-recognition');

    expect(namedText(authority, 'Fortify').filter(text => text === fortify.text).length).toBeGreaterThanOrEqual(2);
    expect(namedText(authority, 'Hostile Takeover').filter(text => text === hostile.text).length).toBeGreaterThanOrEqual(2);

    const proposalRows = objectsById(authority, 'diplomatic-recognition').filter(row => row.accepted && row.refused);
    expect(proposalRows.length).toBeGreaterThanOrEqual(2);
    expect(proposalRows.some(row => row.accepted === recognition.accepted && row.refused === recognition.refused)).toBe(true);
    expect(proposalRows.some(row => row.accepted === recognition.compactAccepted && row.refused === recognition.compactRefused)).toBe(true);
  });

  it('states the Capture versus Advance Front Line distinction in Chapter 8', () => {
    expect(rulebook).toContain('**Capture and Front Line advancement are different operations.**');
    expect(rulebook).toContain('Capture changes control of the specified Territory.');
    expect(rulebook).toContain('**Advance Front Line** changes control of the next opposing Territory immediately beyond that player’s Front Line.');
    expect(rulebook).toContain('> **Fortify — 2 Command · No Action · Aftermath · Win while occupying enemy Territory:** Capture the Territory you occupy, if able.');
    expect(rulebook).toContain('If successful, capture that Territory, if able.');
    expect(rulebook).toContain('> **Accepted:** Diplomat: Capture the Territory you occupy, if able. Accepting player withdraws, then +2 Cards.');
  });
});
