#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import type { GameState } from '../types';
import { applyGameAction, initializeGame } from '../state';
import { activeViewer, buildGuidedOptions } from '../dev/guided-options';

function createDevGame(): GameState {
  return initializeGame({
    id: 'cli-dev-game', version: '0.5.6-dev', shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe','military-countercharge','military-war-crimes','military-battlefield-promotion','military-encampment'], territories: ['p1-territory-1','p1-territory-2','p1-territory-3'] },
      { id: 'player_2', name: 'Player Two', factionId: 'military', leaderName: 'Commandant', deck: ['military-rearguard','military-unbroken-ranks','military-give-chase','military-field-command','card-attrition','card-valor','card-conscription','card-embargo'], territories: ['p2-territory-1','p2-territory-2','p2-territory-3'] },
    ],
  });
}

function print(game: GameState): ReturnType<typeof buildGuidedOptions> {
  const viewer = activeViewer(game);
  const options = buildGuidedOptions(game);
  console.log(`\nTurn ${game.turn} | phase=${game.phase} | active=${game.activePlayer} | priority=${viewer}`);
  console.log(game.board.spaces.map((space) => `[${space.index}:${space.territoryId ?? space.id}${space.occupant ? ` *${space.occupant}` : ''}]`).join(' -- '));
  const pending = game.pendingMilitaryTimingChoice ?? game.pendingMilitaryChoice;
  if (pending) console.log(`\nPending Military choice: ${pending.kind} (${pending.sourceCardId})`);
  const cardText = options.find((option) => option.cardText)?.cardText;
  if (cardText) console.log(`\n${cardText}`);
  console.log('\nAvailable choices');
  options.forEach((option, index) => console.log(`  ${index + 1}. ${option.label}`));
  if (options.length === 0) console.log('  No guided choices available.');
  return options;
}

let game = createDevGame();
const rl = createInterface({ input, output });
try {
  while (true) {
    const options = print(game);
    const command = (await rl.question('\nChoice number, state, reset, or quit: ')).trim().toLowerCase();
    if (command === 'quit' || command === 'q') break;
    if (command === 'state') { console.dir(game, { depth: 5 }); continue; }
    if (command === 'reset') { game = createDevGame(); continue; }
    const choice = Number(command);
    if (!Number.isInteger(choice) || choice < 1 || choice > options.length) { console.log('Invalid choice.'); continue; }
    try { game = applyGameAction(game, options[choice - 1].action).state; }
    catch (error) { console.error(error instanceof Error ? error.message : String(error)); }
  }
} finally { rl.close(); }
