import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { V070_SUBVERSION_ASSET_TEXT } from './subversion-asset';

function readyGame(
  aStarter = 'military-general-forward-doctrine',
  bStarter = 'military-commandant-holdfast',
): V070GameState {
  let state = createV070StarterGame({
    gameId: 'subversion-asset-battle-test',
    seed: 'subversion-asset-battle-seed',
    players: {
      A: { name: 'Alpha', starterDeckId: aStarter },
      B: { name: 'Bravo', starterDeckId: bStarter },
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
  return reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });
}

function activeBattle(
  controller: 'A' | 'B',
  aStarter?: string,
  bStarter?: string,
): V070GameState {
  let state = readyGame(aStarter, bStarter);
  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = controller;

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
  zone: 'hand' | 'assetBank',
): string {
  const instanceId = `subversion-asset-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function resolveDefenderWin(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
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
    values: [1],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [6],
  });
}

function refuseTermsAndLose(state: V070GameState): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'offer_terms',
    playerId: 'A',
    proposalId: 'open-channels',
  });
  state = reduceV070BattleAction(state, {
    type: 'respond_to_terms',
    playerId: 'B',
    response: 'refuse',
  });
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
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
    type: 'use_leverage',
    playerId: 'A',
    bonus: 0,
  });
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [1],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [6],
  });
}

describe('v0.7.0 Subversion reactive Asset during battle', () => {
  test('locks the released Asset text', () => {
    const card = v070CanonicalContent.cardsById.get('intelligence-subversion');
    expect(card?.effects).toContainEqual({
      label: 'Asset',
      text: V070_SUBVERSION_ASSET_TEXT,
    });
  });

  test('pauses Foothold before its effect and passing resumes the exact deferred Asset use', () => {
    let state = activeBattle('A');
    const subversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'pass-subversion',
      'assetBank',
    );
    const foothold = inject(
      state,
      'B',
      'neutral-foothold',
      'pass-foothold',
      'assetBank',
    );

    state = resolveDefenderWin(state);
    expect(state.battleRuntime?.footholdAssetWindowPlayer).toBe('B');
    const handBefore = state.players.B.zones.hand.length;

    state = reduceV070BattleAction(state, {
      type: 'use_foothold_asset',
      playerId: 'B',
      assetInstanceId: foothold,
    });

    expect(state.battleRuntime?.pendingSubversionAssetBattle)
      .toEqual(expect.objectContaining({
        playerId: 'A',
        targetOwner: 'B',
        targetAssetInstanceId: foothold,
        effectLabel: 'Foothold',
      }));
    expect(state.players.B.zones.assetBank).toContain(foothold);
    expect(state.players.B.zones.hand).toHaveLength(handBefore);

    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'pass',
    });

    expect(state.players.A.zones.assetBank).toContain(subversion);
    expect(state.players.B.zones.assetBank).not.toContain(foothold);
    expect(state.players.B.zones.discardPile).toContain(foothold);
    expect(state.players.B.zones.hand).toHaveLength(handBefore + 2);
    expect(state.battle).toBeNull();
  });

  test('using Subversion negates Foothold, graves exactly the chosen Subversion, discards Foothold, and resumes Aftermath', () => {
    let state = activeBattle('A');
    const firstSubversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'use-first',
      'assetBank',
    );
    const secondSubversion = inject(
      state,
      'A',
      'intelligence-subversion',
      'use-second',
      'assetBank',
    );
    const foothold = inject(
      state,
      'B',
      'neutral-foothold',
      'negated',
      'assetBank',
    );

    state = resolveDefenderWin(state);
    const handBefore = state.players.B.zones.hand.length;
    state = reduceV070BattleAction(state, {
      type: 'use_foothold_asset',
      playerId: 'B',
      assetInstanceId: foothold,
    });

    expect(state.battleRuntime?.pendingSubversionAssetBattle
      ?.candidateSubversionInstanceIds)
      .toEqual([firstSubversion, secondSubversion]);

    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'A',
      choice: 'use',
      subversionInstanceId: secondSubversion,
    });

    expect(state.players.A.zones.graveyard).toContain(secondSubversion);
    expect(state.players.A.zones.assetBank).toContain(firstSubversion);
    expect(state.players.A.zones.assetBank).not.toContain(secondSubversion);
    expect(state.players.B.zones.assetBank).not.toContain(foothold);
    expect(state.players.B.zones.discardPile).toContain(foothold);
    expect(state.players.B.zones.hand).toHaveLength(handBefore);
    expect(state.battle).toBeNull();
    expect(state.events.some(event =>
      event.type === 'subversion_asset_used'
      && (event.payload as { targetAssetInstanceId?: string })
        .targetAssetInstanceId === foothold
    )).toBe(true);
  });

  test('negating Safe Conduct applies the original loss instead of leaving the loss-replacement stage stuck', () => {
    let state = activeBattle(
      'B',
      'diplomats-ambassador-open-channels',
      'military-commandant-holdfast',
    );
    const safeConduct = inject(
      state,
      'A',
      'diplomats-safe-conduct',
      'safe-conduct',
      'assetBank',
    );
    const subversion = inject(
      state,
      'B',
      'intelligence-subversion',
      'safe-conduct-counter',
      'assetBank',
    );

    state = refuseTermsAndLose(state);
    expect(state.battleRuntime?.stage).toBe('loss_replacement');
    expect(state.players.A.diplomats?.influence).toBe(0);

    state = reduceV070BattleAction(state, {
      type: 'use_safe_conduct',
      playerId: 'A',
      cardInstanceId: safeConduct,
    });
    expect(state.battleRuntime?.pendingSubversionAssetBattle?.playerId).toBe('B');
    expect(state.battleRuntime?.stage).toBe('loss_replacement');

    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'B',
      choice: 'use',
      subversionInstanceId: subversion,
    });

    expect(state.players.B.zones.graveyard).toContain(subversion);
    expect(state.players.A.zones.discardPile).toContain(safeConduct);
    expect(state.players.A.diplomats?.influence).toBe(0);
    expect(state.battle).toEqual(expect.objectContaining({
      winner: 'B',
      loser: 'A',
      stage: 'resolved',
    }));
    expect(state.battleRuntime?.stage).toBe('aftermath');
    expect(state.battleRuntime?.pendingSubversionAssetBattle).toBeNull();
  });

  test('Good Faith pauses before discard/draw, then resolves normally if Subversion is declined', () => {
    let state = activeBattle(
      'B',
      'diplomats-ambassador-open-channels',
      'military-commandant-holdfast',
    );
    const goodFaith = inject(
      state,
      'A',
      'diplomats-good-faith',
      'good-faith',
      'assetBank',
    );
    inject(
      state,
      'B',
      'intelligence-subversion',
      'good-faith-counter',
      'assetBank',
    );

    state = reduceV070BattleAction(state, {
      type: 'offer_terms',
      playerId: 'A',
      proposalId: 'open-channels',
    });
    const handBefore = state.players.A.zones.hand.length;

    state = reduceV070BattleAction(state, {
      type: 'use_good_faith',
      playerId: 'A',
      cardInstanceId: goodFaith,
    });

    expect(state.players.A.zones.assetBank).toContain(goodFaith);
    expect(state.players.A.zones.hand).toHaveLength(handBefore);
    expect(state.battleRuntime?.pendingSubversionAssetBattle?.effectLabel)
      .toBe('Good Faith');

    state = reduceV070BattleAction(state, {
      type: 'resolve_subversion_asset',
      playerId: 'B',
      choice: 'pass',
    });

    expect(state.players.A.zones.assetBank).not.toContain(goodFaith);
    expect(state.players.A.zones.discardPile).toContain(goodFaith);
    expect(state.players.A.zones.hand).toHaveLength(handBefore + 1);
    expect(state.battleRuntime?.terms.termsCardChoice)
      .toEqual(expect.objectContaining({
        kind: 'good_faith_set_aside',
        playerId: 'A',
      }));
  });

  test('while a Subversion interrupt is pending, unrelated battle actions are blocked', () => {
    let state = activeBattle('A');
    const foothold = inject(
      state,
      'B',
      'neutral-foothold',
      'blocked-window',
      'assetBank',
    );
    inject(
      state,
      'A',
      'intelligence-subversion',
      'blocker',
      'assetBank',
    );

    state = resolveDefenderWin(state);
    state = reduceV070BattleAction(state, {
      type: 'use_foothold_asset',
      playerId: 'B',
      assetInstanceId: foothold,
    });

    expect(() => reduceV070BattleAction(state, {
      type: 'pass_foothold_asset',
      playerId: 'B',
    })).toThrow(/pending Subversion Asset opportunity/);
  });
});
