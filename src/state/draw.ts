import type { CardID, PlayerState } from '../types';

export interface DrawOptions {
  count: number;
  random?: () => number;
  shuffleDiscardIntoDeck?: boolean;
}

export interface DrawResult {
  drawnCards: CardID[];
  reshuffled: boolean;
  exhausted: boolean;
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

export function drawFromDeck(player: PlayerState, options: DrawOptions): DrawResult {
  const count = options.count;
  if (!Number.isInteger(count) || count < 1) {
    throw new Error('Draw count must be a positive integer.');
  }

  const drawnCards: CardID[] = [];
  let reshuffled = false;
  const shouldShuffle = options.shuffleDiscardIntoDeck !== false;
  const shuffle = options.random ? (cards: CardID[]) => fisherYatesShuffle(cards, options.random!) : identityShuffle;

  while (drawnCards.length < count) {
    if (player.zones.deck.length > 0) {
      const nextCard = player.zones.deck.shift();
      if (nextCard) drawnCards.push(nextCard);
      continue;
    }

    if (!shouldShuffle || player.zones.discard.length === 0) break;

    player.zones.deck = shuffle(player.zones.discard);
    player.zones.discard = [];
    reshuffled = true;
  }

  return {
    drawnCards,
    reshuffled,
    exhausted: drawnCards.length < count,
  };
}
