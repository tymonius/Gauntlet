import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { ResolveNeutralChoiceAction } from './actions';
import { bankedAssetCardUseAllowed, bankedAssetUseAllowed } from './banked-assets';
import { counterintelligenceAssetActive } from './neutral-counterintelligence';
import { GameActionError } from './reducer';

export const PALISADE_WALL = 'neutral-palisade-wall';
const PALISADE_ASSET_WINDOW = 'neutral_palisade_wall_asset_window';

function publicLog(
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

function removeOne(cards: string[], cardId: string): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === PALISADE_WALL
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function activeCopies(participant: BattleParticipantState): BattlePlayedCard[] {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((card): card is BattlePlayedCard => active(card));
}

function hasBlockingChoice(game: GameState): boolean {
  return Boolean(
    game.pendingNeutralChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingIntelligenceChoice
    || game.pendingMysticsChoice
    || game.pendingInquisitionChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length,
  );
}

/**
 * Palisade waits behind any already-open battle-start windows, but always
 * resolves before either participant may commit a Battle card.
 */
export function openPalisadeWallAssetChoice(game: GameState): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'hand_commit' || hasBlockingChoice(game)) return false;
  const marker = `${PALISADE_ASSET_WINDOW}:${battle.defender.playerId}`;
  if (battle.effectsResolved.includes(marker)) return false;
  battle.effectsResolved.push(marker);

  const defender = game.players[battle.defender.playerId];
  if (!bankedAssetCardUseAllowed(game, defender.id, PALISADE_WALL)) return false;
  if (!bankedAssetUseAllowed(game, defender.id)) return false;
  if (!bankedAssetUseAllowed(game, battle.attacker.playerId)) return false;

  game.pendingNeutralChoice = {
    kind: 'palisade_wall_asset',
    playerId: defender.id,
    battleId: battle.id,
    targetPlayerId: battle.attacker.playerId,
    options: ['pass', 'use'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = defender.id;
  return true;
}

export function resolvePalisadeWallChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'palisade_wall_asset' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Palisade Wall choice.`);
  }
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId || battle.stage !== 'hand_commit') {
    throw new GameActionError('The Palisade Wall battle-start trigger is no longer available.');
  }
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new GameActionError('Choose whether to discard Palisade Wall.');
  }

  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? battle.attacker.playerId;
  if (action.choice === 'pass') {
    publicLog(
      game,
      action.playerId,
      'neutral_palisade_wall_asset_passed',
      `${game.players[action.playerId].name} kept Palisade Wall banked.`,
      { battleId: battle.id },
    );
    return;
  }

  const player = game.players[action.playerId];
  if (!bankedAssetUseAllowed(game, action.playerId)) {
    throw new GameActionError('Palisade Wall is inactive and cannot be discarded for its effect.');
  }
  if (!removeOne(player.zones.assetBank, PALISADE_WALL)) {
    throw new GameActionError('Palisade Wall is no longer banked.');
  }
  player.zones.discard.push(PALISADE_WALL);
  const prohibited = new Set(battle.bankedAssetUseProhibited ?? []);
  prohibited.add(pending.targetPlayerId);
  battle.bankedAssetUseProhibited = [...prohibited];
  publicLog(
    game,
    action.playerId,
    'neutral_palisade_wall_asset_used',
    `${player.name} discarded Palisade Wall and made the attacker's banked Assets inactive for this battle.`,
    { battleId: battle.id, targetPlayerId: pending.targetPlayerId },
  );
}

/**
 * Every active physical Battle copy attempts the same single negation. Once the
 * opposing hand commitment is negated, additional copies have no further target.
 */
export function applyPalisadeWallBattleEffects(game: GameState): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'dice') return false;
  let applied = false;

  for (const source of [battle.attacker, battle.defender]) {
    const copies = activeCopies(source);
    if (copies.length < 1) continue;
    const opponent = source.playerId === battle.attacker.playerId
      ? battle.defender
      : battle.attacker;
    const target = opponent.handCommit;
    if (!target || target.canceled || target.negated) continue;

    for (const copy of copies) copy.earlyEffectResolved = true;
    if (counterintelligenceAssetActive(game, opponent.playerId)) {
      publicLog(
        game,
        source.playerId,
        'neutral_palisade_wall_negation_blocked',
        `${game.players[opponent.playerId].name}'s Counterintelligence protected their committed Battle card from Palisade Wall.`,
        { battleId: battle.id, targetPlayerId: opponent.playerId, targetCardId: target.cardId },
      );
      continue;
    }

    target.negated = true;
    publicLog(
      game,
      source.playerId,
      'neutral_palisade_wall_battle',
      `${game.players[source.playerId].name} negated ${target.cardId} with Palisade Wall.`,
      { battleId: battle.id, targetPlayerId: opponent.playerId, targetCardId: target.cardId },
    );
    applied = true;
  }
  return applied;
}
