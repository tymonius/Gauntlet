import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  applyV070BattleRetreatStep,
  v070NormalBattleRetreatApplied,
} from './retreat-step';
import {
  markV070BattleCardEffectApplied,
} from './battle-effect-status';
import {
  imposeV070VictoryResultRestrictions,
  v070VictoryResultBenefitWasUsed,
} from './victory-result-restrictions';

export const V070_WAR_CRIMES_ID = 'military-war-crimes' as const;
export const V070_WAR_CRIMES_BATTLE_TEXT =
  'In the Aftermath, if you win, you may apply the same effect and put this card in your Graveyard.' as const;

export interface V070WarCrimesAftermathEffect {
  owner: PlayerId;
  sourceInstanceId: string;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    warCrimesAftermathEffects?: V070WarCrimesAftermathEffect[];
    warCrimesTacticGraveyardPlayers?: PlayerId[];
  }
}

function validateAuthority(): void {
  const frozen = v070CanonicalContent.cardsById.get(
    V070_WAR_CRIMES_ID,
  );
  const current = currentCanonicalContent.cardsById.get(
    V070_WAR_CRIMES_ID,
  );
  const frozenAsset = frozen?.effects.find(
    effect => effect.label === 'Asset',
  )?.text;
  const currentAsset = current?.effects.find(
    effect => effect.label === 'Asset',
  )?.text;
  const frozenBattle = frozen?.effects.find(
    effect => effect.label === 'Gambit/Tactic',
  )?.text;
  const currentBattle = current?.effects.find(
    effect => effect.label === 'Gambit/Tactic',
  )?.text;

  if (!frozenAsset || frozenAsset !== currentAsset) {
    throw new Error(
      'War Crimes Asset authority drifted between frozen and current data.',
    );
  }
  if (frozenBattle !== V070_WAR_CRIMES_BATTLE_TEXT
    || currentBattle !== V070_WAR_CRIMES_BATTLE_TEXT) {
    throw new Error(
      'War Crimes battle text drifted from frozen/current authority.',
    );
  }
}

validateAuthority();

export function registerV070WarCrimesBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  const source = state.cardInstances[sourceInstanceId];
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'War Crimes battle registration requires an active battle.',
    );
  }
  if (source?.owner !== owner
    || source.cardId !== V070_WAR_CRIMES_ID) {
    throw new V070GameActionError(
      'War Crimes source does not match the revealed battle card.',
    );
  }
  runtime.warCrimesAftermathEffects ??= [];
  if (runtime.warCrimesAftermathEffects.some(
    effect => effect.sourceInstanceId === sourceInstanceId,
  )) {
    return;
  }
  runtime.warCrimesAftermathEffects.push({
    owner,
    sourceInstanceId,
  });
  appendV070Event(state, {
    type: 'war_crimes_aftermath_effect_registered',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_WAR_CRIMES_ID,
    },
  });
}

export function v070WarCrimesAftermathEffects(
  state: V070GameState,
): V070WarCrimesAftermathEffect[] {
  return (state.battleRuntime?.warCrimesAftermathEffects ?? [])
    .map(effect => ({ ...effect }));
}

export function v070WarCrimesAftermathEffectEligible(
  state: V070GameState,
  effect: V070WarCrimesAftermathEffect,
): boolean {
  return Boolean(
    state.battle
    && state.battleRuntime
    && state.battleRuntime.stage === 'aftermath'
    && state.battle.winner === effect.owner
    && !v070VictoryResultBenefitWasUsed(state, effect.owner),
  );
}

export function declineV070WarCrimesAftermathEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  const effects = runtime?.warCrimesAftermathEffects ?? [];
  const index = effects.findIndex(
    effect =>
      effect.owner === owner
      && effect.sourceInstanceId === sourceInstanceId,
  );
  if (!runtime || index < 0) {
    throw new V070GameActionError(
      'That optional War Crimes Aftermath effect is not pending.',
    );
  }
  effects.splice(index, 1);
  appendV070Event(state, {
    type: 'war_crimes_aftermath_declined',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_WAR_CRIMES_ID,
    },
  });
}

export function resolveV070WarCrimesAftermathEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  const battle = state.battle;
  if (!runtime || !battle || runtime.stage !== 'aftermath') {
    throw new V070GameActionError(
      'War Crimes resolves only during the Aftermath.',
    );
  }
  const effects = runtime.warCrimesAftermathEffects ?? [];
  const index = effects.findIndex(
    effect =>
      effect.owner === owner
      && effect.sourceInstanceId === sourceInstanceId,
  );
  if (index < 0) {
    throw new V070GameActionError(
      'That War Crimes Aftermath effect is no longer pending.',
    );
  }
  const effect = effects[index];
  if (!v070WarCrimesAftermathEffectEligible(state, effect)) {
    throw new V070GameActionError(
      'War Crimes cannot be combined with a victory-derived movement, capture, or Order that has already been used.',
    );
  }
  effects.splice(index, 1);

  const opponent: PlayerId = owner === 'A' ? 'B' : 'A';
  runtime.warCrimesTacticGraveyardPlayers ??= [];
  if (!runtime.warCrimesTacticGraveyardPlayers.includes(opponent)) {
    runtime.warCrimesTacticGraveyardPlayers.push(opponent);
  }

  const existingDestination =
    runtime.battleCardAftermathDestinationOverrides.find(
      override =>
        override.playerId === owner
        && override.instanceId === sourceInstanceId,
    );
  if (existingDestination) {
    existingDestination.destination = 'graveyard';
    existingDestination.sourceCardId = V070_WAR_CRIMES_ID;
  } else {
    runtime.battleCardAftermathDestinationOverrides.push({
      sourceCardId: V070_WAR_CRIMES_ID,
      playerId: owner,
      instanceId: sourceInstanceId,
      destination: 'graveyard',
    });
  }

  imposeV070VictoryResultRestrictions(
    state,
    owner,
    sourceInstanceId,
    {
      noMovement: true,
      noCapture: true,
      noOrders: true,
    },
  );

  let additionalRetreat = null as null | {
    from: number;
    to: number;
    moved: boolean;
  };
  if (battle.loser === opponent
    && v070NormalBattleRetreatApplied(state)) {
    additionalRetreat = applyV070BattleRetreatStep(
      state,
      opponent,
      {
        kind: 'battle_card',
        label: 'War Crimes',
        sourceInstanceId,
        sourceCardId: V070_WAR_CRIMES_ID,
      },
    );
  }

  markV070BattleCardEffectApplied(state, sourceInstanceId);
  appendV070Event(state, {
    type: 'war_crimes_aftermath_resolved',
    actor: owner,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId: V070_WAR_CRIMES_ID,
      opponentId: opponent,
      opponentTacticsDestination: 'graveyard',
      additionalRetreat,
      noMovement: true,
      noCapture: true,
      noOrders: true,
    },
  });
}

export function v070WarCrimesForcesTacticGraveyard(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  return Boolean(
    state.battleRuntime?.warCrimesTacticGraveyardPlayers
      ?.includes(playerId),
  );
}
