import type {
  BoardSpaceState,
  GameState,
  LeaderAbilityCost,
  LeaderAbilityTiming,
  LeaderAbilityUsageLimit,
  LeaderAbilityUsageState,
  LegalLeaderAbilityOption,
  PlayerID,
} from '../types';
import { spendFactionResource } from './resources';

export interface LeaderAbilityDefinition {
  id: string;
  leaderName: string;
  name: string;
  text: string;
  timing: LeaderAbilityTiming;
  usageLimit?: LeaderAbilityUsageLimit;
  cost?: LeaderAbilityCost;
  canUse?: (game: GameState, playerId: PlayerID) => boolean;
  resolve: (game: GameState, playerId: PlayerID) => void;
}

export class LeaderAbilityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LeaderAbilityError';
  }
}

export class LeaderAbilityRegistry {
  private readonly abilities = new Map<string, LeaderAbilityDefinition>();
  constructor(definitions: readonly LeaderAbilityDefinition[] = []) {
    for (const definition of definitions) this.register(definition);
  }
  register(definition: LeaderAbilityDefinition): void {
    if (this.abilities.has(definition.id)) throw new LeaderAbilityError(`Duplicate Leader ability: ${definition.id}.`);
    this.abilities.set(definition.id, definition);
  }
  get(id: string): LeaderAbilityDefinition | undefined { return this.abilities.get(id); }
  forLeader(leaderName?: string): LeaderAbilityDefinition[] {
    return leaderName ? [...this.abilities.values()].filter((ability) => ability.leaderName === leaderName) : [];
  }
}

function usageFor(game: GameState, playerId: PlayerID): LeaderAbilityUsageState {
  const player = game.players[playerId];
  player.leaderAbilityUsage ??= { turn: {}, battle: {} };
  return player.leaderAbilityUsage;
}

function timingIsOpen(game: GameState, playerId: PlayerID, timing: LeaderAbilityTiming): boolean {
  switch (timing) {
    case 'action_opportunity':
      return game.activePlayer === playerId && (game.phase === 'action_before_movement' || game.phase === 'action_after_movement');
    case 'before_battle_dice':
      return game.phase === 'battle' && game.battle?.stage === 'dice'
        && (game.battle.attacker.playerId === playerId || game.battle.defender.playerId === playerId);
    case 'after_battle':
      return game.phase === 'action_after_movement'
        && game.recentBattleResult?.winner === playerId
        && game.pendingLeaderAbilityWindow?.playerId === playerId;
    case 'turn_start':
      return game.phase === 'turn_start' && game.activePlayer === playerId;
    case 'turn_end':
      return game.activePlayer === playerId && game.phase !== 'battle' && game.phase !== 'game_over';
  }
}

function usageAvailable(game: GameState, playerId: PlayerID, ability: LeaderAbilityDefinition): boolean {
  const usage = usageFor(game, playerId);
  const limit = ability.usageLimit ?? 'none';
  if (limit === 'once_per_turn') return usage.turn[ability.id] !== game.turn;
  if (limit === 'once_per_battle') {
    const battleId = game.battle?.id ?? game.recentBattleResult?.battleId;
    return Boolean(battleId) && usage.battle[ability.id] !== battleId;
  }
  return true;
}

function canPay(game: GameState, playerId: PlayerID, cost?: LeaderAbilityCost): boolean {
  if (!cost) return true;
  return (game.players[playerId].resources?.[cost.resource]?.value ?? 0) >= cost.amount;
}

function occupiedSpace(game: GameState, playerId: PlayerID): BoardSpaceState | undefined {
  return game.board.spaces.find((space) => space.occupant === playerId);
}

function captureOccupiedTerritory(game: GameState, playerId: PlayerID): void {
  const space = occupiedSpace(game, playerId);
  if (!space || space.kind !== 'territory' || !space.territoryId || space.controller === playerId) return;
  const previousController = space.controller;
  if (previousController) {
    game.players[previousController].controlledTerritories = game.players[previousController].controlledTerritories
      .filter((territoryId) => territoryId !== space.territoryId);
  }
  if (!game.players[playerId].controlledTerritories.includes(space.territoryId)) {
    game.players[playerId].controlledTerritories.push(space.territoryId);
  }
  space.controller = playerId;
  delete space.capturePendingBy;
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor: playerId,
    type: 'territory_captured',
    message: `${game.players[playerId].name} captured ${space.territoryId} immediately with Fortify.`,
    payload: { spaceId: space.id, territoryId: space.territoryId, previousController, controller: playerId, source: 'commandant-fortify' },
    visibility: 'public',
  });
}

function repelLoserOneAdditionalPosition(game: GameState): void {
  const result = game.recentBattleResult;
  if (!result) return;
  const loser = game.players[result.loser];
  const current = occupiedSpace(game, result.loser);
  if (!current) return;
  const destination = game.board.spaces.find((space) => space.index === current.index + result.retreatDirection);
  if (!destination || destination.occupant) return;
  current.occupant = undefined;
  destination.occupant = result.loser;
  loser.occupiedSpaceId = destination.id;
  if (destination.kind === 'territory' && destination.controller && destination.controller !== result.loser) {
    destination.capturePendingBy = result.loser;
  } else if (destination.kind === 'territory' && destination.controller === result.loser) {
    delete destination.capturePendingBy;
  }
}

export function legalLeaderAbilitiesFor(
  game: GameState,
  playerId: PlayerID,
  registry: LeaderAbilityRegistry = defaultLeaderAbilityRegistry,
): LegalLeaderAbilityOption[] {
  const player = game.players[playerId];
  if (!player?.leaderName) return [];
  return registry.forLeader(player.leaderName)
    .filter((ability) => timingIsOpen(game, playerId, ability.timing))
    .filter((ability) => usageAvailable(game, playerId, ability))
    .filter((ability) => canPay(game, playerId, ability.cost))
    .filter((ability) => ability.canUse?.(game, playerId) ?? true)
    .map((ability) => ({
      abilityId: ability.id,
      name: ability.name,
      text: ability.text,
      timing: ability.timing,
      cost: ability.cost,
      usageLimit: ability.usageLimit ?? 'none',
      phase: game.phase,
    }));
}

export function useLeaderAbility(
  game: GameState,
  playerId: PlayerID,
  abilityId: string,
  registry: LeaderAbilityRegistry = defaultLeaderAbilityRegistry,
): void {
  const player = game.players[playerId];
  if (!player) throw new LeaderAbilityError(`Unknown player: ${playerId}.`);
  const ability = registry.get(abilityId);
  if (!ability || ability.leaderName !== player.leaderName) throw new LeaderAbilityError(`${player.name} cannot use ${abilityId}.`);
  if (!timingIsOpen(game, playerId, ability.timing)) throw new LeaderAbilityError(`${ability.name} cannot be used at this timing.`);
  if (!usageAvailable(game, playerId, ability)) throw new LeaderAbilityError(`${ability.name} has already been used in this window.`);
  if (!(ability.canUse?.(game, playerId) ?? true)) throw new LeaderAbilityError(`${ability.name}'s requirements are not satisfied.`);
  if (!canPay(game, playerId, ability.cost)) throw new LeaderAbilityError(`${player.name} cannot pay for ${ability.name}.`);

  if (ability.cost) spendFactionResource(game, playerId, ability.cost.resource, ability.cost.amount, `Leader ability: ${ability.name}`);
  ability.resolve(game, playerId);

  const usage = usageFor(game, playerId);
  if ((ability.usageLimit ?? 'none') === 'once_per_turn') usage.turn[ability.id] = game.turn;
  if ((ability.usageLimit ?? 'none') === 'once_per_battle') {
    const battleId = game.battle?.id ?? game.recentBattleResult?.battleId;
    if (battleId) usage.battle[ability.id] = battleId;
  }

  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor: playerId,
    type: 'leader_ability_used',
    message: `${player.name} used ${ability.name}.`,
    payload: { abilityId: ability.id, leaderName: player.leaderName, cost: ability.cost },
    visibility: 'public',
  });
}

export function resetLeaderAbilityUsageForNewTurn(game: GameState, playerId: PlayerID): void {
  usageFor(game, playerId).turn = {};
}

export function resetLeaderAbilityUsageAfterBattle(game: GameState): void {
  for (const playerId of Object.keys(game.players)) usageFor(game, playerId).battle = {};
}

export const defaultLeaderAbilityRegistry = new LeaderAbilityRegistry([
  {
    id: 'general-onward',
    leaderName: 'General',
    name: 'Onward',
    text: 'Move one additional position this turn. Resolve this movement one position at a time. It may initiate a battle.',
    timing: 'action_opportunity',
    usageLimit: 'once_per_turn',
    cost: { resource: 'command', amount: 1 },
    resolve: (game, playerId) => {
      game.players[playerId].movementRemaining += 1;
      game.phase = 'movement';
    },
  },
  {
    id: 'general-rally',
    leaderName: 'General',
    name: 'Rally',
    text: 'Before dice are rolled in a battle you initiated, add +1 to your battle total.',
    timing: 'before_battle_dice',
    usageLimit: 'once_per_battle',
    cost: { resource: 'command', amount: 1 },
    canUse: (game, playerId) => game.battle?.attacker.playerId === playerId,
    resolve: (game, playerId) => {
      if (!game.battle) return;
      const participant = game.battle.attacker.playerId === playerId ? game.battle.attacker : game.battle.defender;
      participant.modifiers += 1;
    },
  },
  {
    id: 'general-rout',
    leaderName: 'General',
    name: 'Rout',
    text: 'After you win a battle you initiated, move one position toward the opponent’s end of the Gauntlet. This movement may initiate another battle.',
    timing: 'after_battle',
    usageLimit: 'once_per_battle',
    cost: { resource: 'command', amount: 2 },
    canUse: (game, playerId) => game.recentBattleResult?.winner === playerId && game.recentBattleResult.attacker === playerId,
    resolve: (game, playerId) => {
      game.players[playerId].movementRemaining += 1;
      game.phase = 'movement';
    },
  },
  {
    id: 'commandant-entrench',
    leaderName: 'Commandant',
    name: 'Entrench',
    text: 'Before dice are rolled in a battle you did not initiate, add +1 to your battle total.',
    timing: 'before_battle_dice',
    usageLimit: 'once_per_battle',
    cost: { resource: 'command', amount: 1 },
    canUse: (game, playerId) => game.battle?.defender.playerId === playerId,
    resolve: (game, playerId) => {
      if (!game.battle) return;
      const participant = game.battle.attacker.playerId === playerId ? game.battle.attacker : game.battle.defender;
      participant.modifiers += 1;
    },
  },
  {
    id: 'commandant-repel',
    leaderName: 'Commandant',
    name: 'Repel',
    text: 'After you win a battle you did not initiate, the defeated opponent retreats one additional position, if able.',
    timing: 'after_battle',
    usageLimit: 'once_per_battle',
    cost: { resource: 'command', amount: 1 },
    canUse: (game, playerId) => game.recentBattleResult?.winner === playerId
      && game.recentBattleResult.defender === playerId
      && Boolean(occupiedSpace(game, game.recentBattleResult.loser)),
    resolve: (game) => repelLoserOneAdditionalPosition(game),
  },
  {
    id: 'commandant-fortify',
    leaderName: 'Commandant',
    name: 'Fortify',
    text: 'After you win a battle while occupying an enemy-controlled Territory, capture that Territory immediately.',
    timing: 'after_battle',
    usageLimit: 'once_per_battle',
    cost: { resource: 'command', amount: 2 },
    canUse: (game, playerId) => {
      const space = occupiedSpace(game, playerId);
      return game.recentBattleResult?.winner === playerId
        && Boolean(space?.kind === 'territory' && space.controller && space.controller !== playerId);
    },
    resolve: (game, playerId) => captureOccupiedTerritory(game, playerId),
  },
]);
