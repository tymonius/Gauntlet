#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import type { CardID, GameState, PlayerID, SpaceID } from '../types';
import type { GameAction } from '../state';
import { applyGameAction, initializeGame, toPrivateGameView } from '../state';

interface GuidedOption {
  label: string;
  action: GameAction;
}

interface SessionLogEntry {
  index: number;
  command: string;
  action?: GameAction;
  result: 'applied' | 'error' | 'utility' | 'unknown' | 'quit';
  error?: string;
  before: Pick<GameState, 'turn' | 'phase' | 'activePlayer' | 'priorityPlayer' | 'winner'>;
  after?: Pick<GameState, 'turn' | 'phase' | 'activePlayer' | 'priorityPlayer' | 'winner'>;
}

interface SessionLog {
  startedAt: string;
  endedAt?: string;
  entries: SessionLogEntry[];
  finalState?: GameState;
}

const defaultDecks = {
  player_1: [
    'card-attrition',
    'card-fortifications',
    'card-valor',
    'card-conscription',
    'card-embargo',
    'p1-card-6',
    'p1-card-7',
    'p1-card-8',
  ],
  player_2: [
    'card-attrition',
    'card-fortifications',
    'card-valor',
    'card-conscription',
    'card-embargo',
    'p2-card-6',
    'p2-card-7',
    'p2-card-8',
  ],
};

function createDevGame(): GameState {
  return initializeGame({
    id: 'cli-dev-game',
    version: '0.5.6-dev',
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        deck: defaultDecks.player_1,
        territories: ['p1-territory-1', 'p1-territory-2', 'p1-territory-3'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        deck: defaultDecks.player_2,
        territories: ['p2-territory-1', 'p2-territory-2', 'p2-territory-3'],
      },
    ],
  });
}

function snapshot(game: GameState): SessionLogEntry['before'] {
  return {
    turn: game.turn,
    phase: game.phase,
    activePlayer: game.activePlayer,
    priorityPlayer: game.priorityPlayer,
    winner: game.winner,
  };
}

function recordLogEntry(log: SessionLog, entry: Omit<SessionLogEntry, 'index'>): void {
  log.entries.push({ index: log.entries.length + 1, ...entry });
}

function safeTimestamp(date = new Date()): string {
  return date.toISOString().replace(/[:.]/g, '-');
}

async function saveSessionLog(log: SessionLog, game: GameState): Promise<string> {
  const endedAt = new Date().toISOString();
  const completeLog: SessionLog = {
    ...log,
    endedAt,
    finalState: game,
  };
  const directory = 'playtest-logs';
  await mkdir(directory, { recursive: true });
  const path = `${directory}/gauntlet-cli-${safeTimestamp(new Date(log.startedAt))}.json`;
  await writeFile(path, JSON.stringify(completeLog, null, 2));
  return path;
}

function activeViewer(game: GameState): PlayerID {
  return game.priorityPlayer ?? game.activePlayer;
}

function formatList(items: readonly string[]): string {
  return items.length === 0 ? '-' : items.join(', ');
}

function controlledMarkers(game: GameState): Map<PlayerID, string> {
  const playerIds = Object.keys(game.players) as PlayerID[];
  return new Map(playerIds.map((playerId, index) => [playerId, index === 0 ? '<' : '>']));
}

function printBoard(game: GameState): void {
  const markers = controlledMarkers(game);
  console.log('\nBoard');
  console.log('  ' + game.board.spaces.map((space) => {
    const occupant = space.occupant ? ` ${markers.get(space.occupant) ?? '*'}${space.occupant}` : '';
    const pending = space.capturePendingBy ? ` pending:${space.capturePendingBy}` : '';
    const territory = space.territoryId ? ` ${space.territoryId}` : '';
    const controller = space.controller ? ` ctrl:${space.controller}` : '';
    return `[${space.index}:${space.id}${territory}${controller}${occupant}${pending}]`;
  }).join(' -- '));
}

function printPlayerSummary(game: GameState): void {
  console.log('\nPlayer summary');
  for (const player of Object.values(game.players)) {
    console.log(`  ${player.id}: hand=${player.zones.hand.length}, deck=${player.zones.deck.length}, discard=${player.zones.discard.length}, graveyard=${player.zones.graveyard.length}, assets=${player.zones.assetBank.length}/${player.controlledTerritories.length}, actions=${player.actionsRemaining}, movement=${player.movementRemaining}`);
  }
}

function printPlayerDetails(game: GameState): void {
  console.log('\nPlayer details');
  for (const player of Object.values(game.players)) {
    console.log(`  ${player.id} (${player.name})`);
    console.log(`    hand: ${formatList(player.zones.hand)}`);
    console.log(`    deck: ${formatList(player.zones.deck)}`);
    console.log(`    discard: ${formatList(player.zones.discard)}`);
    console.log(`    graveyard: ${formatList(player.zones.graveyard)}`);
    console.log(`    assets: ${formatList(player.zones.assetBank)} / limit ${player.controlledTerritories.length}`);
    console.log(`    conditions: ${formatList(player.zones.conditions)}`);
    console.log(`    territories: ${formatList(player.controlledTerritories)}`);
    console.log(`    occupied: ${player.occupiedSpaceId ?? '-'}`);
  }
}

function printBattle(game: GameState, viewer: PlayerID): void {
  const battle = toPrivateGameView(game, viewer).battle;
  if (!battle) return;

  console.log('\nBattle');
  console.log(`  stage: ${battle.stage}`);
  console.log(`  location: ${battle.location}`);
  console.log(`  attacker: ${battle.attacker.playerId} die=${battle.attacker.diceRoll ?? '-'} mod=${battle.attacker.modifiers}`);
  console.log(`  defender: ${battle.defender.playerId} die=${battle.defender.diceRoll ?? '-'} mod=${battle.defender.modifiers}`);
  console.log(`  tie policy: ${battle.tiePolicy}`);
  if (battle.validBattleCardTargets) {
    console.log('  valid battle targets:');
    battle.validBattleCardTargets.forEach((target, index) => {
      console.log(`    ${index + 1}. ${target.sourceOwner}:${target.sourceCardId} -> ${target.targetOwner}:${target.targetCardId}`);
    });
  }
}

function printPendingChoices(game: GameState): void {
  if (!game.pendingAssetBankDiscards) return;

  console.log('\nPending Asset Bank discards');
  for (const pending of Object.values(game.pendingAssetBankDiscards)) {
    console.log(`  ${pending.playerId}: discard ${pending.discardCount}; limit ${pending.limit}; options: ${formatList(pending.options)}`);
  }
}

function playerSpace(game: GameState, playerId: PlayerID) {
  return game.board.spaces.find((space) => space.occupant === playerId);
}

function adjacentSpaces(game: GameState, playerId: PlayerID) {
  const current = playerSpace(game, playerId);
  if (!current) return [];

  return game.board.spaces.filter((space) => Math.abs(space.index - current.index) === 1);
}

function buildGuidedOptions(game: GameState): GuidedOption[] {
  const playerId = activeViewer(game);
  const player = game.players[playerId];
  const view = toPrivateGameView(game, playerId);
  const options: GuidedOption[] = [];

  if (game.pendingAssetBankDiscards?.[playerId]) {
    const pending = game.pendingAssetBankDiscards[playerId];
    if (pending.discardCount === 1) {
      for (const cardId of pending.options) {
        options.push({
          label: `Discard ${cardId} from Asset Bank`,
          action: { type: 'resolve_asset_bank_discard', playerId, cardIds: [cardId] },
        });
      }
    }
    return options;
  }

  if (game.phase === 'turn_start') {
    options.push({ label: 'Draw 1 card', action: { type: 'draw_card', playerId } });
  }

  if (game.phase === 'action_before_movement' || game.phase === 'action_after_movement') {
    for (const play of view.legalActionPlays ?? []) {
      options.push({
        label: `Play Action ${play.cardId} -> ${play.destination}`,
        action: { type: 'play_action_card', playerId, cardId: play.cardId },
      });
    }
  }

  if (game.phase === 'movement') {
    for (const space of adjacentSpaces(game, playerId)) {
      options.push({
        label: `Move to ${space.id}${space.occupant ? ` occupied by ${space.occupant}` : ''}`,
        action: { type: 'move_player', playerId, toSpaceId: space.id },
      });
    }
  }

  for (const space of game.board.spaces) {
    if (!space.revealed && space.controller === playerId) {
      options.push({
        label: `Reveal ${space.id}${space.territoryId ? ` (${space.territoryId})` : ''}`,
        action: { type: 'reveal_space', playerId, spaceId: space.id },
      });
    }
  }

  const battle = view.battle;
  if (battle?.legalBattlePlays) {
    for (const play of battle.legalBattlePlays) {
      if (play.action === 'commit_battle_hand_card' && play.cardId) {
        options.push({
          label: `Commit ${play.cardId} from hand`,
          action: { type: 'commit_battle_hand_card', playerId, cardId: play.cardId },
        });
      } else if (play.action === 'play_battle_draw_card' && play.cardId) {
        options.push({
          label: `Play battle-drawn ${play.cardId}`,
          action: { type: 'play_battle_draw_card', playerId, cardId: play.cardId },
        });
      } else if (play.action === 'pass_battle_hand_commit') {
        options.push({ label: 'Pass hand commitment', action: { type: 'pass_battle_hand_commit', playerId } });
      } else if (play.action === 'pass_battle_draw_play') {
        options.push({ label: 'Pass battle-draw play', action: { type: 'pass_battle_draw_play', playerId } });
      }
    }
  }

  if (game.battle?.stage === 'battle_draw') {
    options.push({ label: 'Draw battle cards', action: { type: 'draw_battle_cards', playerId } });
  }

  if (game.battle?.stage === 'dice') {
    for (const value of [1, 2, 3, 4, 5, 6]) {
      options.push({ label: `Roll ${value}`, action: { type: 'roll_battle_die', playerId, value } });
    }
  }

  if (game.battle?.stage === 'resolution') {
    options.push({ label: 'Resolve battle', action: { type: 'resolve_battle', playerId } });
  }

  if (game.phase !== 'battle' && game.phase !== 'game_over' && playerId === game.activePlayer) {
    options.push({ label: 'End turn', action: { type: 'end_turn', playerId } });
  }

  return options;
}

function printGuidedOptions(options: GuidedOption[]): void {
  console.log('\nAvailable choices');
  if (options.length === 0) {
    console.log('  No guided choices available. Use manual commands or state/help.');
    return;
  }

  options.forEach((option, index) => {
    console.log(`  ${index + 1}. ${option.label}`);
  });
}

function printState(game: GameState): GuidedOption[] {
  const viewer = activeViewer(game);
  const options = buildGuidedOptions(game);
  console.log('\n='.repeat(40));
  console.log(`Turn ${game.turn} | phase=${game.phase} | active=${game.activePlayer} | priority=${viewer}${game.winner ? ` | winner=${game.winner}` : ''}`);
  printBoard(game);
  printPlayerSummary(game);
  printPendingChoices(game);
  printBattle(game, viewer);
  printGuidedOptions(options);
  console.log('\nEnter a choice number, or use: help, state, details, save-log, draw [n], reveal <space>, action <card>, discard-assets <card...>, move <space>, commit <card>, pass-hand, battle-draw [n], play-battle <card>, pass-battle, roll <1-6>, resolve, end, quit');
  return options;
}

function parseAction(command: string, game: GameState, guidedOptions: GuidedOption[]): GameAction | undefined {
  const [verb, ...args] = command.trim().split(/\s+/).filter(Boolean);
  const playerId = activeViewer(game);
  const choice = Number(command);
  if (Number.isInteger(choice) && choice >= 1 && choice <= guidedOptions.length) return guidedOptions[choice - 1].action;

  switch (verb) {
    case 'draw':
      return { type: 'draw_card', playerId, count: args[0] ? Number(args[0]) : undefined };
    case 'reveal':
      return { type: 'reveal_space', playerId, spaceId: args[0] as SpaceID };
    case 'action':
      return { type: 'play_action_card', playerId, cardId: args[0] as CardID };
    case 'discard-assets':
      return { type: 'resolve_asset_bank_discard', playerId, cardIds: args as CardID[] };
    case 'move':
      return { type: 'move_player', playerId, toSpaceId: args[0] as SpaceID };
    case 'commit':
      return { type: 'commit_battle_hand_card', playerId, cardId: args[0] as CardID };
    case 'pass-hand':
      return { type: 'pass_battle_hand_commit', playerId };
    case 'battle-draw':
      return { type: 'draw_battle_cards', playerId, count: args[0] ? Number(args[0]) : undefined };
    case 'play-battle':
      return { type: 'play_battle_draw_card', playerId, cardId: args[0] as CardID };
    case 'pass-battle':
      return { type: 'pass_battle_draw_play', playerId };
    case 'roll':
      return { type: 'roll_battle_die', playerId, value: args[0] ? Number(args[0]) : undefined };
    case 'resolve':
      return { type: 'resolve_battle', playerId };
    case 'end':
      return { type: 'end_turn', playerId };
    default:
      return undefined;
  }
}

function printHelp(): void {
  console.log(`\nMinimal Gauntlet dev runner\n\nPreferred use:\n  Enter a listed choice number.\n\nManual examples:\n  draw\n  reveal space-1\n  action card-fortifications\n  move space-1\n  pass-hand\n  battle-draw\n  play-battle card-valor\n  roll 6\n  resolve\n  discard-assets card-fortifications\n  end\n\nUtility commands:\n  state    Reprint summary and choices\n  details  Show full player zones\n  save-log Save the current playtest log to playtest-logs/\n  help     Show this help\n  quit     Exit and auto-save the log\n\nThe runner always acts as the current priority player. It is intentionally rough and exists to expose engine/rules gaps during local playtesting.\n`);
}

async function main(): Promise<void> {
  let game = createDevGame();
  const log: SessionLog = { startedAt: new Date().toISOString(), entries: [] };
  const rl = createInterface({ input, output });

  printHelp();
  let guidedOptions = printState(game);

  while (game.phase !== 'game_over') {
    const line = await rl.question('\ngauntlet> ');
    const command = line.trim();
    const before = snapshot(game);

    if (command === '' || command === 'state') {
      guidedOptions = printState(game);
      recordLogEntry(log, { command: command || 'state', result: 'utility', before, after: snapshot(game) });
      continue;
    }
    if (command === 'details') {
      printPlayerDetails(game);
      recordLogEntry(log, { command, result: 'utility', before, after: snapshot(game) });
      continue;
    }
    if (command === 'help') {
      printHelp();
      recordLogEntry(log, { command, result: 'utility', before, after: snapshot(game) });
      continue;
    }
    if (command === 'save-log') {
      const path = await saveSessionLog(log, game);
      console.log(`Saved playtest log to ${path}`);
      recordLogEntry(log, { command, result: 'utility', before, after: snapshot(game) });
      continue;
    }
    if (command === 'quit' || command === 'exit') {
      recordLogEntry(log, { command, result: 'quit', before, after: snapshot(game) });
      break;
    }

    const action = parseAction(command, game, guidedOptions);
    if (!action) {
      console.log(`Unknown command or choice: ${command}`);
      recordLogEntry(log, { command, result: 'unknown', before, after: snapshot(game) });
      continue;
    }

    try {
      game = applyGameAction(game, action).state;
      recordLogEntry(log, { command, action, result: 'applied', before, after: snapshot(game) });
      guidedOptions = printState(game);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(message);
      recordLogEntry(log, { command, action, result: 'error', error: message, before, after: snapshot(game) });
    }
  }

  if (game.winner) console.log(`\n${game.winner} wins.`);
  const path = await saveSessionLog(log, game);
  console.log(`Saved playtest log to ${path}`);
  rl.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
