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
import { battleDiceCount, deterministicBattleDiceValues, selectBattleDieResult } from './battle-dice';
import { activeBankedAssetCopies } from './banked-assets';
import { drawFromDeck } from './draw';
import { GameActionError } from './reducer';

export const VALOR = 'neutral-valor';
const VALOR_REROLL_PREFIX = 'neutral_valor_reroll_resolved:';

interface ValorBattleSource {
  playerId: PlayerID;
  sourceKey: string;
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

function activeValor(card?: BattlePlayedCard): card is BattlePlayedCard {
  return Boolean(
    card
    && card.cardId === VALOR
    && !card.canceled
    && !card.negated
    && (!card.virtual || card.effectOnlyReplay),
  );
}

function activeBattleSources(battle: BattleState): ValorBattleSource[] {
  const sources: ValorBattleSource[] = [];
  for (const participant of [battle.attacker, battle.defender]) {
    if (activeValor(participant.handCommit)) {
      sources.push({ playerId: participant.playerId, sourceKey: `${participant.playerId}:hand` });
    }
    participant.battleDrawPlayed.forEach((card, index) => {
      if (activeValor(card)) {
        sources.push({ playerId: participant.playerId, sourceKey: `${participant.playerId}:battle_draw:${index}` });
      }
    });
  }
  return sources;
}

function participantFor(battle: BattleState, playerId: PlayerID): BattleParticipantState {
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new GameActionError(`${playerId} is not participating in this battle.`);
}

function opponentFor(battle: BattleState, playerId: PlayerID): BattleParticipantState {
  return battle.attacker.playerId === playerId ? battle.defender : battle.attacker;
}

function battleTotal(participant: BattleParticipantState): number {
  return (participant.diceRoll ?? 0) + participant.modifiers;
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

export function openNextValorReroll(game: GameState): boolean {
  if (hasBlockingChoice(game)) return false;
  const battle = game.battle;
  if (!battle || battle.stage !== 'resolution') return false;
  if (battle.attacker.diceRoll === undefined || battle.defender.diceRoll === undefined) return false;

  for (const source of activeBattleSources(battle)) {
    const marker = `${VALOR_REROLL_PREFIX}${source.sourceKey}`;
    if (battle.effectsResolved.includes(marker)) continue;
    const participant = participantFor(battle, source.playerId);
    const opponent = opponentFor(battle, source.playerId);
    if (battleTotal(participant) >= battleTotal(opponent)) continue;

    battle.effectsResolved.push(marker);
    game.pendingNeutralChoice = {
      kind: 'valor_battle',
      playerId: source.playerId,
      battleId: battle.id,
      sourceKey: source.sourceKey,
      oldRoll: participant.diceRoll!,
      options: ['pass', 'use'],
      resumePriorityPlayer: game.priorityPlayer,
    };
    game.priorityPlayer = source.playerId;
    return true;
  }
  return false;
}

function randomValues(count: number): number[] {
  return Array.from({ length: count }, () => Math.floor(Math.random() * 6) + 1);
}

function validateValues(values: number[], expectedCount: number): void {
  if (values.length !== expectedCount) {
    throw new GameActionError(`This Valor reroll requires exactly ${expectedCount} dice.`);
  }
  if (values.some((value) => !Number.isInteger(value) || value < 1 || value > 6)) {
    throw new GameActionError('Every rerolled die must be an integer from 1 to 6.');
  }
}

export function resolveValorChoice(game: GameState, action: ResolveNeutralChoiceAction): void {
  const pending = game.pendingNeutralChoice;
  if (!pending || pending.kind !== 'valor_battle' || pending.playerId !== action.playerId) {
    throw new GameActionError(`${action.playerId} has no pending Valor choice.`);
  }
  const battle = game.battle;
  if (!battle || battle.id !== pending.battleId) {
    throw new GameActionError('The Valor battle is no longer active.');
  }
  if (action.choice !== 'pass' && action.choice !== 'use') {
    throw new GameActionError('Choose whether to use Valor.');
  }

  game.pendingNeutralChoice = undefined;
  if (action.choice === 'use') {
    const participant = participantFor(battle, action.playerId);
    const count = battleDiceCount(participant);
    const values = action.values
      ? [...action.values]
      : action.value !== undefined
        ? count === 1
          ? [action.value]
          : deterministicBattleDiceValues(participant, action.value)
        : randomValues(count);
    validateValues(values, count);
    const selected = selectBattleDieResult(participant, values);
    participant.diceRolls = values;
    participant.diceRoll = selected;
    appendPublicLog(
      game,
      action.playerId,
      'neutral_valor_rerolled',
      `${game.players[action.playerId].name} rerolled with Valor and must use ${selected}.`,
      {
        battleId: battle.id,
        oldRoll: pending.oldRoll,
        values,
        selected,
      },
    );
  } else {
    appendPublicLog(
      game,
      action.playerId,
      'neutral_valor_passed',
      `${game.players[action.playerId].name} declined to reroll with Valor.`,
      { battleId: battle.id, oldRoll: pending.oldRoll },
    );
  }
  game.priorityPlayer = pending.resumePriorityPlayer ?? game.activePlayer;
}

export function applyValorAssetDraw(
  game: GameState,
  battle: BattleState,
  winnerId: PlayerID | undefined,
): CardID[] {
  if (!winnerId) return [];
  const loserId = winnerId === battle.attacker.playerId
    ? battle.defender.playerId
    : battle.attacker.playerId;
  if (battle.bankedAssetUseProhibited?.includes(loserId)) return [];

  const seditionSuppressed = battle.seditionInactiveAssets?.[loserId]
    ?.filter((cardId) => cardId === VALOR).length ?? 0;
  const copies = Math.max(0, activeBankedAssetCopies(game, loserId, VALOR) - seditionSuppressed);
  if (copies < 1) return [];

  const player = game.players[loserId];
  const draw = drawFromDeck(player, { count: copies });
  player.zones.hand.push(...draw.drawnCards);
  appendPublicLog(
    game,
    loserId,
    'neutral_valor_asset_draw',
    `${player.name} drew ${draw.drawnCards.length} card${draw.drawnCards.length === 1 ? '' : 's'} with Valor after losing the battle.`,
    {
      battleId: battle.id,
      copies,
      drawCount: draw.drawnCards.length,
      reshuffled: draw.reshuffled,
      exhausted: draw.exhausted,
    },
  );
  return draw.drawnCards;
}
