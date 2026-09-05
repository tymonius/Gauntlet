import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';
import {
  clearV070AssetFaceState,
  isV070AssetUsable,
} from './asset-face-state';
import { drawV070Cards } from './card-draw';
import { advanceV070FrontLine, nextV070FrontLineTarget } from './front-line';
import { recordV070IntelligenceBattleAssetUseForMission } from './intelligence';
import type { V070UnsupportedBattleEffect } from './battle-types';

export const V070_FORTIFICATIONS_ID = 'neutral-fortifications' as const;
export const V070_FORTIFICATIONS_ASSET_TEXT =
  'During Onset while defending a Territory you control, you may put this card in your Graveyard to apply its Gambit/Tactic effect after Tactics are revealed.' as const;
export const V070_FORTIFICATIONS_BATTLE_TEXT =
  'If you are defending a Territory you control, after Tactics are revealed, +2 Reserve; +1 Tactic from those cards. If you lose, after you retreat, the attacker captures that Territory. In the Aftermath, put this card in your Graveyard.' as const;

validateFortificationsContract();

export function v070FortificationsAssetEligibleInstanceIds(
  state: V070GameState,
): string[] {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || runtime.stage !== 'onset' || battle.lastStand) {
    return [];
  }

  const defender = battle.defender;
  const territory = state.board.find(
    candidate => candidate.position === battle.contestedPosition,
  );
  if (!territory || territory.controller !== defender) return [];

  return state.players[defender].zones.assetBank.filter(instanceId =>
    state.cardInstances[instanceId]?.cardId === V070_FORTIFICATIONS_ID
    && isV070AssetUsable(state, instanceId)
  );
}

export function openV070FortificationsAssetOnsetWindow(
  state: V070GameState,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || runtime.stage !== 'onset') return false;
  if (runtime.pendingFortificationsAssetOnset) return true;
  if (runtime.fortificationsAssetOnsetResolved) return false;

  const candidates = v070FortificationsAssetEligibleInstanceIds(state);
  if (candidates.length === 0) {
    runtime.fortificationsAssetOnsetResolved = true;
    return false;
  }

  runtime.pendingFortificationsAssetOnset = {
    playerId: battle.defender,
    candidateAssetInstanceIds: [...candidates],
  };
  appendFortificationsAssetWindowEvents(state, battle.defender, candidates, false);
  return true;
}

export function useV070FortificationsAssetOnset(
  state: V070GameState,
  playerId: PlayerId,
  assetInstanceId: string,
): boolean {
  const runtime = requireRuntime(state);
  const pending = runtime.pendingFortificationsAssetOnset;
  if (!pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'That player has no pending Fortifications Asset opportunity.',
    );
  }
  if (!pending.candidateAssetInstanceIds.includes(assetInstanceId)
    || !v070FortificationsAssetEligibleInstanceIds(state)
      .includes(assetInstanceId)) {
    throw new V070GameActionError(
      'Choose an eligible active banked Fortifications.',
    );
  }

  const bank = state.players[playerId].zones.assetBank;
  const index = bank.indexOf(assetInstanceId);
  if (index < 0) {
    throw new V070GameActionError('Fortifications is no longer banked.');
  }
  bank.splice(index, 1);
  clearV070AssetFaceState(state, assetInstanceId);
  state.players[playerId].zones.graveyard.push(assetInstanceId);

  scheduleFortificationsBattleEffect(
    state,
    playerId,
    assetInstanceId,
    'asset',
  );
  recordV070IntelligenceBattleAssetUseForMission(state, playerId);

  appendV070Event(state, {
    type: 'fortifications_asset_used',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      assetInstanceId,
      destination: 'graveyard',
      appliesAfterTacticsReveal: true,
    },
  });

  return continueV070FortificationsAssetOnsetWindow(state, true);
}

export function passV070FortificationsAssetOnset(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const runtime = requireRuntime(state);
  const pending = runtime.pendingFortificationsAssetOnset;
  if (!pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'That player has no pending Fortifications Asset opportunity.',
    );
  }
  runtime.pendingFortificationsAssetOnset = null;
  runtime.fortificationsAssetOnsetResolved = true;
  appendV070Event(state, {
    type: 'fortifications_asset_passed',
    actor: playerId,
    visibility: 'public',
    payload: { playerId },
  });
}

export function continueV070FortificationsAssetOnsetWindow(
  state: V070GameState,
  afterAttempt = false,
): boolean {
  const runtime = requireRuntime(state);
  const pending = runtime.pendingFortificationsAssetOnset;
  if (!pending) return false;

  const candidates = v070FortificationsAssetEligibleInstanceIds(state);
  if (candidates.length === 0) {
    runtime.pendingFortificationsAssetOnset = null;
    runtime.fortificationsAssetOnsetResolved = true;
    return false;
  }

  pending.candidateAssetInstanceIds = [...candidates];
  appendFortificationsAssetWindowEvents(
    state,
    pending.playerId,
    candidates,
    afterAttempt,
  );
  return true;
}

export function applyV070FortificationsGambitTacticEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
): void {
  const battle = state.battle;
  const runtime = requireRuntime(state);
  if (!battle) throw new V070GameActionError('Fortifications requires an active battle.');

  if (isBattleCardInstance(runtime, owner, sourceInstanceId)
    && !runtime.battleCardAftermathDestinationOverrides.some(
      override => override.instanceId === sourceInstanceId,
    )) {
    runtime.battleCardAftermathDestinationOverrides.push({
      sourceCardId: V070_FORTIFICATIONS_ID,
      playerId: owner,
      instanceId: sourceInstanceId,
      destination: 'graveyard',
    });
  }

  if (battle.lastStand || owner !== battle.defender) return;
  const territory = state.board.find(
    candidate => candidate.position === battle.contestedPosition,
  );
  if (!territory || territory.controller !== owner) return;

  scheduleFortificationsBattleEffect(
    state,
    owner,
    sourceInstanceId,
    'battle_card',
  );
}

export function openNextV070FortificationsPostTacticsEffect(
  state: V070GameState,
): boolean {
  const runtime = requireRuntime(state);
  if (runtime.pendingFortificationsPostTactics) return true;
  if (runtime.stage !== 'outcome') return false;

  const scheduled = runtime.fortificationsScheduledEffects.find(effect =>
    !runtime.fortificationsPostTacticsProcessedSourceInstanceIds
      .includes(effect.sourceInstanceId)
  );
  if (!scheduled) return false;

  runtime.fortificationsPostTacticsProcessedSourceInstanceIds.push(
    scheduled.sourceInstanceId,
  );
  if (!runtime.fortificationsCaptureEffects.some(
    effect => effect.sourceInstanceId === scheduled.sourceInstanceId,
  )) {
    runtime.fortificationsCaptureEffects.push({
      owner: scheduled.owner,
      sourceInstanceId: scheduled.sourceInstanceId,
      territoryPosition: state.battle!.contestedPosition,
    });
  }

  const draw = drawV070Cards(
    state,
    scheduled.owner,
    2,
    'Fortifications post-reveal Reserve',
  );
  const participant = runtime.participants[scheduled.owner];
  participant.reserve.push(...draw.drawn);
  const candidates = draw.drawn.filter(instanceId =>
    cardEligibleForTactic(state, instanceId)
  );

  appendV070Event(state, {
    type: 'fortifications_reserve_added',
    actor: scheduled.owner,
    visibility: 'public',
    payload: {
      playerId: scheduled.owner,
      sourceInstanceId: scheduled.sourceInstanceId,
      count: draw.drawn.length,
      reshuffles: draw.reshuffles,
      exhausted: draw.exhausted,
    },
  });
  if (draw.drawn.length > 0) {
    appendV070Event(state, {
      type: 'reserve_identity',
      actor: scheduled.owner,
      visibility: scheduled.owner,
      payload: {
        cardInstanceIds: [...draw.drawn],
        purpose: 'Fortifications',
      },
    });
  }

  runtime.pendingFortificationsPostTactics = {
    playerId: scheduled.owner,
    sourceInstanceId: scheduled.sourceInstanceId,
    drawnInstanceIds: [...draw.drawn],
    candidateTacticInstanceIds: [...candidates],
  };
  appendV070Event(state, {
    type: 'fortifications_tactic_window_opened',
    actor: scheduled.owner,
    visibility: 'public',
    payload: {
      playerId: scheduled.owner,
      sourceInstanceId: scheduled.sourceInstanceId,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'fortifications_tactic_options',
    actor: scheduled.owner,
    visibility: scheduled.owner,
    payload: {
      sourceInstanceId: scheduled.sourceInstanceId,
      drawnInstanceIds: [...draw.drawn],
      candidateTacticInstanceIds: [...candidates],
    },
  });
  return true;
}

export function resolveV070FortificationsPostTacticsChoice(
  state: V070GameState,
  playerId: PlayerId,
  tacticInstanceId?: string,
): void {
  const runtime = requireRuntime(state);
  const pending = runtime.pendingFortificationsPostTactics;
  if (!pending || pending.playerId !== playerId) {
    throw new V070GameActionError(
      'That player has no pending Fortifications Tactic opportunity.',
    );
  }

  runtime.pendingFortificationsPostTactics = null;
  if (!tacticInstanceId) {
    appendV070Event(state, {
      type: 'fortifications_tactic_passed',
      actor: playerId,
      visibility: 'public',
      payload: { sourceInstanceId: pending.sourceInstanceId },
    });
    return;
  }

  if (!pending.candidateTacticInstanceIds.includes(tacticInstanceId)) {
    throw new V070GameActionError(
      'Choose an eligible Tactic from the cards added by Fortifications.',
    );
  }
  const participant = runtime.participants[playerId];
  const reserveIndex = participant.reserve.indexOf(tacticInstanceId);
  if (reserveIndex < 0 || !cardEligibleForTactic(state, tacticInstanceId)) {
    throw new V070GameActionError(
      'That Fortifications Tactic candidate is no longer available.',
    );
  }

  participant.reserve.splice(reserveIndex, 1);
  participant.additionalTactics.push({
    instanceId: tacticInstanceId,
    owner: playerId,
    role: 'tactic',
    faceUp: true,
  });

  const cardId = requireCardId(state, tacticInstanceId);
  appendV070Event(state, {
    type: 'tactic_added_after_reveal',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId: tacticInstanceId,
      cardId,
      source: 'Fortifications',
      faceUp: true,
    },
  });

  if (cardId === V070_FORTIFICATIONS_ID) {
    applyV070FortificationsGambitTacticEffect(
      state,
      playerId,
      tacticInstanceId,
    );
    return;
  }

  const futureEffect = futureTacticEffectStillAvailable(state, tacticInstanceId);
  if (futureEffect) haltForUnsupportedLateTactic(
    state,
    playerId,
    tacticInstanceId,
    cardId,
    futureEffect.label,
    futureEffect.text,
  );
}

export function resolveV070FortificationsCaptureAfterRetreat(
  state: V070GameState,
  winner: PlayerId,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || runtime.fortificationsCaptureEffects.length === 0) {
    return;
  }

  const effects = [...runtime.fortificationsCaptureEffects];
  runtime.fortificationsCaptureEffects = [];
  if (winner !== battle.attacker || battle.loser !== battle.defender) return;

  for (const effect of effects) {
    if (effect.owner !== battle.defender) continue;
    const territory = state.board.find(
      candidate => candidate.position === effect.territoryPosition,
    );
    if (!territory || territory.controller === battle.attacker) continue;

    const nextTarget = nextV070FrontLineTarget(state, battle.attacker);
    if (!nextTarget || nextTarget.position !== territory.position) {
      throw new V070GameActionError(
        'Fortifications cannot create non-contiguous control; the contested Territory must be the attacker’s next Front Line target.',
      );
    }

    const result = advanceV070FrontLine(
      state,
      battle.attacker,
      1,
      'Fortifications',
    );
    appendV070Event(state, {
      type: 'fortifications_capture_resolved',
      actor: battle.attacker,
      visibility: 'public',
      payload: {
        sourceInstanceId: effect.sourceInstanceId,
        territoryPosition: territory.position,
        captured: result.captures.some(
          capture => capture.position === territory.position,
        ),
      },
    });
    if (result.reachedOpponentEnd && !runtime.pendingGameVictory) {
      runtime.pendingGameVictory = {
        winner: battle.attacker,
        route: 'final_territory_capture',
      };
    }
  }
}

function scheduleFortificationsBattleEffect(
  state: V070GameState,
  owner: PlayerId,
  sourceInstanceId: string,
  sourceKind: 'asset' | 'battle_card',
): void {
  const runtime = requireRuntime(state);
  if (runtime.fortificationsScheduledEffects.some(
    effect => effect.sourceInstanceId === sourceInstanceId,
  )) return;
  runtime.fortificationsScheduledEffects.push({
    owner,
    sourceInstanceId,
    sourceKind,
  });
}

function appendFortificationsAssetWindowEvents(
  state: V070GameState,
  playerId: PlayerId,
  candidates: readonly string[],
  continues: boolean,
): void {
  appendV070Event(state, {
    type: continues
      ? 'fortifications_asset_window_continues'
      : 'fortifications_asset_window_opened',
    actor: playerId,
    visibility: 'public',
    payload: {
      playerId,
      candidateCount: candidates.length,
      optional: true,
    },
  });
  appendV070Event(state, {
    type: 'fortifications_asset_options',
    actor: playerId,
    visibility: playerId,
    payload: {
      playerId,
      candidateAssetInstanceIds: [...candidates],
    },
  });
}

function cardEligibleForTactic(
  state: V070GameState,
  instanceId: string,
): boolean {
  const cardId = requireCardId(state, instanceId);
  const card = v070CanonicalContent.cardsById.get(cardId);
  return Boolean(card?.effects.some(effect =>
    effect.label === 'Tactic' || effect.label === 'Gambit/Tactic'
  ));
}

function futureTacticEffectStillAvailable(
  state: V070GameState,
  instanceId: string,
): { label: string; text: string } | null {
  const cardId = requireCardId(state, instanceId);
  const card = v070CanonicalContent.cardsById.get(cardId);
  const effect = card?.effects.find(candidate =>
    candidate.label === 'Tactic' || candidate.label === 'Gambit/Tactic'
  );
  if (!effect) return null;

  if (/\bafter\b|\bbefore\b|\bIn the Aftermath\b|\bWin\s+—|\bLose\s+—|\bif you (?:win|lose)\b/i
    .test(effect.text)) {
    return { label: effect.label, text: effect.text };
  }
  return null;
}

function haltForUnsupportedLateTactic(
  state: V070GameState,
  owner: PlayerId,
  instanceId: string,
  cardId: string,
  label: string,
  text: string,
): void {
  const runtime = requireRuntime(state);
  const unsupported: V070UnsupportedBattleEffect = {
    owner,
    instanceId,
    cardId,
    role: 'tactic',
    label,
    text,
    encounteredAt: 'reveal_tactics',
  };
  runtime.unsupportedEffects.push(unsupported);
  runtime.stage = 'halted';
  appendV070Event(state, {
    type: 'battle_halted_unsupported_effect',
    visibility: 'public',
    payload: {
      effects: [{
        owner,
        cardId,
        role: 'tactic',
        label,
        timing: 'late_additional_tactic',
      }],
    },
  });
}

function isBattleCardInstance(
  runtime: NonNullable<V070GameState['battleRuntime']>,
  owner: PlayerId,
  instanceId: string,
): boolean {
  const participant = runtime.participants[owner];
  return [
    participant.gambit,
    ...participant.additionalGambits,
    participant.tactic,
    ...participant.additionalTactics,
  ].some(commitment => commitment?.instanceId === instanceId);
}

function requireRuntime(
  state: V070GameState,
): NonNullable<V070GameState['battleRuntime']> {
  if (!state.battleRuntime) {
    throw new V070GameActionError(
      'Fortifications requires an active battle runtime.',
    );
  }
  return state.battleRuntime;
}

function requireCardId(state: V070GameState, instanceId: string): string {
  const instance = state.cardInstances[instanceId];
  if (!instance) throw new V070GameActionError(`Unknown card instance ${instanceId}.`);
  return instance.cardId;
}

function validateFortificationsContract(): void {
  const card = v070CanonicalContent.cardsById.get(V070_FORTIFICATIONS_ID);
  if (!card) throw new Error('Missing canonical v0.7.0 Fortifications card.');
  const asset = card.effects.find(effect => effect.label === 'Asset');
  const battle = card.effects.find(effect => effect.label === 'Gambit/Tactic');
  if (asset?.text !== V070_FORTIFICATIONS_ASSET_TEXT
    || battle?.text !== V070_FORTIFICATIONS_BATTLE_TEXT) {
    throw new Error(
      `Fortifications handler text drift from canonical v0.7.0 content: ${JSON.stringify({
        labels: card.effects.map(effect => effect.label),
        actualAsset: asset?.text ?? null,
        expectedAsset: V070_FORTIFICATIONS_ASSET_TEXT,
        actualBattle: battle?.text ?? null,
        expectedBattle: V070_FORTIFICATIONS_BATTLE_TEXT,
      })}`,
    );
  }
}
