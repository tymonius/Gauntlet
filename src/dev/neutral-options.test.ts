import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { initializeGame } from '../state/v06';
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

  it('offers each Tactical Planning bottom-deck option', () => {
    const state = game();
    state.priorityPlayer = 'player_1';
    state.pendingNeutralChoice = {
      kind: 'tactical_planning_action',
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

  it('offers all Scouting Report Action inspection modes', () => {
    const state = game();
    state.priorityPlayer = 'player_1';
    state.pendingNeutralChoice = {
      kind: 'scouting_report_action',
      playerId: 'player_1',
      opponentId: 'player_2',
      options: ['inspect_own_draw', 'inspect_opponent_draw', 'inspect_opponent_hand'],
    };

    expect(buildGuidedOptions(state).map((option) => option.action)).toEqual([
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'inspect_own_draw' },
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'inspect_opponent_draw' },
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'inspect_opponent_hand' },
    ]);
  });

  it('uses physical target keys for Scouting Report Battle inspection', () => {
    const state = game();
    state.priorityPlayer = 'player_1';
    state.pendingNeutralChoice = {
      kind: 'scouting_report_battle_inspect',
      playerId: 'player_1',
      battleId: 'battle-scouting',
      sourceKey: 'player_1:hand',
      targetOptions: [
        { targetKey: 'player_2:hand', targetOwner: 'player_2', targetSource: 'hand' },
        { targetKey: 'player_2:battle_draw:0', targetOwner: 'player_2', targetSource: 'battle_draw' },
      ],
      options: ['inspect'],
    };

    expect(buildGuidedOptions(state).map((option) => option.action)).toEqual([
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'inspect', targetKey: 'player_2:hand' },
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'inspect', targetKey: 'player_2:battle_draw:0' },
    ]);
  });

  it('offers pass and each Scouting Report replacement', () => {
    const state = game();
    state.priorityPlayer = 'player_1';
    state.pendingNeutralChoice = {
      kind: 'scouting_report_battle_replace',
      playerId: 'player_1',
      battleId: 'battle-scouting',
      sourceKey: 'player_1:hand',
      replacementOptions: ['card-valor', 'card-fortifications'],
      options: ['pass', 'replace'],
    };

    expect(buildGuidedOptions(state).map((option) => option.action)).toEqual([
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'pass' },
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'replace', cardId: 'card-valor' },
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'replace', cardId: 'card-fortifications' },
    ]);
  });

  it('offers Supplies Asset pass and use choices', () => {
    const state = game();
    state.priorityPlayer = 'player_1';
    state.pendingNeutralChoice = {
      kind: 'supplies_asset',
      playerId: 'player_1',
      entryId: 'supplies-asset-1',
      triggersRemaining: 2,
      options: ['pass', 'use'],
    };

    expect(buildGuidedOptions(state).map((option) => option.action)).toEqual([
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'pass' },
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'use' },
    ]);
  });

  it('offers each mandatory Supplies Battle discard', () => {
    const state = game();
    state.priorityPlayer = 'player_1';
    state.pendingNeutralChoice = {
      kind: 'supplies_battle_discard',
      playerId: 'player_1',
      entryId: 'supplies-battle-1',
      battleId: 'battle-supplies',
      cardOptions: ['card-valor', 'card-fortifications'],
      triggersRemaining: 1,
      options: ['select_card'],
    };

    expect(buildGuidedOptions(state).map((option) => option.action)).toEqual([
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'select_card', cardId: 'card-valor' },
      { type: 'resolve_neutral_choice', playerId: 'player_1', choice: 'select_card', cardId: 'card-fortifications' },
    ]);
  });
});
