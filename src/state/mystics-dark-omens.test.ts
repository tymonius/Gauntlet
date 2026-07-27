import { describe, expect, it } from 'vitest';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply-mystics';
import { initializeGame } from './initialize';
import { toPrivateGameView, toPublicGameView } from './views';

function participant(playerId: PlayerID): BattleParticipantState {
  return {
    playerId,
    passedHandCommit: true,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: [],
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function played(cardId: string, owner: PlayerID, origin: 'hand' | 'battle_draw'): BattlePlayedCard {
  return { cardId, owner, origin, faceDown: true, canceled: false };
}

function game(leaderName = 'Spirit Walker'): GameState {
  const state = initializeGame({
    id: 'mystics-dark-omens-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Mystic',
        factionId: 'mystics',
        leaderName,
        deck: ['mystics-dark-omens', 'card-valor', 'mystics-fates-toll', 'card-fortifications'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'military',
        leaderName: 'General',
        deck: ['card-valor'],
        territories: ['t4', 't5', 't6'],
      },
    ],
  });
  state.phase = 'action_before_movement';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  return state;
}

function prepareRevealBattle(state: GameState, secondCopy = false): void {
  const territories = state.board.spaces.filter((space) => space.kind === 'territory');
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'dark-omens-battle',
    stage: 'dice',
    location: territories[3].id,
    attackerOrigin: territories[2].id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
  state.battle.attacker.handCommit = played('mystics-dark-omens', 'player_1', 'hand');
  if (secondCopy) {
    state.battle.attacker.battleDrawPlayed = [played('mystics-dark-omens', 'player_1', 'battle_draw')];
    state.battle.attacker.battleDrawPlayLimit = 2;
  }
}

describe('Dark Omens Action effect', () => {
  it('holds the source card outside Discard until the mandatory choice completes', () => {
    let state = game('Alchemist');
    state.players.player_1.zones.hand = ['mystics-dark-omens'];
    state.players.player_1.zones.deck = [];
    state.players.player_1.zones.discard = ['card-valor', 'mystics-fates-toll', 'card-fortifications'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-dark-omens',
    }).state;

    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'dark_omens_action',
      playerId: 'player_1',
      drawnCardIds: ['card-valor', 'mystics-fates-toll'],
      sourceCardId: 'mystics-dark-omens',
      restoreSourceToDiscard: true,
    });
    expect(state.players.player_1.zones.hand).toEqual(['card-valor', 'mystics-fates-toll']);
    expect(state.players.player_1.zones.deck).toEqual(['card-fortifications']);
    expect(state.players.player_1.zones.discard).not.toContain('mystics-dark-omens');
    expect(toPrivateGameView(state, 'player_1').pendingMysticsChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingMysticsChoice).toBeUndefined();
    expect('pendingMysticsChoice' in toPublicGameView(state)).toBe(false);
    expect(buildGuidedOptions(state).map((option) => option.action)).toContainEqual({
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'card-valor',
    });

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'card-valor',
    }).state;

    expect(state.players.player_1.zones.graveyard).toContain('card-valor');
    expect(state.players.player_1.zones.hand).toEqual(expect.arrayContaining(['mystics-fates-toll', 'card-fortifications']));
    expect(state.players.player_1.zones.hand).not.toContain('mystics-dark-omens');
    expect(state.players.player_1.zones.discard).toContain('mystics-dark-omens');
    expect(state.players.player_1.mystics?.materiaPrimaUsedTurn).toBe(state.turn);
  });

  it('allows only a card drawn by Dark Omens to be selected', () => {
    let state = game();
    state.players.player_1.zones.hand = ['mystics-dark-omens', 'unrelated-hand-card'];
    state.players.player_1.zones.deck = ['card-valor', 'mystics-fates-toll'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-dark-omens',
    }).state;

    expect(() => applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'unrelated-hand-card',
    })).toThrow(/cards drawn by Dark Omens/i);
  });

  it('finishes its effect before opening Invocation', () => {
    let state = game();
    state.players.player_1.mystics!.completedRites = ['rite_of_echoes'];
    state.players.player_1.zones.hand = ['mystics-dark-omens'];
    state.players.player_1.zones.deck = ['card-valor', 'mystics-fates-toll'];
    state.players.player_1.zones.graveyard = ['grave-option'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-dark-omens',
    }).state;
    expect(state.pendingMysticsChoice?.kind).toBe('dark_omens_action');

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'select',
      cardId: 'card-valor',
    }).state;

    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'invocation',
      playerId: 'player_1',
      sourceCardIds: ['mystics-dark-omens'],
    });
  });
});

describe('Dark Omens Battle effect', () => {
  it('opens after reveal before Invocation and lets the player keep the draw', () => {
    let state = game();
    state.players.player_1.mystics!.completedRites = ['rite_of_echoes'];
    state.players.player_1.zones.deck = ['card-valor'];
    state.players.player_1.zones.graveyard = ['grave-option'];
    prepareRevealBattle(state);

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.battle?.stage).toBe('dice');
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'dark_omens_battle',
      playerId: 'player_1',
      drawnCardId: 'card-valor',
    });
    expect(state.players.player_1.zones.hand).toContain('card-valor');

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'keep',
    }).state;

    expect(state.battle?.attacker.advantage ?? 0).toBe(0);
    expect(state.players.player_1.zones.hand).toContain('card-valor');
    expect(state.pendingMysticsChoice).toMatchObject({ kind: 'invocation' });
  });

  it('sacrifices only the drawn card and grants advantage', () => {
    let state = game('Alchemist');
    state.players.player_1.zones.deck = ['card-valor'];
    prepareRevealBattle(state);

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'sacrifice',
      cardId: 'card-valor',
    }).state;

    expect(state.players.player_1.zones.hand).not.toContain('card-valor');
    expect(state.players.player_1.zones.graveyard).toContain('card-valor');
    expect(state.battle?.attacker.advantage).toBe(1);
    expect(state.players.player_1.mystics?.materiaPrimaDeferredBattleId).toBe('dark-omens-battle');
  });

  it('resolves multiple active copies one at a time', () => {
    let state = game();
    state.players.player_1.zones.deck = ['card-valor', 'mystics-fates-toll'];
    prepareRevealBattle(state, true);

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(state.pendingMysticsChoice).toMatchObject({ kind: 'dark_omens_battle', drawnCardId: 'card-valor' });

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'keep',
    }).state;
    expect(state.pendingMysticsChoice).toMatchObject({ kind: 'dark_omens_battle', drawnCardId: 'mystics-fates-toll' });

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'sacrifice',
      cardId: 'mystics-fates-toll',
    }).state;
    expect(state.pendingMysticsChoice).toBeUndefined();
    expect(state.battle?.attacker.advantage).toBe(1);
  });

  it('ignores canceled Dark Omens cards', () => {
    let state = game();
    state.players.player_1.zones.deck = ['card-valor'];
    prepareRevealBattle(state);
    state.battle!.attacker.handCommit!.canceled = true;

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.pendingMysticsChoice).toBeUndefined();
    expect(state.players.player_1.zones.hand).not.toContain('card-valor');
  });
});
