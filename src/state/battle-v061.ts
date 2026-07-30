import type {
  BattleTiePolicy,
  CardID,
  PlayerID,
  SpaceID,
  V061BattleCard,
  V061BattleCardDestination,
  V061BattleParticipantState,
  V061BattleStage,
  V061BattleState,
  V061PublicBattleParticipantView,
  V061PublicBattleView,
} from '../types';

export const V061_BATTLE_SEQUENCE: readonly V061BattleStage[] = [
  'opening_effects',
  'set_gambits',
  'form_reserves',
  'reveal_gambits',
  'choose_tactics',
  'reveal_tactics',
  'resolve_battle',
  'aftermath',
] as const;

export interface CreateV061BattleOptions {
  id: string;
  location: SpaceID;
  attackerOrigin: SpaceID;
  attacker: PlayerID;
  defender: PlayerID;
  tiePolicy: BattleTiePolicy;
  lastStand?: boolean;
}

export function createV061BattleParticipant(playerId: PlayerID): V061BattleParticipantState {
  return {
    playerId,
    gambitChoiceComplete: false,
    tacticChoiceComplete: false,
    reserveFormed: false,
    reserve: [],
    initialReserve: [],
    tactics: [],
    reserveSize: 3,
    gambitLimit: 1,
    tacticLimit: 1,
    advantage: 0,
    disadvantage: 0,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
    withdrew: false,
  };
}

export function createV061BattleState(options: CreateV061BattleOptions): V061BattleState {
  return {
    rulesVersion: 'v0.6.1',
    id: options.id,
    stage: 'opening_effects',
    location: options.location,
    attackerOrigin: options.attackerOrigin,
    attacker: createV061BattleParticipant(options.attacker),
    defender: createV061BattleParticipant(options.defender),
    tiePolicy: options.tiePolicy,
    lastStand: options.lastStand,
    openingEffectsComplete: false,
    gambitRevealComplete: false,
    tacticRevealComplete: false,
    effectsResolved: [],
  };
}

export function v061BattleParticipant(
  battle: V061BattleState,
  playerId: PlayerID,
): V061BattleParticipantState | undefined {
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  return undefined;
}

export function v061GambitChoicesComplete(battle: V061BattleState): boolean {
  return battle.attacker.gambitChoiceComplete && battle.defender.gambitChoiceComplete;
}

export function v061ReservesFormed(battle: V061BattleState): boolean {
  return battle.attacker.reserveFormed && battle.defender.reserveFormed;
}

export function v061TacticChoicesComplete(battle: V061BattleState): boolean {
  return battle.attacker.tacticChoiceComplete && battle.defender.tacticChoiceComplete;
}

export function nextV061BattleStage(battle: V061BattleState): V061BattleStage | undefined {
  switch (battle.stage) {
    case 'opening_effects':
      return battle.openingEffectsComplete ? 'set_gambits' : undefined;
    case 'set_gambits':
      return v061GambitChoicesComplete(battle) ? 'form_reserves' : undefined;
    case 'form_reserves':
      return v061ReservesFormed(battle) ? 'reveal_gambits' : undefined;
    case 'reveal_gambits':
      return battle.gambitRevealComplete ? 'choose_tactics' : undefined;
    case 'choose_tactics':
      return v061TacticChoicesComplete(battle) ? 'reveal_tactics' : undefined;
    case 'reveal_tactics':
      return battle.tacticRevealComplete ? 'resolve_battle' : undefined;
    case 'resolve_battle':
      return battle.winner || battle.noWinner ? 'aftermath' : undefined;
    case 'aftermath':
      return undefined;
  }
}

export function advanceV061BattleStage(battle: V061BattleState): V061BattleStage {
  const next = nextV061BattleStage(battle);
  if (!next) throw new Error(`Battle ${battle.id} cannot advance from ${battle.stage}.`);
  battle.stage = next;
  return next;
}

export function normalV061BattleDestination(card: V061BattleCard): V061BattleCardDestination {
  if (card.cleanupDestination) return card.cleanupDestination;
  return card.role === 'gambit' ? 'graveyard' : 'discard';
}

export function v061InterferenceReturnDestination(card: V061BattleCard): Extract<V061BattleCardDestination, 'hand' | 'reserve'> {
  if (card.source === 'hand') return 'hand';
  if (card.source === 'reserve') return 'reserve';
  throw new Error(`Card ${card.cardId} entered battle from an effect and has no default Interference return zone.`);
}

export function remainingV061ReserveDestination(): V061BattleCardDestination {
  return 'discard';
}

function revealV061BattleCardToViewer(
  card: V061BattleCard | undefined,
  viewer?: PlayerID,
): V061BattleCard | { faceDown: true } | undefined {
  if (!card || card.virtual) return undefined;
  if (!card.faceDown || card.owner === viewer || (viewer && card.visibleTo?.includes(viewer))) return structuredClone(card);
  return { faceDown: true };
}

export function toV061PublicBattleParticipantView(
  participant: V061BattleParticipantState,
  viewer?: PlayerID,
): V061PublicBattleParticipantView {
  return {
    playerId: participant.playerId,
    gambitChoiceComplete: participant.gambitChoiceComplete,
    tacticChoiceComplete: participant.tacticChoiceComplete,
    reserveFormed: participant.reserveFormed,
    gambit: revealV061BattleCardToViewer(participant.gambit, viewer),
    reserveCount: participant.reserve.length,
    tactics: participant.tactics
      .filter((card) => !card.virtual)
      .map((card) => revealV061BattleCardToViewer(card, viewer)!)
      .filter(Boolean),
    reserveSize: participant.reserveSize,
    gambitLimit: participant.gambitLimit,
    tacticLimit: participant.tacticLimit,
    advantage: participant.advantage,
    disadvantage: participant.disadvantage,
    diceRolls: participant.diceRolls ? [...participant.diceRolls] : undefined,
    diceRoll: participant.diceRoll,
    modifiers: participant.modifiers,
    retreated: participant.retreated,
    withdrew: participant.withdrew,
  };
}

export function toV061PublicBattleView(
  battle: V061BattleState,
  viewer?: PlayerID,
): V061PublicBattleView {
  return {
    rulesVersion: battle.rulesVersion,
    id: battle.id,
    stage: battle.stage,
    location: battle.location,
    attackerOrigin: battle.attackerOrigin,
    attacker: toV061PublicBattleParticipantView(battle.attacker, viewer),
    defender: toV061PublicBattleParticipantView(battle.defender, viewer),
    tiePolicy: battle.tiePolicy,
    lastStand: battle.lastStand,
    winner: battle.winner,
    loser: battle.loser,
    noWinner: battle.noWinner,
  };
}

export function createV061BattleCard(options: {
  cardId: CardID;
  owner: PlayerID;
  role: 'gambit' | 'tactic';
  source: 'hand' | 'reserve' | 'effect';
  faceDown?: boolean;
  added?: boolean;
}): V061BattleCard {
  return {
    cardId: options.cardId,
    owner: options.owner,
    role: options.role,
    source: options.source,
    faceDown: options.faceDown ?? true,
    negated: false,
    added: options.added,
  };
}
