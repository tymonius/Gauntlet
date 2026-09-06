import type {
  BattleParticipantState,
  BattlePlayedCard,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { ResolveInquisitionChoiceAction } from './actions';
import {
  addReplayedBattleCard,
  replayableBattleEffectsIn,
} from './battle-effect-replay';
import { spendFactionResource } from './resources';
import { GameActionError } from './reducer';

export const HERESY = 'inquisition-heresy';

function publicLog(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
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

function activeHeresy(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card
    && card.cardId === HERESY
    && !card.canceled
    && !card.negated
    && !card.virtual);
}

interface HeresySource {
  playerId: PlayerID;
  card: BattlePlayedCard;
}

function unresolvedSource(participant: BattleParticipantState): HeresySource | undefined {
  if (activeHeresy(participant.handCommit) && !participant.handCommit.postRevealEffectResolved) {
    return { playerId: participant.playerId, card: participant.handCommit };
  }
  const card = participant.battleDrawPlayed.find((candidate) => (
    activeHeresy(candidate) && !candidate.postRevealEffectResolved
  ));
  return card ? { playerId: participant.playerId, card } : undefined;
}

function nextSource(game: GameState): HeresySource | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  return unresolvedSource(battle.attacker) ?? unresolvedSource(battle.defender);
}

function opponentId(game: GameState, playerId: PlayerID): PlayerID {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.defender.playerId;
  if (battle.defender.playerId === playerId) return battle.attacker.playerId;
  throw new GameActionError(`${playerId} is not participating in this battle.`);
}

function hasFourConviction(game: GameState, playerId: PlayerID): boolean {
  return (game.players[playerId].resources?.conviction?.value ?? 0) >= 4;
}

function hasBlockingWindow(game: GameState): boolean {
  return Boolean(
    game.pendingInquisitionChoice
    || game.pendingMysticsChoice
    || game.pendingIntelligenceChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length > 0,
  );
}

export function heresyGraveyardOptions(game: GameState, playerId: PlayerID): CardID[] {
  const opponent = opponentId(game, playerId);
  return [...new Set(replayableBattleEffectsIn(
    game,
    playerId,
    game.players[opponent].zones.graveyard,
  ))];
}

export function openNextHeresyChoice(game: GameState): boolean {
  if (hasBlockingWindow(game) || game.battle?.stage !== 'dice') return false;
  while (true) {
    const source = nextSource(game);
    if (!source) return false;
    source.card.postRevealEffectResolved = true;
    if (!hasFourConviction(game, source.playerId)) continue;
    const graveyardOptions = heresyGraveyardOptions(game, source.playerId);
    if (graveyardOptions.length === 0) continue;
    game.pendingInquisitionChoice = {
      kind: 'heresy_replay',
      playerId: source.playerId,
      opponentId: opponentId(game, source.playerId),
      battleId: game.battle.id,
      graveyardOptions,
      options: ['pass', 'replay'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = source.playerId;
    return true;
  }
}

export function isHeresyChoice(kind: unknown): kind is 'heresy_replay' {
  return kind === 'heresy_replay';
}

export function resolveHeresyChoice(game: GameState, action: ResolveInquisitionChoiceAction): CardID | undefined {
  const pending = game.pendingInquisitionChoice;
  if (!pending || pending.kind !== 'heresy_replay' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Heresy choice.`);
  }
  if (!game.battle || game.battle.id !== pending.battleId || game.battle.stage !== 'dice') {
    throw new GameActionError('The Heresy battle window is no longer open.');
  }
  const resumePriority = pending.resumePriorityPlayer;
  game.pendingInquisitionChoice = undefined;
  if (action.choice === 'pass') {
    game.priorityPlayer = resumePriority ?? game.activePlayer;
    return undefined;
  }
  if (action.choice !== 'replay' || !pending.graveyardOptions.includes(action.cardId)) {
    throw new GameActionError('Choose an eligible opposing Graveyard card or pass Heresy.');
  }
  if (!game.players[pending.opponentId].zones.graveyard.includes(action.cardId)) {
    throw new GameActionError('The chosen Heresy card is no longer in the opponent’s Graveyard.');
  }
  if (!heresyGraveyardOptions(game, action.playerId).includes(action.cardId)) {
    throw new GameActionError('The chosen Battle effect can no longer resolve at this timing.');
  }

  spendFactionResource(game, action.playerId, 'conviction', 4, HERESY);
  const replayed = addReplayedBattleCard(game, action.playerId, action.cardId);
  replayed.virtual = true;
  game.priorityPlayer = resumePriority ?? game.activePlayer;
  publicLog(
    game,
    action.playerId,
    'inquisition_heresy_replayed',
    `${game.players[action.playerId].name} spent 4 Conviction to resolve ${action.cardId} from ${game.players[pending.opponentId].name}’s Graveyard with Heresy.`,
    {
      battleId: pending.battleId,
      cardId: action.cardId,
      opponentId: pending.opponentId,
      chosenCardRemainsInGraveyard: true,
    },
  );
  return action.cardId;
}
