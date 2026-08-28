import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
  type V070PlayerZones,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';

const ambassadorStarter = 'diplomats-ambassador-open-channels';
const senatorStarter = 'diplomats-senator-procedure-endures';
const militaryStarter = 'military-commandant-holdfast';

function activeBattle(diplomatStarterId = ambassadorStarter): V070GameState {
  let state = createV070StarterGame({
    gameId: `terms-cards-${diplomatStarterId}`,
    seed: `terms-cards-seed-${diplomatStarterId}`,
    players: {
      A: { name: 'Diplomat', starterDeckId: diplomatStarterId },
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

describe('v0.7.0 Diplomat Terms cards — first integration tranche', () => {
  test('Diplomatic Latitude offers two same-Stake Proposals and the accepting opponent selects the one that applies', () => {
    let state = activeBattle();
    const latitude = relocateCard(state, 'A', 'diplomats-diplomatic-latitude', 'hand');
    const aDiscard = state.players.A.zones.hand.find(id => id !== latitude)!;
    const bDiscard = state.players.B.zones.hand[0];

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'open-channels',
    });
    state = reduceV070BattleAction(state, {
      type: 'use_diplomatic_latitude',
      playerId: 'A',
      cardInstanceId: latitude,
      secondProposalId: 'mutual-disarmament',
    });

    expect(state.battleRuntime?.terms.offeredProposalIds).toEqual([
      'open-channels',
      'mutual-disarmament',
    ]);
    expect(state.players.A.zones.hand).toContain(latitude);

    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });
    expect(state.battleRuntime?.terms.proposalChoice?.kind).toBe('diplomatic_latitude_accepted');
    expect(state.battleRuntime?.terms.proposalChoice?.playerId).toBe('B');

    state = reduceV070BattleAction(state, {
      type: 'resolve_proposal_choice',
      playerId: 'B',
      proposalId: 'mutual-disarmament',
    });
    expect(state.battleRuntime?.terms.proposalId).toBe('mutual-disarmament');

    state = reduceV070BattleAction(state, {
      type: 'resolve_proposal_choice',
      playerId: 'A',
      cardInstanceId: aDiscard,
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_proposal_choice',
      playerId: 'B',
      cardInstanceId: bDiscard,
    });

    expect(state.battle).toBeNull();
    expect(state.players.A.diplomats?.ratifiedProposals).toContain('mutual-disarmament');
    expect(state.players.A.diplomats?.ratifiedProposals).not.toContain('open-channels');
    expect(state.players.A.zones.hand).toContain(latitude);
  });

  test('Diplomatic Latitude refusal lets the Diplomat select the sole Refused/imposable Proposal and then discards Latitude', () => {
    let state = activeBattle();
    const latitude = relocateCard(state, 'A', 'diplomats-diplomatic-latitude', 'hand');

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'open-channels',
    });
    state = reduceV070BattleAction(state, {
      type: 'use_diplomatic_latitude',
      playerId: 'A',
      cardInstanceId: latitude,
      secondProposalId: 'mutual-disarmament',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'refuse',
    });

    expect(state.battleRuntime?.terms.proposalChoice).toEqual(expect.objectContaining({
      kind: 'diplomatic_latitude_refused',
      playerId: 'A',
    }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_proposal_choice',
      playerId: 'A',
      proposalId: 'open-channels',
    });

    expect(state.battleRuntime?.terms.stage).toBe('refused');
    expect(state.battleRuntime?.terms.proposalId).toBe('open-channels');
    expect(state.battleRuntime?.participants.A.reserveBonus).toBe(1);
    expect(state.players.A.zones.hand).not.toContain(latitude);
    expect(state.players.A.zones.discardPile).toContain(latitude);
  });

  test('Détente rewards acceptance only when the selected Proposal was already ratified when offered', () => {
    let state = activeBattle();
    const detente = relocateCard(state, 'A', 'diplomats-detente', 'assetBank');
    state.players.A.diplomats!.ratifiedProposals = ['de-escalation'];

    const influenceBefore = state.players.A.diplomats!.influence;
    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });

    expect(state.players.A.zones.assetBank).toContain(detente);
    expect(state.players.A.diplomats?.influence).toBe(influenceBefore + 1);
    expect(state.players.A.diplomats?.detenteUsedTurn).toBe(state.turnNumber);
    expect(state.events.some(event => event.type === 'detente_triggered')).toBe(true);
  });

  test('Détente does not reward a Proposal that becomes ratified during the accepted Terms', () => {
    let state = activeBattle();
    relocateCard(state, 'A', 'diplomats-detente', 'assetBank');

    const influenceBefore = state.players.A.diplomats!.influence;
    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });

    expect(state.players.A.diplomats?.influence).toBe(influenceBefore + 1);
    expect(state.players.A.diplomats?.detenteUsedTurn).toBeNull();
    expect(state.events.some(event => event.type === 'detente_triggered')).toBe(false);
  });

  test('Plenipotentiary ratifies an unratified refused Proposal for the resulting Treaty-Article count with no reward', () => {
    let state = activeBattle(senatorStarter);
    const plenipotentiary = relocateCard(state, 'A', 'diplomats-plenipotentiary', 'assetBank');
    state.players.A.diplomats!.ratifiedProposals = ['de-escalation'];
    state.players.A.diplomats!.influence = 3;

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'mutual-disarmament',
    });
    expect(state.players.A.diplomats?.influence).toBe(2);

    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'refuse',
    });
    expect(state.battleRuntime?.terms.response).toBe('refused');

    state = reduceV070BattleAction(state, {
      type: 'use_plenipotentiary',
      playerId: 'A',
      cardInstanceId: plenipotentiary,
    });

    expect(state.players.A.diplomats?.ratifiedProposals).toEqual([
      'de-escalation',
      'mutual-disarmament',
    ]);
    expect(state.players.A.diplomats?.influence).toBe(0);
    expect(state.players.A.zones.assetBank).not.toContain(plenipotentiary);
    expect(state.players.A.zones.graveyard).toContain(plenipotentiary);
    expect(state.events.some(event =>
      event.type === 'proposal_ratified'
      && (event.payload as { source?: string })?.source === 'plenipotentiary'
    )).toBe(true);

    // The Proposal's Refused effect still remains live and must resolve.
    expect(state.battleRuntime?.terms.proposalChoice?.kind).toBe('mutual_disarmament_refused');
  });
});
