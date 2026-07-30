import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { COUNTERWORKS } from './neutral-counterworks';
import { PATHFINDERS } from './neutral-pathfinders';
import {
  convertCapturedSiegeWeaponryToRuins,
  SIEGE_WEAPONRY,
  siegeWeaponryActionTarget,
} from './neutral-siege-weaponry';
import { territoryPrintedEffectIsActive } from './territory-printed-effects';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-siege-weaponry-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1', name: 'Besieger', factionId: 'intelligence', leaderName: 'Spy',
        deck: [SIEGE_WEAPONRY, SIEGE_WEAPONRY, PATHFINDERS, 'p1-draw'],
        territories: ['territory-field-hospital', 'territory-high-ground', 'territory-watchtower'],
      },
      {
        id: 'player_2', name: 'Defender', factionId: 'intelligence', leaderName: 'Spy',
        deck: [COUNTERWORKS, 'p2-draw'],
        territories: ['territory-supply-depot', 'territory-old-battlefield', 'territory-refuge'],
      },
    ],
  });
  state.phase = 'action_before_movement';
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.players.player_1.actionsRemaining = 1;
  for (const space of state.board.spaces) delete space.occupant;
  const current = state.board.spaces.find((space) => space.id === 'space-3')!;
  current.occupant = 'player_1';
  state.players.player_1.occupiedSpaceId = current.id;
  return state;
}

function played(
  cardId: string,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId,
    owner,
    origin,
    faceDown: false,
    canceled: false,
    fromInitialBattleHand: origin === 'battle_draw',
    ...overrides,
  };
}

function participant(playerId: PlayerID, cards: BattlePlayedCard[]): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    initialBattleHand: cards.filter((card) => card.origin === 'battle_draw').map((card) => card.cardId),
    battleDrawPlayed: cards.filter((card) => card.origin === 'battle_draw'),
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, cards.filter((card) => card.origin === 'battle_draw').length),
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function beginBattle(
  state: GameState,
  attackerCards: BattlePlayedCard[],
  defenderCards: BattlePlayedCard[] = [],
): void {
  for (const space of state.board.spaces) delete space.occupant;
  const origin = state.board.spaces.find((space) => space.id === 'space-3')!;
  const location = state.board.spaces.find((space) => space.id === 'space-4')!;
  origin.occupant = 'player_1';
  location.occupant = 'player_2';
  location.controller = 'player_2';
  location.revealed = true;
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: `siege-battle-${state.log.length + 1}`,
    stage: 'dice',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', attackerCards),
    defender: participant('player_2', defenderCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function reveal(state: GameState): GameState {
  return applyGameAction(state, {
    type: 'resolve_battle_reveal', playerId: 'player_1',
  }).state;
}

function finishBattle(state: GameState, attackerWins: boolean): GameState {
  state.battle!.attacker.diceRoll = attackerWins ? 6 : 1;
  state.battle!.defender.diceRoll = attackerWins ? 1 : 6;
  state.battle!.stage = 'resolution';
  return applyGameAction(state, {
    type: 'resolve_battle', playerId: 'player_1',
  }).state;
}

function playAction(state: GameState): GameState {
  state.players.player_1.zones.hand = [SIEGE_WEAPONRY];
  return applyGameAction(state, {
    type: 'play_action_card', playerId: 'player_1', cardId: SIEGE_WEAPONRY,
  }).state;
}

describe('Neutral Siege Weaponry', () => {
  it('registers both canonical forms and uses a deterministic Action target', () => {
    const state = game();
    for (const space of state.board.spaces.filter((candidate) => candidate.kind === 'territory')) {
      space.revealed = true;
    }
    expect(getCardPlayRule(SIEGE_WEAPONRY)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'removed', battle_draw: 'discard' },
      requiresTarget: false,
    });
    expect(siegeWeaponryActionTarget(state, 'player_1')).toBe('space-4');
  });

  it('places the Action copy on the nearest eligible Territory and suppresses its printed effect', () => {
    let state = game();
    for (const space of state.board.spaces.filter((candidate) => candidate.kind === 'territory')) space.revealed = true;
    state = playAction(state);

    const target = state.board.spaces.find((space) => space.id === 'space-4')!;
    expect(target.overlays).toContainEqual(expect.objectContaining({
      cardId: SIEGE_WEAPONRY,
      owner: 'player_1',
      faceUp: true,
      kind: 'standard',
      siegeWeaponrySource: 'action',
    }));
    expect(territoryPrintedEffectIsActive(state, target, 'player_1')).toBe(false);
    expect(state.players.player_1.zones.removed).not.toContain(SIEGE_WEAPONRY);
  });

  it('pauses for a banked Counterworks response and resumes the original reveal after it passes', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [COUNTERWORKS];
    beginBattle(state, [played(SIEGE_WEAPONRY, 'player_1'), played(PATHFINDERS, 'player_1')]);

    state = reveal(state);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'counterworks_asset', playerId: 'player_2', overlayCardId: SIEGE_WEAPONRY,
    });
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'pass',
    }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.battle?.effectsResolved).toContain('before_battle_resolution');
    expect(state.battle?.attacker.modifiers).toBe(0);
    expect(state.board.spaces.find((space) => space.id === 'space-4')?.overlays).toContainEqual(
      expect.objectContaining({ cardId: SIEGE_WEAPONRY, siegeWeaponrySource: 'battle' }),
    );
  });

  it('removes a Battle-deployed Overlay on a loss and leaves the normal cleanup copy', () => {
    let state = game();
    beginBattle(state, [played(SIEGE_WEAPONRY, 'player_1')]);
    state = finishBattle(reveal(state), false);

    expect(state.board.spaces.find((space) => space.id === 'space-4')?.overlays).toBeUndefined();
    expect(state.players.player_1.zones.discard.filter((cardId) => cardId === SIEGE_WEAPONRY)).toHaveLength(1);
  });

  it('removes the duplicate cleanup copy and leaves face-down Ruins after a Battle win', () => {
    let state = game();
    beginBattle(state, [played(SIEGE_WEAPONRY, 'player_1')]);
    state = finishBattle(reveal(state), true);

    expect(state.players.player_1.zones.discard).not.toContain(SIEGE_WEAPONRY);
    expect(state.board.spaces.find((space) => space.id === 'space-4')?.overlays).toContainEqual(
      expect.objectContaining({ cardId: SIEGE_WEAPONRY, owner: 'player_1', faceUp: false, kind: 'ruins' }),
    );
  });

  it('sends an Action-deployed copy to the Graveyard after its owner loses the next attack there', () => {
    let state = game();
    for (const space of state.board.spaces.filter((candidate) => candidate.kind === 'territory')) space.revealed = true;
    state = playAction(state);
    beginBattle(state, []);
    state = finishBattle(reveal(state), false);

    expect(state.board.spaces.find((space) => space.id === 'space-4')?.overlays).toBeUndefined();
    expect(state.players.player_1.zones.graveyard).toContain(SIEGE_WEAPONRY);
  });

  it('turns an Action-deployed copy into Ruins after its owner wins the next attack there', () => {
    let state = game();
    for (const space of state.board.spaces.filter((candidate) => candidate.kind === 'territory')) space.revealed = true;
    state = playAction(state);
    beginBattle(state, []);
    state = finishBattle(reveal(state), true);

    expect(state.board.spaces.find((space) => space.id === 'space-4')?.overlays).toContainEqual(
      expect.objectContaining({ cardId: SIEGE_WEAPONRY, faceUp: false, kind: 'ruins' }),
    );
  });

  it('turns an Action-deployed copy into Ruins when its owner captures without a battle', () => {
    let state = game();
    for (const space of state.board.spaces.filter((candidate) => candidate.kind === 'territory')) space.revealed = true;
    state = playAction(state);
    const target = state.board.spaces.find((space) => space.id === 'space-4')!;
    const before = Object.fromEntries(
      state.board.spaces.filter((space) => space.kind === 'territory').map((space) => [space.id, space.controller]),
    );
    target.controller = 'player_1';

    expect(convertCapturedSiegeWeaponryToRuins(state, before)).toBe(1);
    expect(target.overlays).toContainEqual(
      expect.objectContaining({ cardId: SIEGE_WEAPONRY, faceUp: false, kind: 'ruins' }),
    );
  });

  it('ignores canceled, negated, virtual, defending, and friendly-Territory Battle copies', () => {
    for (const overrides of [{ canceled: true }, { negated: true }, { virtual: true }]) {
      let state = game();
      beginBattle(state, [played(SIEGE_WEAPONRY, 'player_1', 'battle_draw', overrides)]);
      state = reveal(state);
      expect(state.board.spaces.find((space) => space.id === 'space-4')?.overlays).toBeUndefined();
    }

    let defending = game();
    beginBattle(defending, [], [played(SIEGE_WEAPONRY, 'player_2')]);
    defending = reveal(defending);
    expect(defending.board.spaces.find((space) => space.id === 'space-4')?.overlays).toBeUndefined();

    let friendly = game();
    beginBattle(friendly, [played(SIEGE_WEAPONRY, 'player_1')]);
    friendly.board.spaces.find((space) => space.id === 'space-4')!.controller = 'player_1';
    friendly = reveal(friendly);
    expect(friendly.board.spaces.find((space) => space.id === 'space-4')?.overlays).toBeUndefined();
  });
});
