import { describe, expect, it } from 'vitest';
import { V06_RULES_VERSION } from '../content';
import { GameSetupValidationError } from './validation';
import { initializeV06Game, validateV06GameSetup, type V06GameSetupInput } from './v06-setup';

function legalDeck(): string[] {
  return Array.from({ length: 30 }, () => 'neutral-rallying-cry');
}

function validSetup(): V06GameSetupInput {
  return {
    rulesVersion: V06_RULES_VERSION,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Player One',
        factionId: 'military',
        leaderName: 'General',
        deck: legalDeck(),
        territories: ['territory-quicksand', 'territory-garrison', 'territory-high-ground'],
      },
      {
        id: 'player_2',
        name: 'Player Two',
        factionId: 'diplomats',
        leaderName: 'Ambassador',
        deck: legalDeck(),
        territories: ['territory-watchtower', 'territory-supply-depot', 'territory-arena-grand-melee'],
      },
    ],
  };
}

describe('canonical v0.6 game setup', () => {
  it('validates and initializes canonical faction, Leader, Deck, and Territory selections', () => {
    const setup = validSetup();
    expect(validateV06GameSetup(setup)).toEqual({ valid: true, issues: [] });

    const game = initializeV06Game(setup);
    expect(game.version).toBe('v0.6.0');
    expect(game.players.player_1.factionId).toBe('military');
    expect(game.players.player_1.leaderName).toBe('General');
    expect(game.players.player_1.zones.hand).toHaveLength(3);
    expect(game.players.player_1.zones.deck).toHaveLength(27);
  });

  it('rejects a Leader from another faction', () => {
    const setup = validSetup();
    setup.players[0].leaderName = 'Ambassador';

    expect(validateV06GameSetup(setup).issues).toContainEqual(expect.objectContaining({ code: 'leader_faction_mismatch' }));
    expect(() => initializeV06Game(setup)).toThrow(GameSetupValidationError);
  });

  it('rejects undersized, over-value, illegal-allegiance, and invalid Territory packages', () => {
    const setup = validSetup();
    setup.players[0].deck = [
      ...Array.from({ length: 29 }, () => 'neutral-rallying-cry'),
      'diplomats-balanced-concessions',
    ];
    setup.players[0].territories = [
      'territory-arena-grand-melee',
      'territory-arena-no-quarter',
      'territory-quicksand',
    ];

    const codes = validateV06GameSetup(setup).issues.map((issue) => issue.code);
    expect(codes).toContain('illegal_card_allegiance');
    expect(codes).toContain('too_many_arenas');
  });

  it('rejects duplicate Unique cards', () => {
    const setup = validSetup();
    setup.players[0].deck = [
      'neutral-manifest-destiny',
      'neutral-manifest-destiny',
      ...Array.from({ length: 28 }, () => 'neutral-rallying-cry'),
    ];

    expect(validateV06GameSetup(setup).issues).toContainEqual(expect.objectContaining({ code: 'duplicate_unique_card' }));
  });
});
