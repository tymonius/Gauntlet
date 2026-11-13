import { describe, expect, test } from 'vitest';
import { createV070StarterGame, reduceV070SetupAction, type V070GameState } from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { viewV070GameForPlayer } from './views';
import { v070CanonicalContent } from '../content/v070';
import { placeV070OverlayFromHand } from './overlays';
import {
  associateV070Sanction,
  reduceV070SanctionAction,
  V070_SANCTIONS_BLOCKADE_ID,
} from './sanctions';

function setup(ambassador = false): V070GameState {
  let state = createV070StarterGame({
    gameId: 'candidate-follow-up-live',
    seed: 'candidate-follow-up-live-seed',
    players: {
      A: {
        name: ambassador ? 'Ambassador' : 'General',
        starterDeckId: ambassador
          ? 'diplomats-ambassador-open-channels'
          : 'military-general-forward-doctrine',
      },
      B: { name: 'Commandant', starterDeckId: 'military-commandant-holdfast' },
    },
  });
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard', playerId,
      cardInstanceId: state.players[playerId].openingSelection[0]!,
    });
  }
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'arrange_territories', playerId,
      territoryIds: state.players[playerId].territoryCandidates,
    });
  }
  state = reduceV070SetupAction(state, { type: 'roll_first_player', playerId: 'A', value: 6 });
  state = reduceV070SetupAction(state, { type: 'roll_first_player', playerId: 'B', value: 1 });
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(territory => {
    territory.occupant = null;
    territory.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'choose_movement', playerId: 'A', choice: 'advance' });
  if (ambassador) {
    state = reduceV070BattleAction(state, {
      type: 'offer_terms', playerId: 'A', proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms', playerId: 'B', response: 'refuse',
    });
  }
  state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
  return state;
}

function revealGambit(state: V070GameState, owner: 'A' | 'B', cardId: string): [V070GameState, string] {
  const instanceId = state.players[owner].zones.hand[0]!;
  state.cardInstances[instanceId].cardId = cardId;
  const other = owner === 'A' ? 'B' : 'A';
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'A',
    ...(owner === 'A' ? { cardInstanceId: instanceId } : {}),
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'B',
    ...(owner === 'B' ? { cardInstanceId: instanceId } : {}),
  });
  state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
  expect(state.battleRuntime?.stage).not.toBe('halted');
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
  state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
  return [state, instanceId];
}

function settle(state: V070GameState, winner: 'A' | 'B'): V070GameState {
  if (state.battleRuntime?.terms.stage === 'refused'
    && !state.battleRuntime.terms.leverageResolved) {
    state = reduceV070BattleAction(state, {
      type: 'use_leverage', playerId: 'A', bonus: 0,
    });
  }
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice', playerId: 'A', values: [winner === 'A' ? 6 : 1],
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice', playerId: 'B', values: [winner === 'B' ? 6 : 1],
  });
  expect(state.battleRuntime?.stage).toBe('aftermath');
  return state;
}
function complete(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'complete_aftermath', playerId: 'A',
  });
}
function asset(state: V070GameState, owner: 'A' | 'B'): string {
  const id = state.players[owner].zones.hand.pop()!;
  state.cardInstances[id].cardId = 'military-countercharge';
  state.players[owner].zones.assetBank.push(id);
  return id;
}
describe('actual v0.7.3 follow-up reducer integration', () => {
  test('exact frozen and current canonical battle text is registered', async () => {
    const { v070CanonicalContent } = await import('../content/v070');
    const { currentCanonicalContent } = await import('../content/current-game');
    const { v070BattleEffectHandler } = await import('./battle-effects');
    for (const content of [v070CanonicalContent, currentCanonicalContent]) {
      for (const id of ['military-countercharge', 'military-give-chase']) {
        const battleText = content.cardsById.get(id)?.effects.find(effect =>
          effect.label === 'Gambit/Tactic')?.text;
        expect(v070BattleEffectHandler(id)?.expectedText).toBe(battleText);
      }
    }
  });

  test('winning attacker reveals Give Chase, starts a fresh restricted battle, and leaves Rout unpaid', () => {
    let [state, id] = revealGambit(setup(), 'A', 'military-give-chase');
    state = settle(state, 'A');
    state.players.A.military!.command = 2;
    state = complete(state);
    expect(state.battle).toBeNull();
    const offered = state.v073FollowUpQueue?.pending.map(g => g.kind);
    expect(offered).toEqual(['give-chase-battle', 'general-rout']);
    expect(viewV070GameForPlayer(state, 'A').pendingFollowUpMovement?.options[0]?.kind)
      .toBe('give-chase-battle');
    state = reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'A', grantKey: 'give-chase:' + id,
    });
    expect(state.players.A.military?.command).toBe(2);
    state = reduceV070TurnAction(state, {
      type: 'choose_movement', playerId: 'A', choice: 'advance',
    });
    expect(state.battle?.attacker).toBe('A');
    expect(state.battle?.attackerGambitProhibited).toBe(true);
    expect(state.v073FollowUpQueue).toBeUndefined();
    expect(state.players.A.military?.command).toBe(2);
    expect(state.v073GiveChaseBattleRestriction?.reservePenalty).toBe(0);
    expect(() => reduceV070BattleAction(state, {
      type: 'use_general_rally', playerId: 'A',
    })).toThrow(/prohibits Orders/);
    expect(state.players.A.zones.graveyard).toContain(id);
  });

  test('declining optional Give Chase preserves a payable Rout', () => {
    let [state, id] = revealGambit(setup(), 'A', 'military-give-chase');
    state = settle(state, 'A');
    state.players.A.military!.command = 2;
    state = complete(state);
    state = reduceV070TurnAction(state, {
      type: 'decline_follow_up_movement', playerId: 'A',
      grantKey: 'give-chase:' + id,
    });
    expect(state.players.A.military?.command).toBe(2);
    expect(state.v073FollowUpQueue?.pending.map(g => g.kind)).toEqual(['general-rout']);
    state = reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'A', grantKey: 'general-rout:A',
    });
    expect(state.players.A.military?.command).toBe(0);
    expect(state.turnState?.movementSequenceOpen).toBe(true);
  });

  test('winning defender launches mandatory off-turn Countercharge with the turn owner unchanged', () => {
    let [state, id] = revealGambit(setup(), 'B', 'military-countercharge');
    state = settle(state, 'B');
    const turn = state.turnNumber;
    state = complete(state);
    expect(state.v073FollowUpQueue?.pending.map(g => g.kind)).toEqual(['countercharge-battle']);
    expect(() => reduceV070TurnAction(state, {
      type: 'decline_follow_up_movement', playerId: 'B',
      grantKey: 'countercharge-battle:' + id,
    })).toThrow(/Mandatory/);
    state = reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'B',
      grantKey: 'countercharge-battle:' + id,
    });
    expect(state.turnState?.effectMovementController).toBe('B');
    state = reduceV070TurnAction(state, {
      type: 'choose_movement', playerId: 'B', choice: 'advance',
    });
    expect(state.activePlayer).toBe('A');
    expect(state.turnNumber).toBe(turn);
    expect(state.battle?.attacker).toBe('B');
    expect(state.v073FollowUpQueue).toBeUndefined();
  });

  test('a no-battle Countercharge movement leaves another physical grant available', () => {
    let state = setup();
    const a1 = asset(state, 'B');
    const a2 = asset(state, 'B');
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
    state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
    state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
    state = settle(state, 'B');
    state = complete(state);
    expect(state.v073FollowUpQueue?.pending.length).toBe(2);
    state.players.A.position = 0;
    state.board.forEach(t => { if (t.occupant === 'A') t.occupant = null; });
    state.board[0].occupant = 'A';
    state = reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'B',
      grantKey: 'countercharge-asset:' + a1,
    });
    expect(state.players.B.zones.graveyard).toContain(a1);
    state = reduceV070TurnAction(state, {
      type: 'choose_movement', playerId: 'B', choice: 'advance',
    });
    expect(state.battle).toBeNull();
    expect(state.v073FollowUpQueue?.pending.map(g => g.sourceInstanceId)).toEqual([a2]);
    state = reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'B',
      grantKey: 'countercharge-asset:' + a2,
    });
    expect(state.players.B.zones.graveyard).toContain(a2);
  });

  test('a second Countercharge opportunity expires when the first Advance creates a battle', () => {
    let state = setup();
    const c1 = asset(state, 'B');
    const c2 = asset(state, 'B');
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
    state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
    state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
    state = complete(settle(state, 'B'));
    expect(state.v073FollowUpQueue?.pending.length).toBe(2);
    state = reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'B',
      grantKey: 'countercharge-asset:' + c1,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement', playerId: 'B', choice: 'advance',
    });
    expect(state.battle?.attacker).toBe('B');
    expect(state.v073FollowUpQueue).toBeUndefined();
    expect(state.players.B.zones.assetBank).toContain(c2);
    expect(state.players.B.zones.graveyard).not.toContain(c2);
    expect(state.events.some(e =>
      e.type === 'follow_up_movement_resolved'
      && (e.payload as {expired?: string[]}).expired?.includes('countercharge-asset:' + c2)
    )).toBe(true);
  });
  test('Give Chase after two actual battles reduces the third battle Reserve by one', () => {
    let [state, first] = revealGambit(setup(), 'A', 'military-give-chase');
    state = complete(settle(state, 'A'));
    state = reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'A', grantKey: 'give-chase:' + first,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement', playerId: 'A', choice: 'advance',
    });
    expect(state.battle?.attackerGambitProhibited).toBe(true);
    // This is battle two. The printed restriction prohibits a Gambit, not a Tactic.
    state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
    state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
    const second = state.battleRuntime!.participants.A.reserve[0]!;
    state.cardInstances[second].cardId = 'military-give-chase';
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A', cardInstanceId: second,
    });
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
    state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
    state = complete(settle(state, 'A'));
    expect(state.v073FollowUpQueue?.pending.some(g => g.sourceInstanceId === second))
      .toBe(true);
    state = reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'A', grantKey: 'give-chase:' + second,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement', playerId: 'A', choice: 'advance',
    });
    expect(state.v073GiveChaseBattleRestriction?.reservePenalty).toBe(1);
    expect(state.battle?.attackerGambitProhibited).toBe(true);
    state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
    expect(state.battleRuntime?.participants.A.reserve.length).toBe(
      v070CanonicalContent.content.battle.normal_reserve_size - 1,
    );
    expect(state.activePlayer).toBe('A');
    expect(state.events.filter(e => e.type === 'battle_initiated')).toHaveLength(3);
  });

  test('Blockade departure interrupts repeated Countercharge movement until resolved', () => {
    let state = setup(true);
    const first = asset(state, 'B');
    const second = asset(state, 'B');
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
    state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: 'B' });
    state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: 'A' });
    state = complete(settle(state, 'B'));

    const blockade = state.players.A.zones.hand[0]!;
    state.cardInstances[blockade].cardId = V070_SANCTIONS_BLOCKADE_ID;
    placeV070OverlayFromHand(state, 'A', blockade, 3, 'follow-up Blockade regression');
    associateV070Sanction(state, {
      instanceId: blockade, owner: 'A', opponent: 'B', kind: 'overlay',
    });
    // The A token is safely separated so the first Countercharge does not begin a battle.
    state.board.forEach(t => { if (t.occupant === 'A') t.occupant = null; });
    state.players.A.position = 0;
    state.board[0].occupant = 'A';
    state = reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'B',
      grantKey: 'countercharge-asset:' + first,
    });
    state = reduceV070TurnAction(state, {
      type: 'choose_movement', playerId: 'B', choice: 'advance',
    });
    expect(state.pendingSanctionChoices).toEqual([
      expect.objectContaining({
        kind: 'blockade_movement', sanctionInstanceId: blockade,
        playerId: 'B', movement: 'leave',
      }),
    ]);
    expect(state.v073FollowUpQueue?.pending.map(g => g.sourceInstanceId)).toEqual([second]);
    expect(viewV070GameForPlayer(state, 'B').pendingFollowUpMovement?.options).toEqual([]);
    const snapshot = structuredClone(state);
    expect(() => reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'B',
      grantKey: 'countercharge-asset:' + second,
    })).toThrow(/pending Sanction/);
    expect(state).toEqual(snapshot);
    const payment = state.players.B.zones.hand[0]!;
    state = reduceV070SanctionAction(state, {
      type: 'resolve_blockade_choice', playerId: 'B',
      sanctionInstanceId: blockade, choice: 'discard', discardInstanceId: payment,
    });
    expect(state.pendingSanctionChoices).toEqual([]);
    expect(viewV070GameForPlayer(state, 'B').pendingFollowUpMovement?.options)
      .toEqual([expect.objectContaining({ key: 'countercharge-asset:' + second })]);
    state = reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'B',
      grantKey: 'countercharge-asset:' + second,
    });
    expect(state.players.B.zones.graveyard).toContain(second);
  });

  test('an illegal mandatory Advance leaves the selected grant intact without phantom expiration', () => {
    let [state, source] = revealGambit(setup(), 'B', 'military-countercharge');
    state = complete(settle(state, 'B'));
    state = reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'B',
      grantKey: 'countercharge-battle:' + source,
    });
    // Force an out-of-bounds movement attempt as a legality-only regression.
    // This does not establish a gameplay resolution for inherently impossible grants.
    state.players.B.position = 0;
    const snapshot = structuredClone(state);
    expect(() => reduceV070TurnAction(state, {
      type: 'choose_movement', playerId: 'B', choice: 'advance',
    })).toThrow();
    expect(state).toEqual(snapshot);
    expect(state.v073FollowUpQueue?.active?.sourceInstanceId).toBe(source);
  });

  test('forged unrelated actor cannot take the offered effect or move another player', () => {
    let [state, id] = revealGambit(setup(), 'B', 'military-countercharge');
    state = complete(settle(state, 'B'));
    const snap = structuredClone(state);
    expect(() => reduceV070TurnAction(state, {
      type: 'choose_follow_up_movement', playerId: 'A',
      grantKey: 'countercharge-battle:' + id,
    })).toThrow(/not offered/);
    expect(state).toEqual(snap);
  });
});
