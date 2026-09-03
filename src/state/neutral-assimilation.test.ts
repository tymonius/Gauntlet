import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { ASSIMILATION } from './neutral-assimilation';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-assimilation-canonical-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Attacker',
        factionId: 'military',
        leaderName: 'General',
        deck: [ASSIMILATION, ASSIMILATION, 'neutral-rallying-cry'],
        territories: ['territory-high-ground', 'territory-watchtower', 'territory-garrison'],
      },
      {
        id: 'player_2',
        name: 'Defender',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [ASSIMILATION, 'neutral-rallying-cry'],
        territories: ['territory-supply-depot', 'territory-old-battlefield', 'territory-refuge'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 2;
  return state;
}

function played(
  cardId: string,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId,
    owner,
    origin,
    faceDown: false,
    canceled: false,
    ...overrides,
  };
}

function participant(
  playerId: PlayerID,
  cards: BattlePlayedCard[],
  roll: number,
): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    initialBattleHand: cards.filter((card) => card.origin === 'battle_draw').map((card) => card.cardId),
    battleDrawPlayed: cards.filter((card) => card.origin === 'battle_draw'),
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, cards.filter((card) => card.origin === 'battle_draw').length),
    rerollsRemaining: 0,
    diceRoll: roll,
    modifiers: 0,
    retreated: false,
  };
}

function beginAttack(
  state: GameState,
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
  attackerWins = true,
): void {
  for (const space of state.board.spaces) delete space.occupant;
  const origin = state.board.spaces.find((space) => space.id === 'space-3')!;
  const location = state.board.spaces.find((space) => space.id === 'space-4')!;
  origin.occupant = 'player_1';
  location.kind = 'territory';
  location.territoryId = 'territory-refuge';
  location.revealed = true;
  location.controller = 'player_2';
  location.occupant = 'player_2';
  delete location.capturePendingBy;
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  if (!state.players.player_2.controlledTerritories.includes(location.territoryId)) {
    state.players.player_2.controlledTerritories.push(location.territoryId);
  }
  state.players.player_1.controlledTerritories = state.players.player_1.controlledTerritories
    .filter((territoryId) => territoryId !== location.territoryId);
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: `assimilation-battle-${state.log.length + 1}`,
    stage: 'resolution',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', attackerCards, attackerWins ? 6 : 1),
    defender: participant('player_2', defenderCards, attackerWins ? 1 : 6),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
  };
}

function resolveBattle(state: GameState): GameState {
  return applyGameAction(state, {
    type: 'resolve_battle',
    playerId: 'player_1',
  }).state;
}

function choose(state: GameState, choice: 'pass' | 'use'): GameState {
  return applyGameAction(state, {
    type: 'resolve_neutral_choice',
    playerId: 'player_1',
    choice,
  }).state;
}

describe('Neutral Assimilation', () => {
  it('registers both canonical forms and banks the Action as an Asset', () => {
    expect(getCardPlayRule(ASSIMILATION)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });

    let state = game();
    state.players.player_1.zones.hand = [ASSIMILATION];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: ASSIMILATION,
    }).state;
    expect(state.players.player_1.zones.assetBank).toEqual([ASSIMILATION]);
    expect(state.neutralAssimilationConditions).toBeUndefined();
  });

  it('offers the banked Asset only after its controller wins a qualifying attack', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ASSIMILATION];
    beginAttack(state);
    state = resolveBattle(state);

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'assimilation_asset',
      playerId: 'player_1',
      spaceId: 'space-4',
    });
    expect(state.board.spaces.find((space) => space.id === 'space-4')?.controller).toBe('player_2');
  });

  it('may keep the Asset and leave the normal occupation/capture schedule unchanged', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ASSIMILATION];
    beginAttack(state);
    state = choose(resolveBattle(state), 'pass');

    const space = state.board.spaces.find((candidate) => candidate.id === 'space-4')!;
    expect(state.players.player_1.zones.assetBank).toEqual([ASSIMILATION]);
    expect(state.players.player_1.zones.graveyard).not.toContain(ASSIMILATION);
    expect(space.controller).toBe('player_2');
    expect(space.capturePendingBy).toBe('player_1');
  });

  it('may sacrifice the Asset after the win to capture immediately', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ASSIMILATION];
    beginAttack(state);
    state = choose(resolveBattle(state), 'use');

    const space = state.board.spaces.find((candidate) => candidate.id === 'space-4')!;
    expect(state.players.player_1.zones.assetBank).not.toContain(ASSIMILATION);
    expect(state.players.player_1.zones.graveyard).toContain(ASSIMILATION);
    expect(space.controller).toBe('player_1');
    expect(space.capturePendingBy).toBeUndefined();
  });

  it('does not consume or offer the Asset after a loss', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ASSIMILATION];
    beginAttack(state, [], [], false);
    state = resolveBattle(state);

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.assetBank).toEqual([ASSIMILATION]);
    expect(state.neutralAssimilationBattleResolution).toBeUndefined();
  });

  it('captures immediately with the Battle form and graveyards a Battle Hand copy', () => {
    let state = game();
    beginAttack(state, [played(ASSIMILATION, 'player_1')]);
    state = resolveBattle(state);

    const space = state.board.spaces.find((candidate) => candidate.id === 'space-4')!;
    expect(space.controller).toBe('player_1');
    expect(space.capturePendingBy).toBeUndefined();
    expect(state.players.player_1.zones.discard).not.toContain(ASSIMILATION);
    expect(state.players.player_1.zones.graveyard).toContain(ASSIMILATION);
  });

  it('leaves a losing, defending, canceled, or negated Battle copy on its normal path', () => {
    for (const setup of [
      { attackerCards: [played(ASSIMILATION, 'player_1')], defenderCards: [], attackerWins: false },
      { attackerCards: [], defenderCards: [played(ASSIMILATION, 'player_2')], attackerWins: true },
      { attackerCards: [played(ASSIMILATION, 'player_1', 'battle_draw', { canceled: true })], defenderCards: [], attackerWins: true },
      { attackerCards: [played(ASSIMILATION, 'player_1', 'battle_draw', { negated: true })], defenderCards: [], attackerWins: true },
    ]) {
      let state = game();
      beginAttack(state, setup.attackerCards, setup.defenderCards, setup.attackerWins);
      state = resolveBattle(state);
      expect(state.neutralAssimilationBattleResolution).toBeUndefined();
      expect(state.board.spaces.find((space) => space.id === 'space-4')?.controller).toBe('player_2');
    }
  });

  it('does not offer a banked Asset that was inactive during the battle', () => {
    let state = game();
    state.players.player_1.zones.assetBank = [ASSIMILATION];
    beginAttack(state);
    state.battle!.bankedAssetUseProhibited = ['player_1'];
    state = resolveBattle(state);

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.players.player_1.zones.assetBank).toEqual([ASSIMILATION]);
  });
});
