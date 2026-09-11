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
  V070_ARCANE_KNOWLEDGE_BATTLE_TEXT,
  V070_ARCANE_KNOWLEDGE_ID,
} from './arcane-knowledge-battle';
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';
import { isV070AssetActive } from './asset-face-state';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'arcane-knowledge-battle',
    seed: 'arcane-knowledge-battle-seed',
    players: {
      A: { name: 'Alpha', starterDeckId: 'military-commandant-holdfast' },
      B: { name: 'Bravo', starterDeckId: 'military-commandant-holdfast' },
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
  const instanceId = `arcane-${owner}-${suffix}`;
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

describe('v0.7.0 Arcane Knowledge battle integration', () => {
  test('binds exact released authority and registers the battle surface', () => {
    expect(V070_ARCANE_KNOWLEDGE_BATTLE_TEXT).toBe(
      'Apply the Gambit or Tactic effect of one card in your Graveyard that can apply now.',
    );
    expect(v070CanonicalContent.cardsById.get(V070_ARCANE_KNOWLEDGE_ID)?.effects
      .find(effect => effect.label === 'Gambit/Tactic')?.text)
      .toBe(V070_ARCANE_KNOWLEDGE_BATTLE_TEXT);
    expect(v070BattleEffectHandler(V070_ARCANE_KNOWLEDGE_ID)?.expectedText)
      .toBe(V070_ARCANE_KNOWLEDGE_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS).toContain(V070_ARCANE_KNOWLEDGE_ID);
  });

  test('as a Gambit applies the sole live Graveyard effect without moving its physical source', () => {
    let state = startBattle();
    const arcane = inject(state, 'A', V070_ARCANE_KNOWLEDGE_ID, 'gambit');
    const target = putInGraveyard(state, 'A', 'neutral-new-recruits', 'gambit-target');

    state = setAndRevealGambits(state, arcane);

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.players.A.zones.graveyard).toContain(target);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'arcane_knowledge_battle_effect_applied',
        actor: 'A',
        payload: expect.objectContaining({
          targetInstanceId: target,
          targetEffectLabel: 'Gambit/Tactic',
          copiedChainDepth: 1,
        }),
      }),
    ]));
  });

  test('as a Tactic excludes a Gambit-only trigger whose timing has passed', () => {
    let state = setAndRevealGambits(startBattle());
    const arcane = inject(state, 'A', V070_ARCANE_KNOWLEDGE_ID, 'tactic');
    putInGraveyard(state, 'A', 'neutral-conscription', 'past-gambit-trigger');

    const reserveBefore = [...(state.battleRuntime?.participants.A.reserve ?? [])];
    state = revealTactic(state, arcane);

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(state.events.some(event =>
      event.type === 'arcane_knowledge_battle_no_applicable_effect'
    )).toBe(true);
    expect(state.battleRuntime?.participants.A.reserve)
      .toEqual(expect.arrayContaining(reserveBefore));
  });

  test('preserves exact instance/label choices and rejects a stale Graveyard source', () => {
    let state = startBattle();
    const arcane = inject(state, 'A', V070_ARCANE_KNOWLEDGE_ID, 'choice');
    const first = putInGraveyard(state, 'A', 'neutral-new-recruits', 'choice-one');
    const second = putInGraveyard(state, 'A', 'neutral-rallying-cry', 'choice-two');

    state = setAndRevealGambits(state, arcane);
    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'arcane_knowledge',
        encounteredAt: 'reveal_gambits',
        candidates: expect.arrayContaining([
          { sourceInstanceId: first, effectLabel: 'Gambit/Tactic' },
          { sourceInstanceId: second, effectLabel: 'Gambit/Tactic' },
        ]),
      }),
    );

    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_arcane_knowledge_battle',
      playerId: 'A',
      targetInstanceId: first,
      targetEffectLabel: 'Gambit',
    })).toThrow(/originally eligible/i);

    state.players.A.zones.graveyard = state.players.A.zones.graveyard
      .filter(instanceId => instanceId !== first);
    expect(() => reduceV070BattleAction(state, {
      type: 'resolve_arcane_knowledge_battle',
      playerId: 'A',
      targetInstanceId: first,
      targetEffectLabel: 'Gambit/Tactic',
    })).toThrow(/no longer apply/i);
  });

  test('a copied Sedition effect opens and completes its normal downstream opponent choice', () => {
    let state = startBattle();
    const arcane = inject(state, 'A', V070_ARCANE_KNOWLEDGE_ID, 'sedition-source');
    putInGraveyard(state, 'A', 'neutral-sedition', 'sedition-target');
    const asset = inject(state, 'B', 'neutral-resourcefulness', 'asset');
    state.players.B.zones.assetBank.push(asset);

    state = setAndRevealGambits(state, arcane);
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

  test('Arcane Knowledge copying Witchcraft preserves the parent so Witchcraft repeats at copied layer two', () => {
    let state = startBattle();
    const gambit = inject(state, 'A', 'neutral-new-recruits', 'live-repeat-target');
    state = setAndRevealGambits(state, gambit);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);

    const witchcraft = putInGraveyard(
      state,
      'A',
      'mystics-witchcraft',
      'graveyard-witchcraft',
    );
    const arcane = inject(state, 'A', V070_ARCANE_KNOWLEDGE_ID, 'tactic-copy');
    state = revealTactic(state, arcane);

    expect(pendingV070BattleRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'witchcraft',
        sourceInstanceId: witchcraft,
        parentApplication: expect.objectContaining({ chainDepth: 1 }),
      }),
    );

    state = reduceV070BattleAction(state, {
      type: 'resolve_witchcraft_battle',
      playerId: 'A',
      targetInstanceId: gambit,
    });
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(2);
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'witchcraft_battle_effect_repeated',
        payload: expect.objectContaining({ copiedChainDepth: 2 }),
      }),
    ]));
  });
});
