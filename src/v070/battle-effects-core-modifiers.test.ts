import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { retreatV070Position } from './rules';
import { isV070AssetActive } from './asset-face-state';

function startBattle(
  territoryId?: string,
): V070GameState {
  let state = createV070StarterGame({
    gameId: 'core-battle-effects-test',
    seed: `core-battle-effects-${territoryId ?? 'blank'}`,
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'military-general-forward-doctrine',
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
  if (territoryId) {
    state.board[3].territoryId = territoryId;
    state.board[3].blank = false;
  }

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

function injectHandCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `core-effect-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.hand.push(instanceId);
  return instanceId;
}

function injectBankedAsset(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `core-asset-${owner}-${suffix}-${cardId}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones.assetBank.push(instanceId);
  return instanceId;
}

function revealGambits(
  state: V070GameState,
  aCard?: string,
  bCard?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aCard,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: bCard,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

function toOutcome(state: V070GameState): V070GameState {
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

describe('v0.7.0 core battle-effect modifiers', () => {
  test('Sequestration makes both players Assets inactive without removing them from their banks', () => {
    let state = startBattle();
    const sequestration = injectHandCard(
      state,
      'A',
      'neutral-sequestration',
      'sequestration',
    );
    const aAsset = injectBankedAsset(
      state,
      'A',
      'neutral-counterintelligence',
      'a',
    );
    const bAsset = injectBankedAsset(
      state,
      'B',
      'neutral-counterintelligence',
      'b',
    );

    state = revealGambits(state, sequestration);

    expect(new Set(state.battleRuntime?.assetInactivePlayers))
      .toEqual(new Set(['A', 'B']));
    expect(isV070AssetActive(state, aAsset)).toBe(false);
    expect(isV070AssetActive(state, bAsset)).toBe(false);
    expect(state.players.A.zones.assetBank).toContain(aAsset);
    expect(state.players.B.zones.assetBank).toContain(bAsset);
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
  });

  test('Illegal Occupation applies only in a Counterattack and suppresses the opponent Assets when it does', () => {
    let counterattack = startBattle();
    const contested = counterattack.battle!.contestedPosition;
    counterattack.board.find(space => space.position === contested)!.controller = 'A';
    const illegalOccupation = injectHandCard(
      counterattack,
      'A',
      'neutral-illegal-occupation',
      'counterattack',
    );
    const opponentAsset = injectBankedAsset(
      counterattack,
      'B',
      'neutral-counterintelligence',
      'opponent',
    );

    counterattack = revealGambits(
      counterattack,
      illegalOccupation,
    );

    expect(counterattack.battleRuntime?.participants.A.advantage).toBe(1);
    expect(counterattack.battleRuntime?.assetInactivePlayers).toContain('B');
    expect(isV070AssetActive(counterattack, opponentAsset)).toBe(false);

    let ordinary = startBattle();
    const ordinaryIllegalOccupation = injectHandCard(
      ordinary,
      'A',
      'neutral-illegal-occupation',
      'ordinary',
    );
    ordinary = revealGambits(
      ordinary,
      ordinaryIllegalOccupation,
    );

    expect(ordinary.battleRuntime?.participants.A.advantage).toBe(0);
    expect(ordinary.battleRuntime?.assetInactivePlayers).toEqual([]);
    expect(ordinary.battleRuntime?.stage).toBe('choose_tactics');
  });

  test('Tactical Planning adds one card to the live Reserve when Gambits reveal without increasing Tactic limit', () => {
    let state = startBattle();
    const tacticalPlanning = injectHandCard(
      state,
      'A',
      'neutral-tactical-planning',
      'reserve',
    );

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: tacticalPlanning,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });

    expect(state.battleRuntime?.stage).toBe('reveal_gambits');
    const reserveBeforeReveal =
      state.battleRuntime!.participants.A.reserve.length;
    expect(state.battleRuntime?.participants.A.tacticLimit).toBe(1);

    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(state.battleRuntime?.participants.A.reserve.length)
      .toBe(reserveBeforeReveal + 1);
    expect(state.battleRuntime?.participants.A.tacticLimit).toBe(1);
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battleRuntime?.unsupportedEffects).toEqual([]);

    const added = state.events.find(event =>
      event.type === 'battle_reserve_cards_added'
      && (
        event.payload as { sourceCardId?: string } | undefined
      )?.sourceCardId === 'neutral-tactical-planning'
    );
    expect(added).toBeDefined();
    const privateIdentity = state.events.find(event =>
      event.type === 'reserve_identity'
      && event.visibility === 'A'
      && (
        event.payload as { purpose?: string } | undefined
      )?.purpose === 'Tactical Planning'
    );
    expect(privateIdentity).toBeDefined();
  });

  test('Consolidation defers its +1 Card until its attacker wins on an opponent-controlled Territory', () => {
    let state = startBattle();
    const consolidation = injectHandCard(
      state,
      'A',
      'neutral-consolidation',
      'consolidation',
    );

    state = revealGambits(state, consolidation);
    expect(state.battleRuntime?.aftermathDrawEffects).toEqual([
      {
        owner: 'A',
        sourceInstanceId: consolidation,
        sourceCardId: 'neutral-consolidation',
        count: 1,
      },
    ]);

    state = toOutcome(state);
    const handBeforeOutcome = state.players.A.zones.hand.length;
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

    expect(state.battle?.winner).toBe('A');
    expect(state.players.A.zones.hand).toHaveLength(handBeforeOutcome + 1);
    expect(state.battleRuntime?.aftermathDrawEffects).toEqual([]);
    expect(state.events.some(event =>
      event.type === 'battle_card_aftermath_draw'
      && (
        event.payload as { sourceCardId?: string } | undefined
      )?.sourceCardId === 'neutral-consolidation'
    )).toBe(true);
  });

  test('Foothold gains Advantage while defending a Counterattack and defers its win draw until Aftermath', () => {
    let state = startBattle();
    const contested = state.battle!.contestedPosition;
    state.board.find(space => space.position === contested)!.controller = 'A';
    const foothold = injectHandCard(
      state,
      'B',
      'neutral-foothold',
      'foothold',
    );

    state = revealGambits(state, undefined, foothold);
    expect(state.battleRuntime?.participants.B.advantage).toBe(1);
    expect(state.battleRuntime?.aftermathDrawEffects).toEqual([
      {
        owner: 'B',
        sourceInstanceId: foothold,
        sourceCardId: 'neutral-foothold',
        count: 1,
      },
    ]);

    state = toOutcome(state);
    const handBeforeOutcome = state.players.B.zones.hand.length;
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [6, 6],
    });

    expect(state.battle?.winner).toBe('B');
    expect(state.players.B.zones.hand).toHaveLength(handBeforeOutcome + 1);
    expect(state.battleRuntime?.aftermathDrawEffects).toEqual([]);
  });

  test('Conscription adds one live Reserve card and one additional normal Tactic choice at Gambit reveal', () => {
    let state = startBattle();
    const conscription = injectHandCard(
      state,
      'A',
      'neutral-conscription',
      'conscription',
    );

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: conscription,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
    });

    const reserveBeforeReveal =
      state.battleRuntime!.participants.A.reserve.length;
    expect(state.battleRuntime?.participants.A.tacticLimit).toBe(1);

    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(state.battleRuntime?.participants.A.reserve.length)
      .toBe(reserveBeforeReveal + 1);
    expect(state.battleRuntime?.participants.A.tacticLimit).toBe(2);
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battleRuntime?.unsupportedEffects).toEqual([]);

    const [firstA, secondA] =
      state.battleRuntime!.participants.A.reserve;
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: firstA,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: secondA,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });

    expect(state.battleRuntime?.participants.A.additionalTactics)
      .toHaveLength(1);
    expect(state.battleRuntime?.stage).toBe('reveal_tactics');
  });

  test('Disinformation gains Advantage against an opposing Gambit and returns itself to Hand when battle cards clear', () => {
    let state = startBattle();
    const disinformation = injectHandCard(
      state,
      'A',
      'intelligence-disinformation',
      'disinformation',
    );
    const opposingGambit = injectHandCard(
      state,
      'B',
      'neutral-rallying-cry',
      'opposing-gambit',
    );

    state = revealGambits(
      state,
      disinformation,
      opposingGambit,
    );

    expect(state.battleRuntime?.participants.A.advantage).toBe(1);
    expect(
      state.battleRuntime?.battleCardAftermathDestinationOverrides,
    ).toContainEqual({
      sourceCardId: 'intelligence-disinformation',
      playerId: 'A',
      instanceId: disinformation,
      destination: 'hand',
    });

    state = toOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6, 6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.players.A.zones.hand).toContain(disinformation);
    expect(state.players.A.zones.graveyard).not.toContain(disinformation);
    expect(state.players.B.zones.graveyard).toContain(opposingGambit);
  });

  test('Accursed Wager battle text reuses the existing losing-player Aftermath discard queue', () => {
    let state = startBattle();
    const wager = injectHandCard(
      state,
      'A',
      'mystics-accursed-wager',
      'battle-wager',
    );
    const target = state.players.B.zones.hand[0];

    state = revealGambits(state, wager);
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battleRuntime?.unsupportedEffects).toEqual([]);
    expect(state.battleRuntime?.battleAccursedWagerInstanceIds)
      .toEqual([wager]);

    state = toOutcome(state);
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

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.battleRuntime?.pendingAccursedWager).toEqual({
      loser: 'B',
      remainingSourceActionInstanceIds: [wager],
      immediateWinner: null,
    });

    state = reduceV070BattleAction(state, {
      type: 'resolve_accursed_wager_discard',
      playerId: 'B',
      cardInstanceId: target,
    });

    expect(state.players.B.zones.hand).not.toContain(target);
    expect(state.players.B.zones.graveyard).toContain(target);
    expect(state.battleRuntime).toBeNull();
    expect(state.battle).toBeNull();
    expect(state.players.A.zones.graveyard).toContain(wager);
  });

  test('Circle of Bones becomes an Overlay on the contested Territory before battle cards clear', () => {
    let state = startBattle();
    const contestedPosition = state.battle!.contestedPosition;
    const contestedTerritoryInstanceId =
      state.board.find(space => space.position === contestedPosition)!
        .territoryInstanceId;
    const circle = injectHandCard(
      state,
      'A',
      'mystics-circle-of-bones',
      'circle-overlay',
    );

    state = revealGambits(state, circle);
    expect(state.battleRuntime?.unsupportedEffects).toEqual([]);
    expect(state.battleRuntime?.battleCardAftermathOverlayPlacements)
      .toContainEqual({
        owner: 'A',
        sourceInstanceId: circle,
        sourceCardId: 'mystics-circle-of-bones',
        condition: 'always',
      });

    state = toOutcome(state);
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
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.overlays).toContainEqual(
      expect.objectContaining({
        instanceId: circle,
        owner: 'A',
        territoryInstanceId: contestedTerritoryInstanceId,
      }),
    );
    expect(state.players.A.zones.graveyard).not.toContain(circle);
    expect(state.players.A.zones.discardPile).not.toContain(circle);
  });

  test('Battlefield Plunder becomes an Overlay only if its owner wins', () => {
    let winState = startBattle();
    const winPosition = winState.battle!.contestedPosition;
    const plunderWin = injectHandCard(
      winState,
      'A',
      'neutral-battlefield-plunder',
      'plunder-win',
    );

    winState = revealGambits(winState, plunderWin);
    winState = toOutcome(winState);
    winState = reduceV070BattleAction(winState, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    });
    winState = reduceV070BattleAction(winState, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });
    winState = reduceV070BattleAction(winState, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(winState.overlays.some(overlay =>
      overlay.instanceId === plunderWin
      && winState.board.find(space => space.position === winPosition)
        ?.territoryInstanceId === overlay.territoryInstanceId
    )).toBe(true);
    expect(winState.players.A.zones.graveyard).not.toContain(plunderWin);

    let lossState = startBattle();
    const plunderLoss = injectHandCard(
      lossState,
      'A',
      'neutral-battlefield-plunder',
      'plunder-loss',
    );

    lossState = revealGambits(lossState, plunderLoss);
    lossState = toOutcome(lossState);
    lossState = reduceV070BattleAction(lossState, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [1],
    });
    lossState = reduceV070BattleAction(lossState, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [6],
    });
    lossState = reduceV070BattleAction(lossState, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(lossState.overlays.some(overlay =>
      overlay.instanceId === plunderLoss
    )).toBe(false);
    expect(lossState.players.A.zones.graveyard).toContain(plunderLoss);
  });

  test('Pathfinders gains +1 only when the contested Territory has an active printed effect', () => {
    let active = startBattle('territory-high-ground');
    const activePathfinders = injectHandCard(
      active,
      'A',
      'neutral-pathfinders',
      'active',
    );
    active = revealGambits(active, activePathfinders);

    expect(active.battleRuntime?.activePrintedTerritoryAtOnset)
      .toEqual(expect.objectContaining({
        territoryId: 'territory-high-ground',
      }));
    expect(active.battleRuntime?.participants.A.battleModifier).toBe(1);

    let blank = startBattle();
    const blankPathfinders = injectHandCard(
      blank,
      'A',
      'neutral-pathfinders',
      'blank',
    );
    blank = revealGambits(blank, blankPathfinders);

    expect(blank.battleRuntime?.activePrintedTerritoryAtOnset).toBeNull();
    expect(blank.battleRuntime?.participants.A.battleModifier).toBe(0);
  });

  test('Court Martial gives Disadvantage and adds one retreat after the normal retreat if the opponent loses', () => {
    let state = startBattle();
    const courtMartial = injectHandCard(
      state,
      'A',
      'neutral-court-martial',
      'retreat',
    );

    state = revealGambits(state, courtMartial);
    expect(state.battleRuntime?.participants.B.disadvantage).toBe(1);
    expect(state.battleRuntime?.additionalRetreatEffects).toContainEqual({
      sourceInstanceId: courtMartial,
      sourceCardId: 'neutral-court-martial',
      targetPlayer: 'B',
      steps: 1,
    });

    state = toOutcome(state);
    const normalRetreat = retreatV070Position(
      'B',
      3,
      state.board.length,
    );
    const expectedAfterCourtMartial = retreatV070Position(
      'B',
      normalRetreat,
      state.board.length,
    );

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1, 1],
    });

    expect(state.battle?.winner).toBe('A');
    expect(state.battle?.positions.B).toBe(expectedAfterCourtMartial);
    expect(state.events.some(event =>
      event.type === 'battle_card_aftermath_retreat'
      && (event.payload as { sourceCardId?: string }).sourceCardId
        === 'neutral-court-martial'
    )).toBe(true);
  });

  test('Unbroken Ranks grants one extra Command after normal victory Command when no Order was used', () => {
    let state = startBattle();
    const unbrokenRanks = injectHandCard(
      state,
      'A',
      'military-unbroken-ranks',
      'no-order',
    );

    state = revealGambits(state, unbrokenRanks);
    state = toOutcome(state);
    expect(state.players.A.military?.command).toBe(0);

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

    expect(state.players.A.military?.command).toBe(2);
    const gains = state.events.filter(event =>
      event.type === 'military_command_gained'
      && event.actor === 'A'
    );
    expect(gains).toHaveLength(2);
    expect((gains[0].payload as { reason?: string }).reason)
      .toBeUndefined();
    expect((gains[1].payload as { reason?: string }).reason)
      .toBe('Unbroken Ranks');
    expect(gains[0].index).toBeLessThan(gains[1].index);
  });

  test('Unbroken Ranks does not grant extra Command after an Order was used during that battle', () => {
    let state = startBattle();
    state.players.A.military!.command = 1;
    const unbrokenRanks = injectHandCard(
      state,
      'A',
      'military-unbroken-ranks',
      'with-order',
    );

    state = revealGambits(state, unbrokenRanks);
    state = toOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'use_general_rally',
      playerId: 'A',
    });

    expect(state.battleRuntime?.militaryOrderUsedPlayers).toContain('A');
    expect(state.players.A.military?.command).toBe(0);

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

    expect(state.players.A.military?.command).toBe(1);
    expect(state.events.filter(event =>
      event.type === 'military_command_gained'
      && event.actor === 'A'
      && (event.payload as { reason?: string }).reason === 'Unbroken Ranks'
    )).toHaveLength(0);
  });
});
