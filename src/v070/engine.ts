import { V070_RULES_VERSION } from '../content/v070';
import { createV070TurnState, type PlayerId, type V070BattleState, type V070TurnState } from './rules';
import { v070StarterDecks, type V070ResolvedStarterDeck } from './starter-decks';
import type { V070BattleRuntime } from './battle-types';

export type V070GameStage = 'setup' | 'playing' | 'ended';
export type V070SetupStage = 'opening_selection' | 'territory_arrangement' | 'first_player';

export interface V070CardInstance {
  instanceId: string;
  cardId: string;
  owner: PlayerId;
}

export interface V070OverlayAttachment {
  instanceId: string;
  owner: PlayerId;
  territoryInstanceId: string;
  placedTurn: number;
  sequence: number;
}

export interface V070PendingTurnChoice {
  kind: 'demilitarized_zone_upkeep';
  playerId: PlayerId;
  overlayInstanceId: string;
  territoryInstanceId: string;
}

export interface V070TerritoryTurnRestriction {
  kind: 'no_entry';
  source: 'demilitarized_zone';
  sourceInstanceId: string;
  territoryInstanceId: string;
  turnNumber: number;
}

export interface V070PlayerZones {
  drawPile: string[];
  hand: string[];
  discardPile: string[];
  graveyard: string[];
  assetBank: string[];
  removed: string[];
}

export interface V070SanctionAssociation {
  instanceId: string;
  owner: PlayerId;
  opponent: PlayerId;
  kind: 'asset' | 'overlay';
}

export interface V070PendingAssetLimitChoice {
  playerId: PlayerId;
  effectiveLimit: number;
  excess: number;
  reason: string;
  sourceInstanceId: string | null;
}

export interface V070PendingActionCard {
  playerId: PlayerId;
  instanceId: string;
  cardId: string;
  phase: 'opening' | 'denouement';
}

export type V070PendingActionEffectChoice =
  | {
      kind: 'clemency_target';
      playerId: PlayerId;
      opponentId: PlayerId;
      sourceActionInstanceId: string;
    }
  | {
      kind: 'clemency_response';
      playerId: PlayerId;
      actionOwnerId: PlayerId;
      sourceActionInstanceId: string;
      targetInstanceId: string;
    }
  | {
      kind: 'arcane_knowledge_target';
      playerId: PlayerId;
      sourceActionInstanceId: string;
    }
  | {
      kind: 'contraband_target';
      playerId: PlayerId;
      sourceActionInstanceId: string;
    }
  | {
      kind: 'salvage_recovery_target';
      playerId: PlayerId;
      sourceActionInstanceId: string;
    }
  | {
      kind: 'hand_destination_target';
      playerId: PlayerId;
      sourceActionInstanceId: string;
      purpose: 'Second Line' | 'Tactical Planning' | 'Salvage' | 'New Recruits';
      destination: 'draw_top' | 'draw_bottom' | 'discard';
      drawAfter: number;
    };

export type V070PendingSanctionChoice =
  | {
      kind: 'censure_action';
      playerId: PlayerId;
      sanctionInstanceId: string;
      sourceActionInstanceId: string;
    }
  | {
      kind: 'blockade_movement';
      playerId: PlayerId;
      sanctionInstanceId: string;
      territoryInstanceId: string;
      movement: 'leave' | 'enter';
    };

export interface V070DiplomatState {
  influence: number;
  ratifiedProposals: string[];
  cordialityUsedTurn: number | null;
  politicalCapitalUsedTurn: number | null;
  detenteUsedTurn: number | null;
}

export interface V070PlayerState {
  id: PlayerId;
  name: string;
  starterDeckId: string;
  factionId: string;
  leaderId: string;
  zones: V070PlayerZones;
  openingSelection: string[];
  territoryCandidates: string[];
  territoryOrder: string[] | null;
  position: number | null;
  controlledTerritories: string[];
  reshuffleCount: number;
  diplomats: V070DiplomatState | null;
}

export interface V070BoardTerritory {
  territoryInstanceId: string;
  position: number;
  territoryId: string;
  contributedBy: PlayerId;
  controller: PlayerId;
  occupant: PlayerId | null;
}

export interface V070SetupState {
  stage: V070SetupStage;
  firstPlayerRolls: Partial<Record<PlayerId, number>>;
}

export interface V070GameEvent {
  index: number;
  type: string;
  actor?: PlayerId;
  visibility: 'public' | PlayerId;
  payload?: unknown;
}

export interface V070GameState {
  rulesVersion: typeof V070_RULES_VERSION;
  gameId: string;
  seed: string;
  stage: V070GameStage;
  setup: V070SetupState | null;
  players: Record<PlayerId, V070PlayerState>;
  cardInstances: Record<string, V070CardInstance>;
  board: V070BoardTerritory[];
  activePlayer: PlayerId | null;
  turnNumber: number;
  turnState: V070TurnState | null;
  battle: V070BattleState | null;
  battleRuntime: V070BattleRuntime | null;
  overlays: V070OverlayAttachment[];
  nextOverlaySequence: number;
  territoryTurnRestrictions: V070TerritoryTurnRestriction[];
  sanctions: V070SanctionAssociation[];
  sanctionTriggerTurns: Record<string, number>;
  pendingActionCard: V070PendingActionCard | null;
  pendingActionEffectChoice: V070PendingActionEffectChoice | null;
  pendingSanctionChoices: V070PendingSanctionChoice[];
  pendingAssetLimitChoice: V070PendingAssetLimitChoice | null;
  pendingTurnChoice: V070PendingTurnChoice | null;
  winner: PlayerId | null;
  events: V070GameEvent[];
}

export interface CreateV070StarterGameInput {
  gameId: string;
  seed: string;
  players: Record<PlayerId, {
    name: string;
    starterDeckId: string;
  }>;
}

export type V070SetupAction =
  | {
      type: 'choose_opening_discard';
      playerId: PlayerId;
      cardInstanceId: string;
    }
  | {
      type: 'arrange_territories';
      playerId: PlayerId;
      territoryIds: readonly string[];
    }
  | {
      type: 'roll_first_player';
      playerId: PlayerId;
      value: number;
    };

export class V070GameActionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'V070GameActionError';
  }
}

export function createV070StarterGame(input: CreateV070StarterGameInput): V070GameState {
  if (!input.gameId.trim()) throw new Error('gameId is required.');
  if (!input.seed) throw new Error('A deterministic game seed is required.');

  const cardInstances: Record<string, V070CardInstance> = {};
  const players = {} as Record<PlayerId, V070PlayerState>;

  for (const playerId of ['A', 'B'] as const) {
    const playerInput = input.players[playerId];
    const starter = requireStarter(playerInput.starterDeckId);
    const deck = instantiateStarterDeck(playerId, starter, cardInstances);
    const shuffled = deterministicV070Shuffle(deck, `${input.seed}:${playerId}:opening-deck`);
    const openingSelection = shuffled.splice(0, 4);

    players[playerId] = {
      id: playerId,
      name: playerInput.name,
      starterDeckId: starter.definition.id,
      factionId: starter.definition.factionId,
      leaderId: starter.definition.leaderId,
      zones: {
        drawPile: shuffled,
        hand: [],
        discardPile: [],
        graveyard: [],
        assetBank: [],
        removed: [],
      },
      openingSelection,
      territoryCandidates: starter.territories.map(territory => territory.id),
      territoryOrder: null,
      position: null,
      controlledTerritories: [],
      reshuffleCount: 0,
      diplomats: starter.definition.factionId === 'diplomats'
        ? {
            influence: 1,
            ratifiedProposals: [],
            cordialityUsedTurn: null,
            politicalCapitalUsedTurn: null,
            detenteUsedTurn: null,
          }
        : null,
    };
  }

  const state: V070GameState = {
    rulesVersion: V070_RULES_VERSION,
    gameId: input.gameId,
    seed: input.seed,
    stage: 'setup',
    setup: {
      stage: 'opening_selection',
      firstPlayerRolls: {},
    },
    players,
    cardInstances,
    board: [],
    activePlayer: null,
    turnNumber: 0,
    turnState: null,
    battle: null,
    battleRuntime: null,
    overlays: [],
    nextOverlaySequence: 1,
    territoryTurnRestrictions: [],
    sanctions: [],
    sanctionTriggerTurns: {},
    pendingActionCard: null,
    pendingActionEffectChoice: null,
    pendingSanctionChoices: [],
    pendingAssetLimitChoice: null,
    pendingTurnChoice: null,
    winner: null,
    events: [],
  };

  appendV070Event(state, {
    type: 'game_created',
    visibility: 'public',
    payload: {
      rulesVersion: V070_RULES_VERSION,
      starterDecks: {
        A: players.A.starterDeckId,
        B: players.B.starterDeckId,
      },
      seed: input.seed,
    },
  });
  appendV070Event(state, {
    type: 'opening_selection_dealt',
    visibility: 'A',
    actor: 'A',
    payload: { cardInstanceIds: [...players.A.openingSelection] },
  });
  appendV070Event(state, {
    type: 'opening_selection_dealt',
    visibility: 'B',
    actor: 'B',
    payload: { cardInstanceIds: [...players.B.openingSelection] },
  });

  return state;
}

export function reduceV070SetupAction(
  state: V070GameState,
  action: V070SetupAction,
): V070GameState {
  if (state.stage !== 'setup' || !state.setup) {
    throw new V070GameActionError('Setup actions are legal only during setup.');
  }

  const next = structuredClone(state) as V070GameState;

  switch (action.type) {
    case 'choose_opening_discard':
      chooseOpeningDiscard(next, action.playerId, action.cardInstanceId);
      break;
    case 'arrange_territories':
      arrangeTerritories(next, action.playerId, action.territoryIds);
      break;
    case 'roll_first_player':
      rollFirstPlayer(next, action.playerId, action.value);
      break;
  }

  return next;
}

function chooseOpeningDiscard(
  state: V070GameState,
  playerId: PlayerId,
  cardInstanceId: string,
): void {
  requireSetupStage(state, 'opening_selection');
  const player = state.players[playerId];
  if (player.openingSelection.length !== 4) {
    throw new V070GameActionError(`${playerId} has already completed opening selection.`);
  }

  const discardIndex = player.openingSelection.indexOf(cardInstanceId);
  if (discardIndex < 0) {
    throw new V070GameActionError('Opening discard must be one of the four dealt opening cards.');
  }

  const kept = [...player.openingSelection];
  kept.splice(discardIndex, 1);
  player.openingSelection = [];
  player.zones.hand.push(...kept);
  player.zones.discardPile.push(cardInstanceId);

  appendV070Event(state, {
    type: 'opening_discard_chosen',
    actor: playerId,
    visibility: 'public',
    payload: {
      cardInstanceId,
      cardId: state.cardInstances[cardInstanceId].cardId,
    },
  });

  if (state.players.A.openingSelection.length === 0
    && state.players.B.openingSelection.length === 0) {
    state.setup!.stage = 'territory_arrangement';
    appendV070Event(state, {
      type: 'opening_selection_complete',
      visibility: 'public',
    });
  }
}

function arrangeTerritories(
  state: V070GameState,
  playerId: PlayerId,
  territoryIds: readonly string[],
): void {
  requireSetupStage(state, 'territory_arrangement');
  const player = state.players[playerId];
  if (player.territoryOrder) {
    throw new V070GameActionError(`${playerId} has already arranged Territories.`);
  }
  if (territoryIds.length !== 3 || new Set(territoryIds).size !== 3) {
    throw new V070GameActionError('Territory arrangement must contain each of the three Territories exactly once.');
  }

  const expected = [...player.territoryCandidates].sort();
  const received = [...territoryIds].sort();
  if (JSON.stringify(expected) !== JSON.stringify(received)) {
    throw new V070GameActionError('Territory arrangement must use exactly the player’s released starter Territories.');
  }

  player.territoryOrder = [...territoryIds];
  appendV070Event(state, {
    type: 'territory_arrangement_locked',
    actor: playerId,
    visibility: playerId,
    payload: { territoryIds: [...territoryIds] },
  });

  if (state.players.A.territoryOrder && state.players.B.territoryOrder) {
    state.setup!.stage = 'first_player';
    appendV070Event(state, {
      type: 'territory_arrangements_complete',
      visibility: 'public',
    });
  }
}

function rollFirstPlayer(
  state: V070GameState,
  playerId: PlayerId,
  value: number,
): void {
  requireSetupStage(state, 'first_player');
  assertDie(value);

  if (state.setup!.firstPlayerRolls[playerId] !== undefined) {
    throw new V070GameActionError(`${playerId} has already rolled for first player.`);
  }
  state.setup!.firstPlayerRolls[playerId] = value;

  appendV070Event(state, {
    type: 'first_player_roll',
    actor: playerId,
    visibility: 'public',
    payload: { value },
  });

  const a = state.setup!.firstPlayerRolls.A;
  const b = state.setup!.firstPlayerRolls.B;
  if (a === undefined || b === undefined) return;

  if (a === b) {
    state.setup!.firstPlayerRolls = {};
    appendV070Event(state, {
      type: 'first_player_roll_tied',
      visibility: 'public',
      payload: { value: a },
    });
    return;
  }

  const firstPlayer: PlayerId = a > b ? 'A' : 'B';
  completeSetup(state, firstPlayer);
}

function completeSetup(state: V070GameState, firstPlayer: PlayerId): void {
  const orderA = state.players.A.territoryOrder;
  const orderB = state.players.B.territoryOrder;
  if (!orderA || !orderB) throw new Error('Cannot complete setup before both Territory arrangements are locked.');

  const boardTerritories = [
    ...orderA.map((territoryId, index): V070BoardTerritory => ({
      territoryInstanceId: `A-territory-${String(index + 1).padStart(2, '0')}-${territoryId}`,
      position: index,
      territoryId,
      contributedBy: 'A',
      controller: 'A',
      occupant: index === 0 ? 'A' : null,
    })),
    ...[...orderB].reverse().map((territoryId, index): V070BoardTerritory => ({
      territoryInstanceId: `B-territory-${String(index + 1).padStart(2, '0')}-${territoryId}`,
      position: index + 3,
      territoryId,
      contributedBy: 'B',
      controller: 'B',
      occupant: index === 2 ? 'B' : null,
    })),
  ];

  state.board = boardTerritories;
  state.players.A.position = 0;
  state.players.B.position = 5;
  state.players.A.controlledTerritories = boardTerritories
    .filter(territory => territory.controller === 'A')
    .map(territory => territory.territoryId);
  state.players.B.controlledTerritories = boardTerritories
    .filter(territory => territory.controller === 'B')
    .map(territory => territory.territoryId);

  state.stage = 'playing';
  state.setup = null;
  state.activePlayer = firstPlayer;
  state.turnNumber = 1;
  state.turnState = createV070TurnState();

  appendV070Event(state, {
    type: 'territories_revealed',
    visibility: 'public',
    payload: {
      board: boardTerritories.map(territory => ({
        territoryInstanceId: territory.territoryInstanceId,
        position: territory.position,
        territoryId: territory.territoryId,
        controller: territory.controller,
        occupant: territory.occupant,
      })),
    },
  });
  appendV070Event(state, {
    type: 'first_player_determined',
    actor: firstPlayer,
    visibility: 'public',
    payload: { firstPlayer },
  });
  appendV070Event(state, {
    type: 'turn_started',
    actor: firstPlayer,
    visibility: 'public',
    payload: { turnNumber: 1, phase: state.turnState.phase },
  });
}

function instantiateStarterDeck(
  playerId: PlayerId,
  starter: V070ResolvedStarterDeck,
  instances: Record<string, V070CardInstance>,
): string[] {
  const result: string[] = [];
  let ordinal = 1;

  for (const entry of starter.cards) {
    for (let copy = 0; copy < entry.quantity; copy += 1) {
      const instanceId = `${playerId}-card-${String(ordinal).padStart(2, '0')}-${entry.card.id}`;
      if (instances[instanceId]) throw new Error(`Duplicate card instance id: ${instanceId}`);
      instances[instanceId] = {
        instanceId,
        cardId: entry.card.id,
        owner: playerId,
      };
      result.push(instanceId);
      ordinal += 1;
    }
  }

  if (result.length !== 30) {
    throw new Error(`Released starter ${starter.definition.id} did not instantiate to 30 cards.`);
  }
  return result;
}

export function deterministicV070Shuffle<T>(values: readonly T[], seed: string): T[] {
  const result = [...values];
  const random = mulberry32(hashSeed(seed));

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function mulberry32(seed: number): () => number {
  let value = seed >>> 0;
  return () => {
    value = (value + 0x6D2B79F5) >>> 0;
    let mixed = value;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function requireStarter(id: string): V070ResolvedStarterDeck {
  const starter = v070StarterDecks.get(id);
  if (!starter) throw new Error(`Unknown v0.7.0 released starter Deck: ${id}`);
  return starter;
}

function requireSetupStage(state: V070GameState, stage: V070SetupStage): void {
  if (state.stage !== 'setup' || state.setup?.stage !== stage) {
    throw new V070GameActionError(`Expected setup stage ${stage}.`);
  }
}

function assertDie(value: number): void {
  if (!Number.isInteger(value) || value < 1 || value > 6) {
    throw new V070GameActionError('First-player roll must be an unmodified d6 result.');
  }
}

export function appendV070Event(
  state: V070GameState,
  event: Omit<V070GameEvent, 'index'>,
): void {
  state.events.push({
    index: state.events.length,
    ...event,
  });
}
