import { cardCanBePlayedAt } from '../cards/playability';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type {
  ResolveBattleRevealAction,
  ResolveNeutralChoiceAction,
  UseNeutralReinforcementsAssetAction,
} from './actions';
import { bankedAssetCardUseAllowed } from './banked-assets';
import { resolveBattleRevealCancellations } from './battle-reveal';
import { drawFromDeck } from './draw';
import { GameActionError } from './reducer';

export const REINFORCEMENTS = 'neutral-reinforcements';

const TOO_LATE_AFTER_REVEAL = new Set([
  'card-embargo',
  'neutral-disruption',
  'neutral-sabotage',
  'neutral-palisade-wall',
  'neutral-scouting-report',
  'intelligence-spies',
  'intelligence-intercepted-orders',
  'intelligence-treason',
  'inquisition-confession',
  'neutral-armistice',
]);

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

function participant(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new GameActionError(`${playerId} is not participating in the battle.`);
}

function activeSource(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === REINFORCEMENTS
    && !card.canceled
    && !card.negated
    && !card.virtual
    && !card.earlyEffectResolved,
  );
}

function nextSource(game: GameState): { owner: PlayerID; card: BattlePlayedCard } | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  for (const side of [battle.attacker, battle.defender]) {
    const card = [side.handCommit, ...side.battleDrawPlayed].find(activeSource);
    if (card) return { owner: side.playerId, card };
  }
  return undefined;
}

function cardCanStillResolve(cardId: string): boolean {
  return cardCanBePlayedAt(cardId, 'battle_draw_play', 'battle_draw')
    && !TOO_LATE_AFTER_REVEAL.has(cardId);
}

export function reinforcementsActionOpportunityActive(game: GameState, playerId: PlayerID): boolean {
  const opportunity = game.neutralReinforcementsActionOpportunity;
  return opportunity?.playerId === playerId && opportunity.turn === game.turn;
}

export function canUseReinforcementsAsset(game: GameState, playerId: PlayerID): boolean {
  const player = game.players[playerId];
  if (!player || game.activePlayer !== playerId || game.priorityPlayer !== playerId) return false;
  if (game.phase !== 'action_before_movement' && game.phase !== 'action_after_movement') return false;
  if (reinforcementsActionOpportunityActive(game, playerId)) return false;
  if (!bankedAssetCardUseAllowed(game, playerId, REINFORCEMENTS)) return false;
  return player.actionsRemaining < 1 || player.hasPlayedActionThisTurn || player.hasPlayedBattleThisTurn;
}

export function useReinforcementsAsset(
  game: GameState,
  action: UseNeutralReinforcementsAssetAction,
): void {
  if (!canUseReinforcementsAsset(game, action.playerId)) {
    throw new GameActionError('Reinforcements cannot grant an additional Action and Action Opportunity now.');
  }
  const player = game.players[action.playerId];
  const index = player.zones.assetBank.indexOf(REINFORCEMENTS);
  if (index < 0) throw new GameActionError('Reinforcements is no longer banked.');
  player.zones.assetBank.splice(index, 1);
  player.zones.discard.push(REINFORCEMENTS);
  player.actionsRemaining += 1;
  game.neutralReinforcementsActionOpportunity = { playerId: action.playerId, turn: game.turn };
  publicLog(
    game,
    action.playerId,
    'neutral_reinforcements_asset_used',
    `${player.name} discarded Reinforcements to gain 1 Action and take another Action Opportunity.`,
  );
}

export function consumeReinforcementsActionOpportunity(game: GameState, playerId: PlayerID): void {
  if (reinforcementsActionOpportunityActive(game, playerId)) {
    game.neutralReinforcementsActionOpportunity = undefined;
  }
}

export function clearReinforcementsActionOpportunity(game: GameState, playerId: PlayerID): void {
  if (game.neutralReinforcementsActionOpportunity?.playerId === playerId) {
    game.neutralReinforcementsActionOpportunity = undefined;
  }
}

function openNextBattleChoice(game: GameState, action: ResolveBattleRevealAction): boolean {
  const battle = game.battle;
  if (!battle || battle.stage !== 'dice') return false;

  while (true) {
    const source = nextSource(game);
    if (!source) return false;
    source.card.earlyEffectResolved = true;
    const player = game.players[source.owner];
    const drawn = drawFromDeck(player, { count: 1 }).drawnCards;
    if (drawn.length === 0) {
      publicLog(game, source.owner, 'neutral_reinforcements_battle_empty', `${player.name} could not draw with Reinforcements.`);
      continue;
    }
    const drawnCardId = drawn[0];
    participant(game, source.owner).battleDraw.push(drawnCardId);
    const canPlay = cardCanStillResolve(drawnCardId);
    publicLog(
      game,
      source.owner,
      'neutral_reinforcements_battle_draw',
      `${player.name} drew one additional card into their Battle Hand with Reinforcements.`,
      { canPlay },
    );
    if (!canPlay) continue;

    game.pendingNeutralChoice = {
      kind: 'reinforcements_battle',
      playerId: source.owner,
      battleId: battle.id,
      drawnCardId,
      canPlay,
      resolverPlayerId: action.playerId,
      battleCardTargets: action.battleCardTargets,
      options: ['pass', 'use'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = source.owner;
    return true;
  }
}

/** Returns true when reveal resolution is paused for a Reinforcements choice. */
export function prepareReinforcementsBattleReveal(
  game: GameState,
  action: ResolveBattleRevealAction,
): boolean {
  resolveBattleRevealCancellations(game, action);
  return openNextBattleChoice(game, action);
}

export function resolveReinforcementsChoice(
  game: GameState,
  action: ResolveNeutralChoiceAction,
): { deferredBattleAction?: ResolveBattleRevealAction } {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'reinforcements_battle' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Reinforcements choice.`);
  }
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId || battle.stage !== 'dice') {
    throw new GameActionError('The Reinforcements battle trigger is no longer available.');
  }
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new GameActionError('Choose whether to reveal the card drawn with Reinforcements.');
  }

  const resumePriorityPlayer = pending.resumePriorityPlayer;
  const deferredBattleAction: ResolveBattleRevealAction = {
    type: 'resolve_battle_reveal',
    playerId: pending.resolverPlayerId,
    battleCardTargets: pending.battleCardTargets,
  };
  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = resumePriorityPlayer ?? pending.resolverPlayerId;

  if (action.choice === 'use') {
    if (!pending.canPlay) throw new GameActionError('That card’s Battle effect can no longer resolve.');
    const side = participant(game, action.playerId);
    const index = side.battleDraw.indexOf(pending.drawnCardId);
    if (index < 0) throw new GameActionError('The Reinforcements card is no longer in the Battle Hand.');
    side.battleDraw.splice(index, 1);
    side.battleDrawPlayed.push({
      cardId: pending.drawnCardId,
      owner: action.playerId,
      origin: 'battle_draw',
      faceDown: false,
      canceled: false,
      fromInitialBattleHand: false,
    });
    publicLog(
      game,
      action.playerId,
      'neutral_reinforcements_battle_played',
      `${game.players[action.playerId].name} revealed ${pending.drawnCardId} with Reinforcements.`,
      { cardId: pending.drawnCardId },
    );
  }

  if (openNextBattleChoice(game, deferredBattleAction)) return {};
  return { deferredBattleAction };
}
