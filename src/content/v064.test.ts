import { describe, expect, it } from 'vitest';
import { cleanV063Content } from '../../legacy/digital-engine-reconstruction/clean-v063/content';
import {
  CURRENT_GAME_AUTHORITY_PATH,
  V064_CANDIDATE_RULES_VERSION,
  V064_TERRITORY_SOURCE_ISSUE,
  v064CandidateContent,
} from './v064';

describe('v0.6.4 candidate digital current-game content', () => {
  it('resolves playable cards, factions, and Territories under the current-game authority', () => {
    expect(v064CandidateContent.authorityPath).toBe(CURRENT_GAME_AUTHORITY_PATH);
    expect(v064CandidateContent.rulesVersion).toBe(V064_CANDIDATE_RULES_VERSION);
    expect(v064CandidateContent.territorySourceIssue).toBe(V064_TERRITORY_SOURCE_ISSUE);
    expect(v064CandidateContent.content.territories).toHaveLength(25);
    expect(v064CandidateContent.content.cards).toHaveLength(142);
    expect(v064CandidateContent.content.factions).toHaveLength(6);
    expect(v064CandidateContent.cardsById.has('inquisition-no-martyrs')).toBe(false);
  });

  it('preserves stable Territory identities while exposing approved current text', () => {
    const baseIds = cleanV063Content.content.territories.map((territory) => territory.id).sort();
    const candidateIds = [...v064CandidateContent.territoriesById.keys()].sort();
    expect(candidateIds).toEqual(baseIds);

    expect(v064CandidateContent.territoriesById.get('territory-disrupted-supply-lines')?.text)
      .toBe('While a player is here, only 1 of their Assets can be active. They choose which.');
    expect(v064CandidateContent.territoriesById.get('territory-smuggler-s-pass')?.name)
      .toBe("Smuggler's Run");
    expect(v064CandidateContent.territoriesById.get('territory-arena-grand-melee')?.text)
      .toBe('During battles here, Defensive Edge does not apply. Each player: +1 Reserve, +1 Tactic.');
  });

  it('keeps the source Text effect exactly synchronized with each digital Territory', () => {
    for (const territory of v064CandidateContent.territorySource.territories) {
      expect(territory.effects).toEqual([{ label: 'Text', text: territory.text }]);
      expect(v064CandidateContent.content.territories.find((item) => item.id === territory.id)?.text)
        .toBe(territory.text);
    }
  });

  it('uses the current Leader definitions instead of the immutable release Leader list', () => {
    const mystics = v064CandidateContent.content.factions.find(faction => faction.id === 'mystics');
    expect(mystics?.leaders.map(leader => leader.name)).toEqual(['Alchemist', 'Spirit Walker']);
    expect(mystics?.leaders.find(leader => leader.name === 'Spirit Walker')?.image).toBe('/images/spirit%20walker.png');
  });
});
