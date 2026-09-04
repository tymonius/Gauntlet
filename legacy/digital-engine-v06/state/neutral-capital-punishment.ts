import { CAPITAL_PUNISHMENT } from '../effects/capital-punishment';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type {
  PlayActionCardAction,
  ResolveBattleRevealAction,
} from './actions';
import { GameActionError } from './reducer';

export { CAPITAL_PUNISHMENT };

export interface PreparedCapitalPunishmentAction {
  targetPlayerId: PlayerID;
  targetCardId: CardID;
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

function wonBattleThisTurn(game: GameState, playerId: PlayerID): boolean {
  return game.log.some((event) => (
    event.turn === game.turn
    && event.type === 'battle_resolved'
    && (event.payload as { winner?: PlayerID } | undefined)?.winner === playerId
  ));
}

function opposingPlayers(game: GameState, playerId: PlayerID) {
  return Object.values(game.players).filter((player) => player.id !== playerId);
}

export function canResolveCapitalPunishmentAction(game: GameState, playerId: PlayerID): boolean {
  return wonBattleThisTurn(game, playerId)
    && opposingPlayers(game, playerId).some((player) => player.zones.assetBank.length > 0);
}

export function prepareCapitalPunishmentAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedCapitalPunishmentAction {
  if (action.cardId !== CAPITAL_PUNISHMENT) {
    throw new GameActionError('Capital Punishment was not played.');
  }
  if (!wonBattleThisTurn(game, action.playerId)) {
    throw new GameActionError('Capital Punishment requires you to have won a battle this turn.');
  }
  if (action.targets?.length !== 1 || action.targets[0].kind !== 'card') {
    throw new GameActionError('Capital Punishment requires one opposing Asset target.');
  }

  const target = action.targets[0];
  if (target.owner === action.playerId) {
    throw new GameActionError('Capital Punishment must target an opposing Asset.');
  }
  const targetPlayer = game.players[target.owner];
  if (!targetPlayer?.zones.assetBank.includes(target.cardId)) {
    throw new GameActionError('Capital Punishment must target an opposing Asset that remains banked.');
  }
  return { targetPlayerId: target.owner, targetCardId: target.cardId };
}

export function applyCapitalPunishmentAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedCapitalPunishmentAction,
): void {
  const targetPlayer = game.players[prepared.targetPlayerId];
  if (!targetPlayer || !removeOne(targetPlayer.zones.assetBank, prepared.targetCardId)) {
    throw new GameActionError('The chosen Capital Punishment target is no longer banked.');
  }
  targetPlayer.zones.graveyard.push(prepared.targetCardId);
  appendPublicLog(
    game,
    playerId,
    'neutral_capital_punishment_action',
    `${game.players[playerId].name} put ${targetPlayer.name}'s ${prepared.targetCardId} in the Graveyard with Capital Punishment.`,
    { targetPlayerId: targetPlayer.id, targetCardId: prepared.targetCardId },
  );
}

function active(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && !card.canceled && !card.negated && !card.virtual);
}

export function activeCapitalPunishmentCards(
  participant: BattleParticipantState,
): BattlePlayedCard[] {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((card): card is BattlePlayedCard => active(card) && card.cardId === CAPITAL_PUNISHMENT);
}

export function capitalPunishmentTargetCards(
  participant: BattleParticipantState,
): BattlePlayedCard[] {
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((card): card is BattlePlayedCard => active(card));
}

interface CapitalPunishmentResolution {
  source: BattlePlayedCard;
  target: BattlePlayedCard;
  sourceOwner: PlayerID;
}

function selectedTargetsFor(
  action: ResolveBattleRevealAction,
  sourceOwner: PlayerID,
) {
  return (action.battleCardTargets ?? []).filter((target) => (
    target.sourceCardId === CAPITAL_PUNISHMENT
    && target.sourceOwner === sourceOwner
  ));
}

export function applyCapitalPunishmentBattleEffects(
  game: GameState,
  action: ResolveBattleRevealAction,
): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'dice') return false;

  const resolutions: CapitalPunishmentResolution[] = [];
  for (const participant of [battle.attacker, battle.defender]) {
    const opponent = participant.playerId === battle.attacker.playerId
      ? battle.defender
      : battle.attacker;
    const sources = activeCapitalPunishmentCards(participant);
    const availableTargets = capitalPunishmentTargetCards(opponent);
    const chosenTargets = selectedTargetsFor(action, participant.playerId);
    const requiredTargetCount = Math.min(sources.length, availableTargets.length);

    if (chosenTargets.length < requiredTargetCount) {
      throw new GameActionError('Capital Punishment requires a target for each active copy, if able.');
    }
    if (chosenTargets.length > requiredTargetCount) {
      throw new GameActionError('Capital Punishment has too many targets.');
    }

    const remainingSources = [...sources];
    const remainingTargets = [...availableTargets];
    for (const chosen of chosenTargets) {
      if (chosen.targetOwner !== opponent.playerId) {
        throw new GameActionError('Capital Punishment must target an active opposing Battle card.');
      }
      const source = remainingSources.shift();
      const targetIndex = remainingTargets.findIndex((card) => (
        card.cardId === chosen.targetCardId
        && card.owner === chosen.targetOwner
      ));
      const target = targetIndex >= 0 ? remainingTargets.splice(targetIndex, 1)[0] : undefined;
      if (!source || !target) {
        throw new GameActionError('Capital Punishment must target an active opposing Battle card.');
      }
      resolutions.push({ source, target, sourceOwner: participant.playerId });
    }
  }

  for (const resolution of resolutions) {
    resolution.source.earlyEffectResolved = true;
    resolution.target.negated = true;
    resolution.target.capitalPunishmentBy = [
      ...(resolution.target.capitalPunishmentBy ?? []),
      resolution.sourceOwner,
    ];
    appendPublicLog(
      game,
      resolution.sourceOwner,
      'neutral_capital_punishment_battle',
      `${game.players[resolution.sourceOwner].name} negated ${resolution.target.cardId} with Capital Punishment.`,
      {
        battleId: battle.id,
        targetPlayerId: resolution.target.owner,
        targetCardId: resolution.target.cardId,
      },
    );
  }
  return resolutions.length > 0;
}
