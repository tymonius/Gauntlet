import type { ActionCardTarget } from './actions';
import type { CardID, GameEvent, GameState, PlayerID, SpaceID } from '../types/v06';
import { gainFactionResource } from './resources';
import { processCounterworksOverlayQueue, queueCounterworksOverlayPlacement } from './neutral-counterworks';

function appendLog(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({ id: `${game.id}-event-${game.log.length + 1}`, turn: game.turn, actor, type, message, payload, visibility: 'public' } satisfies GameEvent);
}

function targetSpace(targets?: ActionCardTarget[]): SpaceID | undefined {
  return targets?.find((target): target is Extract<ActionCardTarget, { kind: 'space' }> => target.kind === 'space')?.spaceId;
}
function targetCard(targets?: ActionCardTarget[]): CardID | undefined {
  return targets?.find((target): target is Extract<ActionCardTarget, { kind: 'card' }> => target.kind === 'card')?.cardId;
}

export function initializeMilitaryCardState(game: GameState): void {
  for (const player of Object.values(game.players)) {
    if (player.factionId === 'military') player.military ??= { storedCards: {}, freeOrderAbilityIds: [], pursuitBattleCount: 0 };
  }
}

export function applyMilitaryActionEffect(game: GameState, playerId: PlayerID, cardId: CardID, targets?: ActionCardTarget[]): void {
  const player = game.players[playerId];
  if (!player || player.factionId !== 'military') return;
  player.military ??= { storedCards: {}, freeOrderAbilityIds: [], pursuitBattleCount: 0 };

  if (cardId === 'military-encampment') {
    const spaceId = targetSpace(targets);
    const space = game.board.spaces.find((candidate) => candidate.id === spaceId);
    if (!space || space.kind !== 'territory' || space.occupant !== playerId || space.controller !== playerId) throw new Error('Encampment requires a Territory you occupy and control.');
    queueCounterworksOverlayPlacement(game, {
      kind: 'military_encampment_action',
      playerId,
      cardId,
      spaceId: space.id,
      source: { zone: 'removed' },
    });
    processCounterworksOverlayQueue(game);
  }

  if (cardId === 'military-reserve-force') {
    const stored = targetCard(targets);
    const index = stored ? player.zones.hand.indexOf(stored) : -1;
    if (!stored || index < 0) throw new Error('Reserve Force requires another card from hand.');
    player.zones.hand.splice(index, 1);
    player.military.storedCards[cardId] = stored;
    appendLog(game, playerId, 'military_reserve_stored', `${player.name} stored a card beneath Reserve Force.`);
  }

  if (cardId === 'military-battlefield-promotion') {
    const promoted = targetCard(targets);
    const index = promoted ? player.zones.discard.indexOf(promoted) : -1;
    if (!promoted || index < 0 || game.recentBattleResult?.winner !== playerId || game.recentBattleResult.turn !== game.turn) throw new Error('Battlefield Promotion requires an eligible Battle Hand card from a battle you won this turn.');
    player.zones.discard.splice(index, 1);
    player.zones.hand.push(promoted);
    appendLog(game, playerId, 'military_battlefield_promotion', `${player.name} returned ${promoted} to hand.`, { cardId: promoted });
  }

  if (cardId === 'military-give-chase') {
    if (game.recentBattleResult?.winner !== playerId || game.recentBattleResult.attacker !== playerId || game.recentBattleResult.turn !== game.turn) throw new Error('Give Chase requires a battle you initiated and won this turn.');
    player.movementRemaining += 1;
    game.phase = 'movement';
    appendLog(game, playerId, 'military_give_chase', `${player.name} gave chase and may move one position.`);
  }
}

export function resolveMilitaryEndTurn(game: GameState, endingPlayer: PlayerID): void {
  for (const space of game.board.spaces) {
    for (const overlay of space.overlays ?? []) {
      if (overlay.cardId === 'military-encampment' && overlay.owner === endingPlayer && space.occupant === endingPlayer && space.controller === endingPlayer) {
        gainFactionResource(game, endingPlayer, 'command', 1, 'Encampment');
      }
    }
  }
}

export function removeCapturedEncampments(game: GameState): void {
  for (const space of game.board.spaces) {
    const retained = [];
    for (const overlay of space.overlays ?? []) {
      if (overlay.cardId === 'military-encampment' && space.controller !== overlay.owner) {
        game.players[overlay.owner]?.zones.graveyard.push(overlay.cardId);
        appendLog(game, overlay.owner, 'military_encampment_destroyed', 'Encampment was put in its owner’s Graveyard after control changed.', { spaceId: space.id });
      } else retained.push(overlay);
    }
    space.overlays = retained;
  }
}
