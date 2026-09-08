import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  pendingV070CounterworksPreRevealChoice,
} from './counterworks-battle';
import {
  hasV070BattleCardEffectApplied,
} from './battle-effect-status';
import {
  v070BattleEarlyRevealRecords,
} from './battle-early-reveal';
import {
  pendingV070BattleRevealEffectOrderChoice,
} from './battle-reveal-order';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'counterworks-battle',
    seed: 'counterworks-battle-seed',
    players: {
      A: { name: 'Alpha', starterDeckId: 'military-general-forward-doctrine' },
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

function injectCard(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `counterworks-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function setGambits(
  state: V070GameState,
  a?: string,
  b?: string,
): V070GameState {
  if (a) state.players.A.zones.hand.push(a);
  if (b) state.players.B.zones.hand.push(b);
  state = reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'A', cardInstanceId: a,
  });
  return reduceV070BattleAction(state, {
    type: 'set_gambit', playerId: 'B', cardInstanceId: b,
  });
}

function revealGambits(state: V070GameState): V070GameState {
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits', playerId: 'A',
  });
}

describe('v0.7.0 Counterworks pre-normal reveal', () => {
  test('reveals an opposing Gambit early and lets Deep Cover observe the provenance', () => {
    let state = startBattle();
    const counterworks = injectCard(
      state, 'A', 'neutral-counterworks', 'basic-source',
    );
    const deepCover = injectCard(
      state, 'B', 'intelligence-deep-cover', 'basic-target',
    );
    state = setGambits(state, counterworks, deepCover);
    state.battleRuntime!.participants.A.reserve = [];

    state = revealGambits(state);

    const records = v070BattleEarlyRevealRecords(state);
    expect(records).toEqual(expect.arrayContaining([
      expect.objectContaining({
        instanceId: counterworks,
        sourceController: 'A',
      }),
      expect.objectContaining({
        instanceId: deepCover,
        sourceController: 'A',
        sourceInstanceId: counterworks,
        sourceId: 'neutral-counterworks',
      }),
    ]));
    expect(state.battleRuntime?.participants.B.advantage).toBe(1);
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(hasV070BattleCardEffectApplied(state, counterworks)).toBe(true);
  });

  test('replacement is optional, face up, and its normal reveal effect still applies', () => {
    let state = startBattle();
    const counterworks = injectCard(
      state, 'A', 'neutral-counterworks', 'replacement-source',
    );
    const target = injectCard(
      state, 'B', 'neutral-forced-march', 'replacement-target',
    );
    state = setGambits(state, counterworks, target);
    const replacement = injectCard(
      state, 'A', 'neutral-rallying-cry', 'replacement-card',
    );
    state.battleRuntime!.participants.A.reserve = [replacement];

    state = revealGambits(state);
    expect(pendingV070CounterworksPreRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'counterworks_replacement',
        playerId: 'A',
        sourceInstanceId: counterworks,
        candidateInstanceIds: [replacement],
      }),
    );

    state = reduceV070BattleAction(state, {
      type: 'resolve_counterworks_replacement',
      playerId: 'A',
      replacementInstanceId: replacement,
    });

    expect(state.players.A.zones.graveyard).toContain(counterworks);
    expect(state.battleRuntime?.participants.A.gambit).toEqual(
      expect.objectContaining({
        instanceId: replacement,
        owner: 'A',
        role: 'gambit',
        faceUp: true,
      }),
    );
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
  });

  test('a banked Counterintelligence prevents the entire revealing effect, including replacement', () => {
    let state = startBattle();
    const counterworks = injectCard(
      state, 'A', 'neutral-counterworks', 'asset-block-source',
    );
    const deepCover = injectCard(
      state, 'B', 'intelligence-deep-cover', 'asset-block-target',
    );
    state = setGambits(state, counterworks, deepCover);
    const replacement = injectCard(
      state, 'A', 'neutral-rallying-cry', 'asset-block-replacement',
    );
    state.battleRuntime!.participants.A.reserve = [replacement];
    const asset = injectCard(
      state, 'B', 'neutral-counterintelligence', 'banked-asset',
    );
    state.players.B.zones.assetBank.push(asset);

    state = revealGambits(state);

    expect(pendingV070CounterworksPreRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.participants.A.gambit?.instanceId)
      .toBe(counterworks);
    expect(state.battleRuntime?.participants.A.reserve).toContain(replacement);
    expect(v070BattleEarlyRevealRecords(state).some(record =>
      record.instanceId === deepCover && record.sourceController === 'A'
    )).toBe(false);
    expect(state.battleRuntime?.participants.B.advantage).toBe(0);
    expect(state.events.some(event =>
      event.type === 'counterworks_battle_effect_prevented'
    )).toBe(true);
  });

  test('a face-down Counterintelligence reveals itself, gains +1, and prevents Counterworks', () => {
    let state = startBattle();
    const counterworks = injectCard(
      state, 'A', 'neutral-counterworks', 'battle-block-source',
    );
    const counterintelligence = injectCard(
      state, 'B', 'neutral-counterintelligence', 'battle-block-response',
    );
    state = setGambits(state, counterworks, counterintelligence);
    state.battleRuntime!.participants.A.reserve = [];

    state = revealGambits(state);

    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
    expect(hasV070BattleCardEffectApplied(state, counterintelligence)).toBe(true);
    expect(v070BattleEarlyRevealRecords(state)).toEqual(expect.arrayContaining([
      expect.objectContaining({
        instanceId: counterintelligence,
        sourceController: 'B',
        sourceId: 'neutral-counterintelligence',
      }),
    ]));
    expect(v070BattleEarlyRevealRecords(state).some(record =>
      record.instanceId === counterintelligence && record.sourceController === 'A'
    )).toBe(false);
    expect(state.events.some(event =>
      event.type === 'counterintelligence_battle_effect_prevented'
    )).toBe(true);
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
  });

  test('multiple opposing face-down cards open a private target choice before normal reveal', () => {
    let state = startBattle();
    const counterworks = injectCard(
      state, 'A', 'neutral-counterworks', 'target-choice-source',
    );
    const deepCover = injectCard(
      state, 'B', 'intelligence-deep-cover', 'target-choice-deep-cover',
    );
    state = setGambits(state, counterworks, deepCover);
    const second = injectCard(
      state, 'B', 'neutral-rallying-cry', 'target-choice-second',
    );
    state.battleRuntime!.participants.B.additionalGambits.push({
      instanceId: second,
      owner: 'B',
      role: 'gambit',
      faceUp: false,
    });
    state.battleRuntime!.participants.A.reserve = [];

    state = revealGambits(state);
    expect(state.battleRuntime?.stage).toBe('reveal_gambits');
    expect(pendingV070CounterworksPreRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'counterworks_target',
        playerId: 'A',
        sourceInstanceId: counterworks,
        candidateInstanceIds: expect.arrayContaining([deepCover, second]),
      }),
    );
    expect(state.events.some(event =>
      event.type === 'counterworks_target_options'
      && event.visibility === 'A'
    )).toBe(true);

    state = reduceV070BattleAction(state, {
      type: 'choose_counterworks_target',
      playerId: 'A',
      targetInstanceId: deepCover,
    });

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battleRuntime?.participants.B.advantage).toBe(0);
    expect(pendingV070BattleRevealEffectOrderChoice(state)).toEqual(
      expect.objectContaining({
        playerId: 'B',
        candidateInstanceIds: expect.arrayContaining([deepCover, second]),
      }),
    );

    state = reduceV070BattleAction(state, {
      type: 'resolve_battle_reveal_effect_order',
      playerId: 'B',
      sourceInstanceId: deepCover,
    });

    expect(state.battleRuntime?.participants.B.advantage).toBe(1);
  });

  test('multiple Counterintelligence responses let the protected player choose which copy reacts', () => {
    let state = startBattle();
    const counterworks = injectCard(
      state, 'A', 'neutral-counterworks', 'multi-ci-source',
    );
    const target = injectCard(
      state, 'B', 'intelligence-deep-cover', 'multi-ci-target',
    );
    state = setGambits(state, counterworks, target);
    const ciOne = injectCard(
      state, 'B', 'neutral-counterintelligence', 'multi-ci-one',
    );
    const ciTwo = injectCard(
      state, 'B', 'neutral-counterintelligence', 'multi-ci-two',
    );
    state.battleRuntime!.participants.B.additionalGambits.push(
      { instanceId: ciOne, owner: 'B', role: 'gambit', faceUp: false },
      { instanceId: ciTwo, owner: 'B', role: 'gambit', faceUp: false },
    );
    state.battleRuntime!.participants.A.reserve = [];

    state = revealGambits(state);
    expect(pendingV070CounterworksPreRevealChoice(state)?.kind)
      .toBe('counterworks_target');
    state = reduceV070BattleAction(state, {
      type: 'choose_counterworks_target',
      playerId: 'A',
      targetInstanceId: target,
    });

    expect(pendingV070CounterworksPreRevealChoice(state)).toEqual(
      expect.objectContaining({
        kind: 'counterintelligence_pre_reveal',
        playerId: 'B',
        candidateInstanceIds: expect.arrayContaining([ciOne, ciTwo]),
      }),
    );

    state = reduceV070BattleAction(state, {
      type: 'choose_counterintelligence_pre_reveal',
      playerId: 'B',
      counterintelligenceInstanceId: ciTwo,
    });

    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
    expect(hasV070BattleCardEffectApplied(state, ciTwo)).toBe(true);
    expect(hasV070BattleCardEffectApplied(state, ciOne)).toBe(true);
    expect(state.battleRuntime?.participants.B.advantage).toBe(0);
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
  });

  test('a Counterworks replacement can itself be Counterworks and resolves before normal reveal', () => {
    let state = startBattle();
    const first = injectCard(
      state, 'A', 'neutral-counterworks', 'chain-first',
    );
    const target = injectCard(
      state, 'B', 'neutral-rallying-cry', 'chain-target',
    );
    state = setGambits(state, first, target);
    const second = injectCard(
      state, 'A', 'neutral-counterworks', 'chain-second',
    );
    state.battleRuntime!.participants.A.reserve = [second];

    state = revealGambits(state);
    state = reduceV070BattleAction(state, {
      type: 'resolve_counterworks_replacement',
      playerId: 'A',
      replacementInstanceId: second,
    });

    expect(state.players.A.zones.graveyard).toContain(first);
    expect(state.battleRuntime?.participants.A.gambit?.instanceId).toBe(second);
    expect(hasV070BattleCardEffectApplied(state, first)).toBe(true);
    expect(hasV070BattleCardEffectApplied(state, second)).toBe(true);
    expect(pendingV070CounterworksPreRevealChoice(state)).toBeNull();
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
  });
});
