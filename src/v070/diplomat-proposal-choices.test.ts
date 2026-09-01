import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
  type V070PlayerZones,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { bankableV070AssetInstanceIds } from './assets';
import {
  eligibleV070Proposals,
} from './diplomats';
import { refreshV070ControlledTerritories } from './front-line';
import type { PlayerId } from './rules';

const diplomatStarter = 'diplomats-ambassador-open-channels';
const senatorStarter = 'diplomats-senator-procedure-endures';
const militaryStarter = 'military-commandant-holdfast';

function setupGame(
  diplomatStarterId = diplomatStarter,
  firstPlayer: PlayerId = 'A',
): V070GameState {
  let state = createV070StarterGame({
    gameId: `proposal-choice-${diplomatStarterId}-${firstPlayer}`,
    seed: `proposal-choice-seed-${diplomatStarterId}-${firstPlayer}`,
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

  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'A',
    value: firstPlayer === 'A' ? 6 : 1,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: firstPlayer === 'B' ? 6 : 1,
  });
  return state;
}

function startAttackingDiplomatBattle(
  diplomatStarterId = diplomatStarter,
): V070GameState {
  let state = setupGame(diplomatStarterId, 'A');
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => { space.occupant = null; });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].blank = true;

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
  return reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
}

function startDiplomatDefendingCounterattack(
  finalTerritory = false,
): V070GameState {
  let state = setupGame(diplomatStarter, 'B');

  if (finalTerritory) {
    for (const territory of state.board) {
      territory.controller = territory.position <= 4 ? 'A' : 'B';
      territory.occupant = null;
    }
    // A occupies B's final Territory while B is beyond its own end.
    // B may Advance back into the Gauntlet and initiate a Counterattack from
    // that legal off-board Position.
    state.players.A.position = 5;
    state.players.B.position = 6;
    state.board[5].occupant = 'A';
    state.board[5].blank = true;
  } else {
    state.players.A.position = 2;
    state.players.B.position = 3;
    state.board.forEach(space => { space.occupant = null; });
    state.board[2].controller = 'B';
    state.board[2].occupant = 'A';
    state.board[2].blank = true;
    state.board[3].occupant = 'B';
  }
  refreshV070ControlledTerritories(state);

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'B' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'B' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'B' });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'B',
    choice: 'advance',
  });
  state.players.A.diplomats!.influence = 2;
  return state;
}

function proceedToOutcome(state: V070GameState): V070GameState {
  const attacker = state.battle!.attacker;
  const defender = state.battle!.defender;
  state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: attacker });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: attacker });
  state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: defender });
  state = reduceV070BattleAction(state, { type: 'reveal_gambits', playerId: attacker });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: attacker });
  state = reduceV070BattleAction(state, { type: 'choose_tactic', playerId: defender });
  state = reduceV070BattleAction(state, { type: 'reveal_tactics', playerId: attacker });
  return state;
}

function relocateCard(
  state: V070GameState,
  playerId: PlayerId,
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

describe('v0.7.0 choice-bearing Diplomat Proposals', () => {
  test('Mutual Disarmament accepted requires one Hand discard from each player before draw and withdrawal', () => {
    let state = startAttackingDiplomatBattle();
    const aDiscard = state.players.A.zones.hand[0];
    const bDiscard = state.players.B.zones.hand[0];
    const bHandBefore = state.players.B.zones.hand.length;

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'mutual-disarmament',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });

    expect(state.battleRuntime?.terms.proposalChoice).toEqual(expect.objectContaining({
      kind: 'mutual_disarmament_accepted',
      playerId: 'A',
      optional: false,
    }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_proposal_choice',
      playerId: 'A',
      cardInstanceId: aDiscard,
    });
    expect(state.battleRuntime?.terms.proposalChoice?.playerId).toBe('B');

    state = reduceV070BattleAction(state, {
      type: 'resolve_proposal_choice',
      playerId: 'B',
      cardInstanceId: bDiscard,
    });

    expect(state.battle).toBeNull();
    expect(state.players.A.zones.discardPile).toContain(aDiscard);
    expect(state.players.B.zones.discardPile).toContain(bDiscard);
    expect(state.players.B.zones.hand.length).toBe(bHandBefore);
    expect(state.players.A.diplomats?.ratifiedProposals).toContain('mutual-disarmament');
    expect(state.players.A.diplomats?.influence).toBe(2);
  });

  test('Mutual Disarmament refused may trade one Hand card for +1 Reserve', () => {
    let state = startAttackingDiplomatBattle();
    const discarded = state.players.A.zones.hand[0];

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'mutual-disarmament',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'refuse',
    });

    expect(state.battleRuntime?.terms.stage).toBe('proposal_choice');
    state = reduceV070BattleAction(state, {
      type: 'resolve_proposal_choice',
      playerId: 'A',
      cardInstanceId: discarded,
    });
    expect(state.battleRuntime?.terms.stage).toBe('refused');
    expect(state.battleRuntime?.participants.A.reserveBonus).toBe(1);

    state = reduceV070BattleAction(state, { type: 'proceed_from_onset', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'A' });
    state = reduceV070BattleAction(state, { type: 'set_gambit', playerId: 'B' });
    expect(state.battleRuntime?.participants.A.reserve).toHaveLength(4);
  });

  test('Prisoner Exchange accepted gives each player an independent optional Graveyard recycle', () => {
    let state = startAttackingDiplomatBattle();
    const aGrave = relocateCard(state, 'A', 'neutral-new-recruits', 'graveyard');
    const bAny = state.players.B.zones.hand[0];
    state.players.B.zones.hand.splice(0, 1);
    state.players.B.zones.graveyard.push(bAny);

    expect(eligibleV070Proposals(state, 'A')).toContain('prisoner-exchange');

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'prisoner-exchange',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_proposal_choice',
      playerId: 'A',
      cardInstanceId: aGrave,
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_proposal_choice',
      playerId: 'B',
    });

    expect(state.battle).toBeNull();
    expect(state.players.A.zones.graveyard).not.toContain(aGrave);
    expect(state.players.A.zones.discardPile).toContain(aGrave);
    expect(state.players.B.zones.graveyard).toContain(bAny);
    expect(state.players.A.diplomats?.ratifiedProposals).toContain('prisoner-exchange');
  });

  test('Prisoner Exchange refused-loss choice follows Senator Political Capital and may recycle the recovered card', () => {
    let state = startAttackingDiplomatBattle(senatorStarter);
    const aExistingGrave = relocateCard(state, 'A', 'neutral-new-recruits', 'graveyard');
    const bGrave = state.players.B.zones.hand[0];
    state.players.B.zones.hand.splice(0, 1);
    state.players.B.zones.graveyard.push(bGrave);

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'prisoner-exchange',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'refuse',
    });
    state = proceedToOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'use_leverage',
      playerId: 'A',
      bonus: 0,
    });
    const politicalCapitalCard = state.players.A.zones.hand[0];

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [6],
    });

    expect(state.battleRuntime?.terms.stage).toBe('political_capital');
    expect(state.battleRuntime?.terms.deferredAfterPoliticalCapital).toBe('prisoner_exchange_refused');

    state = reduceV070BattleAction(state, {
      type: 'resolve_political_capital',
      playerId: 'A',
      cardInstanceIds: [politicalCapitalCard],
    });

    expect(state.battleRuntime?.terms.proposalChoice).toEqual(expect.objectContaining({
      kind: 'prisoner_exchange_refused',
      playerId: 'A',
    }));
    expect(state.players.A.zones.graveyard).toContain(politicalCapitalCard);
    expect(state.players.A.zones.graveyard).toContain(aExistingGrave);

    state = reduceV070BattleAction(state, {
      type: 'resolve_proposal_choice',
      playerId: 'A',
      cardInstanceId: politicalCapitalCard,
    });
    expect(state.players.A.zones.graveyard).not.toContain(politicalCapitalCard);
    expect(state.players.A.zones.discardPile).toContain(politicalCapitalCard);
    expect(state.battleRuntime?.terms.stage).toBe('closed');
  });

  test('Rebuilding Pact accepted banks Assets and honors normal Asset-limit replacement', () => {
    let state = startAttackingDiplomatBattle();
    const oldAsset = relocateCard(state, 'A', 'neutral-counterintelligence', 'assetBank');
    relocateCard(state, 'A', 'neutral-reinforcements', 'assetBank');
    relocateCard(state, 'A', 'neutral-stand-ground', 'assetBank');
    const newAsset = relocateCard(state, 'A', 'neutral-supplies', 'hand');

    expect(state.players.A.zones.assetBank).toHaveLength(state.players.A.controlledTerritories.length);
    expect(bankableV070AssetInstanceIds(state, 'A')).toContain(newAsset);
    expect(eligibleV070Proposals(state, 'A')).toContain('rebuilding-pact');

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'rebuilding-pact',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_proposal_choice',
      playerId: 'A',
      cardInstanceId: newAsset,
      replaceAssetInstanceId: oldAsset,
    });
    state = reduceV070BattleAction(state, {
      type: 'resolve_proposal_choice',
      playerId: 'B',
    });

    expect(state.battle).toBeNull();
    expect(state.players.A.zones.assetBank).toContain(newAsset);
    expect(state.players.A.zones.assetBank).not.toContain(oldAsset);
    expect(state.players.A.zones.discardPile).toContain(oldAsset);
    expect(state.players.A.diplomats?.ratifiedProposals).toContain('rebuilding-pact');
  });

  test('Rebuilding Pact refused creates its optional banking window in the Aftermath', () => {
    let state = startAttackingDiplomatBattle();
    const asset = relocateCard(state, 'A', 'neutral-counterintelligence', 'hand');

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'rebuilding-pact',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'refuse',
    });
    state = proceedToOutcome(state);
    state = reduceV070BattleAction(state, { type: 'use_leverage', playerId: 'A', bonus: 0 });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [6],
    });

    expect(state.battleRuntime?.terms.proposalChoice?.kind).toBe('rebuilding_pact_refused');
    state = reduceV070BattleAction(state, {
      type: 'resolve_proposal_choice',
      playerId: 'A',
      cardInstanceId: asset,
    });
    expect(state.players.A.zones.assetBank).toContain(asset);
    expect(state.players.A.diplomats?.ratifiedProposals).not.toContain('rebuilding-pact');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.battle).toBeNull();
  });

  test('Diplomatic Recognition is eligible only while the Diplomat defends a Counterattack', () => {
    let attack = startAttackingDiplomatBattle();
    attack.players.A.diplomats!.influence = 2;
    expect(eligibleV070Proposals(attack, 'A')).not.toContain('diplomatic-recognition');

    const defense = startDiplomatDefendingCounterattack();
    expect(defense.battle?.attacker).toBe('B');
    expect(defense.battle?.defender).toBe('A');
    expect(eligibleV070Proposals(defense, 'A')).toContain('diplomatic-recognition');
  });

  test('Diplomatic Recognition accepted advances the Front Line, withdraws the accepting attacker, and draws two', () => {
    let state = startDiplomatDefendingCounterattack();
    const bHandBefore = state.players.B.zones.hand.length;

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'diplomatic-recognition',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });

    expect(state.battle).toBeNull();
    expect(state.board[2].controller).toBe('A');
    expect(state.players.B.position).toBe(3);
    expect(state.players.B.zones.hand.length).toBe(bHandBefore + 2);
    expect(state.players.A.diplomats?.ratifiedProposals).toContain('diplomatic-recognition');
    expect(state.players.A.diplomats?.influence).toBe(3);
  });

  test('Diplomatic Recognition refused advances the Front Line on a Diplomat win and gives no impose reward', () => {
    let state = startDiplomatDefendingCounterattack();

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'diplomatic-recognition',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'refuse',
    });
    state = proceedToOutcome(state);
    state = reduceV070BattleAction(state, { type: 'use_leverage', playerId: 'A', bonus: 0 });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    });

    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.board[2].controller).toBe('A');
    expect(state.players.A.diplomats?.ratifiedProposals).toContain('diplomatic-recognition');
    expect(state.players.A.diplomats?.influence).toBe(2);
  });

  test('Diplomatic Recognition Front Line advance immediately wins on the opponent final Territory', () => {
    let state = startDiplomatDefendingCounterattack(true);
    const bHandBefore = state.players.B.zones.hand.length;

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'diplomatic-recognition',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'B',
      response: 'accept',
    });

    expect(state.stage).toBe('ended');
    expect(state.winner).toBe('A');
    expect(state.board[5].controller).toBe('A');
    expect(state.battle).toBeNull();
    expect(state.battleRuntime).toBeNull();
    expect(state.players.B.zones.hand.length).toBe(bHandBefore);
    expect(state.events.at(-1)).toEqual(expect.objectContaining({
      type: 'game_won',
      actor: 'A',
      payload: expect.objectContaining({
        route: 'final_territory_capture',
        source: 'diplomatic_recognition',
      }),
    }));
  });
});
