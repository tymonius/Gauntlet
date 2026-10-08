import { describe, expect, test } from 'vitest';
import { currentCanonicalContent } from '../content/current-game';
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
  pendingV070BattleRevealChoice,
} from './battle-reveal-choices';
import {
  V070_PLENIPOTENTIARY_BATTLE_TEXT,
  V070_PLENIPOTENTIARY_ID,
  resolveV070PlenipotentiaryAftermathEffect,
} from './plenipotentiary-battle';

function activeBattle(
  opponentDeckId = 'military-commandant-holdfast',
): V070GameState {
  let state = createV070StarterGame({
    gameId: 'plenipotentiary-battle',
    seed: 'plenipotentiary-battle-seed',
    players: {
      A: {
        name: 'Diplomat',
        starterDeckId: 'diplomats-ambassador-open-channels',
      },
      B: {
        name: 'Opponent',
        starterDeckId: opponentDeckId,
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
    space.controller = space.position <= 2 ? 'A' : 'B';
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

function refuseDeEscalation(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'offer_terms',
    playerId: 'A',
    proposalId: 'de-escalation',
  });
  return reduceV070BattleAction(state, {
    type: 'respond_to_terms',
    playerId: 'B',
    response: 'refuse',
  });
}

function injectHandCard(
  state: V070GameState,
  cardId: string,
  suffix: string,
  owner: 'A' | 'B' = 'A',
): string {
  const instanceId = `plenipotentiary-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

function revealPlenipotentiary(
  state: V070GameState,
): { state: V070GameState; source: string } {
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
  const source = injectHandCard(
    state,
    V070_PLENIPOTENTIARY_ID,
    'source',
  );
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: source,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
  return { state, source };
}

function chooseNoTactics(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
}

function resolveBattle(
  state: V070GameState,
  winner: 'A' | 'B',
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'use_leverage',
    playerId: 'A',
    bonus: 0,
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [winner === 'A' ? 6 : 1],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [winner === 'B' ? 6 : 1],
  });
}

describe('Plenipotentiary battle effect', () => {
  test('binds exact frozen/current authority and registers the Gambit', () => {
    expect(V070_PLENIPOTENTIARY_BATTLE_TEXT).toBe(
      'If this battle follows refused Terms, apply the Refused effect of one other ratified Proposal whose requirement is met.',
    );
    for (const content of [
      v070CanonicalContent,
      currentCanonicalContent,
    ]) {
      const card = content.cardsById.get(V070_PLENIPOTENTIARY_ID);
      expect(card?.effects.find(
        effect => effect.label === 'Gambit',
      )?.text).toBe(V070_PLENIPOTENTIARY_BATTLE_TEXT);
    }
    expect(v070BattleEffectHandler(
      V070_PLENIPOTENTIARY_ID,
    )?.expectedText).toBe(V070_PLENIPOTENTIARY_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_PLENIPOTENTIARY_ID);
  });

  test('copies Open Channels and adds the Reserve card after Reserve already exists', () => {
    let state = activeBattle();
    state.players.A.diplomats!.ratifiedProposals = ['open-channels'];
    state = refuseDeEscalation(state);
    const revealed = revealPlenipotentiary(state);
    state = revealed.state;

    const pending = pendingV070BattleRevealChoice(state);
    expect(pending).toEqual(expect.objectContaining({
      kind: 'plenipotentiary',
      owner: 'A',
      sourceInstanceId: revealed.source,
      candidateProposalIds: expect.arrayContaining(['open-channels']),
    }));
    const reserveBefore =
      state.battleRuntime!.participants.A.reserve.length;

    state = reduceV070BattleAction(state, {
      type: 'resolve_plenipotentiary_battle',
      playerId: 'A',
      proposalId: 'open-channels',
    });

    expect(
      state.battleRuntime!.participants.A.reserve.length,
    ).toBe(reserveBefore + 1);
    expect(
      state.battleRuntime!.participants.A.reserveBonus,
    ).toBe(0);
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.events.some(event =>
      event.type === 'hand_revealed'
      && event.visibility === 'A'
    )).toBe(true);
  });

  test('also applies after the opponent\'s Terms are refused in a Diplomat mirror', () => {
    let state = activeBattle(
      'diplomats-senator-procedure-endures',
    );
    state.players.A.diplomats!.ratifiedProposals = ['open-channels'];

    state = reduceV070BattleAction(state, {
      type: 'pass_terms',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'B',
      proposalId: 'de-escalation',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'A',
      response: 'refuse',
    });

    const revealed = revealPlenipotentiary(state);
    state = revealed.state;
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'plenipotentiary',
        owner: 'A',
        candidateProposalIds: expect.arrayContaining([
          'open-channels',
        ]),
      }),
    );

    const reserveBefore =
      state.battleRuntime!.participants.A.reserve.length;
    state = reduceV070BattleAction(state, {
      type: 'resolve_plenipotentiary_battle',
      playerId: 'A',
      proposalId: 'open-channels',
    });
    expect(
      state.battleRuntime!.participants.A.reserve.length,
    ).toBe(reserveBefore + 1);
  });

  test('resolves copied Capitulation on loss before Senator Political Capital', () => {
    let state = activeBattle(
      'diplomats-senator-procedure-endures',
    );
    state.players.B.diplomats!.ratifiedProposals = ['capitulation'];

    state = reduceV070BattleAction(state, {
      type: 'pass_terms',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'B',
      proposalId: 'open-channels',
    });
    state = reduceV070BattleAction(state, {
      type: 'respond_to_terms',
      playerId: 'A',
      response: 'refuse',
    });
    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });

    const source = injectHandCard(
      state,
      V070_PLENIPOTENTIARY_ID,
      'capitulation-source',
      'B',
    );
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: source,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'plenipotentiary',
        owner: 'B',
        candidateProposalIds: expect.arrayContaining([
          'capitulation',
        ]),
      }),
    );

    state = reduceV070BattleAction(state, {
      type: 'resolve_plenipotentiary_battle',
      playerId: 'B',
      proposalId: 'capitulation',
    });
    state = chooseNoTactics(state);
    state = reduceV070BattleAction(state, {
      type: 'use_leverage',
      playerId: 'B',
      bonus: 0,
    });
    const handBeforeOutcome = state.players.B.zones.hand.length;
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });

    expect(state.battle?.loser).toBe('B');
    expect(state.players.B.zones.hand.length)
      .toBe(handBeforeOutcome + 2);
    expect(state.battleRuntime?.terms.stage)
      .toBe('political_capital');
    expect(state.battleRuntime?.terms.politicalCapitalPending)
      .toBe(true);
  });

  test('does not let Plenipotentiary reuse the Proposal whose Terms were refused', () => {
    let state = activeBattle();
    state.players.A.diplomats!.ratifiedProposals = ['de-escalation'];
    state = refuseDeEscalation(state);
    const revealed = revealPlenipotentiary(state);
    state = revealed.state;

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.events.some(event =>
      event.type === 'plenipotentiary_battle_unavailable'
      && (event.payload as { sourceInstanceId?: string } | undefined)
        ?.sourceInstanceId === revealed.source
    )).toBe(true);
  });

  test('preserves final-territory victory when copied Diplomatic Recognition captures the last Territory', () => {
    let state = activeBattle();
    state = refuseDeEscalation(state);
    const source = injectHandCard(
      state,
      V070_PLENIPOTENTIARY_ID,
      'recognition-source',
      'B',
    );
    const contestedPosition = state.battle!.contestedPosition;
    const contested = state.board.find(
      territory => territory.position === contestedPosition,
    )!;

    state.board.forEach(territory => {
      territory.controller = 'B';
      territory.occupant = null;
    });
    contested.controller = 'A';
    contested.occupant = 'B';
    state.players.B.position = contestedPosition;
    state.battle!.positions.B = contestedPosition;
    state.battle!.winner = 'B';
    state.battle!.loser = 'A';
    state.battleRuntime!.stage = 'aftermath';
    state.battleRuntime!.plenipotentiaryAftermathEffects = [{
      owner: 'B',
      sourceInstanceId: source,
      proposalId: 'diplomatic-recognition',
    }];

    resolveV070PlenipotentiaryAftermathEffect(
      state,
      'B',
      source,
    );

    expect(contested.controller).toBe('B');
    expect(state.battleRuntime?.pendingGameVictory).toEqual({
      winner: 'B',
      route: 'final_territory_capture',
    });
  });

  test('carries Rebuilding Pact into shared Aftermath timing and banks the chosen Asset', () => {
    let state = activeBattle();
    state.players.A.diplomats!.ratifiedProposals = ['rebuilding-pact'];
    state = refuseDeEscalation(state);

    state = reduceV070BattleAction(state, {
      type: 'proceed_from_onset',
      playerId: 'A',
    });
    const source = injectHandCard(
      state,
      V070_PLENIPOTENTIARY_ID,
      'rebuilding-source',
    );
    const asset = injectHandCard(
      state,
      'diplomats-detente',
      'rebuilding-asset',
    );
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: source,
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
      type: 'resolve_plenipotentiary_battle',
      playerId: 'A',
      proposalId: 'rebuilding-pact',
    });
    state = chooseNoTactics(state);
    state = resolveBattle(state, 'A');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(
      state.battleRuntime?.pendingBattleAftermathControlledEffectChoice,
    ).toEqual(expect.objectContaining({
      playerId: 'A',
      candidateSourceInstanceIds: expect.arrayContaining([source]),
    }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_aftermath_controlled_effect',
      playerId: 'A',
      sourceInstanceId: source,
      targetInstanceId: asset,
    });

    expect(state.players.A.zones.assetBank).toContain(asset);
    expect(state.players.A.zones.hand).not.toContain(asset);
    expect(state.battle).toBeNull();
  });
});
