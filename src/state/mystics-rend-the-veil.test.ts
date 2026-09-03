import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-mystics';
import { initializeGame } from './initialize';
import {
  openNextRendTheVeilChoice,
  resolveRendTheVeilChoice,
} from './mystics-rend-the-veil';
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

function rend(owner: PlayerID, origin: 'hand' | 'battle_draw'): BattlePlayedCard {
  return {
    cardId: 'mystics-rend-the-veil',
    owner,
    origin,
    faceDown: false,
    canceled: false,
  };
}

function game(): GameState {
  const state = initializeGame({
    id: 'rend-the-veil-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Mystic',
        factionId: 'mystics',
        leaderName: 'Spirit Walker',
        deck: ['mystics-rend-the-veil', 'card-valor', 'card-attrition', 'card-fortifications'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'military',
        leaderName: 'General',
        deck: ['card-valor', 'card-fortifications'],
        territories: ['t4', 't5', 't6'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  return state;
}

function openBattle(state: GameState, source?: BattlePlayedCard): void {
  const spaces = state.board.spaces.filter((space) => space.kind === 'territory');
  state.phase = 'battle';
  state.battle = {
    id: 'rend-battle',
    stage: 'dice',
    location: spaces[2].id,
    attackerOrigin: spaces[1].id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
  state.battle.attacker.handCommit = source;
}

describe('Rend the Veil', () => {
  it('banks its Action form as an Asset', () => {
    let state = game();
    state.phase = 'action_before_movement';
    state.players.player_1.zones.hand = ['mystics-rend-the-veil'];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: 'mystics-rend-the-veil',
    }).state;

    expect(state.players.player_1.zones.assetBank).toContain('mystics-rend-the-veil');
    expect(state.pendingMysticsChoice).toBeUndefined();
  });

  it('opens a private optional Graveyard choice for an active Battle copy', () => {
    const state = game();
    openBattle(state, rend('player_1', 'hand'));
    state.players.player_1.zones.graveyard = ['card-valor', 'mystics-necromancy'];

    expect(openNextRendTheVeilChoice(state)).toBe(true);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'rend_the_veil',
      playerId: 'player_1',
      sourceSlot: 'hand_commit',
      graveyardOptions: ['card-valor'],
      options: ['pass', 'use'],
    });
    expect(toPrivateGameView(state, 'player_1').pendingMysticsChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingMysticsChoice).toBeUndefined();
    expect('pendingMysticsChoice' in toPublicGameView(state)).toBe(false);
  });

  it('uses a supported Graveyard card as a face-up replayed Battle card', () => {
    const state = game();
    openBattle(state, rend('player_1', 'hand'));
    state.players.player_1.zones.graveyard = ['card-valor'];
    openNextRendTheVeilChoice(state);

    const replayed = resolveRendTheVeilChoice(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: 'card-valor',
    });

    expect(replayed).toBe('card-valor');
    expect(state.players.player_1.zones.graveyard).not.toContain('card-valor');
    expect(state.battle?.attacker.battleDrawPlayed).toContainEqual(expect.objectContaining({
      cardId: 'card-valor',
      origin: 'replayed',
      faceDown: false,
    }));
  });

  it('resolves the replayed modifier and sends that card to Discard during cleanup', () => {
    let state = game();
    openBattle(state, rend('player_1', 'hand'));
    state.players.player_1.zones.graveyard = ['card-valor'];
    openNextRendTheVeilChoice(state);
    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: 'card-valor',
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_battle_reveal',
      playerId: 'player_1',
    }).state;

    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', value: 1 }).state;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_2', value: 2 }).state;
    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.recentBattleResult?.winner).toBe('player_1');
    expect(state.players.player_1.zones.discard).toContain('card-valor');
    expect(state.players.player_1.zones.graveyard).toContain('mystics-rend-the-veil');
  });

  it('discards a banked copy only when its optional effect is used', () => {
    const state = game();
    openBattle(state);
    state.players.player_1.zones.assetBank = ['mystics-rend-the-veil'];
    state.players.player_1.zones.graveyard = ['card-attrition'];
    openNextRendTheVeilChoice(state);

    resolveRendTheVeilChoice(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'pass',
    });
    expect(state.players.player_1.zones.assetBank).toContain('mystics-rend-the-veil');

    state.battle!.effectsResolved = [];
    openNextRendTheVeilChoice(state);
    resolveRendTheVeilChoice(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'use',
      cardId: 'card-attrition',
    });
    expect(state.players.player_1.zones.assetBank).not.toContain('mystics-rend-the-veil');
    expect(state.players.player_1.zones.discard).toContain('mystics-rend-the-veil');
  });

  it('offers Fortifications only to the defender', () => {
    const attacking = game();
    openBattle(attacking, rend('player_1', 'hand'));
    attacking.players.player_1.zones.graveyard = ['card-fortifications'];
    expect(openNextRendTheVeilChoice(attacking)).toBe(false);

    const defending = game();
    openBattle(defending);
    defending.battle!.defender.handCommit = rend('player_2', 'hand');
    defending.players.player_2.zones.graveyard = ['card-fortifications'];
    expect(openNextRendTheVeilChoice(defending)).toBe(true);
    expect(defending.pendingMysticsChoice).toMatchObject({
      playerId: 'player_2',
      graveyardOptions: ['card-fortifications'],
    });
  });
});
