import type {
  ArcaneKnowledgeBattleSource,
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
  ResolveNeutralChoiceAction,
} from './actions';
import {
  addVirtualReplayedBattleCard,
  replayableBattleEffectsIn,
} from './battle-effect-replay';
import { resolveBattleRevealCancellations } from './battle-reveal';
import { GameActionError } from './reducer';

export const ARCANE_KNOWLEDGE = 'neutral-arcane-knowledge';

export interface PreparedArcaneKnowledgeAction {
  targetCardId: CardID;
}

interface ArcaneKnowledgeSource {
  participant: BattleParticipantState;
  card: BattlePlayedCard;
  source: ArcaneKnowledgeBattleSource;
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

function unique(cards: readonly CardID[]): CardID[] {
  return [...new Set(cards)];
}

export function canResolveArcaneKnowledgeAction(game: GameState, playerId: PlayerID): boolean {
  return (game.players[playerId]?.zones.graveyard.length ?? 0) > 0;
}

export function prepareArcaneKnowledgeAction(
  game: GameState,
  action: PlayActionCardAction,
): PreparedArcaneKnowledgeAction | undefined {
  if (action.cardId !== ARCANE_KNOWLEDGE) return undefined;
  const player = game.players[action.playerId];
  if (!player) throw new GameActionError(`Unknown player: ${action.playerId}.`);
  if (!player.zones.hand.includes(ARCANE_KNOWLEDGE)) {
    throw new GameActionError(`${player.name} does not have Arcane Knowledge in hand.`);
  }
  const targets = action.targets ?? [];
  if (targets.length !== 1 || targets[0].kind !== 'card' || targets[0].owner !== action.playerId) {
    throw new GameActionError('Arcane Knowledge requires exactly one card from your own Graveyard.');
  }
  if (!player.zones.graveyard.includes(targets[0].cardId)) {
    throw new GameActionError('The chosen Arcane Knowledge card is not in your Graveyard.');
  }
  return { targetCardId: targets[0].cardId };
}

export function applyArcaneKnowledgeAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedArcaneKnowledgeAction,
): void {
  const player = game.players[playerId];
  if (!removeOne(player.zones.graveyard, prepared.targetCardId)) {
    throw new GameActionError(`${prepared.targetCardId} is no longer in your Graveyard.`);
  }
  player.zones.discard.push(prepared.targetCardId);
  appendPublicLog(
    game,
    playerId,
    'neutral_arcane_knowledge_action',
    `${player.name} moved ${prepared.targetCardId} from their Graveyard to their Discard Pile with Arcane Knowledge.`,
    { cardId: prepared.targetCardId },
  );
}

function activeArcaneKnowledge(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === ARCANE_KNOWLEDGE
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function unresolvedSource(participant: BattleParticipantState): ArcaneKnowledgeSource | undefined {
  if (activeArcaneKnowledge(participant.handCommit) && !participant.handCommit.postRevealEffectResolved) {
    return {
      participant,
      card: participant.handCommit,
      source: { zone: 'hand_commit' },
    };
  }
  for (const [index, card] of participant.battleDrawPlayed.entries()) {
    if (!activeArcaneKnowledge(card) || card.postRevealEffectResolved) continue;
    return {
      participant,
      card,
      source: { zone: 'battle_draw_played', index },
    };
  }
  return undefined;
}

function nextSource(game: GameState): ArcaneKnowledgeSource | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  return unresolvedSource(battle.attacker) ?? unresolvedSource(battle.defender);
}

function sourceCard(
  participant: BattleParticipantState,
  source: ArcaneKnowledgeBattleSource,
): BattlePlayedCard | undefined {
  return source.zone === 'hand_commit'
    ? participant.handCommit
    : participant.battleDrawPlayed[source.index];
}

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new GameActionError(`${playerId} is not participating in this battle.`);
}

function hasBlockingWindow(game: GameState): boolean {
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

export function openNextArcaneKnowledgeChoice(
  game: GameState,
  action: ResolveBattleRevealAction,
): boolean {
  if (hasBlockingWindow(game)) return false;
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || battle.effectsResolved.includes('before_battle_resolution')) return false;

  while (true) {
    const source = nextSource(game);
    if (!source) return false;
    const graveyardOptions = unique(replayableBattleEffectsIn(
      game,
      source.participant.playerId,
      game.players[source.participant.playerId].zones.graveyard,
    ));
    if (graveyardOptions.length === 0) {
      source.card.postRevealEffectResolved = true;
      continue;
    }

    game.pendingNeutralChoice = {
      kind: 'arcane_knowledge_battle',
      playerId: source.participant.playerId,
      battleId: battle.id,
      source: source.source,
      resolverPlayerId: action.playerId,
      battleCardTargets: action.battleCardTargets,
      graveyardOptions,
      options: ['select_card'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = source.participant.playerId;
    return true;
  }
}

export function prepareArcaneKnowledgeBattleReveal(
  game: GameState,
  action: ResolveBattleRevealAction,
): boolean {
  resolveBattleRevealCancellations(game, action);
  return openNextArcaneKnowledgeChoice(game, action);
}

export function resolveArcaneKnowledgeChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): { deferredBattleAction?: ResolveBattleRevealAction } {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'arcane_knowledge_battle' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Arcane Knowledge choice.`);
  }
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId || battle.stage !== 'dice') {
    throw new GameActionError('The Arcane Knowledge battle window is no longer open.');
  }
  if (action.choice !== 'select_card' || !action.cardId || !pending.graveyardOptions.includes(action.cardId)) {
    throw new GameActionError('Choose an eligible Battle effect from your Graveyard for Arcane Knowledge.');
  }

  const deferredBattleAction: ResolveBattleRevealAction = {
    type: 'resolve_battle_reveal',
    playerId: pending.resolverPlayerId,
    battleCardTargets: pending.battleCardTargets,
  };
  const participant = participantFor(game, pending.playerId);
  const source = sourceCard(participant, pending.source);
  if (!activeArcaneKnowledge(source) || source.postRevealEffectResolved) {
    throw new GameActionError('The Arcane Knowledge source is no longer active.');
  }
  const player = game.players[pending.playerId];
  if (!player.zones.graveyard.includes(action.cardId)
    || replayableBattleEffectsIn(game, pending.playerId, [action.cardId]).length !== 1) {
    throw new GameActionError(`${action.cardId} can no longer resolve from your Graveyard.`);
  }

  source.postRevealEffectResolved = true;
  addVirtualReplayedBattleCard(game, pending.playerId, action.cardId);
  const resumePriority = pending.resumePriorityPlayer;
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;
  appendPublicLog(
    game,
    pending.playerId,
    'neutral_arcane_knowledge_battle',
    `${player.name} resolved ${action.cardId} from their Graveyard with Arcane Knowledge.`,
    {
      battleId: battle.id,
      cardId: action.cardId,
      source: pending.source,
    },
  );
  if (openNextArcaneKnowledgeChoice(game, deferredBattleAction)) return {};
  return { deferredBattleAction };
}
