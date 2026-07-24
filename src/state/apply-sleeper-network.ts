import type { CardID, GameState, PlayerID } from '../types';
import type { AppStateAction } from './actions';
import { applyGameAction as applyExfiltrationGameAction } from './apply-exfiltration';
import {
  continueSleeperNetworkActivation,
  isSleeperNetworkChoice,
  maybeOpenSleeperNetworkEndTurnWindow,
  resolveSleeperNetworkChoice,
} from './intelligence-sleeper-network';
import { runPostActionAutomationPipeline } from './pipeline';
import type { ApplyGameActionResult } from './reducer';

function hasPendingWindow(game: GameState): boolean {
  return Boolean(
    game.pendingIntelligenceChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length > 0,
  );
}

function activeSleeperOwner(game: GameState): PlayerID | undefined {
  return Object.values(game.players).find((player) => player.intelligence?.sleeperNetwork?.activation)?.id;
}

function restoreActionState(
  game: GameState,
  playerId: PlayerID,
  snapshot: {
    phase: GameState['phase'];
    actionsRemaining: number;
    hasPlayedActionThisTurn: boolean;
    hasPlayedBattleThisTurn: boolean;
    existingCopies: number;
    cardId: CardID;
  },
): void {
  const player = game.players[playerId];
  game.phase = snapshot.phase;
  player.actionsRemaining = snapshot.actionsRemaining;
  player.hasPlayedActionThisTurn = snapshot.hasPlayedActionThisTurn;
  player.hasPlayedBattleThisTurn = snapshot.hasPlayedBattleThisTurn;
  const copiesNow = player.zones.hand.filter((cardId) => cardId === snapshot.cardId).length;
  for (let index = copiesNow; index < snapshot.existingCopies; index += 1) player.zones.hand.push(snapshot.cardId);
  const pending = game.pendingIntelligenceChoice;
  if (pending?.kind === 'spies_discard' && snapshot.existingCopies > 0 && !pending.handOptions.includes(snapshot.cardId)) {
    pending.handOptions.push(snapshot.cardId);
  }
}

function playSleeperActionCard(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  targets?: Extract<AppStateAction, { type: 'play_action_card' }>['targets'],
): ApplyGameActionResult {
  const working = structuredClone(game);
  const player = working.players[playerId];
  const snapshot = {
    phase: working.phase,
    actionsRemaining: player.actionsRemaining,
    hasPlayedActionThisTurn: player.hasPlayedActionThisTurn,
    hasPlayedBattleThisTurn: player.hasPlayedBattleThisTurn,
    existingCopies: player.zones.hand.filter((candidate) => candidate === cardId).length,
    cardId,
  };

  player.zones.hand.push(cardId);
  working.phase = 'action_before_movement';
  player.actionsRemaining = Math.max(player.actionsRemaining, 1);
  player.hasPlayedActionThisTurn = false;
  player.hasPlayedBattleThisTurn = false;

  const result = applyExfiltrationGameAction(working, {
    type: 'play_action_card',
    playerId,
    cardId,
    targets,
  });
  restoreActionState(result.state, playerId, snapshot);
  return result;
}

function continueActivationIfReady(game: GameState): void {
  if (hasPendingWindow(game)) return;
  const owner = activeSleeperOwner(game);
  if (owner) continueSleeperNetworkActivation(game, owner);
}

export function applyGameAction(game: GameState, action: AppStateAction): ApplyGameActionResult {
  if (action.type === 'resolve_intelligence_choice'
    && isSleeperNetworkChoice(game.pendingIntelligenceChoice?.kind)) {
    const next = structuredClone(game);
    const resolution = resolveSleeperNetworkChoice(next, action);

    if (resolution.kind === 'end_turn') {
      return applyExfiltrationGameAction(next, { type: 'end_turn', playerId: action.playerId });
    }
    if (resolution.kind === 'play_card' && resolution.cardId) {
      const result = playSleeperActionCard(next, action.playerId, resolution.cardId, resolution.targets);
      continueActivationIfReady(result.state);
      runPostActionAutomationPipeline(result.state);
      return result;
    }

    continueActivationIfReady(next);
    runPostActionAutomationPipeline(next);
    return { state: next };
  }

  if (action.type === 'end_turn') {
    const next = structuredClone(game);
    if (maybeOpenSleeperNetworkEndTurnWindow(next, action.playerId)) {
      runPostActionAutomationPipeline(next);
      return { state: next };
    }
  }

  const result = applyExfiltrationGameAction(game, action);
  continueActivationIfReady(result.state);
  runPostActionAutomationPipeline(result.state);
  return result;
}
