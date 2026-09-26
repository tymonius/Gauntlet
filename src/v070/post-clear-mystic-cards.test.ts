import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import {
  cardEligibleForV070BattleRole,
  reduceV070BattleAction,
} from './battle-engine';
import {
  V070_GRAVE_WARD_BATTLE_TEXT,
  V070_GRAVE_WARD_ID,
  V070_NECROMANCY_BATTLE_TEXT,
  V070_NECROMANCY_ID,
  V070_SOUL_FOR_SOUL_BATTLE_TEXT,
  V070_SOUL_FOR_SOUL_ID,
} from './post-clear-mystic-cards';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from './battle-effects';
import { currentCanonicalContent } from '../content/current-game';
import { v070CanonicalContent } from '../content/v070';

function startBattle(options: {
  contestedTerritoryId?: string;
} = {}): V070GameState {
  let state = createV070StarterGame({
    gameId: 'post-clear-mystics-test',
    seed: 'post-clear-mystics-seed',
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
  if (options.contestedTerritoryId) {
    state.board[3].territoryId = options.contestedTerritoryId;
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

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
  zone: 'hand' | 'graveyard' = 'hand',
): string {
  const instanceId = `post-clear-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  state.players[owner].zones[zone].push(instanceId);
  return instanceId;
}

function setAReserveCardId(
  state: V070GameState,
  cardId: string,
  index = 0,
): string {
  const instanceId = state.battleRuntime!.participants.A.reserve[index];
  expect(instanceId).toBeDefined();
  state.cardInstances[instanceId].cardId = cardId;
  expect(cardEligibleForV070BattleRole(cardId, 'tactic')).toBe(true);
  return instanceId;
}

function revealGambits(
  state: V070GameState,
  aCard?: string,
  bCard?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: aCard,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: bCard,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

function revealTactics(
  state: V070GameState,
  aCard?: string,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
    cardInstanceId: aCard,
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });
}

function resolveOutcome(
  state: V070GameState,
  aDie = 6,
  bDie = 1,
): V070GameState {
  state = reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'A',
    values: [aDie],
  });
  return reduceV070BattleAction(state, {
    type: 'submit_battle_dice',
    playerId: 'B',
    values: [bDie],
  });
}

describe('current v0.7.2 post-clear Mystics battle effects', () => {
  test('binds all three unchanged battle surfaces to frozen and current authority', () => {
    expect(V070_GRAVE_WARD_ID).toBe('mystics-grave-ward');
    expect(V070_GRAVE_WARD_BATTLE_TEXT).toBe(
      'In the Aftermath, after Gambits enter your Graveyard, choose one other Gambit you set during this battle. Move it from your Graveyard to your Discard Pile.',
    );
    expect(V070_SOUL_FOR_SOUL_ID).toBe('mystics-soul-for-soul');
    expect(V070_SOUL_FOR_SOUL_BATTLE_TEXT).toBe(
      'In the Aftermath, after Gambits enter your Graveyard, you may exchange one card in your Hand with one other Gambit you set during this battle that is in your Graveyard.',
    );
    expect(V070_NECROMANCY_ID).toBe('mystics-necromancy');
    expect(V070_NECROMANCY_BATTLE_TEXT).toBe(
      'In the Aftermath, after Gambits enter your Graveyard, apply the effect below.\n\nChoose up to three non-Necromancy cards in your Graveyard. Put all cards in your Hand in your Graveyard, then return the chosen cards to your Hand.',
    );

    for (const [cardId, text] of [
      [V070_GRAVE_WARD_ID, V070_GRAVE_WARD_BATTLE_TEXT],
      [V070_SOUL_FOR_SOUL_ID, V070_SOUL_FOR_SOUL_BATTLE_TEXT],
      [V070_NECROMANCY_ID, V070_NECROMANCY_BATTLE_TEXT],
    ] as const) {
      expect(v070CanonicalContent.cardsById.get(cardId)?.effects
        .find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(text);
      expect(currentCanonicalContent.cardsById.get(cardId)?.effects
        .find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(text);
      expect(v070BattleEffectHandler(cardId)?.expectedText).toBe(text);
      expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toContain(cardId);
    }
  });

  test('Grave Ward moves the sole other Gambit from Graveyard to Discard after cards clear', () => {
    let state = startBattle();
    const gambit = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'grave-ward-gambit',
    );
    state = revealGambits(state, gambit);
    const graveWard = setAReserveCardId(state, V070_GRAVE_WARD_ID);
    state = revealTactics(state, graveWard);
    state = resolveOutcome(state);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.battleRuntime).toBeNull();
    expect(state.players.A.zones.graveyard).not.toContain(gambit);
    expect(state.players.A.zones.discardPile).toContain(gambit);
    expect(state.players.A.zones.discardPile).toContain(graveWard);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'grave_ward_gambit_recovered',
      actor: 'A',
      payload: expect.objectContaining({
        sourceInstanceId: graveWard,
        targetInstanceId: gambit,
      }),
    }));
  });

  test('Grave Ward cannot target itself when it was the only Gambit', () => {
    let state = startBattle();
    const graveWard = inject(
      state,
      'A',
      V070_GRAVE_WARD_ID,
      'grave-ward-self',
    );
    state = revealGambits(state, graveWard);
    state = revealTactics(state);
    state = resolveOutcome(state);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(state.battleRuntime).toBeNull();
    expect(state.players.A.zones.graveyard).toContain(graveWard);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_post_clear_aftermath_effect_unavailable',
      actor: 'A',
      payload: expect.objectContaining({
        sourceInstanceId: graveWard,
        sourceCardId: V070_GRAVE_WARD_ID,
        reason: 'no_valid_option',
      }),
    }));
  });

  test('Soul for Soul exchanges a Hand card with another Gambit after cards clear', () => {
    let state = startBattle();
    const gambit = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'soul-gambit',
    );
    const handCard = inject(
      state,
      'A',
      'neutral-advance-guard',
      'soul-hand',
    );
    state = revealGambits(state, gambit);
    const soulForSoul = setAReserveCardId(state, V070_SOUL_FOR_SOUL_ID);
    state = revealTactics(state, soulForSoul);
    state = resolveOutcome(state);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(
      state.battleRuntime?.pendingBattlePostClearAftermathChoice,
    ).toEqual({
      playerId: 'A',
      candidateSourceInstanceIds: [soulForSoul],
    });

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_post_clear_aftermath_effect',
      playerId: 'A',
      sourceInstanceId: soulForSoul,
      handInstanceId: handCard,
      graveyardInstanceId: gambit,
    });

    expect(state.battleRuntime).toBeNull();
    expect(state.players.A.zones.hand).toContain(gambit);
    expect(state.players.A.zones.hand).not.toContain(handCard);
    expect(state.players.A.zones.graveyard).toContain(handCard);
    expect(state.players.A.zones.graveyard).not.toContain(gambit);
    expect(state.players.A.zones.discardPile).toContain(soulForSoul);
  });

  test('Soul for Soul may be declined', () => {
    let state = startBattle();
    const gambit = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'soul-decline-gambit',
    );
    inject(
      state,
      'A',
      'neutral-advance-guard',
      'soul-decline-hand',
    );
    state = revealGambits(state, gambit);
    const soulForSoul = setAReserveCardId(state, V070_SOUL_FOR_SOUL_ID);
    state = revealTactics(state, soulForSoul);
    state = resolveOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    state = reduceV070BattleAction(state, {
      type: 'pass_battle_post_clear_aftermath_effect',
      playerId: 'A',
      sourceInstanceId: soulForSoul,
    });

    expect(state.battleRuntime).toBeNull();
    expect(state.players.A.zones.graveyard).toContain(gambit);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_post_clear_aftermath_effect_declined',
      actor: 'A',
      payload: expect.objectContaining({
        sourceInstanceId: soulForSoul,
        sourceCardId: V070_SOUL_FOR_SOUL_ID,
      }),
    }));
  });

  test('Necromancy chooses Graveyard cards before dumping the entire Hand, then returns the chosen cards', () => {
    let state = startBattle();
    const gambit = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'necromancy-gambit',
    );
    const preexisting = inject(
      state,
      'A',
      'neutral-advance-guard',
      'necromancy-graveyard',
      'graveyard',
    );
    const handCard = inject(
      state,
      'A',
      'neutral-entrenchment',
      'necromancy-hand',
    );

    state = revealGambits(state, gambit);
    const necromancy = setAReserveCardId(state, V070_NECROMANCY_ID);
    state = revealTactics(state, necromancy);
    state = resolveOutcome(state);

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    expect(
      state.battleRuntime?.pendingBattlePostClearAftermathChoice,
    ).toEqual({
      playerId: 'A',
      candidateSourceInstanceIds: [necromancy],
    });

    const handBefore = [...state.players.A.zones.hand];
    expect(handBefore).toContain(handCard);

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_post_clear_aftermath_effect',
      playerId: 'A',
      sourceInstanceId: necromancy,
      targetInstanceIds: [gambit, preexisting],
    });

    expect(state.battleRuntime).toBeNull();
    expect(state.players.A.zones.hand).toContain(gambit);
    expect(state.players.A.zones.hand).toContain(preexisting);
    for (const instanceId of handBefore) {
      expect(state.players.A.zones.graveyard).toContain(instanceId);
    }
    expect(state.players.A.zones.graveyard).not.toContain(gambit);
    expect(state.players.A.zones.graveyard).not.toContain(preexisting);
    expect(state.players.A.zones.discardPile).toContain(necromancy);
  });

  test('Monastery suppresses a deferred Arcane battle effect instead of registering it', () => {
    let state = startBattle({
      contestedTerritoryId: 'territory-monastery',
    });
    const gambit = inject(
      state,
      'A',
      'neutral-rallying-cry',
      'monastery-gambit',
    );
    state = revealGambits(state, gambit);
    const graveWard = setAReserveCardId(state, V070_GRAVE_WARD_ID);
    state = revealTactics(state, graveWard);

    expect(state.battleRuntime?.battleCardPostClearAftermathEffects).toEqual([]);
    expect(state.events).toContainEqual(expect.objectContaining({
      type: 'battle_card_effect_suppressed',
      actor: 'A',
      payload: expect.objectContaining({
        instanceId: graveWard,
        cardId: V070_GRAVE_WARD_ID,
        reason: 'Monastery',
      }),
    }));

    state = resolveOutcome(state);
    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });
    expect(state.players.A.zones.graveyard).toContain(gambit);
  });
});
