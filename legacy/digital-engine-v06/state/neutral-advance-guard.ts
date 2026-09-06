import type {
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { PlayActionCardAction } from './actions';
import { GameActionError } from './reducer';

export const ADVANCE_GUARD = 'neutral-advance-guard';
const ADVANCE_GUARD_BATTLE_RESOLUTION = 'neutral_advance_guard_battle';

export interface PreparedAdvanceGuardAction {
  remainingHand: CardID[];
}

function appendPublicLog(
  game: GameState,
  actor: PlayerID,
  type: string,
  message: string,
  payload?: unknown,
): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor,
    type,
    message,
    payload,
    visibility: 'public',
  } satisfies GameEvent);
}

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function activeAdvanceGuard(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === ADVANCE_GUARD
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

export function requireAdvanceGuardActionTiming(game: GameState, playerId: PlayerID): void {
  if (game.activePlayer !== playerId || game.phase !== 'action_before_movement') {
    throw new GameActionError('Advance Guard can be played only during the Action Opportunity before movement.');
  }
}

export function prepareAdvanceGuardAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedAdvanceGuardAction | undefined {
  if (action.cardId !== ADVANCE_GUARD) return undefined;
  const player = game.players[action.playerId];
  if (!player) throw new GameActionError(`Unknown player: ${action.playerId}.`);
  const remainingHand = [...player.zones.hand];
  if (!removeOne(remainingHand, ADVANCE_GUARD)) {
    throw new GameActionError(`${player.name} does not have Advance Guard in hand.`);
  }
  return { remainingHand };
}

export function applyAdvanceGuardAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedAdvanceGuardAction,
): void {
  const player = game.players[playerId];
  player.zones.hand = [...prepared.remainingHand];
  player.movementRemaining += 1;
  player.advanceGuardMovementRemaining = (player.advanceGuardMovementRemaining ?? 0) + 1;
  appendPublicLog(
    game,
    playerId,
    'neutral_advance_guard_action',
    `${player.name} gained one additional position of movement from Advance Guard.`,
    {
      movementRemaining: player.movementRemaining,
      advanceGuardMovementRemaining: player.advanceGuardMovementRemaining,
    },
  );
}

/** Ordinary movement is spent first; the marked position is used only once all
 * remaining movement is Advance Guard movement. */
export function moveUsesAdvanceGuardPosition(game: GameState, playerId: PlayerID): boolean {
  const player = game.players[playerId];
  const marked = player?.advanceGuardMovementRemaining ?? 0;
  return marked > 0 && player.movementRemaining <= marked;
}

export function reconcileAdvanceGuardMove(
  game: GameState,
  playerId: PlayerID,
  usedAdvanceGuardPosition: boolean,
  initiatedBattle: boolean,
): void {
  const player = game.players[playerId];
  if (!player) return;

  if (initiatedBattle) {
    if (usedAdvanceGuardPosition && game.battle) {
      game.battle.handCommitProhibitedFor = [
        ...new Set([...(game.battle.handCommitProhibitedFor ?? []), playerId]),
      ];
      appendPublicLog(
        game,
        playerId,
        'neutral_advance_guard_battle_started',
        `${player.name} initiated a battle with Advance Guard movement and cannot commit a card from hand.`,
        { battleId: game.battle.id },
      );
    }
    player.advanceGuardMovementRemaining = 0;
    return;
  }

  if (usedAdvanceGuardPosition) {
    player.advanceGuardMovementRemaining = Math.max(
      (player.advanceGuardMovementRemaining ?? 0) - 1,
      0,
    );
  }
  if (game.phase !== 'game_over') {
    game.phase = player.movementRemaining > 0 ? 'movement' : 'action_after_movement';
  }
}

export function clearAdvanceGuardMovement(game: GameState, playerId: PlayerID): void {
  const player = game.players[playerId];
  if (player) player.advanceGuardMovementRemaining = 0;
}

export function requireAdvanceGuardHandCommitAllowed(game: GameState, playerId: PlayerID): void {
  if (game.battle?.handCommitProhibitedFor?.includes(playerId)) {
    throw new GameActionError('Advance Guard movement prevents this player from committing a card from hand in this battle.');
  }
}

export function applyAdvanceGuardBattleEffects(game: GameState): void {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || !battle.effectsResolved.includes('before_battle_resolution')
    || battle.effectsResolved.includes(ADVANCE_GUARD_BATTLE_RESOLUTION)) return;

  const attacker = battle.attacker;
  const count = attacker.handCommit
    ? 0
    : attacker.battleDrawPlayed.filter(activeAdvanceGuard).length;
  if (count > 0) {
    attacker.advantage = (attacker.advantage ?? 0) + count;
    appendPublicLog(
      game,
      attacker.playerId,
      'neutral_advance_guard_battle',
      `${game.players[attacker.playerId].name} gained ${count} advantage from Advance Guard.`,
      { battleId: battle.id, count },
    );
  }
  battle.effectsResolved.push(ADVANCE_GUARD_BATTLE_RESOLUTION);
}
