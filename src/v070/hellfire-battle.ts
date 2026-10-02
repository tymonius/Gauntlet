import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import {
  applyV070NormalAftermathConviction,
  spendV070Conviction,
} from './inquisition';
import {
  completeV070HellfireBattleRevealChoice,
  queueV070HellfireBattleRevealChoice,
} from './battle-reveal-choices';
import type { PlayerId } from './rules';

export const V070_HELLFIRE_ID = 'inquisition-hellfire' as const;
export const V070_HELLFIRE_BATTLE_TEXT =
  "After Tactics are revealed, spend any amount of Conviction. For each Conviction spent, choose one: +1 Battle Total; or, if you win, put the top card of the opponent's Draw Pile in their Graveyard in the Aftermath. You may choose either option more than once." as const;

export interface V070HellfireAftermathEffect {
  owner: PlayerId;
  sourceInstanceId: string;
  cardCount: number;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    hellfireAftermathEffects?: V070HellfireAftermathEffect[];
  }
}

function validateAuthority(): void {
  for (const source of [
    v070CanonicalContent.cardsById.get(V070_HELLFIRE_ID),
    currentCanonicalContent.cardsById.get(V070_HELLFIRE_ID),
  ]) {
    const text = source?.effects.find(
      effect => effect.label === 'Gambit/Tactic',
    )?.text;
    if (text !== V070_HELLFIRE_BATTLE_TEXT) {
      throw new Error(
        'Hellfire battle text drifted from frozen/current authority.',
      );
    }
  }
}

validateAuthority();

function convictionAvailable(
  state: V070GameState,
  owner: PlayerId,
): number {
  return state.players[owner].inquisition?.conviction ?? 0;
}

export function registerV070HellfireBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Hellfire battle resolution requires an active battle.',
    );
  }
  const source = state.cardInstances[sourceInstanceId];
  if (source?.cardId !== V070_HELLFIRE_ID || source.owner !== owner) {
    throw new V070GameActionError(
      'Hellfire battle source does not match the applied card effect.',
    );
  }

  const maximumConviction = convictionAvailable(state, owner);
  if (maximumConviction === 0) {
    appendV070Event(state, {
      type: 'hellfire_battle_resolved',
      actor: owner,
      visibility: 'public',
      payload: {
        sourceInstanceId,
        sourceCardId: V070_HELLFIRE_ID,
        convictionSpent: 0,
        battleTotalBonus: 0,
        aftermathCardCount: 0,
      },
    });
    return;
  }

  queueV070HellfireBattleRevealChoice(state, {
    kind: 'hellfire',
    owner,
    sourceInstanceId,
    maximumConviction,
  });
}

export function resolveV070HellfireBattleChoice(
  state: V070GameState,
  playerId: PlayerId,
  battleTotalBonus: number,
  aftermathCardCount: number,
): void {
  const pending =
    state.battleRuntime?.pendingHellfireBattleRevealChoice;
  if (!pending || !state.battleRuntime?.hellfireBattleRevealChoiceOpen) {
    throw new V070GameActionError(
      'No Hellfire battle allocation is pending.',
    );
  }
  if (pending.owner !== playerId) {
    throw new V070GameActionError(
      'Only the Hellfire controller may choose its Conviction allocation.',
    );
  }
  for (const [label, value] of [
    ['Battle Total allocation', battleTotalBonus],
    ['Aftermath allocation', aftermathCardCount],
  ] as const) {
    if (!Number.isInteger(value) || value < 0) {
      throw new V070GameActionError(
        `Hellfire ${label} must be a nonnegative integer.`,
      );
    }
  }

  const convictionSpent = battleTotalBonus + aftermathCardCount;
  const currentConviction = convictionAvailable(state, playerId);
  if (convictionSpent > pending.maximumConviction
    || convictionSpent > currentConviction) {
    throw new V070GameActionError(
      `Hellfire may spend at most ${Math.min(
        pending.maximumConviction,
        currentConviction,
      )} Conviction in this application.`,
    );
  }

  const choice = completeV070HellfireBattleRevealChoice(state);
  if (convictionSpent > 0) {
    spendV070Conviction(
      state,
      playerId,
      convictionSpent,
      'Hellfire battle effect',
    );
  }

  const runtime = state.battleRuntime!;
  runtime.participants[playerId].battleModifier += battleTotalBonus;

  if (aftermathCardCount > 0) {
    runtime.hellfireAftermathEffects ??= [];
    runtime.hellfireAftermathEffects.push({
      owner: playerId,
      sourceInstanceId: choice.sourceInstanceId,
      cardCount: aftermathCardCount,
    });
  }

  appendV070Event(state, {
    type: 'hellfire_battle_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: choice.sourceInstanceId,
      sourceCardId: V070_HELLFIRE_ID,
      convictionSpent,
      battleTotalBonus,
      aftermathCardCount,
      battleModifier:
        runtime.participants[playerId].battleModifier,
    },
  });
}

export function v070HellfireAftermathEffects(
  state: V070GameState,
): V070HellfireAftermathEffect[] {
  return state.battleRuntime?.hellfireAftermathEffects ?? [];
}

export function v070HellfireAftermathEffectEligible(
  state: V070GameState,
  effect: V070HellfireAftermathEffect,
): boolean {
  return Boolean(
    state.battle
    && state.battleRuntime
    && state.battleRuntime.stage === 'aftermath'
    && state.battle.winner === effect.owner
    && effect.cardCount > 0,
  );
}

export function resolveV070HellfireAftermathEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): string[] {
  const runtime = state.battleRuntime;
  const battle = state.battle;
  if (!runtime || !battle || runtime.stage !== 'aftermath') {
    throw new V070GameActionError(
      'Hellfire delayed loss resolves only during the Aftermath.',
    );
  }

  const effects = runtime.hellfireAftermathEffects ?? [];
  const index = effects.findIndex(
    effect =>
      effect.owner === owner
      && effect.sourceInstanceId === sourceInstanceId,
  );
  if (index < 0) {
    throw new V070GameActionError(
      'That Hellfire Aftermath effect is no longer pending.',
    );
  }
  const [effect] = effects.splice(index, 1);
  if (battle.winner !== owner) {
    return [];
  }

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  const drawPile = state.players[opponent].zones.drawPile;
  const graveyarded = drawPile.splice(0, effect.cardCount);
  state.players[opponent].zones.graveyard.push(...graveyarded);

  applyV070NormalAftermathConviction(
    state,
    owner,
    graveyarded,
  );

  appendV070Event(state, {
    type: 'hellfire_aftermath_resolved',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_HELLFIRE_ID,
      opponentId: opponent,
      requestedCardCount: effect.cardCount,
      graveyardedInstanceIds: [...graveyarded],
      graveyardedCards: graveyarded.map(instanceId => ({
        instanceId,
        cardId: state.cardInstances[instanceId]?.cardId ?? null,
      })),
      exhausted: graveyarded.length < effect.cardCount,
    },
  });

  return graveyarded;
}
