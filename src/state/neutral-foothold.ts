import type {
  BattleParticipantState,
  BattlePlayedCard,
  BattleState,
  CardID,
  GameEvent,
  GameState,
  PlayerID,
} from '../types/v06';
import type { ResolveNeutralChoiceAction } from './actions';
import { drawFromDeck } from './draw';
import { activeBankedAssetCopies, bankedAssetUseAllowed } from './intelligence-subversion-battle';
import { GameActionError } from './reducer';

export const FOOTHOLD = 'neutral-foothold';
const FOOTHOLD_BATTLE_RESOLUTION = 'neutral_foothold_battle';

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

function activeFoothold(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === FOOTHOLD
    && !card.canceled
    && !card.negated
    && !card.virtual,
  );
}

function activeCopyCount(participant: BattleParticipantState): number {
  return (activeFoothold(participant.handCommit) ? 1 : 0)
    + participant.battleDrawPlayed.filter(activeFoothold).length;
}

function defenderOccupiesUncontrolledTerritory(
  game: GameState,
  battle: BattleState,
  controllerBeforeBattle?: PlayerID,
): boolean {
  const location = game.board.spaces.find((space) => space.id === battle.location);
  const controller = controllerBeforeBattle === undefined ? location?.controller : controllerBeforeBattle;
  return Boolean(
    location?.kind === 'territory'
    && location.occupant === battle.defender.playerId
    && controller !== battle.defender.playerId,
  );
}

function hasBlockingChoice(game: GameState): boolean {
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

export function applyFootholdBattleEffects(game: GameState): void {
  const battle = game.battle;
  if (!battle
    || battle.stage !== 'dice'
    || !battle.effectsResolved.includes('before_battle_resolution')
    || battle.effectsResolved.includes(FOOTHOLD_BATTLE_RESOLUTION)) return;

  const count = defenderOccupiesUncontrolledTerritory(game, battle)
    ? activeCopyCount(battle.defender)
    : 0;
  if (count > 0) {
    battle.defender.advantage = (battle.defender.advantage ?? 0) + count;
    appendPublicLog(
      game,
      battle.defender.playerId,
      'neutral_foothold_battle_advantage',
      `${game.players[battle.defender.playerId].name} gained ${count} advantage from Foothold while defending an uncontrolled Territory.`,
      { battleId: battle.id, copies: count },
    );
  }
  battle.effectsResolved.push(FOOTHOLD_BATTLE_RESOLUTION);
}

export function applyFootholdBattleCleanupDraw(
  game: GameState,
  battle: BattleState,
  controllerBeforeBattle: PlayerID | undefined,
  winnerId: PlayerID | undefined,
): CardID[] {
  if (winnerId !== battle.defender.playerId) return [];
  if (!defenderOccupiesUncontrolledTerritory(game, battle, controllerBeforeBattle)) return [];

  const count = activeCopyCount(battle.defender);
  if (count < 1) return [];
  const player = game.players[battle.defender.playerId];
  const draw = drawFromDeck(player, { count });
  player.zones.hand.push(...draw.drawnCards);
  appendPublicLog(
    game,
    player.id,
    'neutral_foothold_battle_draw',
    `${player.name} drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} with Foothold after winning as the defender.`,
    {
      battleId: battle.id,
      copies: count,
      drawCount: draw.drawnCards.length,
      reshuffled: draw.reshuffled,
      exhausted: draw.exhausted,
    },
  );
  return draw.drawnCards;
}

export function queueFootholdAssetChoices(
  game: GameState,
  battle: BattleState,
  controllerBeforeBattle: PlayerID | undefined,
  winnerId: PlayerID | undefined,
): number {
  const playerId = battle.defender.playerId;
  if (winnerId !== playerId) return 0;
  if (!defenderOccupiesUncontrolledTerritory(game, battle, controllerBeforeBattle)) return 0;
  if (battle.bankedAssetUseProhibited?.includes(playerId) || !bankedAssetUseAllowed(game, playerId)) return 0;
  if (game.neutralFootholdAssetQueue?.some((entry) => entry.battleId === battle.id && entry.playerId === playerId)) return 0;

  const count = activeBankedAssetCopies(game, playerId, FOOTHOLD);
  if (count < 1) return 0;
  const queue = game.neutralFootholdAssetQueue ?? [];
  queue.push({
    id: `${game.id}-foothold-asset-${battle.id}-${queue.length + 1}`,
    playerId,
    battleId: battle.id,
    triggersRemaining: count,
  });
  game.neutralFootholdAssetQueue = queue;
  return count;
}

function trimQueue(game: GameState): void {
  const retained = (game.neutralFootholdAssetQueue ?? []).filter((entry) => {
    if (!bankedAssetUseAllowed(game, entry.playerId)) return false;
    const available = activeBankedAssetCopies(game, entry.playerId, FOOTHOLD);
    entry.triggersRemaining = Math.min(entry.triggersRemaining, available);
    return entry.triggersRemaining > 0;
  });
  game.neutralFootholdAssetQueue = retained.length > 0 ? retained : undefined;
}

export function openNextFootholdChoice(game: GameState): boolean {
  if (hasBlockingChoice(game)) return false;
  trimQueue(game);
  const entry = game.neutralFootholdAssetQueue?.[0];
  if (!entry) return false;
  game.pendingNeutralChoice = {
    kind: 'foothold_asset',
    playerId: entry.playerId,
    entryId: entry.id,
    battleId: entry.battleId,
    triggersRemaining: entry.triggersRemaining,
    options: ['pass', 'use'],
    resumePriorityPlayer: game.priorityPlayer,
  };
  game.priorityPlayer = entry.playerId;
  return true;
}

export function resolveFootholdChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'foothold_asset' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Foothold choice.`);
  }
  const entry = game.neutralFootholdAssetQueue?.find((candidate) => candidate.id === pending.entryId);
  if (!entry) throw new GameActionError('The Foothold trigger is no longer pending.');
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new GameActionError('Choose whether to discard Foothold and draw two cards.');
  }

  game.pendingNeutralChoice = undefined;
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
  if (action.choice === 'pass') {
    entry.triggersRemaining = 0;
    appendPublicLog(
      game,
      action.playerId,
      'neutral_foothold_asset_passed',
      `${game.players[action.playerId].name} used no more banked Foothold copies after the battle.`,
      { battleId: pending.battleId },
    );
  } else {
    const player = game.players[action.playerId];
    if (!removeOne(player.zones.assetBank, FOOTHOLD)) {
      throw new GameActionError('Foothold is no longer banked.');
    }
    player.zones.discard.push(FOOTHOLD);
    entry.triggersRemaining -= 1;
    const draw = drawFromDeck(player, { count: 2 });
    player.zones.hand.push(...draw.drawnCards);
    appendPublicLog(
      game,
      action.playerId,
      'neutral_foothold_asset_used',
      `${player.name} discarded Foothold and drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'}.`,
      {
        battleId: pending.battleId,
        drawCount: draw.drawnCards.length,
        reshuffled: draw.reshuffled,
        exhausted: draw.exhausted,
      },
    );
  }
  trimQueue(game);
  openNextFootholdChoice(game);
}
