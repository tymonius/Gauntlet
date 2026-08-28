import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
  type V070PlayerZones,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const militaryStarter = 'military-commandant-holdfast';

function activeBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'response-card-test',
    seed: 'response-card-seed',
    players: {
      A: { name: 'Diplomat', starterDeckId: diplomatStarter },
      B: { name: 'Opponent', starterDeckId: militaryStarter },
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
  state = reduceV070SetupAction(state, { type: 'roll_first_player', playerId: 'A', value: 6 });
  state = reduceV070SetupAction(state, { type: 'roll_first_player', playerId: 'B', value: 1 });

  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => { space.occupant = null; });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  return reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
}

function relocateCard(
  state: V070GameState,
  playerId: 'A' | 'B',
  cardId: string,
  target: keyof Pick<V070PlayerZones, 'hand' | 'discardPile' | 'graveyard' | 'assetBank'>,
): string {
  const instance = Object.values(state.cardInstances)
    .find(candidate => candidate.owner === playerId && candidate.cardId === cardId);
  if (!instance) throw new Error(`Missing ${playerId} card ${cardId}`);

  const player = state.players[playerId];
  for (const zone of [
    player.zones.drawPile,
    player.zones.hand,
    player.zones.discardPile,
    player.zones.graveyard,
    player.zones.assetBank,
    player.zones.removed,
  ]) {
    const index = zone.indexOf(instance.instanceId);
    if (index >= 0) zone.splice(index, 1);
  }
  player.zones[target].push(instance.instanceId);
  return instance.instanceId;
}

function proceedToGambitReveal(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
  return reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: 'A' });
}

describe('v0.7.0 Diplomat offer/response cards', () => {
  test('Diplomatic Divination resolves each revealed copy independently after the response', () => {
    let state = activeBattle();
    const copies = Object.values(state.cardInstances)
      .filter(instance => instance.owner === 'A' && instance.cardId === 'diplomats-diplomatic-divination');
    expect(copies.length).toBeGreaterThanOrEqual(1);

    const divination = relocateCard(state, 'A', 'diplomats-diplomatic-divination', 'hand');
    const influenceBefore = state.players.A.diplomats!.influence;

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'use_diplomatic_divination',
      playerId: 'A',
      cardInstanceId: divination,
      prediction: 'accept',
    });
    expect(state.players.A.zones.hand).not.toContain(divination);

    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });

    expect(state.players.A.zones.discardPile).toContain(divination);
    expect(state.players.A.diplomats?.influence).toBe(influenceBefore + 2);
    expect(state.events.some(event =>
      event.type === 'diplomatic_divination_resolved'
      && (event.payload as { matched?: boolean })?.matched === true
    )).toBe(true);
  });

  test('a missed Diplomatic Divination goes to the Graveyard', () => {
    let state = activeBattle();
    const divination = relocateCard(state, 'A', 'diplomats-diplomatic-divination', 'hand');

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'use_diplomatic_divination',
      playerId: 'A',
      cardInstanceId: divination,
      prediction: 'refuse',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });

    expect(state.players.A.zones.graveyard).toContain(divination);
    expect(state.players.A.zones.discardPile).not.toContain(divination);
  });

  test('Good Faith draws first, then may set aside the newly drawn card', () => {
    let state = activeBattle();
    const goodFaith = relocateCard(state, 'A', 'diplomats-good-faith', 'assetBank');
    const expectedDraw = state.players.A.zones.drawPile[0];

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'use_good_faith',
      playerId: 'A',
      cardInstanceId: goodFaith,
    });

    expect(state.players.A.zones.discardPile).toContain(goodFaith);
    expect(state.players.A.zones.hand).toContain(expectedDraw);
    expect(state.battleRuntime?.terms.termsCardChoice?.kind).toBe('good_faith_set_aside');

    state = reduceV070BattleAction(state, {
      type: 'resolve_terms_card_choice',
      playerId: 'A',
      cardInstanceId: expectedDraw,
    });
    expect(state.players.A.zones.hand).not.toContain(expectedDraw);
    expect(state.battleRuntime?.terms.stage).toBe('response');

    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });

    expect(state.players.A.zones.graveyard).toContain(expectedDraw);
    expect(state.events.some(event => event.type === 'good_faith_accepted')).toBe(true);
  });

  test('Good Faith returns its set-aside card to Hand after refusal', () => {
    let state = activeBattle();
    const goodFaith = relocateCard(state, 'A', 'diplomats-good-faith', 'assetBank');

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'use_good_faith',
      playerId: 'A',
      cardInstanceId: goodFaith,
    });
    const setAside = state.players.A.zones.hand[0];
    state = reduceV070BattleAction(state, {
      type: 'resolve_terms_card_choice',
      playerId: 'A',
      cardInstanceId: setAside,
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'refuse',
    });

    expect(state.players.A.zones.hand).toContain(setAside);
    expect(state.battleRuntime?.terms.stage).toBe('refused');
  });

  test('Trade Concessions accepted supports the draw-two option and pays the Diplomat card', () => {
    let state = activeBattle();
    const trade = relocateCard(state, 'A', 'diplomats-trade-concessions', 'hand');
    const diplomatHandBefore = state.players.A.zones.hand.length;
    const opponentHandBefore = state.players.B.zones.hand.length;

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'use_trade_concessions',
      playerId: 'A',
      cardInstanceId: trade,
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });

    expect(state.battleRuntime?.terms.termsCardChoice?.kind).toBe('trade_concessions');
    state = reduceV070BattleAction(state, {
      type: 'resolve_terms_card_choice',
      playerId: 'B',
      choice: 'draw_two',
    });

    expect(state.battle).toBeNull();
    expect(state.players.B.zones.hand.length).toBe(opponentHandBefore + 3);
    expect(state.players.A.zones.discardPile).toContain(trade);
    expect(state.players.A.zones.hand.length).toBeGreaterThanOrEqual(diplomatHandBefore);
  });

  test('Trade Concessions refused returns to Hand before Gambits', () => {
    let state = activeBattle();
    const trade = relocateCard(state, 'A', 'diplomats-trade-concessions', 'hand');

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'use_trade_concessions',
      playerId: 'A',
      cardInstanceId: trade,
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'refuse',
    });

    expect(state.players.A.zones.hand).toContain(trade);
    expect(state.battleRuntime?.terms.stage).toBe('refused');
  });

  test('Nonbinding Resolution may leave an accepted unratified Proposal unratified for +2 Influence', () => {
    let state = activeBattle();
    const nonbinding = relocateCard(state, 'A', 'diplomats-nonbinding-resolution', 'hand');
    const influenceBefore = state.players.A.diplomats!.influence;

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'use_nonbinding_resolution',
      playerId: 'A',
      cardInstanceId: nonbinding,
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });

    expect(state.battleRuntime?.terms.termsCardChoice?.kind).toBe('nonbinding_resolution');
    state = reduceV070BattleAction(state, {
      type: 'resolve_terms_card_choice',
      playerId: 'B',
      choice: 'decline_ratification',
    });

    expect(state.battle).toBeNull();
    expect(state.players.A.diplomats?.ratifiedProposals).not.toContain('de-escalation');
    expect(state.players.A.diplomats?.influence).toBe(influenceBefore + 2);
    expect(state.players.A.zones.discardPile).toContain(nonbinding);
  });

  test('Nonbinding Resolution ratify option uses normal +1 ratification reward', () => {
    let state = activeBattle();
    const nonbinding = relocateCard(state, 'A', 'diplomats-nonbinding-resolution', 'hand');
    const influenceBefore = state.players.A.diplomats!.influence;

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'use_nonbinding_resolution',
      playerId: 'A',
      cardInstanceId: nonbinding,
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_terms_card_choice',
      playerId: 'B',
      choice: 'ratify',
    });

    expect(state.players.A.diplomats?.ratifiedProposals).toContain('de-escalation');
    expect(state.players.A.diplomats?.influence).toBe(influenceBefore + 1);
    expect(state.players.A.zones.discardPile).toContain(nonbinding);
  });

  test('Nonbinding Resolution refused discards and draws before Gambits', () => {
    let state = activeBattle();
    const nonbinding = relocateCard(state, 'A', 'diplomats-nonbinding-resolution', 'hand');
    const handBefore = state.players.A.zones.hand.length;

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'use_nonbinding_resolution',
      playerId: 'A',
      cardInstanceId: nonbinding,
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'refuse',
    });

    expect(state.players.A.zones.discardPile).toContain(nonbinding);
    // Nonbinding replaces the set-aside card with one draw, while the refused
    // De-escalation Proposal independently grants the Diplomat another card.
    expect(state.players.A.zones.hand.length).toBe(handBefore + 1);
    expect(state.battleRuntime?.terms.stage).toBe('refused');
  });

  test('refused Gunboat Diplomacy becomes a face-up additional Gambit and still allows a normal Gambit', () => {
    let state = activeBattle();
    const gunboat = relocateCard(state, 'A', 'diplomats-gunboat-diplomacy', 'hand');

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'use_gunboat_diplomacy',
      playerId: 'A',
      cardInstanceId: gunboat,
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'refuse',
    });

    expect(state.battleRuntime?.participants.A.additionalGambits).toEqual([
      expect.objectContaining({
        instanceId: gunboat,
        owner: 'A',
        role: 'gambit',
        faceUp: true,
      }),
    ]);

    state = proceedToGambitReveal(state);
    expect(state.battleRuntime?.participants.A.gambit).toBeNull();
    expect(state.battleRuntime?.participants.A.additionalGambits).toHaveLength(1);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(2);
  });

  test('accepted Gunboat Diplomacy goes to Discard and creates no battle commitment', () => {
    let state = activeBattle();
    const gunboat = relocateCard(state, 'A', 'diplomats-gunboat-diplomacy', 'hand');

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'use_gunboat_diplomacy',
      playerId: 'A',
      cardInstanceId: gunboat,
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });

    expect(state.battle).toBeNull();
    expect(state.players.A.zones.discardPile).toContain(gunboat);
  });
});
