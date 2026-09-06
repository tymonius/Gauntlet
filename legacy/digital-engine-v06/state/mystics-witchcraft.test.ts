import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { buildGuidedOptions } from '../dev/guided-options';
import { applyGameAction } from './apply-mystics';
import { initializeGame } from './initialize';
import {
  WITCHCRAFT,
  openNextWitchcraftChoice,
  supportedWitchcraftRepeatIds,
} from './mystics-witchcraft';
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

function played(
  cardId: string,
  owner: PlayerID = 'player_1',
  origin: 'hand' | 'battle_draw' = 'hand',
): BattlePlayedCard {
  return { cardId, owner, origin, faceDown: false, canceled: false };
}

function game(): GameState {
  const state = initializeGame({
    id: 'witchcraft-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Mystic',
        factionId: 'mystics',
        leaderName: 'Spirit Walker',
        deck: [
          WITCHCRAFT,
          'card-valor',
          'card-fortifications',
          'mystics-dark-omens',
          'mystics-fates-toll',
          'card-attrition',
        ],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'military',
        leaderName: 'General',
        deck: ['card-valor', 'card-fortifications', 'card-attrition'],
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

function openBattle(state: GameState, battleId = 'witchcraft-battle'): void {
  const spaces = state.board.spaces.filter((space) => space.kind === 'territory');
  state.phase = 'battle';
  state.battle = {
    id: battleId,
    stage: 'dice',
    location: spaces[2].id,
    attackerOrigin: spaces[1].id,
    attacker: participant('player_1'),
    defender: participant('player_2'),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Witchcraft', () => {
  it('banks its Action form as an Asset', () => {
    let state = game();
    state.phase = 'action_before_movement';
    state.players.player_1.zones.hand = [WITCHCRAFT];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: WITCHCRAFT,
    }).state;

    expect(state.players.player_1.zones.assetBank).toContain(WITCHCRAFT);
  });

  it('gains advantage when the Battle form has no eligible target', () => {
    const state = game();
    openBattle(state);
    state.battle!.attacker.handCommit = played(WITCHCRAFT);

    expect(openNextWitchcraftChoice(state)).toBe(false);
    expect(state.battle!.attacker.advantage).toBe(1);
    expect(state.battle!.attacker.handCommit?.postRevealEffectResolved).toBe(true);
  });

  it('repeats Valor without exposing or cleaning up a phantom card', () => {
    let state = game();
    openBattle(state);
    state.battle!.attacker.handCommit = played(WITCHCRAFT);
    state.battle!.attacker.battleDrawPlayed = [played('card-valor', 'player_1', 'battle_draw')];

    expect(openNextWitchcraftChoice(state)).toBe(true);
    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'witchcraft_repeat',
      sourceKind: 'battle_card',
      targetOptions: [expect.objectContaining({ cardId: 'card-valor' })],
    });
    const targetKey = state.pendingMysticsChoice?.kind === 'witchcraft_repeat'
      ? state.pendingMysticsChoice.targetOptions[0].targetKey
      : '';

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'repeat',
      targetKey,
    }).state;

    expect(state.battle?.attacker.battleDrawPlayed).toContainEqual(expect.objectContaining({
      cardId: 'card-valor',
      origin: 'replayed',
      virtual: true,
    }));
    expect(toPublicGameView(state).battle?.attacker.battleDrawPlayed).toHaveLength(1);
    expect(toPrivateGameView(state, 'player_1').battle?.attacker.battleDrawPlayed).toHaveLength(1);

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_1', value: 1 }).state;
    state = applyGameAction(state, { type: 'roll_battle_die', playerId: 'player_2', value: 4 }).state;
    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.recentBattleResult?.winner).toBe('player_1');
    expect(state.players.player_1.zones.discard.filter((cardId) => cardId === 'card-valor')).toHaveLength(1);
    expect(state.players.player_1.zones.graveyard).toContain(WITCHCRAFT);
  });

  it('uses a banked copy once per turn by sacrificing a hand card', () => {
    let state = game();
    openBattle(state);
    state.battle!.attacker.handCommit = played('card-valor');
    state.players.player_1.zones.assetBank = [WITCHCRAFT];
    state.players.player_1.zones.hand = ['card-attrition'];

    expect(openNextWitchcraftChoice(state)).toBe(true);
    expect(state.pendingMysticsChoice).toMatchObject({ kind: 'witchcraft_repeat', sourceKind: 'asset' });
    const targetKey = state.pendingMysticsChoice?.kind === 'witchcraft_repeat'
      ? state.pendingMysticsChoice.targetOptions[0].targetKey
      : '';
    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'repeat',
      targetKey,
      cardId: 'card-attrition',
    }).state;

    expect(state.players.player_1.zones.graveyard).toContain('card-attrition');
    expect(state.players.player_1.zones.assetBank).toContain(WITCHCRAFT);
    expect(state.players.player_1.mystics).toMatchObject({
      witchcraftAssetUseTurn: state.turn,
      witchcraftAssetUsesThisTurn: 1,
    });

    openBattle(state, 'second-battle-same-turn');
    state.battle!.attacker.handCommit = played('card-valor');
    state.players.player_1.zones.hand = ['card-fortifications'];
    expect(openNextWitchcraftChoice(state)).toBe(false);
  });

  it('does not consume the once-per-turn Asset use when the player passes', () => {
    let state = game();
    openBattle(state);
    state.battle!.attacker.handCommit = played('card-valor');
    state.players.player_1.zones.assetBank = [WITCHCRAFT];
    state.players.player_1.zones.hand = ['card-attrition'];
    openNextWitchcraftChoice(state);

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;
    expect(state.players.player_1.mystics?.witchcraftAssetUsesThisTurn).toBeUndefined();

    openBattle(state, 'later-battle');
    state.battle!.attacker.handCommit = played('card-valor');
    expect(openNextWitchcraftChoice(state)).toBe(true);
  });

  it('repeats Dark Omens through its normal draw-and-choice flow', () => {
    let state = game();
    openBattle(state);
    state.battle!.attacker.handCommit = played(WITCHCRAFT);
    state.battle!.attacker.battleDrawPlayed = [played('mystics-dark-omens', 'player_1', 'battle_draw')];
    state.battle!.effectsResolved.push('mystics_dark_omens_resolved:player_1:battle_draw:0');
    state.players.player_1.zones.deck = ['card-valor'];
    openNextWitchcraftChoice(state);
    const targetKey = state.pendingMysticsChoice?.kind === 'witchcraft_repeat'
      ? state.pendingMysticsChoice.targetOptions[0].targetKey
      : '';

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'repeat',
      targetKey,
    }).state;

    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'dark_omens_battle',
      sourceKey: 'player_1:battle_draw:1',
      drawnCardId: 'card-valor',
    });
  });

  it("repeats Fate's Toll and requires its sacrifice cost again", () => {
    let state = game();
    openBattle(state);
    state.battle!.attacker.handCommit = played(WITCHCRAFT);
    state.battle!.attacker.battleDrawPlayed = [played('mystics-fates-toll', 'player_1', 'battle_draw')];
    state.battle!.attacker.diceRoll = 2;
    state.battle!.effectsResolved.push('mystics_fates_toll_resolved:player_1:battle_draw:0');
    state.players.player_1.zones.hand = ['card-attrition'];
    openNextWitchcraftChoice(state);
    const targetKey = state.pendingMysticsChoice?.kind === 'witchcraft_repeat'
      ? state.pendingMysticsChoice.targetOptions[0].targetKey
      : '';

    state = applyGameAction(state, {
      type: 'resolve_mystics_choice',
      playerId: 'player_1',
      choice: 'repeat',
      targetKey,
    }).state;

    expect(state.pendingMysticsChoice).toMatchObject({
      kind: 'fates_toll_reroll',
      sourceKey: 'player_1:battle_draw:1',
      oldRoll: 2,
      handOptions: ['card-attrition'],
    });
  });

  it('sends a battle-drawn Witchcraft card to the Graveyard during cleanup', () => {
    let state = game();
    openBattle(state);
    state.battle!.attacker.battleDrawPlayed = [played(WITCHCRAFT, 'player_1', 'battle_draw')];
    openNextWitchcraftChoice(state);
    state.battle!.stage = 'resolution';
    state.battle!.attacker.diceRoll = 6;
    state.battle!.defender.diceRoll = 1;

    state = applyGameAction(state, { type: 'resolve_battle', playerId: 'player_1' }).state;

    expect(state.players.player_1.zones.graveyard).toContain(WITCHCRAFT);
    expect(state.players.player_1.zones.discard).not.toContain(WITCHCRAFT);
  });

  it('exposes only effects with proven repeat coverage', () => {
    expect(supportedWitchcraftRepeatIds()).toEqual(expect.arrayContaining([
      'card-valor',
      'card-fortifications',
      'mystics-dark-omens',
      'mystics-fates-toll',
    ]));
    expect(supportedWitchcraftRepeatIds()).not.toContain(WITCHCRAFT);
    expect(buildGuidedOptions(game())).toBeDefined();
  });
});
