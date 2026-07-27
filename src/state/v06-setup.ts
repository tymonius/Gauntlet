import { V06_RULES_VERSION, v06CanonicalContent } from '../content';
import type { CardID, GameID, GameState, PlayerID, TerritoryID } from '../types';
import { initializeGame } from './initialize';
import { createV06StandardBoard } from './v06-board';
import { GameSetupValidationError, type ValidationIssue, type ValidationResult } from './validation';

export interface V06PlayerSetupInput {
  id: PlayerID;
  name: string;
  factionId: string;
  leaderName: string;
  deck: CardID[];
  territories: TerritoryID[];
}

export interface V06GameSetupInput {
  id?: GameID;
  rulesVersion?: typeof V06_RULES_VERSION;
  players: [V06PlayerSetupInput, V06PlayerSetupInput];
  startingPlayer?: PlayerID;
  shuffleDecks?: boolean;
  random?: () => number;
}

function duplicates<T>(items: readonly T[]): T[] {
  const seen = new Set<T>();
  const repeated = new Set<T>();
  for (const item of items) {
    if (seen.has(item)) repeated.add(item);
    seen.add(item);
  }
  return [...repeated];
}

function validatePlayer(player: V06PlayerSetupInput, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const rules = v06CanonicalContent.content.deck_construction;
  const faction = v06CanonicalContent.factionsById.get(player.factionId);
  const leader = v06CanonicalContent.leadersByName.get(player.leaderName);

  if (!faction) issues.push({ code: 'unknown_faction', message: `Unknown faction: ${player.factionId}.`, path: `${path}.factionId` });
  if (!leader) {
    issues.push({ code: 'unknown_leader', message: `Unknown Leader: ${player.leaderName}.`, path: `${path}.leaderName` });
  } else if (leader.factionId !== player.factionId) {
    issues.push({ code: 'leader_faction_mismatch', message: `${player.leaderName} does not belong to faction ${player.factionId}.`, path: `${path}.leaderName` });
  }

  if (player.deck.length < rules.minimum_playable_cards) {
    issues.push({ code: 'deck_below_minimum', message: `${player.name} must include at least ${rules.minimum_playable_cards} cards in the Playable Deck.`, path: `${path}.deck` });
  }

  let totalValue = 0;
  const counts = new Map<CardID, number>();
  for (const cardId of player.deck) {
    const card = v06CanonicalContent.cardsById.get(cardId);
    if (!card) {
      issues.push({ code: 'unknown_card', message: `Unknown card: ${cardId}.`, path: `${path}.deck` });
      continue;
    }
    totalValue += card.cost;
    counts.set(cardId, (counts.get(cardId) ?? 0) + 1);
    if (faction && card.allegiance !== 'Neutral' && card.allegiance !== faction.name) {
      issues.push({ code: 'illegal_card_allegiance', message: `${card.name} belongs to ${card.allegiance}, not ${faction.name} or Neutral.`, path: `${path}.deck` });
    }
  }

  if (totalValue > rules.maximum_deckbuilding_value) {
    issues.push({ code: 'deck_value_exceeded', message: `${player.name}'s Playable Deck has value ${totalValue}; the maximum is ${rules.maximum_deckbuilding_value}.`, path: `${path}.deck` });
  }

  for (const [cardId, count] of counts) {
    const card = v06CanonicalContent.cardsById.get(cardId);
    if (card?.unique && count > 1) issues.push({ code: 'duplicate_unique_card', message: `${card.name} is Unique and may appear only once.`, path: `${path}.deck` });
  }

  if (player.territories.length !== rules.territories_per_player) {
    issues.push({ code: 'invalid_territory_count', message: `${player.name} must select exactly ${rules.territories_per_player} Territories.`, path: `${path}.territories` });
  }

  const repeatedTerritories = duplicates(player.territories);
  if (repeatedTerritories.length > 0) {
    issues.push({ code: 'duplicate_territory_selection', message: `${player.name} selected duplicate Territories: ${repeatedTerritories.join(', ')}.`, path: `${path}.territories` });
  }

  let arenaCount = 0;
  for (const territoryId of player.territories) {
    const territory = v06CanonicalContent.territoriesById.get(territoryId);
    if (!territory) issues.push({ code: 'unknown_territory', message: `Unknown Territory: ${territoryId}.`, path: `${path}.territories` });
    else if (territory.arena) arenaCount += 1;
  }
  if (arenaCount > rules.maximum_arenas) {
    issues.push({ code: 'too_many_arenas', message: `${player.name} may select no more than ${rules.maximum_arenas} Arena.`, path: `${path}.territories` });
  }

  return issues;
}

export function validateV06GameSetup(input: V06GameSetupInput): ValidationResult {
  const issues: ValidationIssue[] = [];
  const version = input.rulesVersion ?? V06_RULES_VERSION;
  if (version !== V06_RULES_VERSION) issues.push({ code: 'unsupported_rules_version', message: `Expected ${V06_RULES_VERSION}, received ${version}.`, path: 'rulesVersion' });
  if (!Array.isArray(input.players) || input.players.length !== 2) {
    return { valid: false, issues: [{ code: 'invalid_player_count', message: 'Gauntlet requires exactly two players.', path: 'players' }] };
  }

  issues.push(...validatePlayer(input.players[0], 'players.0'));
  issues.push(...validatePlayer(input.players[1], 'players.1'));
  if (input.players[0].id === input.players[1].id) issues.push({ code: 'duplicate_player_id', message: 'Players must have distinct ids.', path: 'players' });
  if (input.startingPlayer && !input.players.some((player) => player.id === input.startingPlayer)) {
    issues.push({ code: 'invalid_starting_player', message: `Starting player ${input.startingPlayer} is not in this game.`, path: 'startingPlayer' });
  }

  return { valid: issues.length === 0, issues };
}

export function initializeV06Game(input: V06GameSetupInput): GameState {
  const validation = validateV06GameSetup(input);
  if (!validation.valid) throw new GameSetupValidationError(validation.issues);

  const game = initializeGame({
    id: input.id,
    version: V06_RULES_VERSION,
    startingPlayer: input.startingPlayer,
    openingHandSize: v06CanonicalContent.content.deck_construction.opening_hand,
    shuffleDecks: input.shuffleDecks,
    random: input.random,
    players: input.players.map((player) => ({
      id: player.id,
      name: player.name,
      factionId: player.factionId,
      leaderName: player.leaderName,
      deck: player.deck,
      territories: player.territories,
    })) as [V06PlayerSetupInput, V06PlayerSetupInput],
  });

  const topology = createV06StandardBoard(input.players);
  game.board = topology.board;
  for (const player of input.players) {
    game.players[player.id].occupiedSpaceId = topology.startingSpaces[player.id];
  }

  return game;
}
