import type { ActionCardTarget } from '../state/actions';
import type { CardID, GameEvent, GameState, PlayerID, SpaceID } from '../types';
import { gainFactionResource } from '../state/resources';

export interface MilitaryCardDefinition {
  id: CardID;
  name: string;
  cost: number;
  unique?: boolean;
  cardForm?: 'Territory Overlay';
  action: string;
  battle: string;
  supplemental?: string[];
}

export const militaryCardDefinitions: readonly MilitaryCardDefinition[] = [
  { id: 'military-unbroken-ranks', name: 'Unbroken Ranks', cost: 1, action: 'Bank this as an Asset. After you win a battle in which you used no Orders, you may discard it to gain 1 Command.', battle: 'If you win this battle and used no Orders in it, gain 1 Command.' },
  { id: 'military-battlefield-promotion', name: 'Battlefield Promotion', cost: 2, action: 'During an Action Opportunity after you win a battle this turn, return one card you played from your Battle Hand in that battle from your Discard Pile to your hand.', battle: 'If you win, return one other card you played from your Battle Hand to your hand instead of discarding it during cleanup.' },
  { id: 'military-encampment', name: 'Encampment', cost: 2, cardForm: 'Territory Overlay', action: 'Place this as an Overlay on a Territory you occupy and control.', battle: 'If you win while defending a Territory you control, place this on it as an Overlay during cleanup.', supplemental: ['At the end of your turn, if you occupy and control this Territory, gain 1 Command. When an opponent gains control of it, put this in its owner’s Graveyard.'] },
  { id: 'military-rearguard', name: 'Rearguard', cost: 2, action: 'Bank this as an Asset. After you lose a battle and retreat, when your opponent would enter your position that turn using an Order or card effect, you may discard this to prevent that movement. No Command is spent; any card used returns to its owner’s hand.', battle: 'If you lose and retreat, bank this during cleanup.' },
  { id: 'military-brothers-in-arms', name: 'Brothers in Arms', cost: 2, action: 'Bank this as an Asset. Before cards are committed from hand in a battle involving you, you may discard this to delay your hand commitment until after both players form their Battle Hands. Then either commit one card from your hand and choose one card from your Battle Hand, revealing both face up together, or choose neither. Both Battle effects must still be able to resolve.', battle: 'If this is in your initial Battle Hand and you committed no card from your hand, you may choose this and also commit one card from your hand face up. Both Battle effects must still be able to resolve.' },
  { id: 'military-field-command', name: 'Field Command', cost: 3, action: 'Bank this as an Asset. After using a 1-Command Order, you may discard this to use your Leader’s other 1-Command Order once this turn, at its next legal timing, for 0 Command.', battle: 'After using a 1-Command Order during this battle, you may use your Leader’s other 1-Command Order once this turn, at its next legal timing, for 0 Command. If you do, put this in your Graveyard after that Order resolves.' },
  { id: 'military-reserve-force', name: 'Reserve Force', cost: 3, action: 'Bank this as an Asset with another card from your hand that has a Battle effect face down beneath it. After all cards in a battle involving you are revealed, you may discard this to reveal the stored card face up for its Battle effect, if that effect can still resolve. Put the stored card in your Graveyard during cleanup, or immediately if this leaves play before deployment.', battle: 'After all cards in the battle are revealed, you may replace this with a card from your hand whose Battle effect can still resolve. If you do, put this in your Graveyard, reveal that card face up for its Battle effect, and put that card in your Graveyard during cleanup. Otherwise, discard this during cleanup.' },
  { id: 'military-give-chase', name: 'Give Chase', cost: 3, action: 'During an Action Opportunity after you win a battle you initiated this turn, move one position toward the opponent’s end of the Gauntlet. This may initiate a battle.', battle: 'If you win and initiated this battle, after the opponent retreats, move one position toward their end of the Gauntlet. This may initiate a battle.', supplemental: ['In a battle initiated this way, you cannot commit a card from your hand or use Orders. When forming your Battle Hand, draw one fewer card for each battle already fought this turn beyond the first, to a minimum of zero. After the movement, put this in your Graveyard.'] },
  { id: 'military-hold-the-line', name: 'Hold the Line', cost: 4, action: 'Bank this as an Asset. When a battle begins in which you defend a Territory you control, before cards are committed from hand, you may put this in your Graveyard to use the effect below.', battle: 'If you are defending a Territory you control, use the effect below, then put this in your Graveyard during cleanup.', supplemental: ['After all cards in the battle are revealed, draw two additional cards into your Battle Hand and immediately reveal up to one of them face up for its Battle effect, if that effect can still resolve. If you lose, after you retreat, the opponent captures that Territory immediately.'] },
  { id: 'military-countercharge', name: 'Countercharge', cost: 4, action: 'Bank this as an Asset. After you win a battle you did not initiate, you may put this in your Graveyard to use the effect below.', battle: 'If you win this battle and did not initiate it, use the effect below, then put this in your Graveyard.', supplemental: ['After the opponent retreats, move one position toward their end of the Gauntlet. This may initiate a battle.'] },
  { id: 'military-war-crimes', name: 'War Crimes', cost: 4, action: 'Bank this as an Asset. After you win a battle, you may put this in your Graveyard to use the effect below.', battle: 'If you win, you may use the effect below. If you do, put this in your Graveyard during cleanup.', supplemental: ['Put every card your opponent played from their Battle Hand in that battle in their Graveyard instead of their Discard Pile, and make them retreat one additional position. You cannot move, capture a Territory, or use an Order as a result of that victory.'] },
  { id: 'military-shock-and-awe', name: 'Shock and Awe', cost: 5, unique: true, action: 'Bank this as an Asset. When you initiate a battle on an enemy-controlled Territory, before cards are committed from hand, you may put this in your Graveyard to use the effect below.', battle: 'If you are attacking on an enemy-controlled Territory, use the effect below, then put this in your Graveyard during cleanup.', supplemental: ['After all cards in the battle are revealed, you may reveal one additional card from your hand face up for its Battle effect, if that effect can still resolve. Put that card in your Graveyard during cleanup. If you lose, retreat one additional position after your normal retreat. If you win, choose Breakthrough or Consolidate.', 'Breakthrough: Choose only if the opponent can retreat one additional position. They do so after their normal retreat; then move one position toward their end of the Gauntlet. This movement cannot initiate a battle.', 'Consolidate: Capture the contested Territory immediately, then set your Command to 2.', 'After either option, you cannot move again, capture another Territory, or use an Order as a result of that victory.'] },
] as const;

export const militaryCardsById = new Map(militaryCardDefinitions.map((card) => [card.id, card]));

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
    player.zones.removed = player.zones.removed.filter((id) => id !== cardId);
    space.overlays = [...(space.overlays ?? []), { cardId, owner: playerId, faceUp: true }];
    appendLog(game, playerId, 'military_encampment_placed', `${player.name} placed Encampment on ${space.territoryId ?? space.id}.`, { spaceId });
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
