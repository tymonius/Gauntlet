import { v06CanonicalContent } from '../content';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
  PlayerState,
} from '../types';
import type { ResolveMysticsChoiceAction, UseMysticTransmutationAction } from './actions';
import { drawFromDeck } from './draw';
import { cardValue } from './financiers';
import { invocationUnlocked, isArcaneCard, transmutationUnlocked } from './mystics-ritual';

export class MysticsConversionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MysticsConversionError';
  }
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

function removeOne(cards: CardID[], cardId: CardID): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function requireMystic(game: GameState, playerId: PlayerID): PlayerState & { mystics: NonNullable<PlayerState['mystics']> } {
  const player = game.players[playerId];
  if (!player || player.factionId !== 'mystics' || !player.mystics) {
    throw new MysticsConversionError(`${playerId} is not a Mystics player.`);
  }
  return player as PlayerState & { mystics: NonNullable<PlayerState['mystics']> };
}

function hasBlockingChoice(game: GameState): boolean {
  return Boolean(
    game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingIntelligenceChoice
    || game.pendingMysticsChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length,
  );
}

function drawMateriaPrima(game: GameState, playerId: PlayerID): CardID | undefined {
  const player = requireMystic(game, playerId);
  const draw = drawFromDeck(player, { count: 1 });
  const cardId = draw.drawnCards[0];
  if (cardId) player.zones.hand.push(cardId);
  publicLog(
    game,
    playerId,
    'mystics_materia_prima_drawn',
    `${player.name} drew one card with Materia Prima.`,
    { count: cardId ? 1 : 0, reshuffled: draw.reshuffled, exhausted: draw.exhausted },
  );
  return cardId;
}

export function triggerMateriaPrimaAfterHandSacrifice(
  game: GameState,
  playerId: PlayerID,
  source: string,
): boolean {
  const player = requireMystic(game, playerId);
  if (player.leaderName !== 'Alchemist' || game.activePlayer !== playerId) return false;
  if (player.mystics.materiaPrimaUsedTurn === game.turn) return false;

  player.mystics.materiaPrimaUsedTurn = game.turn;
  if (game.battle) {
    player.mystics.materiaPrimaDeferredBattleId = game.battle.id;
    publicLog(
      game,
      playerId,
      'mystics_materia_prima_deferred',
      `${player.name} will draw with Materia Prima after the battle resolves.`,
      { source, battleId: game.battle.id },
    );
  } else {
    drawMateriaPrima(game, playerId);
  }
  return true;
}

export function sacrificeMysticHandCard(
  game: GameState,
  playerId: PlayerID,
  cardId: CardID,
  source: string,
  triggersMateriaPrima = true,
): void {
  const player = requireMystic(game, playerId);
  if (!removeOne(player.zones.hand, cardId)) {
    throw new MysticsConversionError(`${cardId} is not in ${player.name}'s hand.`);
  }
  player.zones.graveyard.push(cardId);
  publicLog(game, playerId, 'mystics_card_sacrificed', `${player.name} put ${cardId} in their Graveyard.`, {
    cardId,
    source,
  });
  if (triggersMateriaPrima) triggerMateriaPrimaAfterHandSacrifice(game, playerId, source);
}

export function resolveDeferredMateriaPrimaAfterBattle(game: GameState, battleId: string): void {
  for (const player of Object.values(game.players)) {
    if (player.mystics?.materiaPrimaDeferredBattleId !== battleId) continue;
    player.mystics.materiaPrimaDeferredBattleId = undefined;
    drawMateriaPrima(game, player.id);
  }
}

function supplementalCard(cardId: CardID): boolean {
  const card = v06CanonicalContent.cardsById.get(cardId);
  return card?.allegiance?.toLowerCase() === 'supplemental'
    || card?.card_form?.toLowerCase().includes('supplemental') === true;
}

function battleParticipant(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new MysticsConversionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new MysticsConversionError(`${playerId} is not involved in this battle.`);
}

function participantHasRolled(participant: BattleParticipantState): boolean {
  return participant.diceRoll !== undefined || Boolean(participant.diceRolls?.length);
}

function battleDiceHaveBeenRolled(battle: BattleState): boolean {
  return participantHasRolled(battle.attacker) || participantHasRolled(battle.defender);
}

export function canUseTransmutation(game: GameState, playerId: PlayerID): boolean {
  try {
    const player = requireMystic(game, playerId);
    if (!transmutationUnlocked(player.mystics)) return false;
    if (player.mystics.transmutationUsedTurn === game.turn) return false;
    if (!game.battle || game.battle.stage !== 'dice') return false;
    battleParticipant(game, playerId);
    if (battleDiceHaveBeenRolled(game.battle)) return false;
    return player.zones.hand.some((cardId) => !supplementalCard(cardId));
  } catch {
    return false;
  }
}

export function useTransmutation(game: GameState, action: UseMysticTransmutationAction): number {
  const player = requireMystic(game, action.playerId);
  if (!transmutationUnlocked(player.mystics)) {
    throw new MysticsConversionError('Transmutation is not unlocked.');
  }
  if (player.mystics.transmutationUsedTurn === game.turn) {
    throw new MysticsConversionError('Transmutation has already been used this turn.');
  }
  if (!game.battle || game.battle.stage !== 'dice') {
    throw new MysticsConversionError('Transmutation may be used only before dice are rolled in a battle.');
  }
  const participant = battleParticipant(game, action.playerId);
  if (battleDiceHaveBeenRolled(game.battle)) {
    throw new MysticsConversionError('Transmutation must be used before any battle dice are rolled.');
  }
  if (supplementalCard(action.cardId)) {
    throw new MysticsConversionError('Supplemental cards cannot be used for Transmutation.');
  }

  const value = cardValue(action.cardId);
  sacrificeMysticHandCard(game, action.playerId, action.cardId, 'transmutation');
  participant.modifiers += value;
  player.mystics.transmutationUsedTurn = game.turn;
  publicLog(game, action.playerId, 'mystics_transmutation_used', `${player.name} used Transmutation for +${value}.`, {
    cardId: action.cardId,
    value,
    battleId: game.battle.id,
  });
  return value;
}

function invocationOptions(game: GameState, playerId: PlayerID): CardID[] {
  return [...new Set(requireMystic(game, playerId).zones.graveyard)];
}

export function queueInvocationForArcaneUse(
  game: GameState,
  playerId: PlayerID,
  sourceCardIds: CardID[],
): boolean {
  const player = game.players[playerId];
  if (!player || player.factionId !== 'mystics' || !player.mystics) return false;
  const arcaneSources = sourceCardIds.filter(isArcaneCard);
  if (arcaneSources.length === 0 || !invocationUnlocked(player.mystics)) return false;
  if (player.mystics.invocationUsedTurn === game.turn) return false;

  const options = invocationOptions(game, playerId);
  if (options.length === 0) return false;
  const existing = player.mystics.invocationDeferredSourceCardIds ?? [];
  player.mystics.invocationDeferredSourceCardIds = [...existing, ...arcaneSources];
  return openDeferredInvocationIfReady(game, playerId);
}

export function openDeferredInvocationIfReady(game: GameState, playerId?: PlayerID): boolean {
  if (hasBlockingChoice(game)) return false;
  const players = playerId
    ? [game.players[playerId]].filter((player): player is PlayerState => Boolean(player?.factionId === 'mystics' && player.mystics))
    : Object.values(game.players).filter((player) => player.factionId === 'mystics' && player.mystics);
  for (const player of players) {
    const mystics = player.mystics!;
    const sourceCardIds = mystics.invocationDeferredSourceCardIds ?? [];
    if (sourceCardIds.length === 0 || mystics.invocationUsedTurn === game.turn) {
      mystics.invocationDeferredSourceCardIds = undefined;
      continue;
    }
    const graveyardOptions = invocationOptions(game, player.id);
    if (graveyardOptions.length === 0) {
      mystics.invocationDeferredSourceCardIds = undefined;
      continue;
    }
    mystics.invocationDeferredSourceCardIds = undefined;
    game.pendingMysticsChoice = {
      kind: 'invocation',
      playerId: player.id,
      sourceCardIds,
      graveyardOptions,
      options: ['pass', 'use'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = player.id;
    return true;
  }
  return false;
}

export function resolveInvocationChoice(game: GameState, action: ResolveMysticsChoiceAction): void {
  const pending = game.pendingMysticsChoice;
  if (!pending || pending.kind !== 'invocation' || pending.playerId !== action.playerId) {
    throw new MysticsConversionError(`${action.playerId} has no pending Invocation choice.`);
  }
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new MysticsConversionError('Choose whether to use Invocation.');
  }

  const player = requireMystic(game, action.playerId);
  game.pendingMysticsChoice = undefined;
  if (action.choice === 'use') {
    if (!action.cardId || !pending.graveyardOptions.includes(action.cardId)) {
      throw new MysticsConversionError('Choose an eligible card from your Graveyard.');
    }
    if (!removeOne(player.zones.graveyard, action.cardId)) {
      throw new MysticsConversionError('The chosen card is no longer in your Graveyard.');
    }
    player.zones.discard.push(action.cardId);
    player.mystics.invocationUsedTurn = game.turn;
    publicLog(game, action.playerId, 'mystics_invocation_used', `${player.name} moved ${action.cardId} to their Discard Pile with Invocation.`, {
      cardId: action.cardId,
      sourceCardIds: pending.sourceCardIds,
    });
  } else {
    publicLog(game, action.playerId, 'mystics_invocation_passed', `${player.name} declined Invocation.`, {
      sourceCardIds: pending.sourceCardIds,
    });
  }
  if (game.phase !== 'game_over') game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
}

function activeArcaneCards(battle: BattleState, playerId: PlayerID): BattlePlayedCard[] {
  const participant = battle.attacker.playerId === playerId ? battle.attacker : battle.defender;
  return [participant.handCommit, ...participant.battleDrawPlayed]
    .filter((card): card is BattlePlayedCard => Boolean(card && !card.canceled && !card.negated && isArcaneCard(card.cardId)));
}

export function queueInvocationForRevealedBattleCards(game: GameState): void {
  const battle = game.battle;
  if (!battle || battle.stage !== 'dice') return;
  for (const playerId of [battle.attacker.playerId, battle.defender.playerId]) {
    const player = game.players[playerId];
    if (!player || player.factionId !== 'mystics' || !player.mystics) continue;
    const key = `mystics_invocation_queued:${playerId}`;
    if (battle.effectsResolved.includes(key)) continue;
    battle.effectsResolved.push(key);
    const sources = activeArcaneCards(battle, playerId).map((card) => card.cardId);
    if (sources.length) queueInvocationForArcaneUse(game, playerId, sources);
  }
}
