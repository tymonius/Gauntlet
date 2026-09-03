#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  createV070StarterGame,
  type CreateV070StarterGameInput,
  type V070GameState,
} from '../v070/engine';
import { v070StarterDecks } from '../v070/starter-decks';
import { viewV070GameForPlayer } from '../v070/views';
import {
  applyV070CliReducerCommand,
  parseV070CliReducerCommand,
} from './v070-reducer-repl';

interface CliOptions {
  seed: string;
  aStarterId: string;
  bStarterId: string;
}

function optionsFromArgs(args: readonly string[]): CliOptions {
  const starters = [...v070StarterDecks.keys()];
  if (starters.length < 2) {
    throw new Error('The certified v0.7.0 starter package must contain at least two Decks.');
  }

  const value = (flag: string): string | undefined => {
    const index = args.indexOf(flag);
    return index >= 0 ? args[index + 1] : undefined;
  };

  const aStarterId = value('--a') ?? starters[0];
  const bStarterId = value('--b') ?? starters[1];
  const seed = value('--seed') ?? 'v070-dev-cli';

  for (const [label, starterId] of [
    ['A', aStarterId],
    ['B', bStarterId],
  ] as const) {
    if (!v070StarterDecks.has(starterId)) {
      throw new Error(
        `Unknown starter for ${label}: ${starterId}. Use the "starters" command to list certified IDs.`,
      );
    }
  }

  return { seed, aStarterId, bStarterId };
}

function createGame(options: CliOptions): V070GameState {
  const input: CreateV070StarterGameInput = {
    gameId: 'v070-cli-dev-game',
    seed: options.seed,
    players: {
      A: {
        name: 'Player A',
        starterDeckId: options.aStarterId,
      },
      B: {
        name: 'Player B',
        starterDeckId: options.bStarterId,
      },
    },
  };
  return createV070StarterGame(input);
}

function printSummary(game: V070GameState): void {
  const phase = game.turnState?.phase ?? '-';
  const battleStage = game.battleRuntime?.stage ?? '-';
  console.log(
    `\nstage=${game.stage} turn=${game.turnNumber} active=${game.activePlayer ?? '-'} phase=${phase} battle=${battleStage}`,
  );
  if (game.winner) console.log(`winner=${game.winner}`);
  if (game.pendingActionCard) {
    console.log(`pendingActionCard=${game.pendingActionCard.instanceId}`);
  }
  if (game.pendingActionEffectChoice) {
    console.log(`pendingActionEffectChoice=${game.pendingActionEffectChoice.kind}`);
  }
  if (game.pendingAssetLimitChoice) {
    console.log(`pendingAssetLimitChoice=${game.pendingAssetLimitChoice.playerId}`);
  }
  if (game.pendingTurnChoice) {
    console.log(`pendingTurnChoice=${game.pendingTurnChoice.kind}`);
  }
  if (game.battleRuntime?.unsupportedEffects.length) {
    console.log('unsupported battle effects:');
    for (const effect of game.battleRuntime.unsupportedEffects) {
      console.log(`  ${effect.owner}: ${effect.cardId} — ${effect.text}`);
    }
  }
}

function printHelp(): void {
  console.log(`
Commands:
  help
  starters
  state
  view A
  view B
  events [count]
  reset
  setup <JSON action>
  turn <JSON action>
  battle <JSON action>
  quit

Examples:
  setup {"type":"choose_opening_discard","playerId":"A","cardInstanceId":"..."}
  turn {"type":"resolve_capture","playerId":"A"}
  battle {"type":"set_gambit","playerId":"A"}
`);
}

function printStarters(): void {
  console.log('\nCertified v0.7.0 starter Decks');
  for (const starter of v070StarterDecks.values()) {
    const deck = starter.definition;
    console.log(
      `  ${deck.id} | ${deck.factionId} / ${deck.leaderId} | ${deck.name}`,
    );
  }
}

let options: CliOptions;
try {
  options = optionsFromArgs(process.argv.slice(2));
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
  throw error;
}

let game = createGame(options);
const rl = createInterface({ input, output });

console.log('Gauntlet v0.7.0 rules-aware engine CLI');
console.log('This runner exposes the promoted reducer directly; unsupported current battle effects still halt explicitly.');
console.log(`A=${options.aStarterId}`);
console.log(`B=${options.bStarterId}`);
printHelp();
printSummary(game);

try {
  while (true) {
    const line = (await rl.question('\nv070> ')).trim();
    if (!line) continue;

    const [verb, arg] = line.split(/\s+/, 2);
    if (verb === 'quit' || verb === 'q' || verb === 'exit') break;

    try {
      if (verb === 'help') {
        printHelp();
        continue;
      }
      if (verb === 'starters') {
        printStarters();
        continue;
      }
      if (verb === 'state') {
        console.dir(game, { depth: null });
        continue;
      }
      if (verb === 'view') {
        if (arg !== 'A' && arg !== 'B' && arg !== 'a' && arg !== 'b') {
          throw new Error('view requires player A or B.');
        }
        const playerId = arg.toUpperCase() as 'A' | 'B';
        console.dir(viewV070GameForPlayer(game, playerId), { depth: null });
        continue;
      }
      if (verb === 'events') {
        const requested = arg ? Number(arg) : 20;
        if (!Number.isInteger(requested) || requested < 1) {
          throw new Error('events count must be a positive integer.');
        }
        console.dir(game.events.slice(-requested), { depth: null });
        continue;
      }
      if (verb === 'reset') {
        game = createGame(options);
        printSummary(game);
        continue;
      }

      game = applyV070CliReducerCommand(
        game,
        parseV070CliReducerCommand(line),
      );
      printSummary(game);
    } catch (error) {
      console.error(error instanceof Error ? error.message : String(error));
    }
  }
} finally {
  rl.close();
}
