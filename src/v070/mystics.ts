import { v070CanonicalContent } from '../content/v070';
import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
  type V070MysticRiteId,
  type V070MysticRiteState,
} from './engine';
import {
  bindV070CardFromPlayerZone,
  releaseV070BoundCards,
  releaseV070BoundCardsForPurpose,
  v070BindingsForHost,
} from './bindings';
import { drawV070Cards } from './card-draw';
import { assertV070GraveyardExitAllowed } from './territories';
import type { PlayerId } from './rules';

const ECHOES_GRAVEYARD_PURPOSE = 'Mystics Rite of Echoes graveyard card';
const ECHOES_HAND_PURPOSE = 'Mystics Rite of Echoes hand card';
const RITUAL_HAND_PURPOSE = 'Mystics Ritual of Ascension hand card';
const RITUAL_DISCARD_PURPOSE = 'Mystics Ritual of Ascension discard card';
const RITUAL_GRAVEYARD_PURPOSE = 'Mystics Ritual of Ascension graveyard card';

export interface BeginV070MysticRiteOptions {
  echoesGraveyardInstanceId?: string;
  echoesHandInstanceId?: string;
  bloodCostInstanceId?: string;
  crossingCostInstanceId?: string;
}

export interface BeginV070MysticRitualOptions {
  handInstanceId: string;
  discardInstanceId: string;
  graveyardInstanceId: string;
}

export function isV070MysticPlayer(
  state: V070GameState,
  playerId: PlayerId,
): boolean {
  return state.players[playerId].factionId === 'mystics'
    && state.players[playerId].mystics !== null;
}

export function isV070ArcaneCardId(cardId: string): boolean {
  return v070CanonicalContent.cardsById.get(cardId)?.trait === 'Arcane';
}

export function v070MysticCompletedRiteCount(
  state: V070GameState,
  playerId: PlayerId,
): number {
  const mystics = requireMystics(state, playerId);
  return (Object.values(mystics.rites) as V070MysticRiteState[])
    .filter(rite => rite.status === 'completed')
    .length;
}

export function beginV070MysticRite(
  state: V070GameState,
  playerId: PlayerId,
  riteId: V070MysticRiteId,
  options: BeginV070MysticRiteOptions = {},
): void {
  const mystics = requireMystics(state, playerId);
  const rite = mystics.rites[riteId];

  if (rite.status !== 'incomplete') {
    throw new V070GameActionError(
      `Rite of ${riteName(riteId)} is not available to begin.`,
    );
  }
  if ((Object.values(mystics.rites) as V070MysticRiteState[])
    .some(candidate => candidate.status === 'begun')) {
    throw new V070GameActionError(
      'Only one Rite may be begun but incomplete at a time.',
    );
  }

  switch (riteId) {
    case 'echoes':
      beginEchoes(state, playerId, options);
      break;
    case 'blood':
      beginBlood(state, playerId, options);
      break;
    case 'crossing':
      beginCrossing(state, playerId, options);
      break;
  }

  rite.status = 'begun';
  rite.begunTurn = state.turnNumber;
  rite.completedTurn = null;

  appendV070Event(state, {
    type: 'mystic_rite_begun',
    actor: playerId,
    visibility: 'public',
    payload: {
      rite: riteId,
      turnNumber: state.turnNumber,
      territoryInstanceId: rite.territoryInstanceId,
    },
  });
}

export function recordV070MysticCrossingEligibility(
  state: V070GameState,
  winner: PlayerId,
  attacker: PlayerId,
  contestedPosition: number,
): void {
  if (winner !== attacker || !isV070MysticPlayer(state, winner)) return;
  const territory = state.board.find(
    candidate => candidate.position === contestedPosition,
  );
  if (!territory || territory.controller === winner) return;

  const mystics = requireMystics(state, winner);
  mystics.crossingEligibilityTurn = state.turnNumber;
  mystics.crossingEligibilityTerritoryInstanceId =
    territory.territoryInstanceId;

  appendV070Event(state, {
    type: 'mystic_crossing_eligibility_gained',
    actor: winner,
    visibility: 'public',
    payload: {
      turnNumber: state.turnNumber,
      territoryInstanceId: territory.territoryInstanceId,
      territoryPosition: contestedPosition,
    },
  });
}

export function resolveV070MysticCrossingAfterCapture(
  state: V070GameState,
  playerId: PlayerId,
): void {
  if (!isV070MysticPlayer(state, playerId)) return;
  const mystics = requireMystics(state, playerId);
  const rite = mystics.rites.crossing;
  if (rite.status !== 'begun'
    || rite.begunTurn === null
    || rite.begunTurn >= state.turnNumber) {
    return;
  }

  const territory = rite.territoryInstanceId
    ? state.board.find(candidate =>
        candidate.territoryInstanceId === rite.territoryInstanceId)
    : undefined;
  const maintained = Boolean(
    territory
    && (
      territory.controller === playerId
      || state.players[playerId].position === territory.position
    ),
  );

  if (maintained) {
    completeRite(state, playerId, 'crossing');
    return;
  }

  resetRite(state, playerId, 'crossing', 'position_requirement_failed');
}

export function recordV070MysticBattleEffectApplied(
  state: V070GameState,
  playerId: PlayerId,
  sourceInstanceId: string,
): void {
  if (!isV070MysticPlayer(state, playerId)) return;
  const mystics = requireMystics(state, playerId);
  const rite = mystics.rites.echoes;
  const invocationWasUnlocked =
    v070MysticCompletedRiteCount(state, playerId) >= 1;

  if (rite.status === 'begun'
    && rite.begunTurn !== null
    && rite.begunTurn < state.turnNumber
    && mystics.riteCompletedTurn !== state.turnNumber) {
    const hostId = riteHostId(playerId, 'echoes');
    const handBinding = v070BindingsForHost(state, hostId)
      .find(binding => binding.purpose === ECHOES_HAND_PURPOSE);

    if (handBinding && handBinding.cardInstanceId !== sourceInstanceId) {
      const boundCardId =
        state.cardInstances[handBinding.cardInstanceId]?.cardId;
      const sourceCardId =
        state.cardInstances[sourceInstanceId]?.cardId;
      if (boundCardId && boundCardId === sourceCardId) {
        releaseV070BoundCardsForPurpose(
          state,
          hostId,
          ECHOES_GRAVEYARD_PURPOSE,
          'discard',
          'Rite of Echoes completion',
        );
        releaseV070BoundCardsForPurpose(
          state,
          hostId,
          ECHOES_HAND_PURPOSE,
          'graveyard',
          'Rite of Echoes completion',
        );
        completeRite(state, playerId, 'echoes');
      }
    }
  }

  if (invocationWasUnlocked) {
    openV070MysticInvocationAfterEffect(
      state,
      playerId,
      sourceInstanceId,
      true,
    );
  }
}

export function openV070MysticInvocationAfterActionEffect(
  state: V070GameState,
  playerId: PlayerId,
  sourceInstanceId: string,
): void {
  openV070MysticInvocationAfterEffect(
    state,
    playerId,
    sourceInstanceId,
    false,
  );
}

export function v070MysticInvocationPendingPlayers(
  state: V070GameState,
): PlayerId[] {
  return (['A', 'B'] as const).filter(
    playerId => Boolean(state.players[playerId].mystics?.invocationPending),
  );
}

export function useV070MysticInvocation(
  state: V070GameState,
  playerId: PlayerId,
  targetInstanceId: string,
): void {
  const mystics = requireMystics(state, playerId);
  const pending = mystics.invocationPending;
  if (!pending) {
    throw new V070GameActionError(
      'Invocation is not pending for that player.',
    );
  }
  if (mystics.invocationUsedTurn === state.turnNumber) {
    throw new V070GameActionError(
      'Invocation may be used only once per turn.',
    );
  }

  const graveyard = state.players[playerId].zones.graveyard;
  const index = graveyard.indexOf(targetInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'Invocation must choose one card currently in your Graveyard.',
    );
  }

  assertV070GraveyardExitAllowed(state, 'Invocation');
  graveyard.splice(index, 1);
  state.players[playerId].zones.discardPile.push(targetInstanceId);
  mystics.invocationUsedTurn = state.turnNumber;
  mystics.invocationPending = null;

  appendV070Event(state, {
    type: 'mystic_invocation_used',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: pending.sourceCardId,
      targetInstanceId,
      targetCardId: state.cardInstances[targetInstanceId]?.cardId,
      duringBattle: pending.duringBattle,
    },
  });
}

export function passV070MysticInvocation(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const mystics = requireMystics(state, playerId);
  const pending = mystics.invocationPending;
  if (!pending) {
    throw new V070GameActionError(
      'Invocation is not pending for that player.',
    );
  }

  mystics.invocationPending = null;
  appendV070Event(state, {
    type: 'mystic_invocation_declined',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId: pending.sourceInstanceId,
      sourceCardId: pending.sourceCardId,
      duringBattle: pending.duringBattle,
    },
  });
}

export function completeV070MysticBloodAfterBattleWin(
  state: V070GameState,
  winner: PlayerId,
): void {
  if (!isV070MysticPlayer(state, winner)) return;
  const mystics = requireMystics(state, winner);
  const rite = mystics.rites.blood;
  const runtime = state.battleRuntime;
  if (!runtime
    || rite.status !== 'begun'
    || rite.begunTurn === null
    || rite.begunTurn >= state.turnNumber
    || mystics.riteCompletedTurn === state.turnNumber) {
    return;
  }

  const participant = runtime.participants[winner];
  const usedGambit = Boolean(
    participant.gambit || participant.additionalGambits.length > 0
  );
  const usedTactic = Boolean(
    participant.tactic || participant.additionalTactics.length > 0
  );
  if (usedGambit || usedTactic) return;

  completeRite(state, winner, 'blood');
}

export function beginV070MysticRitual(
  state: V070GameState,
  playerId: PlayerId,
  options: BeginV070MysticRitualOptions,
): void {
  const mystics = requireMystics(state, playerId);
  if (v070MysticCompletedRiteCount(state, playerId) !== 3) {
    throw new V070GameActionError(
      'Ritual of Ascension requires all three Rites to be completed.',
    );
  }
  if (mystics.ritual.active) {
    throw new V070GameActionError(
      'Ritual of Ascension is already underway.',
    );
  }

  const selected = [
    options.handInstanceId,
    options.discardInstanceId,
    options.graveyardInstanceId,
  ];
  if (new Set(selected).size !== 3) {
    throw new V070GameActionError(
      'Ritual of Ascension requires three different Arcane cards.',
    );
  }

  assertArcaneInZone(
    state,
    playerId,
    options.handInstanceId,
    'hand',
    'Ritual of Ascension',
  );
  assertArcaneInZone(
    state,
    playerId,
    options.discardInstanceId,
    'discardPile',
    'Ritual of Ascension',
  );
  assertArcaneInZone(
    state,
    playerId,
    options.graveyardInstanceId,
    'graveyard',
    'Ritual of Ascension',
  );

  const hostId = ritualHostId(playerId);
  bindV070CardFromPlayerZone(state, {
    hostId,
    owner: playerId,
    cardInstanceId: options.handInstanceId,
    sourceZone: 'hand',
    faceUp: false,
    purpose: RITUAL_HAND_PURPOSE,
  });
  bindV070CardFromPlayerZone(state, {
    hostId,
    owner: playerId,
    cardInstanceId: options.discardInstanceId,
    sourceZone: 'discardPile',
    faceUp: true,
    purpose: RITUAL_DISCARD_PURPOSE,
  });
  bindV070CardFromPlayerZone(state, {
    hostId,
    owner: playerId,
    cardInstanceId: options.graveyardInstanceId,
    sourceZone: 'graveyard',
    faceUp: true,
    purpose: RITUAL_GRAVEYARD_PURPOSE,
  });

  mystics.ritual.active = true;
  mystics.ritual.begunTurn = state.turnNumber;

  appendV070Event(state, {
    type: 'mystic_ritual_begun',
    actor: playerId,
    visibility: 'public',
    payload: {
      turnNumber: state.turnNumber,
      boundCount: 3,
    },
  });
}

export function applyV070MysticConvergence(
  state: V070GameState,
): void {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || !isV070MysticPlayer(state, battle.attacker)) {
    return;
  }

  const mystics = requireMystics(state, battle.attacker);
  if (!mystics.ritual.active) return;
  const count = v070BindingsForHost(
    state,
    ritualHostId(battle.attacker),
  ).length;
  if (count < 1) return;

  runtime.participants[battle.attacker].battleModifier += count;
  appendV070Event(state, {
    type: 'mystic_convergence_applied',
    actor: battle.attacker,
    visibility: 'public',
    payload: {
      boundCount: count,
      battleModifier: count,
    },
  });
}

export function resolveV070MysticRitualVictory(
  state: V070GameState,
  winner: PlayerId,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || battle.attacker !== winner
    || !isV070MysticPlayer(state, winner)) {
    return false;
  }

  const mystics = requireMystics(state, winner);
  if (!mystics.ritual.active) return false;

  releaseV070BoundCards(
    state,
    ritualHostId(winner),
    'graveyard',
    'Ritual of Ascension completion',
  );
  mystics.ritual.active = false;
  mystics.ritual.begunTurn = null;
  runtime.pendingGameVictory = {
    winner,
    route: 'ritual_of_ascension',
  };

  appendV070Event(state, {
    type: 'mystic_ritual_completed',
    actor: winner,
    visibility: 'public',
    payload: {
      turnNumber: state.turnNumber,
      contestedPosition: battle.contestedPosition,
    },
  });
  return true;
}

export function useV070MysticTransmutation(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId: string,
): void {
  const mystics = requireMystics(state, playerId);
  const runtime = state.battleRuntime;
  if (!state.battle || !runtime || runtime.stage !== 'outcome') {
    throw new V070GameActionError(
      'Transmutation may be used only before dice in an active battle.',
    );
  }
  if (v070MysticCompletedRiteCount(state, playerId) < 2) {
    throw new V070GameActionError(
      'Transmutation unlocks after completing two Rites.',
    );
  }
  if (mystics.transmutationUsedTurn === state.turnNumber) {
    throw new V070GameActionError(
      'Transmutation may be used only once per turn.',
    );
  }
  if (runtime.participants.A.battleDice.length > 0
    || runtime.participants.B.battleDice.length > 0) {
    throw new V070GameActionError(
      'Transmutation must be used before any battle dice are rolled.',
    );
  }

  const hand = state.players[playerId].zones.hand;
  const index = hand.indexOf(cardInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      'Transmutation must put one card from your Hand in your Graveyard.',
    );
  }
  const cardId = state.cardInstances[cardInstanceId]?.cardId;
  const card = cardId
    ? v070CanonicalContent.cardsById.get(cardId)
    : undefined;
  if (!card) {
    throw new V070GameActionError(
      'Transmutation requires a known card instance.',
    );
  }

  hand.splice(index, 1);
  state.players[playerId].zones.graveyard.push(cardInstanceId);
  runtime.participants[playerId].battleModifier += card.cost;
  mystics.transmutationUsedTurn = state.turnNumber;

  appendV070Event(state, {
    type: 'mystic_transmutation_used',
    actor: playerId,
    visibility: 'public',
    payload: {
      cardInstanceId,
      cardId,
      value: card.cost,
      battleModifier: runtime.participants[playerId].battleModifier,
    },
  });

  recordV070MysticQualifyingHandSacrifice(
    state,
    playerId,
    'Transmutation',
  );
}

export function prepareV070MysticLossInterruption(
  state: V070GameState,
  loser: PlayerId,
): void {
  const runtime = state.battleRuntime;
  if (!runtime || runtime.stage !== 'aftermath') return;
  if (!isV070MysticPlayer(state, loser)) {
    runtime.mysticLossInterruptionResolved = true;
    return;
  }

  const mystics = requireMystics(state, loser);
  const interruptible = interruptibleMysticProgress(state, loser);
  if (!interruptible) {
    runtime.mysticLossInterruptionResolved = true;
    return;
  }

  const threshold = 1 + v070MysticCompletedRiteCount(state, loser);
  const candidates = state.players[loser].zones.hand.filter(instanceId => {
    const cardId = state.cardInstances[instanceId]?.cardId;
    const card = cardId
      ? v070CanonicalContent.cardsById.get(cardId)
      : undefined;
    return Boolean(card?.trait === 'Arcane' && card.cost >= threshold);
  });

  if (state.players[loser].leaderId === 'spirit-walker'
    && mystics.guardiansUsedTurn !== state.turnNumber
    && candidates.length > 0) {
    runtime.guardiansWindowOpen = true;
    appendV070Event(state, {
      type: 'mystic_guardians_window_opened',
      actor: loser,
      visibility: 'public',
      payload: {
        threshold,
        completedRites: threshold - 1,
        protects: interruptible,
      },
    });
    appendV070Event(state, {
      type: 'mystic_guardians_options',
      actor: loser,
      visibility: loser,
      payload: {
        threshold,
        candidateInstanceIds: candidates,
      },
    });
    return;
  }

  interruptV070MysticProgress(state, loser, 'battle_loss');
  runtime.mysticLossInterruptionResolved = true;
}

export function useV070GuardiansOfTheCircle(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId: string,
): void {
  const runtime = state.battleRuntime;
  const battle = state.battle;
  const mystics = requireMystics(state, playerId);
  if (!runtime
    || !battle
    || runtime.stage !== 'aftermath'
    || !runtime.guardiansWindowOpen
    || battle.loser !== playerId
    || state.players[playerId].leaderId !== 'spirit-walker') {
    throw new V070GameActionError(
      'Guardians of the Circle is not pending for that player.',
    );
  }

  const threshold = 1 + v070MysticCompletedRiteCount(state, playerId);
  const hand = state.players[playerId].zones.hand;
  const index = hand.indexOf(cardInstanceId);
  const cardId = state.cardInstances[cardInstanceId]?.cardId;
  const card = cardId
    ? v070CanonicalContent.cardsById.get(cardId)
    : undefined;
  if (index < 0 || card?.trait !== 'Arcane' || card.cost < threshold) {
    throw new V070GameActionError(
      `Guardians of the Circle requires an Arcane Hand card of value ${threshold} or greater.`,
    );
  }

  hand.splice(index, 1);
  state.players[playerId].zones.graveyard.push(cardInstanceId);
  mystics.guardiansUsedTurn = state.turnNumber;
  runtime.guardiansWindowOpen = false;
  runtime.mysticLossInterruptionResolved = true;

  appendV070Event(state, {
    type: 'mystic_guardians_used',
    actor: playerId,
    visibility: 'public',
    payload: {
      cardInstanceId,
      cardId,
      value: card.cost,
      threshold,
      protected: interruptibleMysticProgress(state, playerId),
    },
  });
}

export function passV070GuardiansOfTheCircle(
  state: V070GameState,
  playerId: PlayerId,
): void {
  const runtime = state.battleRuntime;
  const battle = state.battle;
  if (!runtime
    || !battle
    || !runtime.guardiansWindowOpen
    || battle.loser !== playerId) {
    throw new V070GameActionError(
      'Guardians of the Circle is not pending for that player.',
    );
  }

  runtime.guardiansWindowOpen = false;
  interruptV070MysticProgress(state, playerId, 'battle_loss');
  runtime.mysticLossInterruptionResolved = true;

  appendV070Event(state, {
    type: 'mystic_guardians_declined',
    actor: playerId,
    visibility: 'public',
  });
}

export function recordV070MysticQualifyingHandSacrifice(
  state: V070GameState,
  playerId: PlayerId,
  purpose: string,
): void {
  if (!isV070MysticPlayer(state, playerId)
    || state.players[playerId].leaderId !== 'alchemist'
    || state.activePlayer !== playerId) {
    return;
  }

  const mystics = requireMystics(state, playerId);
  if (mystics.materiaPrimaUsedTurn === state.turnNumber) return;

  mystics.materiaPrimaUsedTurn = state.turnNumber;
  if (state.battle && state.battleRuntime) {
    mystics.materiaPrimaPendingDraw = true;
    appendV070Event(state, {
      type: 'mystic_materia_prima_pending',
      actor: playerId,
      visibility: 'public',
      payload: {
        turnNumber: state.turnNumber,
        purpose,
        timing: 'after_aftermath',
      },
    });
    return;
  }

  drawMateriaPrima(state, playerId, purpose);
}

export function resolveV070MateriaPrimaAfterAftermath(
  state: V070GameState,
): void {
  for (const playerId of ['A', 'B'] as const) {
    const mystics = state.players[playerId].mystics;
    if (!mystics?.materiaPrimaPendingDraw) continue;
    mystics.materiaPrimaPendingDraw = false;
    drawMateriaPrima(state, playerId, 'battle sacrifice');
  }
}

function openV070MysticInvocationAfterEffect(
  state: V070GameState,
  playerId: PlayerId,
  sourceInstanceId: string,
  duringBattle: boolean,
): void {
  if (!isV070MysticPlayer(state, playerId)) return;
  const mystics = requireMystics(state, playerId);
  if (v070MysticCompletedRiteCount(state, playerId) < 1
    || mystics.invocationUsedTurn === state.turnNumber
    || mystics.invocationPending
    || state.players[playerId].zones.graveyard.length === 0) {
    return;
  }

  const sourceCardId = state.cardInstances[sourceInstanceId]?.cardId;
  if (!sourceCardId || !isV070ArcaneCardId(sourceCardId)) return;

  mystics.invocationPending = {
    sourceInstanceId,
    sourceCardId,
    openedTurn: state.turnNumber,
    duringBattle,
  };

  appendV070Event(state, {
    type: 'mystic_invocation_window_opened',
    actor: playerId,
    visibility: 'public',
    payload: {
      sourceInstanceId,
      sourceCardId,
      duringBattle,
      candidateCount: state.players[playerId].zones.graveyard.length,
    },
  });
  appendV070Event(state, {
    type: 'mystic_invocation_options',
    actor: playerId,
    visibility: playerId,
    payload: {
      sourceInstanceId,
      targetInstanceIds: [...state.players[playerId].zones.graveyard],
    },
  });
}

function beginEchoes(
  state: V070GameState,
  playerId: PlayerId,
  options: BeginV070MysticRiteOptions,
): void {
  const graveyardInstanceId = options.echoesGraveyardInstanceId;
  const handInstanceId = options.echoesHandInstanceId;
  if (!graveyardInstanceId || !handInstanceId) {
    throw new V070GameActionError(
      'Rite of Echoes requires one Graveyard card and one Hand card.',
    );
  }
  if (!state.players[playerId].zones.graveyard.includes(graveyardInstanceId)) {
    throw new V070GameActionError(
      'Rite of Echoes must bind its first card from your Graveyard.',
    );
  }
  if (!state.players[playerId].zones.hand.includes(handInstanceId)) {
    throw new V070GameActionError(
      'Rite of Echoes must bind its second card from your Hand.',
    );
  }

  const handCardId = state.cardInstances[handInstanceId]?.cardId;
  if (!handCardId) {
    throw new V070GameActionError(
      'Rite of Echoes requires a known Hand card.',
    );
  }
  const duplicateExists = Object.values(state.cardInstances).some(instance =>
    instance.owner === playerId
    && instance.instanceId !== handInstanceId
    && instance.cardId === handCardId
  );
  if (!duplicateExists) {
    throw new V070GameActionError(
      'Rite of Echoes requires a Hand card whose title matches another card in your Deck.',
    );
  }

  const hostId = riteHostId(playerId, 'echoes');
  bindV070CardFromPlayerZone(state, {
    hostId,
    owner: playerId,
    cardInstanceId: graveyardInstanceId,
    sourceZone: 'graveyard',
    faceUp: true,
    purpose: ECHOES_GRAVEYARD_PURPOSE,
  });
  bindV070CardFromPlayerZone(state, {
    hostId,
    owner: playerId,
    cardInstanceId: handInstanceId,
    sourceZone: 'hand',
    faceUp: false,
    purpose: ECHOES_HAND_PURPOSE,
  });
}

function beginBlood(
  state: V070GameState,
  playerId: PlayerId,
  options: BeginV070MysticRiteOptions,
): void {
  const cardInstanceId = options.bloodCostInstanceId;
  if (!cardInstanceId) {
    throw new V070GameActionError(
      'Rite of Blood requires one card from your Hand.',
    );
  }
  moveHandCardToGraveyard(
    state,
    playerId,
    cardInstanceId,
    'Rite of Blood beginning cost',
  );
  recordV070MysticQualifyingHandSacrifice(
    state,
    playerId,
    'Rite of Blood',
  );
}

function beginCrossing(
  state: V070GameState,
  playerId: PlayerId,
  options: BeginV070MysticRiteOptions,
): void {
  const mystics = requireMystics(state, playerId);
  if (mystics.crossingEligibilityTurn !== state.turnNumber
    || !mystics.crossingEligibilityTerritoryInstanceId) {
    throw new V070GameActionError(
      'Rite of Crossing requires a qualifying occupation battle won this turn.',
    );
  }

  const handArcane = state.players[playerId].zones.hand.filter(instanceId => {
    const cardId = state.cardInstances[instanceId]?.cardId;
    return Boolean(cardId && isV070ArcaneCardId(cardId));
  });
  const cardInstanceId = options.crossingCostInstanceId;
  if (!cardInstanceId) {
    throw new V070GameActionError(
      'Rite of Crossing requires an Arcane beginning-cost card.',
    );
  }

  if (handArcane.length > 0) {
    if (!handArcane.includes(cardInstanceId)) {
      throw new V070GameActionError(
        'Rite of Crossing must use an Arcane card from Hand while one is available.',
      );
    }
    moveHandCardToGraveyard(
      state,
      playerId,
      cardInstanceId,
      'Rite of Crossing beginning cost',
    );
    recordV070MysticQualifyingHandSacrifice(
      state,
      playerId,
      'Rite of Crossing',
    );
  } else {
    const discard = state.players[playerId].zones.discardPile;
    if (!discard.includes(cardInstanceId)
      || !isV070ArcaneCardId(
        state.cardInstances[cardInstanceId]?.cardId ?? '',
      )) {
      throw new V070GameActionError(
        'With no Arcane card in Hand, Rite of Crossing must move an Arcane card from your Discard Pile to your Graveyard.',
      );
    }

    appendV070Event(state, {
      type: 'hand_revealed',
      actor: playerId,
      visibility: 'public',
      payload: {
        playerId,
        purpose: 'Rite of Crossing',
        cards: state.players[playerId].zones.hand.map(instanceId => ({
          instanceId,
          cardId: state.cardInstances[instanceId]?.cardId,
        })),
      },
    });

    const index = discard.indexOf(cardInstanceId);
    discard.splice(index, 1);
    state.players[playerId].zones.graveyard.push(cardInstanceId);
    appendV070Event(state, {
      type: 'card_moved_to_graveyard',
      actor: playerId,
      visibility: 'public',
      payload: {
        instanceId: cardInstanceId,
        cardId: state.cardInstances[cardInstanceId]?.cardId,
        purpose: 'Rite of Crossing beginning cost',
        sourceZone: 'discard',
      },
    });
  }

  mystics.rites.crossing.territoryInstanceId =
    mystics.crossingEligibilityTerritoryInstanceId;
}

function completeRite(
  state: V070GameState,
  playerId: PlayerId,
  riteId: V070MysticRiteId,
): void {
  const mystics = requireMystics(state, playerId);
  const rite = mystics.rites[riteId];
  if (rite.status !== 'begun') return;
  if (mystics.riteCompletedTurn === state.turnNumber) {
    throw new V070GameActionError(
      'Only one Rite may be completed per turn.',
    );
  }

  rite.status = 'completed';
  rite.completedTurn = state.turnNumber;
  mystics.riteCompletedTurn = state.turnNumber;
  const completedRites = v070MysticCompletedRiteCount(state, playerId);

  appendV070Event(state, {
    type: 'mystic_rite_completed',
    actor: playerId,
    visibility: 'public',
    payload: {
      rite: riteId,
      completedRites,
      unlocked:
        completedRites === 1
          ? 'Invocation'
          : completedRites === 2
            ? 'Transmutation'
            : 'Convergence and Ritual of Ascension',
    },
  });
}

function resetRite(
  state: V070GameState,
  playerId: PlayerId,
  riteId: V070MysticRiteId,
  reason: string,
): void {
  const rite = requireMystics(state, playerId).rites[riteId];
  if (rite.status !== 'begun') return;

  if (riteId === 'echoes') {
    releaseV070BoundCards(
      state,
      riteHostId(playerId, riteId),
      'graveyard',
      `Rite of Echoes interrupted: ${reason}`,
    );
  }

  rite.status = 'incomplete';
  rite.begunTurn = null;
  rite.completedTurn = null;
  rite.territoryInstanceId = null;

  appendV070Event(state, {
    type: 'mystic_rite_interrupted',
    actor: playerId,
    visibility: 'public',
    payload: {
      rite: riteId,
      reason,
    },
  });
}

function interruptV070MysticProgress(
  state: V070GameState,
  playerId: PlayerId,
  reason: string,
): void {
  const mystics = requireMystics(state, playerId);
  for (const riteId of ['echoes', 'blood'] as const) {
    if (mystics.rites[riteId].status === 'begun') {
      resetRite(state, playerId, riteId, reason);
    }
  }

  if (mystics.ritual.active) {
    releaseV070BoundCards(
      state,
      ritualHostId(playerId),
      'graveyard',
      `Ritual of Ascension interrupted: ${reason}`,
    );
    mystics.ritual.active = false;
    mystics.ritual.begunTurn = null;
    appendV070Event(state, {
      type: 'mystic_ritual_interrupted',
      actor: playerId,
      visibility: 'public',
      payload: { reason },
    });
  }
}

function interruptibleMysticProgress(
  state: V070GameState,
  playerId: PlayerId,
): 'rite' | 'ritual' | null {
  const mystics = requireMystics(state, playerId);
  if (mystics.ritual.active) return 'ritual';
  if (mystics.rites.echoes.status === 'begun'
    || mystics.rites.blood.status === 'begun') {
    return 'rite';
  }
  return null;
}

function moveHandCardToGraveyard(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId: string,
  purpose: string,
): void {
  const hand = state.players[playerId].zones.hand;
  const index = hand.indexOf(cardInstanceId);
  if (index < 0) {
    throw new V070GameActionError(
      `${purpose} requires a card from your Hand.`,
    );
  }
  hand.splice(index, 1);
  state.players[playerId].zones.graveyard.push(cardInstanceId);
  appendV070Event(state, {
    type: 'card_moved_to_graveyard',
    actor: playerId,
    visibility: 'public',
    payload: {
      instanceId: cardInstanceId,
      cardId: state.cardInstances[cardInstanceId]?.cardId,
      purpose,
      sourceZone: 'hand',
    },
  });
}

function drawMateriaPrima(
  state: V070GameState,
  playerId: PlayerId,
  purpose: string,
): void {
  const result = drawV070Cards(
    state,
    playerId,
    1,
    'Alchemist Materia Prima',
  );
  state.players[playerId].zones.hand.push(...result.drawn);
  appendV070Event(state, {
    type: 'mystic_materia_prima_resolved',
    actor: playerId,
    visibility: 'public',
    payload: {
      purpose,
      drawn: result.drawn.length,
      reshuffles: result.reshuffles,
      exhausted: result.exhausted,
    },
  });
  if (result.drawn.length > 0) {
    appendV070Event(state, {
      type: 'drawn_card_identity',
      actor: playerId,
      visibility: playerId,
      payload: {
        cardInstanceIds: [...result.drawn],
        purpose: 'Alchemist Materia Prima',
      },
    });
  }
}

function assertArcaneInZone(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId: string,
  zone: 'hand' | 'discardPile' | 'graveyard',
  purpose: string,
): void {
  if (!state.players[playerId].zones[zone].includes(cardInstanceId)) {
    throw new V070GameActionError(
      `${purpose} requires the selected card to be in your ${zone}.`,
    );
  }
  const cardId = state.cardInstances[cardInstanceId]?.cardId;
  if (!cardId || !isV070ArcaneCardId(cardId)) {
    throw new V070GameActionError(
      `${purpose} requires Arcane cards.`,
    );
  }
}

function requireMystics(
  state: V070GameState,
  playerId: PlayerId,
) {
  const mystics = state.players[playerId].mystics;
  if (!mystics || state.players[playerId].factionId !== 'mystics') {
    throw new V070GameActionError(
      `${playerId} is not using the Mystics faction.`,
    );
  }
  return mystics;
}

function riteHostId(
  playerId: PlayerId,
  riteId: V070MysticRiteId,
): string {
  return `mystics:rite:${playerId}:${riteId}`;
}

function ritualHostId(playerId: PlayerId): string {
  return `mystics:ritual:${playerId}`;
}

function riteName(riteId: V070MysticRiteId): string {
  switch (riteId) {
    case 'echoes': return 'Echoes';
    case 'blood': return 'Blood';
    case 'crossing': return 'Crossing';
  }
}
