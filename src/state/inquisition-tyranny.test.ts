import { describe, expect, it } from 'vitest';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { buildPendingInquisitionOptions } from '../dev/inquisition-options';
import { applyGameAction } from './apply-inquisition';
import { continueIntelligencePostRevealFlow } from './intelligence-post-reveal-flow';
import { initializeGame } from './initialize';
import {
  TYRANNY,
  openNextTyrannyChoice,
  tyrannyTargetOptions,
} from './inquisition-tyranny';
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
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' | 'replayed' = 'hand',
  extra: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return { cardId, owner, origin, faceDown: false, canceled: false, ...extra };
}

function game(opponentFaction = 'military'): GameState {
  const opponentLeader = opponentFaction === 'inquisition'
    ? 'Grand Inquisitor'
    : opponentFaction === 'mystics'
      ? 'Spirit Walker'
      : 'General';
  const state = initializeGame({
    id: `inquisition-tyranny-${opponentFaction}`,
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Inquisitor',
        factionId: 'inquisition',
        leaderName: 'Grand Inquisitor',
        deck: [TYRANNY, TYRANNY, 'inquisition-penance'],
        territories: ['t1', 't2', 't3'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: opponentFaction,
        leaderName: opponentLeader,
        deck: ['card-valor', 'card-fortifications', 'mystics-necromancy'],
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

function openBattle(state: GameState, battleId = 'tyranny-battle'): void {
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

describe('Inquisition Tyranny', () => {
  it('banks its Action form as an Asset', () => {
    let state = game();
    state.phase = 'action_before_movement';
    state.players.player_1.zones.hand = [TYRANNY];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: TYRANNY,
    }).state;

    expect(state.players.player_1.zones.assetBank).toEqual([TYRANNY]);
    expect(state.players.player_1.zones.discard).toEqual([]);
  });

  it('opens before normal revealed effects and negates an opposing used card', () => {
    let state = game();
    openBattle(state);
    state.battle!.attacker.handCommit = played(TYRANNY, 'player_1');
    state.battle!.defender.handCommit = played('card-valor', 'player_2');

    expect(continueIntelligencePostRevealFlow(state)).toBe(true);
    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'tyranny_negate',
      playerId: 'player_1',
      sourceKind: 'battle_card',
      options: ['negate'],
      targetOptions: [expect.objectContaining({ targetKey: 'hand_commit', cardId: 'card-valor' })],
    });
    expect(toPrivateGameView(state, 'player_1').pendingInquisitionChoice).toBeDefined();
    expect(toPrivateGameView(state, 'player_2').pendingInquisitionChoice).toBeUndefined();
    expect('pendingInquisitionChoice' in toPublicGameView(state)).toBe(false);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'negate',
      cardId: TYRANNY,
      targetKey: 'hand_commit',
    }).state;

    expect(state.battle?.defender.handCommit?.negated).toBe(true);
    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;
    expect(state.battle?.defender.modifiers).toBe(0);
    expect(state.battle?.effectsResolved).toContain('before_battle_resolution');
  });

  it('keeps duplicate target instances distinct and excludes inactive or virtual cards', () => {
    const state = game();
    openBattle(state);
    state.battle!.defender.handCommit = played('card-valor', 'player_2');
    state.battle!.defender.battleDrawPlayed = [
      played('card-valor', 'player_2', 'battle_draw'),
      played('card-fortifications', 'player_2', 'battle_draw', { canceled: true }),
      played('card-attrition', 'player_2', 'battle_draw', { negated: true }),
      played('card-valor', 'player_2', 'replayed', { virtual: true }),
    ];

    expect(tyrannyTargetOptions(state, 'player_1').map((target) => target.targetKey)).toEqual([
      'hand_commit',
      'battle_draw_played:0',
    ]);
  });

  it('lets an earlier Tyranny negate an opposing Tyranny before it resolves', () => {
    let state = game('inquisition');
    openBattle(state);
    state.battle!.attacker.handCommit = played(TYRANNY, 'player_1');
    state.battle!.defender.handCommit = played(TYRANNY, 'player_2');

    continueIntelligencePostRevealFlow(state);
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'negate',
      cardId: TYRANNY,
      targetKey: 'hand_commit',
    }).state;

    expect(state.battle?.defender.handCommit?.negated).toBe(true);
    expect(state.pendingInquisitionChoice).toBeUndefined();
    expect(state.battle?.attacker.handCommit?.postRevealEffectResolved).toBe(true);
    expect(state.battle?.defender.handCommit?.postRevealEffectResolved).not.toBe(true);
  });

  it('spends 1 Conviction to use a banked copy once per turn and leaves it banked', () => {
    let state = game();
    openBattle(state);
    state.players.player_1.zones.assetBank = [TYRANNY];
    state.players.player_1.resources!.conviction!.value = 2;
    state.battle!.defender.handCommit = played('card-valor', 'player_2');

    expect(openNextTyrannyChoice(state)).toBe(true);
    expect(buildPendingInquisitionOptions(state, 'player_1')).toHaveLength(2);
    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'negate',
      cardId: TYRANNY,
      targetKey: 'hand_commit',
    }).state;

    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
    expect(state.players.player_1.zones.assetBank).toEqual([TYRANNY]);
    expect(state.players.player_1.inquisition).toMatchObject({
      tyrannyAssetUseTurn: state.turn,
      tyrannyAssetUsesThisTurn: 1,
    });

    openBattle(state, 'second-battle-same-turn');
    state.battle!.defender.handCommit = played('card-fortifications', 'player_2');
    expect(openNextTyrannyChoice(state)).toBe(false);
  });

  it('does not consume the Asset use or Conviction when the player passes', () => {
    let state = game();
    openBattle(state);
    state.players.player_1.zones.assetBank = [TYRANNY];
    state.players.player_1.resources!.conviction!.value = 1;
    state.battle!.defender.handCommit = played('card-valor', 'player_2');
    openNextTyrannyChoice(state);

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'pass',
      cardId: TYRANNY,
    }).state;

    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
    expect(state.players.player_1.inquisition?.tyrannyAssetUsesThisTurn).toBeUndefined();

    openBattle(state, 'later-battle');
    state.battle!.defender.handCommit = played('card-fortifications', 'player_2');
    expect(openNextTyrannyChoice(state)).toBe(true);
  });

  it('does not offer the banked Asset without Conviction or while Subversion prohibits Asset use', () => {
    const noConviction = game();
    openBattle(noConviction);
    noConviction.players.player_1.zones.assetBank = [TYRANNY];
    noConviction.battle!.defender.handCommit = played('card-valor', 'player_2');
    expect(openNextTyrannyChoice(noConviction)).toBe(false);

    const prohibited = game();
    openBattle(prohibited);
    prohibited.players.player_1.zones.assetBank = [TYRANNY];
    prohibited.players.player_1.resources!.conviction!.value = 1;
    prohibited.battle!.bankedAssetUseProhibited = ['player_1'];
    prohibited.battle!.defender.handCommit = played('card-valor', 'player_2');
    expect(openNextTyrannyChoice(prohibited)).toBe(false);
  });

  it('can spend Conviction gained from Blasphemy when an Arcane opposing card is revealed', () => {
    let state = game('mystics');
    openBattle(state);
    state.players.player_1.zones.assetBank = [TYRANNY];
    state.players.player_1.resources!.conviction!.value = 0;
    state.battle!.defender.handCommit = played('mystics-necromancy', 'player_2');

    state = applyGameAction(state, { type: 'resolve_battle_reveal', playerId: 'player_1' }).state;

    expect(state.players.player_1.resources?.conviction?.value).toBe(1);
    expect(state.pendingInquisitionChoice).toMatchObject({
      kind: 'tyranny_negate',
      sourceKind: 'asset',
      targetOptions: [expect.objectContaining({ cardId: 'mystics-necromancy' })],
    });

    state = applyGameAction(state, {
      type: 'resolve_inquisition_choice',
      playerId: 'player_1',
      choice: 'negate',
      cardId: TYRANNY,
      targetKey: 'hand_commit',
    }).state;
    expect(state.players.player_1.resources?.conviction?.value).toBe(0);
    expect(state.battle?.defender.handCommit?.negated).toBe(true);
  });
});
