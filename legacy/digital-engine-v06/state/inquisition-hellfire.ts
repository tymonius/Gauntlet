import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { ResolveInquisitionChoiceAction } from './actions';
import { spendFactionResource } from './resources';
import { GameActionError } from './reducer';

export const HELLFIRE = 'inquisition-hellfire';
const DELAYED_PREFIX = 'hellfire_delayed:';

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

function opponentId(game: GameState, playerId: PlayerID): PlayerID {
  const opponent = Object.values(game.players).find((player) => player.id !== playerId);
  if (!opponent) throw new GameActionError('Hellfire requires an opponent.');
  return opponent.id;
}

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new GameActionError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new GameActionError(`${playerId} is not participating in this battle.`);
}

function conviction(game: GameState, playerId: PlayerID): number {
  return game.players[playerId].resources?.conviction?.value ?? 0;
}

function moveTopCardsToGraveyard(game: GameState, playerId: PlayerID, count: number): CardID[] {
  const player = game.players[playerId];
  const moved = player.zones.deck.splice(0, count);
  player.zones.graveyard.push(...moved);
  return moved;
}

function activeHellfire(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(card && card.cardId === HELLFIRE && !card.canceled && !card.negated && !card.virtual);
}

interface HellfireSource {
  playerId: PlayerID;
  card: BattlePlayedCard;
}

function unresolvedSource(participant: BattleParticipantState): HellfireSource | undefined {
  if (activeHellfire(participant.handCommit) && !participant.handCommit.postRevealEffectResolved) {
    return { playerId: participant.playerId, card: participant.handCommit };
  }
  const card = participant.battleDrawPlayed.find((candidate) => (
    activeHellfire(candidate) && !candidate.postRevealEffectResolved
  ));
  return card ? { playerId: participant.playerId, card } : undefined;
}

function nextSource(game: GameState): HellfireSource | undefined {
  const battle = game.battle;
  if (!battle) return undefined;
  return unresolvedSource(battle.attacker) ?? unresolvedSource(battle.defender);
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

export function applyHellfireAction(game: GameState, inquisitorId: PlayerID, cardId: CardID): boolean {
  if (cardId !== HELLFIRE) return false;
  if (game.players[inquisitorId]?.factionId !== 'inquisition') {
    throw new GameActionError('Only an Inquisition player can use Hellfire.');
  }
  const maxSpend = conviction(game, inquisitorId);
  if (maxSpend === 0) {
    publicLog(
      game,
      inquisitorId,
      'inquisition_hellfire_action_resolved',
      `${game.players[inquisitorId].name} used Hellfire without spending Conviction.`,
      { spent: 0, graveyardCardIds: [] },
    );
    return true;
  }
  game.pendingInquisitionChoice = {
    kind: 'hellfire_action',
    playerId: inquisitorId,
    opponentId: opponentId(game, inquisitorId),
    maxSpend,
    options: ['spend'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = inquisitorId;
  return true;
}

export function openNextHellfireChoice(game: GameState): boolean {
  if (hasBlockingWindow(game) || game.battle?.stage !== 'dice') return false;
  while (true) {
    const source = nextSource(game);
    if (!source) return false;
    source.card.postRevealEffectResolved = true;
    const maxSpend = conviction(game, source.playerId);
    if (maxSpend === 0) continue;
    game.pendingInquisitionChoice = {
      kind: 'hellfire_battle',
      playerId: source.playerId,
      opponentId: opponentId(game, source.playerId),
      battleId: game.battle.id,
      maxSpend,
      options: ['allocate'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = source.playerId;
    return true;
  }
}

export function isHellfireChoice(kind: unknown): kind is 'hellfire_action' | 'hellfire_battle' {
  return kind === 'hellfire_action' || kind === 'hellfire_battle';
}

function validAmount(value: number | undefined, maximum: number): value is number {
  return Number.isInteger(value) && value! >= 0 && value! <= maximum;
}

export function resolveHellfireChoice(game: GameState, action: ResolveInquisitionChoiceAction): void {
  const pending = game.pendingInquisitionChoice;
  if (!pending
    || (pending.kind !== 'hellfire_action' && pending.kind !== 'hellfire_battle')
    || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Hellfire choice.`);
  }
  const available = conviction(game, action.playerId);
  const maximum = Math.min(pending.maxSpend, available);
  if (!validAmount(action.amount, maximum)) {
    throw new GameActionError(`Choose a Hellfire Conviction amount from 0 to ${maximum}.`);
  }
  const totalSpend = action.amount;
  const resumePriority = pending.resumePriorityPlayer;

  if (pending.kind === 'hellfire_action') {
    if (action.choice !== 'spend') throw new GameActionError('Choose how much Conviction to spend on Hellfire.');
    spendFactionResource(game, action.playerId, 'conviction', totalSpend, HELLFIRE);
    const moved = moveTopCardsToGraveyard(game, pending.opponentId, totalSpend);
    game.pendingInquisitionChoice = undefined;
    game.priorityPlayer = resumePriority ?? game.activePlayer;
    publicLog(
      game,
      action.playerId,
      'inquisition_hellfire_action_resolved',
      `${game.players[action.playerId].name} spent ${totalSpend} Conviction on Hellfire and put ${moved.length} card${moved.length === 1 ? '' : 's'} from the opposing Draw Pile in the Graveyard.`,
      { spent: totalSpend, graveyardCardIds: moved },
    );
    return;
  }

  if (!game.battle || game.battle.id !== pending.battleId || game.battle.stage !== 'dice') {
    throw new GameActionError('The Hellfire battle window is no longer open.');
  }
  if (action.choice !== 'allocate' || !validAmount(action.secondaryAmount, totalSpend)) {
    throw new GameActionError('Allocate the spent Conviction between battle bonus and delayed Graveyard cards.');
  }
  const delayedCount = action.secondaryAmount;
  const bonusCount = totalSpend - delayedCount;
  spendFactionResource(game, action.playerId, 'conviction', totalSpend, HELLFIRE);
  const participant = participantFor(game, action.playerId);
  participant.modifiers += bonusCount;
  if (delayedCount > 0) {
    game.battle.effectsResolved.push(`${DELAYED_PREFIX}${action.playerId}:${delayedCount}`);
  }
  game.pendingInquisitionChoice = undefined;
  game.priorityPlayer = resumePriority ?? game.activePlayer;
  publicLog(
    game,
    action.playerId,
    'inquisition_hellfire_battle_allocated',
    `${game.players[action.playerId].name} spent ${totalSpend} Conviction on Hellfire: +${bonusCount} battle total and ${delayedCount} delayed Graveyard card${delayedCount === 1 ? '' : 's'} if they win.`,
    { battleId: pending.battleId, spent: totalSpend, bonusCount, delayedCount },
  );
}

export function applyHellfireAfterBattle(game: GameState, battle: BattleState): number {
  const result = game.recentBattleResult;
  if (!result || result.battleId !== battle.id) return 0;
  let movedCount = 0;
  for (const entry of battle.effectsResolved) {
    if (!entry.startsWith(DELAYED_PREFIX)) continue;
    const [, playerId, rawCount] = entry.split(':');
    if (result.winner !== playerId) continue;
    const opponent = result.loser;
    const moved = moveTopCardsToGraveyard(game, opponent, Number(rawCount));
    movedCount += moved.length;
    publicLog(
      game,
      playerId,
      'inquisition_hellfire_after_battle',
      `${game.players[playerId].name} won and Hellfire put ${moved.length} card${moved.length === 1 ? '' : 's'} from ${game.players[opponent].name}’s Draw Pile in their Graveyard.`,
      { battleId: battle.id, requested: Number(rawCount), graveyardCardIds: moved },
    );
  }
  return movedCount;
}
