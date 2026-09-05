import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { bindV070CardFromPlayerZone } from './bindings';
import { viewV070GameForPlayer } from './views';

const attackerStarter = 'military-general-forward-doctrine';
const defenderStarter = 'inquisition-grand-inquisitor-final-judgment';

function readyGame(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'retribution-test',
    seed: 'retribution-seed',
    players: {
      A: { name: 'Attacker', starterDeckId: attackerStarter },
      B: { name: 'Defender', starterDeckId: defenderStarter },
    },
  });

  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId,
      cardInstanceId: state.players[playerId].openingSelection[0],
    });
  }
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'arrange_territories',
      playerId,
      territoryIds: state.players[playerId].territoryCandidates,
    });
  }
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'A',
    value: 6,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });
  return state;
}

function activeBattle(): V070GameState {
  let state = readyGame();
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = 'B';

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
  return reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
  zone?: 'hand' | 'assetBank',
): string {
  const instanceId = `retribution-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  if (zone) state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function resolveBattle(
  state: V070GameState,
  winner: 'A' | 'B',
  gambitA?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: gambitA,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [winner === 'A' ? 6 : 1],
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [winner === 'B' ? 6 : 1],
  });
  expect(state.battle?.winner).toBe(winner);
  expect(state.battleRuntime?.stage).toBe('aftermath');
  return state;
}

function openAftermathEffects(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'complete_aftermath',
    playerId: 'A',
  });
}

function defenderWinWithRetribution(options?: {
  opponentAssetCardId?: string;
  reactiveSubversion?: boolean;
  secondRetribution?: boolean;
}): {
  state: V070GameState;
  retribution: string;
  secondRetribution?: string;
  opponentAsset?: string;
  subversion?: string;
} {
  let state = activeBattle();
  const retribution = inject(
    state,
    'B',
    'inquisition-retribution',
    'source',
    'assetBank',
  );
  const secondRetribution = options?.secondRetribution
    ? inject(
        state,
        'B',
        'inquisition-retribution',
        'second',
        'assetBank',
      )
    : undefined;
  const opponentAsset = options?.opponentAssetCardId
    ? inject(
        state,
        'A',
        options.opponentAssetCardId,
        'target',
        'assetBank',
      )
    : undefined;
  const subversion = options?.reactiveSubversion
    ? inject(
        state,
        'A',
        'intelligence-subversion',
        'reactive',
        'assetBank',
      )
    : undefined;

  state = resolveBattle(state, 'B');
  state = openAftermathEffects(state);
  return {
    state,
    retribution,
    secondRetribution,
    opponentAsset,
    subversion,
  };
}

function hasEvent(state: V070GameState, type: string): boolean {
  return state.events.some(event => event.type === type);
}

describe('v0.7.0 Retribution', () => {
  test('opens only for the defender after the attacking opponent loses', () => {
    const { state, retribution } = defenderWinWithRetribution();
    expect(
      state.battleRuntime?.pendingBattleAftermathControlledEffectChoice,
    ).toMatchObject({
      playerId: 'B',
      candidateSourceInstanceIds: [retribution],
    });
  });

  test('does not trigger an attacker-owned copy', () => {
    let state = activeBattle();
    const source = inject(
      state,
      'A',
      'inquisition-retribution',
      'attacker-owned',
      'assetBank',
    );
    state = resolveBattle(state, 'B');
    state = openAftermathEffects(state);
    expect(state.battle).toBeNull();
    expect(state.battleRuntime).toBeNull();
    expect(state.players.A.zones.assetBank).toContain(source);
    expect(hasEvent(state, 'retribution_used')).toBe(false);
    expect(hasEvent(state, 'retribution_declined')).toBe(false);
  });

  test('does not trigger when the defender loses', () => {
    let state = activeBattle();
    const source = inject(
      state,
      'B',
      'inquisition-retribution',
      'defender-lost',
      'assetBank',
    );
    state = resolveBattle(state, 'A');
    state = openAftermathEffects(state);
    expect(state.battle).toBeNull();
    expect(state.battleRuntime).toBeNull();
    expect(state.players.B.zones.assetBank).toContain(source);
    expect(hasEvent(state, 'retribution_used')).toBe(false);
  });

  test('Battle Subversion suppresses Retribution without opening a reactive window', () => {
    let state = activeBattle();
    const retribution = inject(
      state,
      'B',
      'inquisition-retribution',
      'battle-subversion-target',
      'assetBank',
    );
    const battleSubversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'battle-subversion',
      'hand',
    );
    state = resolveBattle(state, 'B', battleSubversion);
    expect(state.battleRuntime?.assetUseProhibitedPlayers).toContain('B');
    state = openAftermathEffects(state);
    expect(
      state.battleRuntime?.pendingBattleAftermathControlledEffectChoice,
    ).toBeNull();
    expect(state.battleRuntime?.pendingSubversionAssetBattle).toBeNull();
    expect(state.players.B.zones.assetBank).toContain(retribution);
  });

  test('may decline a physical copy without discarding it', () => {
    let { state, retribution } = defenderWinWithRetribution();
    state = reduceV070BattleAction(state, {
      type: 'pass_retribution_asset',
      playerId: 'B',
      assetInstanceId: retribution,
    });
    expect(state.players.B.zones.assetBank).toContain(retribution);
    expect(hasEvent(state, 'retribution_declined')).toBe(true);
    expect(state.battle).toBeNull();
    expect(state.battleRuntime).toBeNull();
  });

  test('multiple physical copies are offered separately after a decline', () => {
    let { state, retribution, secondRetribution } =
      defenderWinWithRetribution({ secondRetribution: true });
    expect(secondRetribution).toBeDefined();
    expect(
      state.battleRuntime?.pendingBattleAftermathControlledEffectChoice
        ?.candidateSourceInstanceIds,
    ).toEqual([retribution, secondRetribution]);

    state = reduceV070BattleAction(state, {
      type: 'pass_retribution_asset',
      playerId: 'B',
      assetInstanceId: retribution,
    });
    expect(
      state.battleRuntime?.pendingBattleAftermathControlledEffectChoice
        ?.candidateSourceInstanceIds,
    ).toEqual([secondRetribution]);
  });

  test('with no opposing Assets, use discards Retribution and grants +2 Conviction', () => {
    let { state, retribution } = defenderWinWithRetribution();
    const before = state.players.B.inquisition?.conviction ?? 0;
    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'B',
      sourceInstanceId: retribution,
    });
    expect(state.players.B.zones.discardPile).toContain(retribution);
    expect(state.players.B.zones.assetBank).not.toContain(retribution);
    expect(state.players.B.inquisition?.conviction).toBe(before + 2);
    expect(state.battle).toBeNull();
    expect(state.battleRuntime).toBeNull();
    expect(hasEvent(state, 'retribution_resolved')).toBe(true);
  });

  test('with opposing Assets, use pauses for the opponent choice', () => {
    let { state, retribution, opponentAsset } = defenderWinWithRetribution({
      opponentAssetCardId: 'neutral-contingency-plan',
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'B',
      sourceInstanceId: retribution,
    });
    expect(state.battleRuntime?.pendingRetributionResponse).toMatchObject({
      playerId: 'A',
      owner: 'B',
      sourceInstanceId: retribution,
      candidateAssetInstanceIds: [opponentAsset],
    });
    expect(() => reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    })).toThrow(/Retribution response/);
  });

  test('the opponent may choose +2 Conviction instead of losing an Asset', () => {
    let { state, retribution, opponentAsset } = defenderWinWithRetribution({
      opponentAssetCardId: 'neutral-contingency-plan',
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'B',
      sourceInstanceId: retribution,
    });
    const before = state.players.B.inquisition?.conviction ?? 0;
    state = reduceV070BattleAction(state, {
      type: 'resolve_retribution_response',
      playerId: 'A',
      choice: 'conviction',
    });
    expect(state.players.B.inquisition?.conviction).toBe(before + 2);
    expect(state.players.A.zones.assetBank).toContain(opponentAsset);
    expect(state.battleRuntime?.pendingRetributionResponse).toBeNull();
  });

  test('the opponent may put one chosen Asset in the Graveyard without Removal', () => {
    let { state, retribution, opponentAsset } = defenderWinWithRetribution({
      opponentAssetCardId: 'neutral-contingency-plan',
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'B',
      sourceInstanceId: retribution,
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_retribution_response',
      playerId: 'A',
      choice: 'asset',
      assetInstanceId: opponentAsset,
    });
    expect(state.players.A.zones.graveyard).toContain(opponentAsset);
    expect(state.players.A.zones.assetBank).not.toContain(opponentAsset);
    expect(state.players.A.zones.removed).not.toContain(opponentAsset);
  });

  test('putting Sleeper Network in the Graveyard releases hidden bound Actions normally', () => {
    let { state, retribution, opponentAsset: sleeper } =
      defenderWinWithRetribution({
        opponentAssetCardId: 'intelligence-sleeper-network',
      });
    const bound = inject(
      state,
      'A',
      'neutral-supplies',
      'sleeper-bound',
      'hand',
    );
    bindV070CardFromPlayerZone(state, {
      hostId: sleeper!,
      owner: 'A',
      cardInstanceId: bound,
      sourceZone: 'hand',
      faceUp: false,
      purpose: 'Sleeper Network',
    });

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'B',
      sourceInstanceId: retribution,
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_retribution_response',
      playerId: 'A',
      choice: 'asset',
      assetInstanceId: sleeper,
    });
    expect(state.players.A.zones.graveyard).toContain(sleeper);
    expect(state.players.A.zones.discardPile).toContain(bound);
    expect(state.bindings.some(binding => binding.hostId === sleeper)).toBe(false);
    expect(state.pendingSleeperNetworkChoice).toBeNull();
  });

  test('reactive Subversion pass lets Retribution apply', () => {
    let { state, retribution, subversion } = defenderWinWithRetribution({
      reactiveSubversion: true,
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'B',
      sourceInstanceId: retribution,
    });
    expect(state.battleRuntime?.pendingSubversionAssetBattle).toMatchObject({
      playerId: 'A',
      targetOwner: 'B',
      targetAssetInstanceId: retribution,
      effectLabel: 'Retribution',
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'pass',
    });
    expect(state.players.B.zones.discardPile).toContain(retribution);
    expect(state.players.A.zones.assetBank).toContain(subversion);
    expect(state.battleRuntime?.pendingRetributionResponse).toMatchObject({
      playerId: 'A',
      candidateAssetInstanceIds: [subversion],
    });
  });

  test('reactive Subversion use negates Retribution and advances shared timing', () => {
    let { state, retribution, subversion } = defenderWinWithRetribution({
      reactiveSubversion: true,
    });
    const before = state.players.B.inquisition?.conviction ?? 0;
    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'B',
      sourceInstanceId: retribution,
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'use',
      subversionInstanceId: subversion,
    });
    expect(state.players.A.zones.graveyard).toContain(subversion);
    expect(state.players.B.zones.discardPile).toContain(retribution);
    expect(state.players.B.inquisition?.conviction).toBe(before);
    expect(hasEvent(state, 'retribution_negated')).toBe(true);
    expect(state.battle).toBeNull();
    expect(state.battleRuntime).toBeNull();
  });

  test('response views expose candidate identities only to the responding player', () => {
    let { state, retribution, opponentAsset } = defenderWinWithRetribution({
      opponentAssetCardId: 'neutral-contingency-plan',
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'B',
      sourceInstanceId: retribution,
    });

    const responder = viewV070GameForPlayer(state, 'A');
    const owner = viewV070GameForPlayer(state, 'B');
    expect(responder.battleRuntime?.pendingRetributionResponse).toMatchObject({
      playerId: 'A',
      candidateAssetCount: 1,
      candidateAssetInstanceIds: [opponentAsset],
    });
    expect(owner.battleRuntime?.pendingRetributionResponse).toMatchObject({
      playerId: 'A',
      candidateAssetCount: 1,
    });
    expect(
      owner.battleRuntime?.pendingRetributionResponse,
    ).not.toHaveProperty('candidateAssetInstanceIds');
  });
});
