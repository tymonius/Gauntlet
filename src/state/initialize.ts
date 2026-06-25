import type {
  BoardSpaceState,
  BoardState,
  CardID,
  GameEvent,
  GameID,
  GameState,
  PlayerID,
  PlayerState,
  TerritoryID,
} from '../types';

export interface PlayerSetupInput {
  id: PlayerID;
  name: string;
  deck: CardID[];
  territories: TerritoryID[];
}

export interface InitializeGameInput {
  id?: GameID;
  version: string;
  players: [PlayerSetupInput, PlayerSetupInput];
  startingPlayer?: PlayerID;
  openingHandSize?: number;
  shuffleDecks?: boolean;
  random?: () => number;
}

function identityShuffle<T>(items: T[]): T[] {
  return [...items];
}

function fisherYatesShuffle<T>(items: T[], random: () => number): T[] {
  const shuffled = [...items];

  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled;
}

function drawOpeningHand(deck: CardID[], openingHandSize: number) {
  return {
    hand: deck.slice(0, openingHandSize),
    deck: deck.slice(openingHandSize),
  };
}

function createPlayerState(
  input: PlayerSetupInput,
  openingHandSize: number,
  shuffle: (deck: CardID[]) => CardID[],
): PlayerState {
  const shuffledDeck = shuffle(input.deck);
  const { hand, deck } = drawOpeningHand(shuffledDeck, openingHandSize);

  return {
    id: input.id,
    name: input.name,
    zones: {
      deck,
      hand,
      discard: [],
      graveyard: [],
      assetBank: [],
      conditions: [],
      removed: [],
    },
    controlledTerritories: [...input.territories],
    occupiedSpaceId: `${input.id}-heartland`,
    actionsRemaining: 1,
    movementRemaining: 1,
    hasPlayedActionThisTurn: false,
    hasPlayedBattleThisTurn: false,
  };
}

function createStandardBoard(players: [PlayerSetupInput, PlayerSetupInput]): BoardState {
  const [playerOne, playerTwo] = players;
  const spaces: BoardSpaceState[] = [];

  spaces.push({
    id: `${playerOne.id}-heartland`,
    index: spaces.length,
    kind: 'heartland',
    controller: playerOne.id,
    occupant: playerOne.id,
    revealed: true,
  });

  playerOne.territories.forEach((territoryId) => {
    spaces.push({
      id: `space-${spaces.length}`,
      index: spaces.length,
      kind: 'territory',
      territoryId,
      controller: playerOne.id,
      revealed: false,
    });
  });

  [...playerTwo.territories].reverse().forEach((territoryId) => {
    spaces.push({
      id: `space-${spaces.length}`,
      index: spaces.length,
      kind: 'territory',
      territoryId,
      controller: playerTwo.id,
      revealed: false,
    });
  });

  spaces.push({
    id: `${playerTwo.id}-heartland`,
    index: spaces.length,
    kind: 'heartland',
    controller: playerTwo.id,
    occupant: playerTwo.id,
    revealed: true,
  });

  return {
    layout: 'standard_1x6',
    spaces,
  };
}

function createInitialLog(gameId: GameID, players: [PlayerSetupInput, PlayerSetupInput]): GameEvent[] {
  return [
    {
      id: `${gameId}-event-setup`,
      turn: 1,
      type: 'game_initialized',
      message: `${players[0].name} and ${players[1].name} began a Gauntlet game.`,
      visibility: 'public',
    },
  ];
}

export function initializeGame(input: InitializeGameInput): GameState {
  const gameId = input.id ?? `game-${Date.now()}`;
  const openingHandSize = input.openingHandSize ?? 3;
  const random = input.random ?? Math.random;
  const shuffle = input.shuffleDecks === false
    ? identityShuffle<CardID>
    : (deck: CardID[]) => fisherYatesShuffle(deck, random);

  const [playerOne, playerTwo] = input.players;
  const startingPlayer = input.startingPlayer ?? playerOne.id;

  return {
    id: gameId,
    version: input.version,
    phase: 'turn_start',
    turn: 1,
    activePlayer: startingPlayer,
    priorityPlayer: startingPlayer,
    players: {
      [playerOne.id]: createPlayerState(playerOne, openingHandSize, shuffle),
      [playerTwo.id]: createPlayerState(playerTwo, openingHandSize, shuffle),
    },
    board: createStandardBoard(input.players),
    log: createInitialLog(gameId, input.players),
  };
}
