import type { BattleState, CardID, GameEvent, GameState, PendingMilitaryChoice, PlayerID, RecentBattleResult } from '../types';
import { gainFactionResource, setFactionResource } from './resources';

function log(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({ id: `${game.id}-event-${game.log.length + 1}`, turn: game.turn, actor, type, message, payload, visibility: 'public' } satisfies GameEvent);
}

function playedBattleHandCards(battle: BattleState, playerId: PlayerID): CardID[] {
  const participant = battle.attacker.playerId === playerId ? battle.attacker : battle.defender;
  return participant.battleDrawPlayed.filter((card) => !card.canceled).map((card) => card.cardId);
}

function committedHandCards(battle: BattleState, playerId: PlayerID): CardID[] {
  const participant = battle.attacker.playerId === playerId ? battle.attacker : battle.defender;
  return participant.handCommit && !participant.handCommit.canceled ? [participant.handCommit.cardId] : [];
}

export function enrichRecentBattleResult(result: RecentBattleResult, battle: BattleState, game: GameState): RecentBattleResult {
  const ids = [battle.attacker.playerId, battle.defender.playerId];
  return {
    ...result,
    battleHandCards: Object.fromEntries(ids.map((id) => [id, playedBattleHandCards(battle, id)])),
    handCommittedCards: Object.fromEntries(ids.map((id) => [id, committedHandCards(battle, id)])),
    ordersUsed: Object.fromEntries(ids.map((id) => [id, Object.keys(game.players[id].leaderAbilityUsage?.battle ?? {})])),
  };
}

function cardWasPlayed(result: RecentBattleResult, playerId: PlayerID, cardId: CardID): boolean {
  return (result.battleHandCards?.[playerId] ?? []).includes(cardId) || (result.handCommittedCards?.[playerId] ?? []).includes(cardId);
}

function hasCardSource(game: GameState, playerId: PlayerID, cardId: CardID): boolean {
  return cardWasPlayed(game.recentBattleResult!, playerId, cardId) || game.players[playerId].zones.assetBank.includes(cardId);
}

function queue(game: GameState, choice: PendingMilitaryChoice): void {
  game.militaryChoiceQueue ??= [];
  game.militaryChoiceQueue.push(choice);
}

function activateNext(game: GameState): void {
  game.pendingMilitaryChoice = game.militaryChoiceQueue?.shift();
  if (game.pendingMilitaryChoice) game.priorityPlayer = game.pendingMilitaryChoice.playerId;
  if (game.militaryChoiceQueue?.length === 0) game.militaryChoiceQueue = undefined;
}

export function buildMilitaryAftermathChoices(game: GameState, _battle: BattleState): void {
  const result = game.recentBattleResult;
  if (!result) return;
  const winner = game.players[result.winner];
  const loser = game.players[result.loser];

  if (winner.factionId === 'military') {
    const usedOrders = (result.ordersUsed?.[result.winner] ?? []).length > 0;
    if (cardWasPlayed(result, result.winner, 'military-unbroken-ranks') && !usedOrders) {
      gainFactionResource(game, result.winner, 'command', 1, 'Unbroken Ranks');
    }

    if (cardWasPlayed(result, result.winner, 'military-battlefield-promotion')) {
      const options = (result.battleHandCards?.[result.winner] ?? []).filter((card) => card !== 'military-battlefield-promotion' && winner.zones.discard.includes(card));
      if (options.length > 0) queue(game, { kind: 'battlefield_promotion', playerId: result.winner, sourceCardId: 'military-battlefield-promotion', options });
    }

    const location = game.board.spaces.find((space) => space.id === result.location);
    if (cardWasPlayed(result, result.winner, 'military-encampment') && result.winner === result.defender && location?.kind === 'territory' && location.controller === result.winner) {
      winner.zones.discard = winner.zones.discard.filter((card) => card !== 'military-encampment');
      winner.zones.graveyard = winner.zones.graveyard.filter((card) => card !== 'military-encampment');
      location.overlays = [...(location.overlays ?? []), { cardId: 'military-encampment', owner: result.winner, faceUp: true }];
      log(game, result.winner, 'military_encampment_placed', `${winner.name} placed Encampment after defending successfully.`, { spaceId: location.id });
    }

    if (result.winner === result.defender && hasCardSource(game, result.winner, 'military-countercharge')) {
      queue(game, { kind: 'countercharge', playerId: result.winner, sourceCardId: 'military-countercharge', options: ['use', 'pass'] });
    }

    if (hasCardSource(game, result.winner, 'military-war-crimes')) {
      queue(game, { kind: 'war_crimes', playerId: result.winner, sourceCardId: 'military-war-crimes', defeatedPlayer: result.loser, affectedCards: [...(result.battleHandCards?.[result.loser] ?? [])], options: ['use', 'pass'] });
    }

    if (result.winner === result.attacker && hasCardSource(game, result.winner, 'military-shock-and-awe')) {
      const loserSpace = game.board.spaces.find((space) => space.occupant === result.loser);
      const extraRetreat = Boolean(loserSpace && game.board.spaces.some((space) => space.index === loserSpace.index + result.retreatDirection && !space.occupant));
      const options: Array<'breakthrough' | 'consolidate'> = extraRetreat ? ['breakthrough', 'consolidate'] : ['consolidate'];
      queue(game, { kind: 'shock_and_awe', playerId: result.winner, sourceCardId: 'military-shock-and-awe', location: result.location, defeatedPlayer: result.loser, options });
    }
  }

  if (loser.factionId === 'military' && cardWasPlayed(result, result.loser, 'military-rearguard')) {
    loser.zones.discard = loser.zones.discard.filter((card) => card !== 'military-rearguard');
    loser.zones.assetBank.push('military-rearguard');
    log(game, result.loser, 'military_rearguard_banked', `${loser.name} banked Rearguard after retreating.`);
  }

  activateNext(game);
}

function consumeSource(game: GameState, playerId: PlayerID, cardId: CardID): void {
  const player = game.players[playerId];
  const assetIndex = player.zones.assetBank.indexOf(cardId);
  if (assetIndex >= 0) {
    player.zones.assetBank.splice(assetIndex, 1);
    player.zones.graveyard.push(cardId);
    return;
  }
  player.zones.discard = player.zones.discard.filter((card) => card !== cardId);
  if (!player.zones.graveyard.includes(cardId)) player.zones.graveyard.push(cardId);
}

function moveOne(game: GameState, playerId: PlayerID, direction: -1 | 1): boolean {
  const origin = game.board.spaces.find((space) => space.occupant === playerId);
  const destination = origin && game.board.spaces.find((space) => space.index === origin.index + direction);
  if (!origin || !destination || destination.occupant) return false;
  delete origin.occupant;
  destination.occupant = playerId;
  game.players[playerId].occupiedSpaceId = destination.id;
  return true;
}

function captureLocation(game: GameState, playerId: PlayerID): void {
  const result = game.recentBattleResult!;
  const space = game.board.spaces.find((candidate) => candidate.id === result.location);
  if (!space?.territoryId || space.kind !== 'territory') return;
  const previous = space.controller;
  if (previous && previous !== playerId) game.players[previous].controlledTerritories = game.players[previous].controlledTerritories.filter((id) => id !== space.territoryId);
  if (!game.players[playerId].controlledTerritories.includes(space.territoryId)) game.players[playerId].controlledTerritories.push(space.territoryId);
  space.controller = playerId;
  delete space.capturePendingBy;
  log(game, playerId, 'territory_captured', `${game.players[playerId].name} captured ${space.territoryId} immediately.`, { spaceId: space.id, previousController: previous });
}

export function resolveMilitaryChoice(game: GameState, playerId: PlayerID, selected: string, cardId?: CardID): void {
  const pending = game.pendingMilitaryChoice;
  if (!pending || pending.playerId !== playerId) throw new Error(`${playerId} has no pending Military choice.`);
  const result = game.recentBattleResult;
  if (!result) throw new Error('Military choice has no battle result.');

  if (pending.kind === 'battlefield_promotion') {
    const chosen = cardId ?? selected;
    if (!pending.options.includes(chosen)) throw new Error('That card is not eligible for Battlefield Promotion.');
    const player = game.players[playerId];
    const index = player.zones.discard.indexOf(chosen);
    if (index < 0) throw new Error('The promoted card is no longer in the Discard Pile.');
    player.zones.discard.splice(index, 1);
    player.zones.hand.push(chosen);
    log(game, playerId, 'military_battlefield_promotion', `${player.name} returned ${chosen} to hand.`, { cardId: chosen });
  }

  if (pending.kind === 'countercharge' && selected === 'use') {
    consumeSource(game, playerId, pending.sourceCardId);
    moveOne(game, playerId, result.retreatDirection);
    log(game, playerId, 'military_countercharge', `${game.players[playerId].name} countercharged after the opponent retreated.`);
  }

  if (pending.kind === 'war_crimes' && selected === 'use') {
    consumeSource(game, playerId, pending.sourceCardId);
    const defeated = game.players[pending.defeatedPlayer];
    for (const affected of pending.affectedCards) {
      const index = defeated.zones.discard.indexOf(affected);
      if (index >= 0) defeated.zones.discard.splice(index, 1);
      if (!defeated.zones.graveyard.includes(affected)) defeated.zones.graveyard.push(affected);
    }
    moveOne(game, pending.defeatedPlayer, result.retreatDirection);
    game.players[playerId].military ??= { storedCards: {}, freeOrderAbilityIds: [], pursuitBattleCount: 0 };
    game.players[playerId].military!.victoryRestrictions = { noMovement: true, noCapture: true, noOrders: true };
    log(game, playerId, 'military_war_crimes', `${game.players[playerId].name} used War Crimes.`, { affectedCards: pending.affectedCards });
  }

  if (pending.kind === 'shock_and_awe') {
    if (selected === 'negated') {
      log(game, playerId, 'military_shock_and_awe_negated', `${game.players[playerId].name}'s Shock and Awe effect was negated.`);
    } else {
      consumeSource(game, playerId, pending.sourceCardId);
      if (selected === 'breakthrough') {
        if (!pending.options.includes('breakthrough')) throw new Error('Breakthrough is not legal because the opponent cannot retreat farther.');
        moveOne(game, pending.defeatedPlayer, result.retreatDirection);
        moveOne(game, playerId, result.retreatDirection);
      } else if (selected === 'consolidate') {
        captureLocation(game, playerId);
        setFactionResource(game, playerId, 'command', 2, 'Shock and Awe — Consolidate');
      } else throw new Error('Choose Breakthrough or Consolidate.');
      game.players[playerId].military ??= { storedCards: {}, freeOrderAbilityIds: [], pursuitBattleCount: 0 };
      game.players[playerId].military!.victoryRestrictions = { noMovement: true, noCapture: true, noOrders: true };
      log(game, playerId, 'military_shock_and_awe', `${game.players[playerId].name} chose ${selected} for Shock and Awe.`);
    }
  }

  game.pendingMilitaryChoice = undefined;
  activateNext(game);
  if (!game.pendingMilitaryChoice && game.phase !== 'game_over') game.priorityPlayer = game.activePlayer;
}
