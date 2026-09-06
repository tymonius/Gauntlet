import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';

function startBattle(territoryId?: string): V070GameState {
  let state = createV070StarterGame({
    gameId: `dark-omens-${territoryId ?? 'ordinary'}`,
    seed: `dark-omens-seed-${territoryId ?? 'ordinary'}`,
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'military-general-forward-doctrine',
      },
      B: {
        name: 'Bravo',
        starterDeckId: 'military-commandant-holdfast',
      },
    },
  });

  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'choose_opening_discard',
      playerId,
      cardInstanceId: state.players[playerId].openingSelection[0],
    });
  }
  for (const playerId of ['A', 'B'] as const) {
    state = reduceV070SetupAction(state, {
      type: 'arrange_territories',
      playerId,
      territoryIds: state.players[playerId].territoryCandidates,
    });
  }
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'A',
    value: 6,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player',
    playerId: 'B',
    value: 1,
  });

  state.players.A.position = 2;
  state.players.B.position = 3;
  state.board.forEach(space => {
    space.occupant = null;
    space.blank = true;
  });
  state.board[2].occupant = 'A';
  state.board[3].occupant = 'B';
  state.board[3].controller = 'B';
  if (territoryId) {
    state.board[3].territoryId = territoryId;
    state.board[3].blank = false;
  }

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening',
    playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement',
    playerId: 'A',
    choice: 'advance',
  });
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
}

function injectCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `dark-omens-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  return instanceId;
}

function putOnTopOfDrawPile(
  state: V070GameState,
  owner: 'A' | 'B',
  instanceId: string,
): void {
  state.players[owner].zones.drawPile.unshift(instanceId);
}

function setAndRevealGambits(
  state: V070GameState,
  aGambit?: string,
  bGambit?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aGambit,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: bGambit,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

describe('v0.7.0 Dark Omens battle effect', () => {
  test('draws one card and may keep it without gaining Advantage', () => {
    let state = startBattle();
    const darkOmens = injectCard(
      state,
      'A',
      'mystics-dark-omens',
      'keep',
    );
    const drawn = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'drawn-keep',
    );
    state.players.A.zones.hand.push(darkOmens);
    putOnTopOfDrawPile(state, 'A', drawn);

    state = setAndRevealGambits(state, darkOmens);

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.players.A.zones.hand).toContain(drawn);
    expect(state.battleRuntime?.participants.A.advantage).toBe(0);
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'dark_omens',
        owner: 'A',
        sourceInstanceId: darkOmens,
        drawnInstanceId: drawn,
      }),
    );
    expect(() => reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    })).toThrow(/Dark Omens/);

    state = reduceV070BattleAction(state, {
      type: 'resolve_dark_omens_battle',
      playerId: 'A',
      use: false,
    });

    expect(state.players.A.zones.hand).toContain(drawn);
    expect(state.players.A.zones.graveyard).not.toContain(drawn);
    expect(state.battleRuntime?.participants.A.advantage).toBe(0);
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
  });

  test('may put exactly the drawn card in Graveyard to gain Advantage', () => {
    let state = startBattle();
    const darkOmens = injectCard(
      state,
      'A',
      'mystics-dark-omens',
      'graveyard',
    );
    const drawn = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'drawn-graveyard',
    );
    state.players.A.zones.hand.push(darkOmens);
    putOnTopOfDrawPile(state, 'A', drawn);

    state = setAndRevealGambits(state, darkOmens);
    state = reduceV070BattleAction(state, {
      type: 'resolve_dark_omens_battle',
      playerId: 'A',
      use: true,
    });

    expect(state.players.A.zones.hand).not.toContain(drawn);
    expect(state.players.A.zones.graveyard).toContain(drawn);
    expect(state.battleRuntime?.participants.A.advantage).toBe(1);
    expect(state.events.some(event =>
      event.type === 'dark_omens_battle_card_graveyarded'
      && (event.payload as { targetInstanceId?: string }).targetInstanceId === drawn
    )).toBe(true);
  });

  test('works as a Tactic and blocks battle dice until its choice resolves', () => {
    let state = startBattle();
    state = setAndRevealGambits(state);

    const darkOmens = injectCard(
      state,
      'A',
      'mystics-dark-omens',
      'tactic',
    );
    const drawn = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'tactic-draw',
    );
    state.battleRuntime!.participants.A.reserve.push(darkOmens);
    putOnTopOfDrawPile(state, 'A', drawn);

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: darkOmens,
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('outcome');
    expect(pendingV070BattleRevealChoice(state)?.kind).toBe('dark_omens');
    expect(() => reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    })).toThrow(/Dark Omens/);

    state = reduceV070BattleAction(state, {
      type: 'resolve_dark_omens_battle',
      playerId: 'A',
      use: false,
    });
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
  });

  test('resolves as far as able when no card can be drawn', () => {
    let state = startBattle();
    const darkOmens = injectCard(
      state,
      'A',
      'mystics-dark-omens',
      'exhausted',
    );
    state.players.A.zones.hand.push(darkOmens);
    state.players.A.zones.drawPile = [];
    state.players.A.zones.discardPile = [];

    state = setAndRevealGambits(state, darkOmens);

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.participants.A.advantage).toBe(0);
    expect(state.events.some(event =>
      event.type === 'dark_omens_battle_choice_unavailable'
    )).toBe(true);
  });

  test('Monastery suppresses the Arcane effect before it draws a card', () => {
    let state = startBattle('territory-monastery');
    const darkOmens = injectCard(
      state,
      'A',
      'mystics-dark-omens',
      'monastery',
    );
    const drawn = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'monastery-draw',
    );
    state.players.A.zones.hand.push(darkOmens);
    putOnTopOfDrawPile(state, 'A', drawn);

    state = setAndRevealGambits(state, darkOmens);

    expect(state.players.A.zones.drawPile[0]).toBe(drawn);
    expect(state.players.A.zones.hand).not.toContain(drawn);
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.events.some(event =>
      event.type === 'battle_card_effect_suppressed'
      && (event.payload as { cardId?: string }).cardId === 'mystics-dark-omens'
    )).toBe(true);
  });

  test('shared reveal choices keep attacker-first alternation across card families', () => {
    let state = startBattle();
    const darkOmens = injectCard(
      state,
      'A',
      'mystics-dark-omens',
      'ordering-dark',
    );
    const divineMercy = injectCard(
      state,
      'B',
      'inquisition-divine-mercy',
      'ordering-mercy',
    );
    const darkDraw = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'ordering-draw',
    );
    const mercyTarget = injectCard(
      state,
      'A',
      'neutral-rallying-cry',
      'ordering-mercy-target',
    );
    state.players.A.zones.hand.push(darkOmens);
    state.players.B.zones.hand.push(divineMercy);
    state.players.A.zones.graveyard.push(mercyTarget);
    putOnTopOfDrawPile(state, 'A', darkDraw);

    state = setAndRevealGambits(state, darkOmens, divineMercy);

    expect(pendingV070BattleRevealChoice(state)?.kind).toBe('dark_omens');
    state = reduceV070BattleAction(state, {
      type: 'resolve_dark_omens_battle',
      playerId: 'A',
      use: false,
    });
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'divine_mercy',
        owner: 'B',
      }),
    );

    state = reduceV070BattleAction(state, {
      type: 'resolve_divine_mercy_battle',
      playerId: 'B',
      targetInstanceId: mercyTarget,
    });
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.players.A.zones.discardPile).toContain(mercyTarget);
  });
});
