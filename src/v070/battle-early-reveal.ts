import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import type { PlayerId } from './rules';

export type V070BattleEarlyRevealSourceKind = 'effect' | 'rule';

export interface V070BattleEarlyRevealRecord {
  instanceId: string;
  owner: PlayerId;
  role: 'gambit' | 'tactic';
  sourceKind: V070BattleEarlyRevealSourceKind;
  sourceController: PlayerId | null;
  sourceInstanceId: string | null;
  sourceId: string | null;
}

export interface V070RevealBattleCommitmentEarlyOptions {
  targetInstanceId: string;
  sourceKind: V070BattleEarlyRevealSourceKind;
  sourceController?: PlayerId | null;
  sourceInstanceId?: string | null;
  sourceId?: string | null;
}

declare module './battle-types' {
  interface V070BattleRuntime {
    earlyRevealRecords?: V070BattleEarlyRevealRecord[];
  }
}

/**
 * Reveal one currently face-down Gambit or Tactic before its normal reveal and
 * preserve why it became public. Effects such as Deep Cover care specifically
 * about opposing effects; rule-driven face-up placement such as Watchtower is
 * intentionally distinguishable through sourceKind.
 */
export function revealV070BattleCommitmentEarly(
  state: V070GameState,
  options: V070RevealBattleCommitmentEarlyOptions,
): boolean {
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime) {
    throw new V070GameActionError(
      'Early battle-card reveal requires an active battle.',
    );
  }

  const commitment = findBattleCommitment(state, options.targetInstanceId);
  if (!commitment) {
    throw new V070GameActionError(
      'Early reveal target must be a Gambit or Tactic currently committed to this battle.',
    );
  }

  // A commitment already face up has either already been revealed or was set
  // face up by another rule/effect. Do not rewrite its provenance.
  if (commitment.faceUp) return false;

  // These stages begin only after the normal reveal for the corresponding role
  // has already occurred. Refuse to manufacture an "early" reveal afterward.
  if (commitment.role === 'gambit'
    && !['onset', 'set_gambits', 'reveal_gambits'].includes(runtime.stage)) {
    return false;
  }
  if (commitment.role === 'tactic'
    && !['onset', 'set_gambits', 'reveal_gambits', 'choose_tactics', 'reveal_tactics']
      .includes(runtime.stage)) {
    return false;
  }

  commitment.faceUp = true;
  runtime.earlyRevealRecords ??= [];
  const record: V070BattleEarlyRevealRecord = {
    instanceId: commitment.instanceId,
    owner: commitment.owner,
    role: commitment.role,
    sourceKind: options.sourceKind,
    sourceController: options.sourceController ?? null,
    sourceInstanceId: options.sourceInstanceId ?? null,
    sourceId: options.sourceId ?? null,
  };
  runtime.earlyRevealRecords.push(record);

  appendV070Event(state, {
    type: 'battle_card_revealed_early',
    actor: options.sourceController ?? commitment.owner,
    visibility: 'public',
    payload: {
      targetInstanceId: commitment.instanceId,
      targetCardId: state.cardInstances[commitment.instanceId]?.cardId ?? null,
      targetOwner: commitment.owner,
      role: commitment.role,
      sourceKind: record.sourceKind,
      sourceController: record.sourceController,
      sourceInstanceId: record.sourceInstanceId,
      sourceId: record.sourceId,
    },
  });
  return true;
}

export function v070BattleEarlyRevealRecords(
  state: V070GameState,
): readonly V070BattleEarlyRevealRecord[] {
  return state.battleRuntime?.earlyRevealRecords ?? [];
}

export function didV070OpponentEffectRevealBattleCardEarly(
  state: V070GameState,
  owner: PlayerId,
): boolean {
  return v070BattleEarlyRevealRecords(state).some(record =>
    record.owner === owner
    && record.sourceKind === 'effect'
    && record.sourceController !== null
    && record.sourceController !== owner
  );
}

function findBattleCommitment(
  state: V070GameState,
  instanceId: string,
) {
  const runtime = state.battleRuntime;
  if (!runtime) return null;

  for (const playerId of ['A', 'B'] as const) {
    const participant = runtime.participants[playerId];
    const commitments = [
      participant.gambit,
      ...participant.additionalGambits,
      participant.tactic,
      ...participant.additionalTactics,
    ];
    const commitment = commitments.find(
      candidate => candidate?.instanceId === instanceId,
    );
    if (commitment) return commitment;
  }
  return null;
}
