import type { CardID, PlayerID, TerritoryID } from '../types';
import type { InitializeGameInput, PlayerSetupInput } from './initialize';

export interface ValidationIssue {
  code: string;
  message: string;
  path?: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}

export class GameSetupValidationError extends Error {
  issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    super(issues.map((issue) => issue.message).join('\n'));
    this.name = 'GameSetupValidationError';
    this.issues = issues;
  }
}

function hasDuplicates<T>(items: T[]): boolean {
  return new Set(items).size !== items.length;
}

function findDuplicates<T>(items: T[]): T[] {
  const seen = new Set<T>();
  const duplicates = new Set<T>();

  for (const item of items) {
    if (seen.has(item)) duplicates.add(item);
    seen.add(item);
  }

  return [...duplicates];
}

function validatePlayerSetup(player: PlayerSetupInput, path: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!player.id) {
    issues.push({ code: 'missing_player_id', message: 'Player is missing an id.', path: `${path}.id` });
  }

  if (!player.name) {
    issues.push({ code: 'missing_player_name', message: `Player ${player.id || path} is missing a name.`, path: `${path}.name` });
  }

  if (!Array.isArray(player.deck) || player.deck.length === 0) {
    issues.push({ code: 'empty_deck', message: `${player.name || player.id} must have a non-empty deck.`, path: `${path}.deck` });
  }

  if (!Array.isArray(player.territories) || player.territories.length !== 3) {
    issues.push({ code: 'invalid_territory_count', message: `${player.name || player.id} must select exactly 3 Territories.`, path: `${path}.territories` });
  }

  if (hasDuplicates(player.territories)) {
    issues.push({
      code: 'duplicate_territory_selection',
      message: `${player.name || player.id} has duplicate Territory selections: ${findDuplicates(player.territories).join(', ')}.`,
      path: `${path}.territories`,
    });
  }

  return issues;
}

export function validateGameSetup(input: InitializeGameInput): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!input.version) {
    issues.push({ code: 'missing_version', message: 'Game setup must include a rules/data version.', path: 'version' });
  }

  if (!Array.isArray(input.players) || input.players.length !== 2) {
    issues.push({ code: 'invalid_player_count', message: 'Gauntlet currently requires exactly 2 players.', path: 'players' });
    return { valid: false, issues };
  }

  const [playerOne, playerTwo] = input.players;
  issues.push(...validatePlayerSetup(playerOne, 'players.0'));
  issues.push(...validatePlayerSetup(playerTwo, 'players.1'));

  if (playerOne.id && playerTwo.id && playerOne.id === playerTwo.id) {
    issues.push({ code: 'duplicate_player_id', message: 'Players must have distinct ids.', path: 'players' });
  }

  if (input.startingPlayer && !input.players.some((player) => player.id === input.startingPlayer)) {
    issues.push({
      code: 'invalid_starting_player',
      message: `Starting player ${input.startingPlayer} is not one of the players in this setup.`,
      path: 'startingPlayer',
    });
  }

  if (input.openingHandSize !== undefined) {
    if (!Number.isInteger(input.openingHandSize) || input.openingHandSize < 0) {
      issues.push({ code: 'invalid_opening_hand_size', message: 'Opening hand size must be a non-negative integer.', path: 'openingHandSize' });
    }

    for (const [index, player] of input.players.entries()) {
      if (Number.isInteger(input.openingHandSize) && input.openingHandSize > player.deck.length) {
        issues.push({
          code: 'opening_hand_larger_than_deck',
          message: `${player.name || player.id} cannot draw an opening hand larger than their deck.`,
          path: `players.${index}.deck`,
        });
      }
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function assertValidGameSetup(input: InitializeGameInput): void {
  const result = validateGameSetup(input);
  if (!result.valid) throw new GameSetupValidationError(result.issues);
}

export function validateCardList(cards: CardID[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!Array.isArray(cards)) {
    issues.push({ code: 'invalid_card_list', message: 'Card list must be an array.' });
  }

  return { valid: issues.length === 0, issues };
}

export function validateTerritoryList(territories: TerritoryID[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (!Array.isArray(territories)) {
    issues.push({ code: 'invalid_territory_list', message: 'Territory list must be an array.' });
  }

  return { valid: issues.length === 0, issues };
}

export function validatePlayerIds(playerIds: PlayerID[]): ValidationResult {
  const issues: ValidationIssue[] = [];

  if (hasDuplicates(playerIds)) {
    issues.push({ code: 'duplicate_player_ids', message: `Duplicate player ids: ${findDuplicates(playerIds).join(', ')}.` });
  }

  return { valid: issues.length === 0, issues };
}
