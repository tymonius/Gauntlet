#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import type { CardID, GameAction, GameState, PlayerID, SpaceID } from '../types';
import { applyGameAction, initializeGame, toPrivateGameView } from '../state';

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

function activeViewer(game: GameState): PlayerID {
  return game.priorityPlayer ?? game.activePlayer;
}

function formatList(items: readonly string[]): string {
  return items.length === 0 ? '-' : items.join(', ');
}

function printBoard(game: GameState): void {
  console.log('\nBoard');
  for (const space of game.board.spaces) {
    const bits = [
      `${space.index}:${space.id}`,
      space.kind,
      space.territoryId ? `territory=${space.territoryId}` : undefined,
      space.controller ? `ctrl=${space.controller}` : undefined,
      space.occupant ? `occ=${space.occupant}` : undefined,
      space.capturePendingBy ? `pending=${space.capturePendingBy}` : undefined,
      space.revealed ? 'revealed' : 'hidden',
    ].filter(Boolean);
    console.log(`  ${bits.join(' | ')}`);
  }
}

function printPlayers(game: GameState): void {
  console.log('\nPlayers');
  for (const player of Object.values(game.players)) {
    console.log(`  ${player.id} (${player.name})`);
    console.log(`    hand: ${formatList(player.zones.hand)}`);
    console.log(`    deck: ${player.zones.deck.length} cards`);
    console.log(`    discard: ${formatList(player.zones.discard)}`);
    console.log(`    graveyard: ${formatList(player.zones.graveyard)}`);
    console.log(`    assets: ${formatList(player.zones.assetBank)} / limit ${player.controlledTerritories.length}`);
    console.log(`    conditions: ${formatList(player.zones.conditions)}`);
    console.log(`    territories: ${formatList(player.controlledTerritories)}`);
    console.log(`    actions=${player.actionsRemaining}, movement=${player.movementRemaining}`);
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
  if (battle.legalBattlePlays) {
    console.log('  legal battle plays:');
    battle.legalBattlePlays.forEach((play, index) => {
      console.log(`    ${index + 1}. ${play.action}${play.cardId ? ` ${play.cardId}` : ''}`);
    });
  }
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

function printLegalActions(game: GameState, viewer: PlayerID): void {
  const view = toPrivateGameView(game, viewer);
  if (view.legalActionPlays) {
    console.log('\nLegal Action cards');
    view.legalActionPlays.forEach((play, index) => {
      console.log(`  ${index + 1}. ${play.cardId} -> ${play.destination}${play.requiresTarget ? ' (target required)' : ''}`);
    });
  }
}

function printState(game: GameState): void {
  const viewer = activeViewer(game);
  console.log('\n='.repeat(40));
  console.log(`Turn ${game.turn} | phase=${game.phase} | active=${game.activePlayer} | priority=${viewer}${game.winner ? ` | winner=${game.winner}` : ''}`);
  printBoard(game);
  printPlayers(game);
  printPendingChoices(game);
  printLegalActions(game, viewer);
  printBattle(game, viewer);
  console.log('\nCommands: help, state, draw [n], reveal <space>, action <card>, discard-assets <card...>, move <space>, commit <card>, pass-hand, battle-draw [n], play-battle <card>, pass-battle, roll <1-6>, resolve, end, quit');
}

function parseAction(command: string, game: GameState): GameAction | undefined {
  const [verb, ...args] = command.trim().split(/\s+/).filter(Boolean);
  const playerId = activeViewer(game);

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
  console.log(`\nMinimal Gauntlet dev runner\n\nExamples:\n  draw\n  reveal space-1\n  action card-fortifications\n  move space-1\n  pass-hand\n  battle-draw\n  play-battle card-valor\n  roll 6\n  resolve\n  discard-assets card-fortifications\n  end\n\nThe runner always acts as the current priority player. It is intentionally rough and exists to expose engine/rules gaps during local playtesting.\n`);
}

async function main(): Promise<void> {
  let game = createDevGame();
  const rl = createInterface({ input, output });

  printHelp();
  printState(game);

  while (game.phase !== 'game_over') {
    const line = await rl.question('\ngauntlet> ');
    const command = line.trim();

    if (command === '' || command === 'state') {
      printState(game);
      continue;
    }
    if (command === 'help') {
      printHelp();
      continue;
    }
    if (command === 'quit' || command === 'exit') break;

    const action = parseAction(command, game);
    if (!action) {
      console.log(`Unknown command: ${command}`);
      continue;
    }

    try {
      game = applyGameAction(game, action).state;
      printState(game);
    } catch (error) {
      console.error(error instanceof Error ? error.message : error);
    }
  }

  if (game.winner) console.log(`\n${game.winner} wins.`);
  rl.close();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
