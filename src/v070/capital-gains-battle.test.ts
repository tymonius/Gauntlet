import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from './battle-effects';
import {
  V070_CAPITAL_GAINS_BATTLE_TEXT,
  V070_CAPITAL_GAINS_ID,
  pendingV070CapitalGainsAftermath,
} from './capital-gains-battle';
import {
  pendingV070AccusationAftermath,
} from './accusation-battle';
import { negateV070BattleCardEffect } from './battle-effect-status';
import { viewV070GameForPlayer } from './views';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'capital-gains-battle',
    seed: 'capital-gains-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'financiers-executive-hostile-expansion',
      },
      B: {
        name: 'Bravo',
        starterDeckId: 'military-commandant-holdfast',
      },
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
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
}

function injectCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `capital-gains-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function prepareCapitalGainsBattle(
  opposingGambitCardId?: string,
): {
  state: V070GameState;
  source: string;
  opposingGambit: string | null;
} {
  let state = startBattle();
  const source = injectCard(
    state,
    'A',
    V070_CAPITAL_GAINS_ID,
    'source',
  );
  state.players.A.zones.hand.push(source);
  let opposingGambit: string | null = null;
  if (opposingGambitCardId) {
    opposingGambit = injectCard(
      state,
      'B',
      opposingGambitCardId,
      'opposing-gambit',
    );
    state.players.B.zones.hand.push(opposingGambit);
  }

  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: source,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    ...(opposingGambit ? { cardInstanceId: opposingGambit } : {}),
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });

  expect(state.battleRuntime?.capitalGainsBattleSourceInstanceIds)
    .toContain(source);
  expect(state.battleRuntime?.battleCardAftermathOverlayPlacements)
    .toEqual(expect.arrayContaining([
      expect.objectContaining({
        sourceInstanceId: source,
        condition: 'owner_win',
      }),
    ]));
  return { state, source, opposingGambit };
}

function resolveBattleOutcome(
  state: V070GameState,
  winner: 'A' | 'B',
): V070GameState {
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
  expect(state.battleRuntime?.stage).toBe('aftermath');
  return state;
}

function openAftermath(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'complete_aftermath',
    playerId: 'A',
  });
}

describe('v0.7.0 Capital Gains battle effect', () => {
  test('binds to released authority and advertises the Gambit/Tactic effect as supported', () => {
    const card = v070CanonicalContent.cardsById.get(V070_CAPITAL_GAINS_ID);
    expect(card?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_CAPITAL_GAINS_BATTLE_TEXT);
    expect(v070BattleEffectHandler(V070_CAPITAL_GAINS_ID)?.expectedText)
      .toBe(V070_CAPITAL_GAINS_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_CAPITAL_GAINS_ID);
  });

  test('winning opens a private choice among either player’s other battle cards', () => {
    let { state, source } = prepareCapitalGainsBattle();
    const opposingReserve = state.battleRuntime!.participants.B.reserve[0];
    const opposingCardId = state.cardInstances[opposingReserve]!.cardId;

    state = openAftermath(resolveBattleOutcome(state, 'A'));
    const pending = pendingV070CapitalGainsAftermath(state);
    expect(pending?.sourceInstanceId).toBe(source);
    expect(pending?.candidateInstanceIds).toContain(opposingReserve);
    expect(pending?.candidateInstanceIds).not.toContain(source);

    const ownerView = viewV070GameForPlayer(state, 'A');
    const opponentView = viewV070GameForPlayer(state, 'B');
    expect(ownerView.pendingCapitalGainsAftermath?.candidateInstanceIds)
      .toContain(opposingReserve);
    expect(opponentView.pendingCapitalGainsAftermath?.candidateCount)
      .toBe(pending?.candidateInstanceIds.length);
    expect(opponentView.pendingCapitalGainsAftermath?.candidateInstanceIds)
      .toBeUndefined();
    expect(opponentView.battleRuntime?.participants.B.reserve)
      .toEqual(expect.arrayContaining([
        expect.objectContaining({
          instanceId: opposingReserve,
          cardId: opposingCardId,
        }),
      ]));
    expect(ownerView.battleRuntime?.participants.B.reserve).toBeUndefined();
  });

  test('places an opposing Reserve card face up in the winner’s Treasury instead of normal cleanup', () => {
    let { state } = prepareCapitalGainsBattle();
    const target = state.battleRuntime!.participants.B.reserve[0];
    const targetCardId = state.cardInstances[target]!.cardId;

    state = openAftermath(resolveBattleOutcome(state, 'A'));
    state = reduceV070BattleAction(state, {
      type: 'resolve_capital_gains_aftermath',
      playerId: 'A',
      targetInstanceId: target,
    });

    expect(state.players.A.financiers?.treasury).toContain(target);
    expect(state.cardInstances[target]?.owner).toBe('B');
    expect(state.players.B.zones.discardPile).not.toContain(target);
    expect(state.players.B.zones.graveyard).not.toContain(target);
    expect(viewV070GameForPlayer(state, 'A').players.A.financiers?.treasury)
      .toContainEqual({ instanceId: target, cardId: targetCardId });
    expect(viewV070GameForPlayer(state, 'B').players.A.financiers?.treasury)
      .toContainEqual({ instanceId: target, cardId: targetCardId });
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'capital_gains_battle_treasury',
        visibility: 'public',
      }),
    ]));
  });

  test('a losing Capital Gains is pruned before shared Aftermath ordering', () => {
    let { state, source } = prepareCapitalGainsBattle();
    state = openAftermath(resolveBattleOutcome(state, 'B'));

    expect(pendingV070CapitalGainsAftermath(state)).toBeNull();
    expect(state.players.A.financiers?.treasury).not.toContain(source);
    expect(state.battleRuntime).toBeNull();
  });

  test('automatically places the only eligible other battle card', () => {
    let { state } = prepareCapitalGainsBattle();
    const target = state.battleRuntime!.participants.B.reserve[0];
    const keepOnly = (playerId: 'A' | 'B', kept: string[]) => {
      const participant = state.battleRuntime!.participants[playerId];
      for (const instanceId of [...participant.reserve]) {
        if (kept.includes(instanceId)) continue;
        participant.reserve.splice(participant.reserve.indexOf(instanceId), 1);
        state.players[playerId].zones.discardPile.push(instanceId);
      }
    };
    keepOnly('A', []);
    keepOnly('B', [target]);

    state = openAftermath(resolveBattleOutcome(state, 'A'));

    expect(pendingV070CapitalGainsAftermath(state)).toBeNull();
    expect(state.players.A.financiers?.treasury).toContain(target);
    expect(state.battleRuntime).toBeNull();
  });

  test('moving another deferred source to Treasury does not cancel that card’s already-triggered Aftermath effect', () => {
    let { state, opposingGambit } = prepareCapitalGainsBattle(
      'inquisition-accusation',
    );
    expect(opposingGambit).not.toBeNull();
    expect(state.battleRuntime?.accusationBattleSourceInstanceIds)
      .toContain(opposingGambit);

    state = openAftermath(resolveBattleOutcome(state, 'A'));
    expect(pendingV070CapitalGainsAftermath(state)).not.toBeNull();
    state = reduceV070BattleAction(state, {
      type: 'resolve_capital_gains_aftermath',
      playerId: 'A',
      targetInstanceId: opposingGambit!,
    });

    expect(state.players.A.financiers?.treasury).toContain(opposingGambit);
    expect(pendingV070AccusationAftermath(state)).not.toBeNull();
    expect(state.battleRuntime?.accusationBattleSourceInstanceIds)
      .toContain(opposingGambit);
  });

  test('negation removes both the Capital Gains registration and its shared-timing carrier', () => {
    let { state, source } = prepareCapitalGainsBattle();
    const negator = injectCard(state, 'B', 'neutral-assassins', 'negator');

    negateV070BattleCardEffect(
      state,
      source,
      negator,
      'neutral-assassins',
    );

    expect(state.battleRuntime?.capitalGainsBattleSourceInstanceIds ?? [])
      .not.toContain(source);
    expect(state.battleRuntime?.battleCardAftermathOverlayPlacements ?? [])
      .not.toEqual(expect.arrayContaining([
        expect.objectContaining({ sourceInstanceId: source }),
      ]));
  });
});
