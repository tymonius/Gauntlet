import type {
  GameState,
  InquisitionPurgeMode,
  PlayerID,
} from '../types/v06';
import type { ResolveInquisitionChoiceAction } from './actions';
import {
  defaultLeaderAbilityRegistry,
  type LeaderAbilityDefinition,
} from './leader-abilities';
import {
  legalFinalJudgmentPurgeOptions,
  useFinalJudgmentPurge,
} from './inquisition-purge';
import { GameActionError } from './reducer';

export const FINAL_JUDGMENT_ABILITY_ID = 'grand-inquisitor-final-judgment';
export const RELENTLESS_PURSUIT_ABILITY_ID = 'witch-hunter-relentless-pursuit';
export const FINAL_JUDGMENT_SENTINEL = 'inquisition-final-judgment';

function occupiedSpace(game: GameState, playerId: PlayerID) {
  return game.board.spaces.find((space) => space.occupant === playerId);
}

function canUseFinalJudgment(game: GameState, playerId: PlayerID): boolean {
  return game.recentBattleResult?.winner === playerId
    && legalFinalJudgmentPurgeOptions(game, playerId).length > 0;
}

function openFinalJudgmentChoice(game: GameState, playerId: PlayerID): void {
  const result = game.recentBattleResult;
  if (!result || result.winner !== playerId) {
    throw new GameActionError('Final Judgment requires a battle victory.');
  }
  const purgeOptions = legalFinalJudgmentPurgeOptions(game, playerId);
  if (purgeOptions.length === 0) {
    throw new GameActionError('No discounted Purge can be used for Final Judgment.');
  }
  game.pendingInquisitionChoice = {
    kind: 'final_judgment_purge',
    playerId,
    battleId: result.battleId,
    purgeOptions,
    options: ['select_purge'],
    resumePriorityPlayer: game.activePlayer,
  };
  game.priorityPlayer = playerId;
}

function canUseRelentlessPursuit(game: GameState, playerId: PlayerID): boolean {
  const result = game.recentBattleResult;
  if (!result
    || result.winner !== playerId
    || result.defender !== playerId
    || result.attacker !== result.loser
    || game.activePlayer !== result.loser) return false;
  const current = occupiedSpace(game, playerId);
  if (!current) return false;
  return game.board.spaces.some((space) => space.index === current.index + result.retreatDirection);
}

function queueRelentlessPursuit(game: GameState, playerId: PlayerID): void {
  const result = game.recentBattleResult;
  if (!result || !canUseRelentlessPursuit(game, playerId)) {
    throw new GameActionError('Relentless Pursuit requires winning a battle the opponent initiated against you.');
  }
  game.inquisitionRelentlessPursuitRequest = {
    playerId,
    loserId: result.loser,
    direction: result.retreatDirection,
  };
}

export const inquisitionLeaderAbilityDefinitions: readonly LeaderAbilityDefinition[] = [
  {
    id: FINAL_JUDGMENT_ABILITY_ID,
    leaderName: 'Grand Inquisitor',
    name: 'Final Judgment',
    text: 'Once per turn, after you win a battle, you may immediately Purge without spending an Action. Reduce that Purge’s Conviction cost by 1, to a minimum of 1.',
    timing: 'after_battle',
    usageLimit: 'once_per_turn',
    canUse: canUseFinalJudgment,
    resolve: openFinalJudgmentChoice,
  },
  {
    id: RELENTLESS_PURSUIT_ABILITY_ID,
    leaderName: 'Witch Hunter',
    name: 'Relentless Pursuit',
    text: 'Once per turn, after you win a battle the opponent initiated against you, you may spend 2 Conviction. End the opponent’s turn; move one position toward the opponent’s end of the Gauntlet. No Action Opportunity occurs between the ended turn and this movement.',
    timing: 'after_battle',
    usageLimit: 'once_per_turn',
    cost: { resource: 'conviction', amount: 2 },
    canUse: canUseRelentlessPursuit,
    resolve: queueRelentlessPursuit,
  },
];

for (const definition of inquisitionLeaderAbilityDefinitions) {
  if (!defaultLeaderAbilityRegistry.get(definition.id)) {
    defaultLeaderAbilityRegistry.register(definition);
  }
}

export function isFinalJudgmentChoice(kind: unknown): kind is 'final_judgment_purge' {
  return kind === 'final_judgment_purge';
}

export function resolveFinalJudgmentChoice(
  game: GameState,
  action: ResolveInquisitionChoiceAction,
): void {
  const pending = game.pendingInquisitionChoice;
  if (!pending || pending.kind !== 'final_judgment_purge' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Final Judgment choice.`);
  }
  const mode = action.choice as InquisitionPurgeMode | undefined;
  if (!mode || !pending.purgeOptions.some((option) => (
    option.mode === mode
    && (option.cardId === undefined || option.cardId === action.cardId)
    && (option.cardIds === undefined || option.cardIds.length === action.cardIds?.length)
  ))) {
    throw new GameActionError('Choose an available discounted Purge for Final Judgment.');
  }
  const resumePriorityPlayer = pending.resumePriorityPlayer;
  game.pendingInquisitionChoice = undefined;
  useFinalJudgmentPurge(game, action.playerId, {
    mode,
    cardId: action.cardId === FINAL_JUDGMENT_SENTINEL ? undefined : action.cardId,
    cardIds: action.cardIds,
  }, resumePriorityPlayer);
  if (!game.pendingInquisitionChoice) {
    game.priorityPlayer = resumePriorityPlayer ?? game.activePlayer;
  }
}

export function consumeRelentlessPursuitRequest(game: GameState) {
  const request = game.inquisitionRelentlessPursuitRequest;
  game.inquisitionRelentlessPursuitRequest = undefined;
  return request;
}

function pursuitResumeBlocked(game: GameState): boolean {
  return Boolean(
    game.battle
    || game.pendingInquisitionChoice
    || game.pendingMysticsChoice
    || game.pendingIntelligenceChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingLeaderAbilityWindow
    || game.inquisitionAccusationQueue?.length
    || game.inquisitionPenanceQueue?.length
    || game.inquisitionDivineMercyQueue?.length
    || game.inquisitionExcommunicationQueue?.length
    || game.inquisitionGuiltByAssociationQueue?.length
    || game.inquisitionActOfFaithQueue?.length
    || game.inquisitionBurningAtTheStakeQueue?.length
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length > 0,
  );
}

export function resumeRelentlessPursuitTurnStart(game: GameState): boolean {
  const resume = game.inquisitionRelentlessPursuitResume;
  if (!resume || pursuitResumeBlocked(game)) return false;
  if (game.activePlayer !== resume.playerId || game.turn !== resume.turn) {
    game.inquisitionRelentlessPursuitResume = undefined;
    return false;
  }
  game.inquisitionRelentlessPursuitResume = undefined;
  game.recentBattleResult = undefined;
  if (game.phase !== 'game_over') {
    game.phase = 'turn_start';
    game.priorityPlayer = resume.playerId;
  }
  return true;
}
