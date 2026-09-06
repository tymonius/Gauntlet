import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PendingCircleOfBonesChoice,
  PlayerID,
  SpaceID,
} from '../types/v06';
import type { ActionCardTarget, ResolveMysticsChoiceAction } from './actions';
import { battleDiceCount, deterministicBattleDiceValues, selectBattleDieResult } from './battle-dice';
import { sacrificeMysticHandCard } from './mystics-conversion';
import { GameActionError } from './reducer';
import { topTerritoryOverlay } from './territory-overlays';
import { counterworksOverlayInactive, processCounterworksOverlayQueue, queueCounterworksOverlayPlacement } from './neutral-counterworks';

export const CIRCLE_OF_BONES = 'mystics-circle-of-bones';
const RESOLVED_MARKER_PREFIX = 'mystics_circle_of_bones_resolved';

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

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function spaceTarget(targets?: ActionCardTarget[]): SpaceID | undefined {
  if (targets?.length !== 1 || targets[0]?.kind !== 'space') return undefined;
  return targets[0].spaceId;
}

function eligibleActionTarget(game: GameState, playerId: PlayerID, spaceId: SpaceID): boolean {
  const currentId = game.players[playerId]?.occupiedSpaceId;
  const current = game.board.spaces.find((space) => space.id === currentId);
  const target = game.board.spaces.find((space) => space.id === spaceId);
  if (!current || !target || target.kind !== 'territory') return false;
  return target.id === current.id || Math.abs(target.index - current.index) === 1;
}

export function circleOfBonesActionTargets(game: GameState, playerId: PlayerID): SpaceID[] {
  return game.board.spaces
    .filter((space) => space.kind === 'territory' && eligibleActionTarget(game, playerId, space.id))
    .map((space) => space.id);
}

export function requireCircleOfBonesActionTarget(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  targets?: ActionCardTarget[],
): void {
  if (cardId !== CIRCLE_OF_BONES) return;
  const target = spaceTarget(targets);
  if (!target) throw new GameActionError('Circle of Bones requires exactly one current or adjacent Territory target.');
  if (!eligibleActionTarget(game, playerId, target)) {
    throw new GameActionError('Circle of Bones must be placed on your current Territory or an adjacent Territory.');
  }
}

export function applyCircleOfBonesAction(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  targets?: ActionCardTarget[],
): boolean {
  if (cardId !== CIRCLE_OF_BONES) return false;
  requireCircleOfBonesActionTarget(game, playerId, cardId, targets);
  const target = spaceTarget(targets)!;
  const player = game.players[playerId];
  if (!player.zones.removed.includes(CIRCLE_OF_BONES)) {
    throw new GameActionError('Circle of Bones did not reach its temporary Action destination.');
  }
  queueCounterworksOverlayPlacement(game, {
    kind: 'circle_of_bones_action',
    playerId,
    cardId: CIRCLE_OF_BONES,
    spaceId: target,
    source: { zone: 'removed' },
  });
  processCounterworksOverlayQueue(game);
  return true;
}

function activeUnplacedCircle(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === CIRCLE_OF_BONES
    && !card.canceled
    && !card.negated
    && !card.postRevealEffectResolved,
  );
}

function orderedBattleCards(battle: BattleState): BattlePlayedCard[] {
  const result: BattlePlayedCard[] = [];
  for (const participant of [battle.attacker, battle.defender]) {
    if (participant.handCommit) result.push(participant.handCommit);
    result.push(...participant.battleDrawPlayed);
  }
  return result;
}

export function placeCircleOfBonesBattleOverlays(game: GameState): number {
  const battle = game.battle;
  if (!battle || !battle.effectsResolved.includes('before_battle_resolution')) return 0;
  const space = game.board.spaces.find((candidate) => candidate.id === battle.location);
  if (!space || space.kind !== 'territory') return 0;

  let placed = 0;
  for (const card of orderedBattleCards(battle)) {
    if (!activeUnplacedCircle(card)) continue;
    card.postRevealEffectResolved = true;
    queueCounterworksOverlayPlacement(game, {
      kind: 'circle_of_bones_battle',
      playerId: card.owner,
      cardId: CIRCLE_OF_BONES,
      spaceId: space.id,
      source: { zone: 'battle_card', battleId: battle.id, owner: card.owner, origin: card.origin },
      battleId: battle.id,
    });
    placed += 1;
  }
  processCounterworksOverlayQueue(game);
  return placed;
}

export function removeCircleOfBonesCleanupCopies(game: GameState, battle: BattleState): number {
  let removed = 0;
  for (const card of orderedBattleCards(battle)) {
    const placementCompleted = card.overlayPlacementCompleted ?? card.postRevealEffectResolved;
    if (card.cardId !== CIRCLE_OF_BONES || !placementCompleted || card.overlayPlacementPrevented) continue;
    const player = game.players[card.owner];
    const zone = card.origin === 'hand' ? player.zones.graveyard : player.zones.discard;
    if (removeOne(zone, CIRCLE_OF_BONES)) removed += 1;
  }
  return removed;
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

function resolvedMarker(battleId: string, spaceId: SpaceID, owner: PlayerID): string {
  return `${RESOLVED_MARKER_PREFIX}:${battleId}:${spaceId}:${owner}`;
}

export function openCircleOfBonesRerollIfReady(game: GameState): boolean {
  if (hasBlockingWindow(game)) return false;
  const battle = game.battle;
  if (!battle || battle.stage !== 'resolution') return false;
  if (battle.attacker.diceRoll === undefined || battle.defender.diceRoll === undefined) return false;

  const space = game.board.spaces.find((candidate) => candidate.id === battle.location);
  const overlay = topTerritoryOverlay(space);
  const overlayIndex = space?.overlays ? space.overlays.length - 1 : -1;
  if (!space || overlay?.cardId !== CIRCLE_OF_BONES) return false;
  if (counterworksOverlayInactive(game, space.id, overlay, overlayIndex, battle.id)) return false;
  if (overlay.owner !== battle.attacker.playerId && overlay.owner !== battle.defender.playerId) return false;

  const marker = resolvedMarker(battle.id, space.id, overlay.owner);
  if (battle.effectsResolved.includes(marker)) return false;
  battle.effectsResolved.push(marker);

  const handOptions = [...new Set(game.players[overlay.owner].zones.hand)];
  if (handOptions.length === 0) return false;
  const pending: PendingCircleOfBonesChoice = {
    kind: 'circle_of_bones_reroll',
    playerId: overlay.owner,
    battleId: battle.id,
    spaceId: space.id,
    handOptions,
    targetPlayerOptions: [battle.attacker.playerId, battle.defender.playerId],
    options: ['pass', 'use'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.pendingMysticsChoice = pending;
  game.priorityPlayer = overlay.owner;
  return true;
}

export function isCircleOfBonesChoice(kind: unknown): kind is PendingCircleOfBonesChoice['kind'] {
  return kind === 'circle_of_bones_reroll';
}

function randomValues(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

function validateValues(values: number[], expectedCount: number): void {
  if (values.length !== expectedCount) {
    throw new GameActionError(`This Circle of Bones reroll requires exactly ${expectedCount} dice.`);
  }
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 6)) {
    throw new GameActionError('Every rerolled die must be an integer from 1 to 6.');
  }
}

export function resolveCircleOfBonesChoice(game: GameState, action: ResolveMysticsChoiceAction): void {
  const pending = game.pendingMysticsChoice;
  if (!pending || pending.kind !== 'circle_of_bones_reroll' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Circle of Bones choice.`);
  }
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId) throw new GameActionError('The Circle of Bones battle is no longer active.');
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new GameActionError('Choose whether to use Circle of Bones.');
  }

  if (action.choice === 'use') {
    if (!action.cardId || !pending.handOptions.includes(action.cardId)) {
      throw new GameActionError('Choose an eligible card from hand for Circle of Bones.');
    }
    if (!action.targetPlayerId || !pending.targetPlayerOptions.includes(action.targetPlayerId)) {
      throw new GameActionError('Choose one of the battle participants to reroll.');
    }
    if (!game.players[action.playerId].zones.hand.includes(action.cardId)) {
      throw new GameActionError('The chosen hand card is no longer available.');
    }
  }

  game.pendingMysticsChoice = undefined;
  if (action.choice === 'pass') {
    game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
    publicLog(game, action.playerId, 'mystics_circle_of_bones_passed', `${game.players[action.playerId].name} declined Circle of Bones.`, {
      battleId: battle.id,
      spaceId: pending.spaceId,
    });
    return;
  }

  sacrificeMysticHandCard(game, action.playerId, action.cardId!, CIRCLE_OF_BONES);
  const target = participantFor(game, action.targetPlayerId!);
  const count = battleDiceCount(target);
  const values = action.values
    ? [...action.values]
    : action.value !== undefined
      ? count === 1
        ? [action.value]
        : deterministicBattleDiceValues(target, action.value)
      : randomValues(count);
  validateValues(values, count);
  const oldRoll = target.diceRoll;
  const selected = selectBattleDieResult(target, values);
  target.diceRolls = values;
  target.diceRoll = selected;

  publicLog(
    game,
    action.playerId,
    'mystics_circle_of_bones_rerolled',
    `${game.players[action.playerId].name} used Circle of Bones. ${game.players[action.targetPlayerId!].name} rerolled and must use ${selected}.`,
    {
      battleId: battle.id,
      spaceId: pending.spaceId,
      targetPlayerId: action.targetPlayerId,
      oldRoll,
      values,
      selected,
    },
  );
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
}
