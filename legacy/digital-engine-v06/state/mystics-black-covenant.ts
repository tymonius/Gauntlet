import { cardCanBePlayedAt, getCardPlayRule } from '../cards/playability';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  BlackCovenantBindingState,
  CardID,
  GameEvent,
  GameState,
  PendingBlackCovenantBattleChoice,
  PlayerID,
} from '../types/v06';
import type {
  ActionCardTarget,
  ResolveMysticsChoiceAction,
  UseMysticBlackCovenantAction,
  UseMysticBlackCovenantBattleAction,
} from './actions';
import { bankedAssetCardUseAllowed } from './intelligence-subversion-battle';
import { GameActionError } from './reducer';

export const BLACK_COVENANT = 'mystics-black-covenant';

export interface PreparedBlackCovenantAction {
  cardId: CardID;
  targets?: ActionCardTarget[];
  actionsRemaining: number;
  hasPlayedActionThisTurn: boolean;
  hasPlayedBattleThisTurn: boolean;
}

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

function privateLog(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor,
    type,
    message,
    payload,
    visibility: 'private',
    visibleTo: [actor],
  } satisfies GameEvent);
}

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function mysticsState(game: GameState, playerId: PlayerID) {
  const player = game.players[playerId];
  if (!player?.mystics) throw new GameActionError(`${playerId} is not using the Mystics faction.`);
  return player.mystics;
}

function participant(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new GameActionError(`${playerId} is not participating in this battle.`);
}

function nextBindingId(game: GameState, playerId: PlayerID): string {
  const mystics = mysticsState(game, playerId);
  mystics.blackCovenantBindingSequence = (mystics.blackCovenantBindingSequence ?? 0) + 1;
  return `${playerId}-black-covenant-${mystics.blackCovenantBindingSequence}`;
}

function bindingFor(game: GameState, playerId: PlayerID, bindingId: string): BlackCovenantBindingState {
  const binding = mysticsState(game, playerId).blackCovenantBindings?.find((candidate) => candidate.id === bindingId);
  if (!binding) throw new GameActionError('That Black Covenant binding is no longer available.');
  return binding;
}

function removeBinding(game: GameState, playerId: PlayerID, bindingId: string): BlackCovenantBindingState {
  const mystics = mysticsState(game, playerId);
  const index = mystics.blackCovenantBindings?.findIndex((candidate) => candidate.id === bindingId) ?? -1;
  if (index < 0 || !mystics.blackCovenantBindings) {
    throw new GameActionError('That Black Covenant binding is no longer available.');
  }
  const [binding] = mystics.blackCovenantBindings.splice(index, 1);
  if (mystics.blackCovenantBindings.length === 0) mystics.blackCovenantBindings = undefined;
  return binding;
}

function selectedBindingTarget(
  game: GameState,
  playerId: PlayerID,
  targets: ActionCardTarget[] | undefined,
): CardID {
  const selected = targets?.filter((target): target is Extract<ActionCardTarget, { kind: 'card' }> => (
    target.kind === 'card' && target.owner === playerId
  )) ?? [];
  if (selected.length !== 1) throw new GameActionError('Black Covenant must bind exactly one other card from your hand.');
  const cardId = selected[0].cardId;
  if (cardId === BLACK_COVENANT) {
    throw new GameActionError('Black Covenant cannot bind another Black Covenant copy in the current digital rules slice.');
  }
  if (!game.players[playerId].zones.hand.includes(cardId)) {
    throw new GameActionError('The chosen Black Covenant card is not in your hand.');
  }
  return cardId;
}

export function requireBlackCovenantActionTarget(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  targets: ActionCardTarget[] | undefined,
): void {
  if (cardId !== BLACK_COVENANT) return;
  selectedBindingTarget(game, playerId, targets);
}

export function applyBlackCovenantAction(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  targets: ActionCardTarget[] | undefined,
): boolean {
  if (cardId !== BLACK_COVENANT) return false;
  const player = game.players[playerId];
  if (!player.zones.assetBank.includes(BLACK_COVENANT)) {
    throw new GameActionError('Black Covenant did not reach the Asset Bank.');
  }
  const boundCardId = selectedBindingTarget(game, playerId, targets);
  if (!removeOne(player.zones.hand, boundCardId)) throw new GameActionError('The chosen card is no longer in your hand.');
  const binding: BlackCovenantBindingState = {
    id: nextBindingId(game, playerId),
    cardId: boundCardId,
    boundTurn: game.turn,
  };
  player.mystics!.blackCovenantBindings ??= [];
  player.mystics!.blackCovenantBindings.push(binding);
  publicLog(game, playerId, 'mystics_black_covenant_bound', `${player.name} bound one card face down beneath Black Covenant.`);
  privateLog(game, playerId, 'mystics_black_covenant_bound_private', `You bound ${boundCardId} beneath Black Covenant.`, {
    bindingId: binding.id,
    cardId: boundCardId,
  });
  return true;
}

export function blackCovenantActionBindings(game: GameState, playerId: PlayerID): BlackCovenantBindingState[] {
  if (game.activePlayer !== playerId || game.priorityPlayer !== playerId || !bankedAssetCardUseAllowed(game, playerId, BLACK_COVENANT)) return [];
  if (game.phase !== 'action_before_movement' && game.phase !== 'action_after_movement') return [];
  return (game.players[playerId].mystics?.blackCovenantBindings ?? []).filter((binding) => (
    cardCanBePlayedAt(binding.cardId, 'action', 'hand')
  ));
}

export function blackCovenantBattleBindings(game: GameState, playerId: PlayerID): BlackCovenantBindingState[] {
  if (!game.battle || game.battle.stage !== 'hand_commit') return [];
  if (game.battle.attacker.playerId !== playerId && game.battle.defender.playerId !== playerId) return [];
  if (!bankedAssetCardUseAllowed(game, playerId, BLACK_COVENANT)) return [];
  return (game.players[playerId].mystics?.blackCovenantBindings ?? []).filter((binding) => (
    cardCanBePlayedAt(binding.cardId, 'battle_hand_commit', 'hand')
  ));
}

export function prepareBlackCovenantBoundAction(
  game: GameState,
  action: UseMysticBlackCovenantAction,
): PreparedBlackCovenantAction {
  const player = game.players[action.playerId];
  const binding = bindingFor(game, action.playerId, action.bindingId);
  if (!blackCovenantActionBindings(game, action.playerId).some((candidate) => candidate.id === binding.id)) {
    throw new GameActionError(`${binding.cardId} cannot be played from Black Covenant at this timing.`);
  }
  if (!removeOne(player.zones.assetBank, BLACK_COVENANT)) throw new GameActionError('Black Covenant is no longer banked.');
  removeBinding(game, action.playerId, action.bindingId);
  player.zones.removed.push(BLACK_COVENANT);
  player.zones.hand.push(binding.cardId);
  const prepared: PreparedBlackCovenantAction = {
    cardId: binding.cardId,
    targets: action.targets,
    actionsRemaining: player.actionsRemaining,
    hasPlayedActionThisTurn: player.hasPlayedActionThisTurn,
    hasPlayedBattleThisTurn: player.hasPlayedBattleThisTurn,
  };
  player.actionsRemaining = Math.max(player.actionsRemaining, 1);
  player.hasPlayedActionThisTurn = false;
  player.hasPlayedBattleThisTurn = false;
  return prepared;
}

export function finishBlackCovenantBoundAction(
  game: GameState,
  playerId: PlayerID,
  prepared: PreparedBlackCovenantAction,
): void {
  const player = game.players[playerId];
  player.actionsRemaining = prepared.actionsRemaining;
  player.hasPlayedActionThisTurn = prepared.hasPlayedActionThisTurn;
  player.hasPlayedBattleThisTurn = prepared.hasPlayedBattleThisTurn;
  if (!removeOne(player.zones.removed, BLACK_COVENANT)) {
    throw new GameActionError('Black Covenant is no longer awaiting Action cleanup.');
  }
  player.zones.graveyard.push(BLACK_COVENANT);
  publicLog(game, playerId, 'mystics_black_covenant_action_released', `${player.name} released a bound card from Black Covenant.`, {
    cardId: prepared.cardId,
  });
}

export function useBlackCovenantBoundBattleCard(
  game: GameState,
  action: UseMysticBlackCovenantBattleAction,
): CardID {
  const player = game.players[action.playerId];
  const binding = bindingFor(game, action.playerId, action.bindingId);
  if (!blackCovenantBattleBindings(game, action.playerId).some((candidate) => candidate.id === binding.id)) {
    throw new GameActionError(`${binding.cardId} cannot be committed from Black Covenant now.`);
  }
  if (!removeOne(player.zones.assetBank, BLACK_COVENANT)) throw new GameActionError('Black Covenant is no longer banked.');
  removeBinding(game, action.playerId, action.bindingId);
  player.zones.removed.push(BLACK_COVENANT);
  const side = participant(game, action.playerId);
  const played: BattlePlayedCard = {
    cardId: binding.cardId,
    owner: action.playerId,
    origin: 'hand',
    faceDown: true,
    canceled: false,
  };
  side.battleDrawPlayed.push(played);
  side.battleDrawPlayLimit += 1;
  player.mystics!.blackCovenantBattleReleases ??= [];
  player.mystics!.blackCovenantBattleReleases.push({
    battleId: game.battle!.id,
    boundCardId: binding.cardId,
    covenantFromAsset: true,
  });
  publicLog(game, action.playerId, 'mystics_black_covenant_battle_committed', `${player.name} committed a bound card from Black Covenant face down.`);
  return binding.cardId;
}

function activeBlackCovenant(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === BLACK_COVENANT && !card.canceled && !card.negated);
}

function nextBattleSource(game: GameState): {
  playerId: PlayerID;
  sourceSlot: 'hand_commit' | 'battle_draw_played';
  sourceIndex?: number;
  card: BattlePlayedCard;
} | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  for (const side of [battle.attacker, battle.defender]) {
    if (activeBlackCovenant(side.handCommit) && !side.handCommit.postRevealEffectResolved) {
      return { playerId: side.playerId, sourceSlot: 'hand_commit', card: side.handCommit };
    }
    const sourceIndex = side.battleDrawPlayed.findIndex((card) => (
      activeBlackCovenant(card) && !card.postRevealEffectResolved
    ));
    if (sourceIndex >= 0) {
      return {
        playerId: side.playerId,
        sourceSlot: 'battle_draw_played',
        sourceIndex,
        card: side.battleDrawPlayed[sourceIndex],
      };
    }
  }
  return undefined;
}

function hasBlockingWindow(game: GameState): boolean {
  return Boolean(
    game.pendingMysticsChoice
    || game.pendingIntelligenceChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length > 0,
  );
}

export function openNextBlackCovenantBattleChoice(game: GameState): boolean {
  if (hasBlockingWindow(game) || game.battle?.stage !== 'dice') return false;
  while (true) {
    const source = nextBattleSource(game);
    if (!source) return false;
    source.card.postRevealEffectResolved = true;
    const handOptions = game.players[source.playerId].zones.hand.filter((cardId) => (
      cardCanBePlayedAt(cardId, 'battle_hand_commit', 'hand')
    ));
    if (handOptions.length === 0) continue;
    const pending: PendingBlackCovenantBattleChoice = {
      kind: 'black_covenant_battle',
      playerId: source.playerId,
      battleId: game.battle.id,
      sourceSlot: source.sourceSlot,
      sourceIndex: source.sourceIndex,
      handOptions,
      options: ['pass', 'bind'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.pendingMysticsChoice = pending;
    game.priorityPlayer = source.playerId;
    return true;
  }
}

export function isBlackCovenantChoice(kind: unknown): kind is PendingBlackCovenantBattleChoice['kind'] {
  return kind === 'black_covenant_battle';
}

export function resolveBlackCovenantBattleChoice(
  game: GameState,
  action: ResolveMysticsChoiceAction,
): CardID | undefined {
  const pending = game.pendingMysticsChoice;
  if (!pending || pending.kind !== 'black_covenant_battle' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Black Covenant choice.`);
  }
  if (!game.battle || game.battle.id !== pending.battleId || game.battle.stage !== 'dice') {
    throw new GameActionError('The Black Covenant battle window is no longer open.');
  }
  const resumePriority = pending.resumePriorityPlayer;
  game.pendingMysticsChoice = undefined;
  if (action.choice === 'pass') {
    game.priorityPlayer = resumePriority ?? game.activePlayer;
    return undefined;
  }
  if (action.choice !== 'bind' || !action.cardId || !pending.handOptions.includes(action.cardId)) {
    throw new GameActionError('Choose an eligible card from hand or pass Black Covenant.');
  }
  const player = game.players[action.playerId];
  if (!removeOne(player.zones.hand, action.cardId)) throw new GameActionError('The chosen card is no longer in your hand.');
  participant(game, action.playerId).battleDrawPlayed.push({
    cardId: action.cardId,
    owner: action.playerId,
    origin: 'hand',
    faceDown: false,
    canceled: false,
  });
  player.mystics!.blackCovenantBattleReleases ??= [];
  player.mystics!.blackCovenantBattleReleases.push({
    battleId: pending.battleId,
    boundCardId: action.cardId,
    covenantFromAsset: false,
  });
  game.priorityPlayer = resumePriority ?? game.activePlayer;
  publicLog(game, action.playerId, 'mystics_black_covenant_battle_released', `${player.name} bound and immediately revealed ${action.cardId} with Black Covenant.`, {
    cardId: action.cardId,
  });
  return action.cardId;
}

export function reconcileBlackCovenantBindings(game: GameState): void {
  for (const player of Object.values(game.players)) {
    const bindings = player.mystics?.blackCovenantBindings;
    if (!bindings?.length) continue;
    const bankedCount = player.zones.assetBank.filter((cardId) => cardId === BLACK_COVENANT).length;
    while (bindings.length > bankedCount) {
      const released = bindings.pop()!;
      player.zones.graveyard.push(released.cardId);
      publicLog(game, player.id, 'mystics_black_covenant_broken', `${player.name}'s bound card entered the Graveyard when Black Covenant left play.`);
      privateLog(game, player.id, 'mystics_black_covenant_broken_private', `${released.cardId} entered your Graveyard when Black Covenant left play.`, {
        cardId: released.cardId,
      });
    }
    if (bindings.length === 0) player.mystics!.blackCovenantBindings = undefined;
  }
}

function cardInAnyNormalZone(game: GameState, playerId: PlayerID, cardId: CardID): boolean {
  const zones = game.players[playerId].zones;
  return zones.hand.includes(cardId)
    || zones.deck.includes(cardId)
    || zones.graveyard.includes(cardId)
    || zones.assetBank.includes(cardId)
    || zones.removed.includes(cardId);
}

export function reconcileBlackCovenantBattleReleases(game: GameState): void {
  for (const player of Object.values(game.players)) {
    const releases = player.mystics?.blackCovenantBattleReleases;
    if (!releases?.length) continue;
    const remaining = releases.filter((release) => {
      if (game.battle?.id === release.battleId) return true;
      let covenantPending = release.covenantFromAsset;
      if (covenantPending && removeOne(player.zones.removed, BLACK_COVENANT)) {
        player.zones.graveyard.push(BLACK_COVENANT);
        covenantPending = false;
      }
      if (removeOne(player.zones.discard, release.boundCardId)) {
        player.zones.graveyard.push(release.boundCardId);
        return covenantPending;
      }
      if (cardInAnyNormalZone(game, player.id, release.boundCardId)) return covenantPending;
      release.covenantFromAsset = covenantPending;
      return true;
    });
    player.mystics!.blackCovenantBattleReleases = remaining.length > 0 ? remaining : undefined;
  }
}

export function correctBlackCovenantBattleSourceDestinations(game: GameState, battle: NonNullable<GameState['battle']>): void {
  for (const side of [battle.attacker, battle.defender]) {
    const battleDrawCopies = side.battleDrawPlayed.filter((card) => (
      activeBlackCovenant(card) && card.origin === 'battle_draw'
    )).length;
    for (let index = 0; index < battleDrawCopies; index += 1) {
      if (!removeOne(game.players[side.playerId].zones.discard, BLACK_COVENANT)) break;
      game.players[side.playerId].zones.graveyard.push(BLACK_COVENANT);
    }
  }
}

export function blackCovenantBindingCanUseAction(binding: BlackCovenantBindingState): boolean {
  return cardCanBePlayedAt(binding.cardId, 'action', 'hand') && !(getCardPlayRule(binding.cardId)?.requiresTarget ?? false);
}
