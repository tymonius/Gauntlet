import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  isV070BattleCardEffectNegated,
  v070BattleCommitment,
} from './battle-effect-status';
import { isV070AssetUsable } from './asset-face-state';

export const V070_COUNTERCHARGE_ID = 'military-countercharge' as const;
export const V070_COUNTERCHARGE_ASSET_TEXT =
  'At the end of the Aftermath, if you won and did not initiate this battle, you may put this card in your Graveyard to advance one Position.' as const;
export const V070_COUNTERCHARGE_BATTLE_TEXT =
  'At the end of the Aftermath, if you won and did not initiate this battle, put this card in your Graveyard, then advance one Position.' as const;

export interface V070CounterchargeAftermathCandidate {
  owner: PlayerId;
  sourceInstanceId: string;
  sourceMode: 'asset' | 'battle';
  optional: boolean;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    /** Revealed physical sources only; no playable handler is registered yet. */
    counterchargeBattleSourceInstanceIds?: string[];
  }
}

function validateAuthority(): void {
  for (const [name, content] of [
    ['frozen v0.7.0', v070CanonicalContent],
    ['current', currentCanonicalContent],
  ] as const) {
    const card = content.cardsById.get(V070_COUNTERCHARGE_ID);
    if (card?.effects.find(effect => effect.label === 'Asset')?.text
        !== V070_COUNTERCHARGE_ASSET_TEXT
      || card?.effects.find(effect => effect.label === 'Gambit/Tactic')?.text
        !== V070_COUNTERCHARGE_BATTLE_TEXT) {
      throw new Error(
        `Countercharge ${name} authority differs from the staged eligibility contract.`,
      );
    }
  }
}

validateAuthority();

/**
 * Stage a revealed Countercharge source only. The live reveal registry does
 * not call this until end-of-Aftermath movement sequencing is defined.
 */
export function stageV070CounterchargeBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  const commitment = v070BattleCommitment(state, sourceInstanceId);
  const card = state.cardInstances[sourceInstanceId];
  if (!state.battle || !runtime || runtime.stage === 'aftermath'
      || !commitment || commitment.owner !== owner
      || (commitment.role !== 'gambit' && commitment.role !== 'tactic')
      || card?.cardId !== V070_COUNTERCHARGE_ID || card.owner !== owner
      || isV070BattleCardEffectNegated(state, sourceInstanceId)) {
    throw new V070GameActionError(
      'Countercharge battle source must be a live, non-negated commitment of its controller.',
    );
  }

  runtime.counterchargeBattleSourceInstanceIds ??= [];
  if (runtime.counterchargeBattleSourceInstanceIds.includes(sourceInstanceId)) {
    return;
  }
  runtime.counterchargeBattleSourceInstanceIds.push(sourceInstanceId);
  appendV070Event(state, {
    type: 'countercharge_battle_effect_staged',
    actor: owner,
    visibility: 'public',
    payload: { sourceInstanceId, sourceCardId: V070_COUNTERCHARGE_ID },
  });
}

/**
 * Identify exactly which printed Countercharge instructions are eligible at
 * the end-of-Aftermath window. This does not decide simultaneous-effect order,
 * interrupt an existing battle, consume Assets, or grant movement.
 *
 * Battle-card mode is mandatory; banked Asset mode is optional. Copies remain
 * distinct physical choices rather than being deduplicated by card title.
 */
export function v070CounterchargeAftermathCandidates(
  state: V070GameState,
): V070CounterchargeAftermathCandidate[] {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || runtime.stage !== 'aftermath'
      || !runtime.aftermathCardsCleared
      || runtime.pendingGameVictory
      || !battle.winner || battle.winner !== battle.defender) {
    return [];
  }

  const owner = battle.winner;
  const staged = runtime.counterchargeBattleSourceInstanceIds ?? [];
  const battleCandidates = staged
    .filter(sourceInstanceId => {
      const card = state.cardInstances[sourceInstanceId];
      const commitment = v070BattleCommitment(state, sourceInstanceId);
      return card?.cardId === V070_COUNTERCHARGE_ID
        && card.owner === owner
        && commitment?.owner === owner
        && !isV070BattleCardEffectNegated(state, sourceInstanceId);
    })
    .map(sourceInstanceId => ({
      owner,
      sourceInstanceId,
      sourceMode: 'battle' as const,
      optional: false,
    }));

  const assets = state.players[owner].zones.assetBank
    .filter(sourceInstanceId =>
      state.cardInstances[sourceInstanceId]?.cardId
        === V070_COUNTERCHARGE_ID
      && state.cardInstances[sourceInstanceId]?.owner === owner
      && isV070AssetUsable(state, sourceInstanceId)
    )
    .map(sourceInstanceId => ({
      owner,
      sourceInstanceId,
      sourceMode: 'asset' as const,
      optional: true,
    }));

  // Collection order is not resolution order. The published shared-timing
  // controller-choice rule governs ordering when this reaches the scheduler.
  return [...battleCandidates, ...assets];
}
