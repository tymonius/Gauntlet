import { initializeGame } from './initialize';

export const exampleGame = initializeGame({
  id: 'example-game',
  version: '0.5.6',
  shuffleDecks: false,
  players: [
    {
      id: 'player_1',
      name: 'Player One',
      deck: [
        'card-rallying-cry',
        'card-scouting-report',
        'card-new-recruits',
        'card-embargo',
      ],
      territories: ['territory-watchtower', 'territory-command-tent', 'territory-monastery'],
    },
    {
      id: 'player_2',
      name: 'Player Two',
      deck: [
        'card-rallying-cry',
        'card-scouting-report',
        'card-new-recruits',
        'card-fortifications',
      ],
      territories: ['territory-garrison', 'territory-poisonous-gas', 'territory-high-ground'],
    },
  ],
});
