import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { initializeGame } from '../state';
import { buildGuidedOptions } from './guided-options';

function game(): GameState {
  return initializeGame({
    id: 'neutral-guided-options-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'One', deck: ['card-valor'], territories: ['a', 'b', 'c'] },
      { id: 'player_2', name: 'Two', deck: ['neutral-redemption'], territories: ['d', 'e', 'f'] },
    ],
  });
}

describe('guided Neutral choices', () => {
  it('offers pass and eligible Asset returns', () => {
    const state = game();
    state.priorityPlayer = 'player_2';
    state.pendingNeutralChoice = {
      kind: 'redemption_asset',
      playerId: 'player_2',
      sourcePlayerId: 'player_1',
      entryId: 'entry-1',
      cardOptions: ['card-valor', 'card-fortifications'],
      triggersRemaining: 1,
      options: ['pass', 'use'],
    };

    expect(buildGuidedOptions(state).map((option) => option.action)).toEqual([
      { type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'pass' },
      { type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'use', cardId: 'card-valor' },
      { type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'use', cardId: 'card-fortifications' },
    ]);
  });

  it('offers exact-size Battle protection selections', () => {
    const state = game();
    state.priorityPlayer = 'player_2';
    state.pendingNeutralChoice = {
      kind: 'redemption_battle',
      playerId: 'player_2',
      battleId: 'battle-1',
      cardOptions: ['card-valor', 'card-fortifications', 'card-attrition'],
      selectCount: 2,
      resolverPlayerId: 'player_1',
      options: ['select_cards'],
    };

    const selections = buildGuidedOptions(state).map((option) => (
      option.action.type === 'resolve_neutral_choice' ? option.action.cardIds : undefined
    ));
    expect(selections).toEqual(expect.arrayContaining([
      ['card-valor', 'card-fortifications'],
      ['card-valor', 'card-attrition'],
      ['card-fortifications', 'card-attrition'],
    ]));
  });

  it('preserves physical multiplicity for duplicate Battle targets', () => {
    const state = game();
    state.priorityPlayer = 'player_2';
    state.pendingNeutralChoice = {
      kind: 'redemption_battle',
      playerId: 'player_2',
      battleId: 'battle-duplicates',
      cardOptions: ['card-valor', 'card-valor', 'card-fortifications'],
      selectCount: 2,
      resolverPlayerId: 'player_1',
      options: ['select_cards'],
    };

    const selections = buildGuidedOptions(state).map((option) => (
      option.action.type === 'resolve_neutral_choice' ? option.action.cardIds : undefined
    ));
    expect(selections).toContainEqual(['card-valor', 'card-valor']);
  });

  it('offers each Reserves Action top-deck option', () => {
    const state = game();
    state.priorityPlayer = 'player_1';
    state.pendingNeutralChoice = {
      kind: 'reserves_action',
      playerId: 'player_1',
      cardOptions: ['card-valor', 'card-fortifications'],
      options: ['select_card'],
    };

    expect(buildGuidedOptions(state).map((option) => option.action)).toEqual([
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'select_card', cardId: 'card-valor' },
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'select_card', cardId: 'card-fortifications' },
    ]);
  });

  it('offers pass and each Reserves Battle cleanup option', () => {
    const state = game();
    state.priorityPlayer = 'player_1';
    state.pendingNeutralChoice = {
      kind: 'reserves_battle',
      playerId: 'player_1',
      battleId: 'battle-reserves',
      cardOptions: ['card-valor', 'card-fortifications'],
      triggersRemaining: 1,
      resolverPlayerId: 'player_2',
      options: ['pass', 'use'],
    };

    expect(buildGuidedOptions(state).map((option) => option.action)).toEqual([
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'pass' },
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'use', cardId: 'card-valor' },
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'use', cardId: 'card-fortifications' },
    ]);
  });
});
