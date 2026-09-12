import { describe, expect, test } from 'vitest';
import { v070CanonicalContent } from '../content/v070';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  V070_SUPPORTED_REVEAL_EFFECT_IDS,
  v070BattleEffectHandler,
} from './battle-effects';
import {
  V070_HERESY_BATTLE_TEXT,
  V070_HERESY_ID,
} from './heresy-battle';
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';
import { gainV070Conviction, v070Conviction } from './inquisition';
import { isV070AssetActive } from './asset-face-state';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'heresy-battle',
    seed: 'heresy-battle-seed',
    players: {
      A: {
        name: 'Inquisition',
        starterDeckId: 'inquisition-grand-inquisitor-final-judgment',
      },
      B: { name: 'Military', starterDeckId: 'military-commandant-holdfast' },
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
    type: 'roll_first_player', playerId: 'A', value: 6,
  });
  state = reduceV070SetupAction(state, {
    type: 'roll_first_player', playerId: 'B', value: 1,
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

  state = reduceV070TurnAction(state, {
    type: 'resolve_capture', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'draw_turn_card', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'pass_opening', playerId: 'A',
  });
  state = reduceV070TurnAction(state, {
    type: 'choose_movement', playerId: 'A', choice: 'advance',
  });
  return reduceV070BattleAction(state, {
    type: 'proceed_from_onset', playerId: 'A',
  });
}

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `heresy-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function putInGraveyard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = inject(state, owner, cardId, suffix);
  state.players[owner].zones.graveyard.push(instanceId);
  return instanceId;
}

function setAndRevealGambits(
  state: V070GameState,
  aGambit?: string,
  bGambit?: string,
): V070GameState {
  if (aGambit) state.players.A.zones.hand.push(aGambit);
  if (bGambit) state.players.B.zones.hand.push(bGambit);
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'A', cardInstanceId: aGambit,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'B', cardInstanceId: bGambit,
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits', playerId: 'A',
  });
}

function revealTactic(
  state: V070GameState,
  tactic: string,
): V070GameState {
  state.battleRuntime!.participants.A.reserve.push(tactic);
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic', playerId: 'A', cardInstanceId: tactic,
  });
  while ((state.battleRuntime?.participants.A.tacticChoicesMade ?? 0)
    < (state.battleRuntime?.participants.A.tacticLimit ?? 0)) {
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'A',
    });
  }
  while ((state.battleRuntime?.participants.B.tacticChoicesMade ?? 0)
    < (state.battleRuntime?.participants.B.tacticLimit ?? 0)) {
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic', playerId: 'B',
    });
  }
  return reduceV070BattleAction(state, {
    type: 'reveal_tactics', playerId: 'A',
  });
}

describe('v0.7.0 Heresy battle integration', () => {
  test('binds exact released authority and registers the battle surface', () => {
    expect(V070_HERESY_BATTLE_TEXT).toBe(
      "You may spend 4 Conviction to apply the Gambit or Tactic effect of one card in the opponent's Graveyard that can apply now.",
    );
    expect(v070CanonicalContent.cardsById.get(V070_HERESY_ID)?.effects
      .find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_HERESY_BATTLE_TEXT);
    expect(v070BattleEffectHandler(V070_HERESY_ID)?.expectedText)
      .toBe(V070_HERESY_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toContain(V070_HERESY_ID);
  });

  test('offers the optional spend even for one target and decline spends nothing', () => {
    let state = startBattle();
    gainV070Conviction(state, 'A', 4, 'setup');
    const heresy = inject(state, 'A', V070_HERESY_ID, 'decline');
    const target = putInGraveyard(state, 'B', 'neutral-new-recruits', 'decline-target');

    state = setAndRevealGambits(state, heresy);
    expect(pendingV070BattleRevealChoice(state)).toEqual(expect.objectContaining({
      kind: 'heresy',
      owner: 'A',
      candidates: [{ sourceInstanceId: target, effectLabel: 'Gambit/Tactic' }],
    }));
    expect(v070Conviction(state, 'A')).toBe(4);

    state = reduceV070BattleAction(state, {
      type: 'resolve_heresy_battle', playerId: 'A', use: false,
    });
    expect(v070Conviction(state, 'A')).toBe(4);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(0);
    expect(state.players.B.zones.graveyard).toContain(target);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'heresy_battle_declined',
        payload: expect.objectContaining({ convictionSpent: 0 }),
      }),
    ]));
  });

  test('acceptance spends exactly 4, applies the copied effect, and leaves its source in the opponent Graveyard', () => {
    let state = startBattle();
    gainV070Conviction(state, 'A', 4, 'setup');
    const heresy = inject(state, 'A', V070_HERESY_ID, 'accept');
    const target = putInGraveyard(state, 'B', 'neutral-new-recruits', 'accept-target');

    state = setAndRevealGambits(state, heresy);
    state = reduceV070BattleAction(state, {
      type: 'resolve_heresy_battle',
      playerId: 'A',
      use: true,
      targetInstanceId: target,
      targetEffectLabel: 'Gambit/Tactic',
    });

    expect(v070Conviction(state, 'A')).toBe(0);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.players.B.zones.graveyard).toContain(target);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'heresy_battle_effect_applied',
        actor: 'A',
        payload: expect.objectContaining({
          targetInstanceId: target,
          convictionSpent: 4,
          copiedChainDepth: 1,
        }),
      }),
    ]));
  });

  test('an unaffordable Heresy opens no choice and a stale target cannot consume Conviction', () => {
    let state = startBattle();
    const heresy = inject(state, 'A', V070_HERESY_ID, 'unaffordable');
    putInGraveyard(state, 'B', 'neutral-new-recruits', 'unaffordable-target');
    state = setAndRevealGambits(state, heresy);
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(v070Conviction(state, 'A')).toBe(0);

    state = startBattle();
    gainV070Conviction(state, 'A', 4, 'setup');
    const liveHeresy = inject(state, 'A', V070_HERESY_ID, 'stale');
    const stale = putInGraveyard(state, 'B', 'neutral-new-recruits', 'stale-target');
    state = setAndRevealGambits(state, liveHeresy);
    state.players.B.zones.graveyard = state.players.B.zones.graveyard
      .filter(instanceId => instanceId !== stale);

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_heresy_battle',
      playerId: 'A',
      use: true,
      targetInstanceId: stale,
      targetEffectLabel: 'Gambit/Tactic',
    })).toThrow(/no longer apply/i);
    expect(v070Conviction(state, 'A')).toBe(4);
  });

  test('as a Tactic excludes an opponent Graveyard Gambit-only trigger whose timing has passed', () => {
    let state = setAndRevealGambits(startBattle());
    gainV070Conviction(state, 'A', 4, 'setup');
    const heresy = inject(state, 'A', V070_HERESY_ID, 'tactic');
    putInGraveyard(state, 'B', 'neutral-conscription', 'past-gambit-trigger');

    state = revealTactic(state, heresy);
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(v070Conviction(state, 'A')).toBe(4);
    expect(state.events.some(event =>
      event.type === 'heresy_battle_no_applicable_effect'
    )).toBe(true);
  });

  test('copied Sedition remakes its downstream opponent choice under the Heresy controller', () => {
    let state = startBattle();
    gainV070Conviction(state, 'A', 4, 'setup');
    const heresy = inject(state, 'A', V070_HERESY_ID, 'sedition');
    const sedition = putInGraveyard(state, 'B', 'neutral-sedition', 'sedition-target');
    const asset = inject(state, 'B', 'neutral-resourcefulness', 'asset');
    state.players.B.zones.assetBank.push(asset);

    state = setAndRevealGambits(state, heresy);
    state = reduceV070BattleAction(state, {
      type: 'resolve_heresy_battle',
      playerId: 'A',
      use: true,
      targetInstanceId: sedition,
      targetEffectLabel: 'Gambit/Tactic',
    });
    expect(v070Conviction(state, 'A')).toBe(0);
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({ kind: 'sedition', opponent: 'B' }),
    );
    expect(isV070AssetActive(state, asset)).toBe(true);

    state = reduceV070BattleAction(state, {
      type: 'resolve_sedition_battle',
      playerId: 'B',
      targetInstanceId: asset,
    });
    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(isV070AssetActive(state, asset)).toBe(false);
  });

  test('Heresy can control an opponent-owned Arcane Knowledge source and its nested copy is layer two', () => {
    let state = startBattle();
    gainV070Conviction(state, 'A', 4, 'setup');
    const heresy = inject(state, 'A', V070_HERESY_ID, 'arcane-chain');
    const arcane = putInGraveyard(
      state,
      'B',
      'neutral-arcane-knowledge',
      'opponent-arcane',
    );
    const recruits = putInGraveyard(
      state,
      'A',
      'neutral-new-recruits',
      'controller-recruits',
    );

    state = setAndRevealGambits(state, heresy);
    expect(pendingV070BattleRevealChoice(state)).toEqual(expect.objectContaining({
      kind: 'heresy',
      candidates: expect.arrayContaining([
        { sourceInstanceId: arcane, effectLabel: 'Gambit/Tactic' },
      ]),
    }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_heresy_battle',
      playerId: 'A',
      use: true,
      targetInstanceId: arcane,
      targetEffectLabel: 'Gambit/Tactic',
    });

    expect(v070Conviction(state, 'A')).toBe(0);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.players.B.zones.graveyard).toContain(arcane);
    expect(state.players.A.zones.graveyard).toContain(recruits);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'arcane_knowledge_battle_effect_applied',
        actor: 'A',
        payload: expect.objectContaining({
          sourceInstanceId: arcane,
          targetInstanceId: recruits,
          copiedChainDepth: 2,
        }),
      }),
    ]));
  });
});
