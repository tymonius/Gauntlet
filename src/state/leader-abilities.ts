import type {
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
      return game.phase === 'action_after_movement' && game.activePlayer === playerId;
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
  if (limit === 'once_per_battle') return Boolean(game.battle) && usage.battle[ability.id] !== game.battle?.id;
  return true;
}

function canPay(game: GameState, playerId: PlayerID, cost?: LeaderAbilityCost): boolean {
  if (!cost) return true;
  return (game.players[playerId].resources?.[cost.resource]?.value ?? 0) >= cost.amount;
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
  if ((ability.usageLimit ?? 'none') === 'once_per_battle' && game.battle) usage.battle[ability.id] = game.battle.id;

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
    id: 'general-rally',
    leaderName: 'General',
    name: 'Rally',
    text: 'Before dice are rolled in a battle you initiated, spend 1 Command to add +1 to your battle total.',
    timing: 'before_battle_dice',
    cost: { resource: 'command', amount: 1 },
    canUse: (game, playerId) => game.battle?.attacker.playerId === playerId,
    resolve: (game, playerId) => {
      if (!game.battle) return;
      const participant = game.battle.attacker.playerId === playerId ? game.battle.attacker : game.battle.defender;
      participant.modifiers += 1;
    },
  },
  {
    id: 'commandant-entrench',
    leaderName: 'Commandant',
    name: 'Entrench',
    text: 'Before dice are rolled in a battle you did not initiate, spend 1 Command to add +1 to your battle total.',
    timing: 'before_battle_dice',
    cost: { resource: 'command', amount: 1 },
    canUse: (game, playerId) => game.battle?.defender.playerId === playerId,
    resolve: (game, playerId) => {
      if (!game.battle) return;
      const participant = game.battle.attacker.playerId === playerId ? game.battle.attacker : game.battle.defender;
      participant.modifiers += 1;
    },
  },
]);
