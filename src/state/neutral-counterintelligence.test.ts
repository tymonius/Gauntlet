import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import { EffectRegistry, baseBattleEffectHandlers, totalModifiersFor } from '../effects/v06';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types';
import { applyGameAction } from './apply-neutral';
import { applyConfessionAction, CONFESSION } from './inquisition-confession';
import { applyBurningAtTheStakeAction, BURNING_AT_THE_STAKE } from './inquisition-burning-at-the-stake';
import { legalInquisitionPurgeOptions } from './inquisition-purge';
import { applyIntelligenceActionEffect } from './intelligence-action-cards';
import { openSurveillanceWindowAfterChoice, revealDeferredBattleCards } from './intelligence-battle';
import { resolveInterceptedOrdersPreRevealCard } from './intelligence-intercepted-orders-battle';
import { resolveAssassinsPreRevealCard } from './intelligence-simple-battle-effects';
import { initializeGame } from './initialize';
import {
  COUNTERINTELLIGENCE,
  counterintelligenceBlocksBattleHandInspection,
  counterintelligenceBlocksFaceDownBattleCardInspection,
  counterintelligenceBlocksHandInspection,
} from './neutral-counterintelligence';

function state(
  playerOneFaction = 'intelligence',
  playerTwoFaction = 'inquisition',
): GameState {
  const game = initializeGame({
    id: 'counterintelligence-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: playerOneFaction,
        leaderName: playerOneFaction === 'intelligence' ? 'Ranger' : 'Grand Inquisitor',
        deck: ['draw-one', 'draw-two', 'card-valor', 'card-fortifications'],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        factionId: playerTwoFaction,
        leaderName: playerTwoFaction === 'inquisition' ? 'Grand Inquisitor' : 'General',
        deck: ['target-one', 'target-two', COUNTERINTELLIGENCE, 'card-attrition'],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  game.phase = 'action_before_movement';
  game.activePlayer = 'player_1';
  game.priorityPlayer = 'player_1';
  return game;
}

function participant(playerId: PlayerID, cards: BattlePlayedCard[] = []): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: cards.filter((card) => card.origin === 'battle_draw'),
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function played(
  cardId: string,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'hand',
): BattlePlayedCard {
  return { cardId, owner, origin, faceDown: true, canceled: false };
}

function beginBattle(
  game: GameState,
  attackerCards: BattlePlayedCard[] = [],
  defenderCards: BattlePlayedCard[] = [],
): void {
  game.phase = 'battle';
  game.battle = {
    id: 'counter-battle',
    stage: 'normal_reveal',
    location: 'space-1',
    attackerOrigin: 'player_1-heartland',
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Counterintelligence', () => {
  it('registers both canonical forms and adds +1 per active Battle copy', () => {
    expect(getCardPlayRule(COUNTERINTELLIGENCE)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });

    const game = state();
    beginBattle(game, [
      played(COUNTERINTELLIGENCE, 'player_1', 'hand'),
      played(COUNTERINTELLIGENCE, 'player_1', 'battle_draw'),
    ]);
    const modifiers = new EffectRegistry(baseBattleEffectHandlers).resolve({
      game,
      battle: game.battle!,
      timing: 'before_battle_resolution',
      actor: 'player_1',
      location: game.battle!.location,
    }).modifiers;

    expect(totalModifiersFor(modifiers, 'player_1')).toBe(2);
  });

  it('distinguishes Asset protection from Battle-only face-down protection', () => {
    const game = state();
    game.players.player_2.zones.assetBank = [COUNTERINTELLIGENCE];
    expect(counterintelligenceBlocksHandInspection(game, 'player_1', 'player_2')).toBe(true);
    expect(counterintelligenceBlocksBattleHandInspection(game, 'player_1', 'player_2')).toBe(true);
    expect(counterintelligenceBlocksFaceDownBattleCardInspection(game, 'player_1', 'player_2')).toBe(true);

    game.players.player_2.zones.assetBank = [];
    beginBattle(game, [], [played(COUNTERINTELLIGENCE, 'player_2')]);
    expect(counterintelligenceBlocksHandInspection(game, 'player_1', 'player_2')).toBe(false);
    expect(counterintelligenceBlocksBattleHandInspection(game, 'player_1', 'player_2')).toBe(false);
    expect(counterintelligenceBlocksFaceDownBattleCardInspection(game, 'player_1', 'player_2')).toBe(true);

    revealDeferredBattleCards(game);
    expect(counterintelligenceBlocksFaceDownBattleCardInspection(game, 'player_1', 'player_2')).toBe(false);
  });

  it('prevents Surveillance from opening against a protected face-down card', () => {
    const game = state();
    game.players.player_1.resources!.intel!.value = 1;
    game.players.player_2.zones.assetBank = [COUNTERINTELLIGENCE];
    beginBattle(game, [], [played('target-one', 'player_2')]);

    expect(openSurveillanceWindowAfterChoice(game, 'player_2', 'target-one', 'hand')).toBe(false);
    expect(game.pendingIntelligenceChoice).toBeUndefined();
  });

  it('blocks the hand inspection portion of Spies while preserving draw and discard', () => {
    const game = state();
    game.players.player_1.zones.deck = ['draw-one'];
    game.players.player_2.zones.hand = ['target-one', 'target-two'];
    game.players.player_2.zones.assetBank = [COUNTERINTELLIGENCE];

    applyIntelligenceActionEffect(game, 'player_1', 'intelligence-spies');

    expect(game.players.player_1.zones.hand).toEqual(['draw-one']);
    expect(game.pendingIntelligenceChoice).toMatchObject({
      kind: 'spies_discard',
      playerId: 'player_1',
      inspectedHand: [],
    });
    expect(game.log.some((event) => event.type === 'neutral_counterintelligence_blocked')).toBe(true);
    expect(game.log.some((event) => event.type === 'intelligence_spies_hand_inspected')).toBe(false);
  });

  it('protects a face-down commitment from Assassins without granting its no-commitment fallback', () => {
    const game = state();
    const assassins = played('intelligence-assassins', 'player_1');
    const protectedCommit = played(COUNTERINTELLIGENCE, 'player_2');
    beginBattle(game, [assassins], [protectedCommit]);

    resolveAssassinsPreRevealCard(game, game.battle!.attacker, assassins);

    expect(protectedCommit.faceDown).toBe(true);
    expect(protectedCommit.negated).toBeUndefined();
    expect(game.battle!.defender.disadvantage ?? 0).toBe(0);
  });

  it('blocks Confession and Burning at the Stake from inspecting a protected hand', () => {
    const game = state('inquisition', 'military');
    game.players.player_2.zones.hand = ['target-one', 'target-two'];
    game.players.player_2.zones.assetBank = [COUNTERINTELLIGENCE];

    expect(applyConfessionAction(game, 'player_1', CONFESSION)).toBe(true);
    expect(game.pendingInquisitionChoice).toBeUndefined();
    expect(game.inquisitionConfessionConstraint).toBeUndefined();

    expect(applyBurningAtTheStakeAction(game, 'player_1', BURNING_AT_THE_STAKE)).toBe(true);
    expect(game.players.player_2.zones.hand).toEqual(['target-one', 'target-two']);
    expect(game.pendingInquisitionChoice).toBeUndefined();
  });

  it('removes the look-and-choose Purge while retaining the private opponent choice', () => {
    const game = state('inquisition', 'military');
    game.players.player_1.resources!.conviction!.value = 4;
    game.players.player_2.zones.hand = ['target-one'];
    game.players.player_2.zones.assetBank = [COUNTERINTELLIGENCE];

    const modes = legalInquisitionPurgeOptions(game, 'player_1').map((option) => option.mode);
    expect(modes).toContain('opponent_choose_hand_to_graveyard');
    expect(modes).not.toContain('choose_hand_to_graveyard');
  });

  it('blocks Intercepted Orders from inspecting a protected Battle Hand', () => {
    const game = state();
    game.players.player_2.zones.assetBank = [COUNTERINTELLIGENCE];
    const source = played('intelligence-intercepted-orders', 'player_1');
    beginBattle(game, [source], [played('target-one', 'player_2', 'battle_draw')]);
    game.battle!.defender.battleDraw = ['target-two'];

    expect(resolveInterceptedOrdersPreRevealCard(game, game.battle!.attacker, source)).toBe(false);
    expect(source.faceDown).toBe(false);
    expect(game.pendingIntelligenceChoice).toBeUndefined();
  });

  it('prevents Watchtower from exposing an attacker protected by the banked Asset', () => {
    const game = state('military', 'military');
    game.phase = 'movement';
    game.players.player_1.zones.assetBank = [COUNTERINTELLIGENCE];
    game.board.spaces.find((space) => space.id === 'player_2-heartland')!.occupant = undefined;
    const destination = game.board.spaces.find((space) => space.id === 'space-1')!;
    destination.territoryId = 'territory-watchtower';
    destination.controller = 'player_2';
    destination.occupant = 'player_2';
    destination.revealed = true;
    game.players.player_2.occupiedSpaceId = destination.id;

    const moved = applyGameAction(game, {
      type: 'move_player',
      playerId: 'player_1',
      toSpaceId: destination.id,
    }).state;

    expect(moved.battle?.attackerHandCommitVisibleTo).toBeUndefined();
  });
});
