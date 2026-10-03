import { describe, expect, test } from 'vitest';
import { currentCanonicalContent } from '../content/current-game';
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
  V070_CONFESSION_BATTLE_TEXT,
  V070_CONFESSION_ID,
  pendingV070ConfessionBattleChoice,
} from './confession-battle';
import { hasV070BattleCardEffectApplied } from './battle-effect-status';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'confession-battle',
    seed: 'confession-battle-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'inquisition-grand-inquisitor-final-judgment',
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
  state = reduceV070BattleAction(state, {
    type: 'proceed_from_onset',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
  });
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

function prepareTactics(
  state: V070GameState,
  opponentCardId = 'neutral-stand-ground',
): {
  state: V070GameState;
  source: string;
  replacement: string;
  target: string;
} {
  const a = state.battleRuntime!.participants.A;
  const b = state.battleRuntime!.participants.B;
  const source = a.reserve[0];
  const replacement = a.reserve[1];
  const target = b.reserve[0];

  state.cardInstances[source].cardId = V070_CONFESSION_ID;
  state.cardInstances[replacement].cardId = 'neutral-rallying-cry';
  state.cardInstances[target].cardId = opponentCardId;

  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
    cardInstanceId: source,
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
    cardInstanceId: target,
  });

  return { state, source, replacement, target };
}

describe('Confession battle effect', () => {
  test('binds exact unchanged frozen/current authority', () => {
    for (const content of [
      v070CanonicalContent,
      currentCanonicalContent,
    ]) {
      expect(content.cardsById.get(V070_CONFESSION_ID)?.effects
        .find(effect => effect.label === 'Tactic')?.text)
        .toBe(V070_CONFESSION_BATTLE_TEXT);
    }
    expect(v070BattleEffectHandler(V070_CONFESSION_ID)?.expectedText)
      .toBe(V070_CONFESSION_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_CONFESSION_ID);
  });

  test('reveals before normal Tactics, then may return itself and choose a face-down replacement from Reserve', () => {
    let { state, source, replacement, target } =
      prepareTactics(startBattle());

    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('reveal_tactics');
    expect(state.battleRuntime?.participants.A.tactic?.faceUp).toBe(true);
    expect(state.battleRuntime?.participants.B.tactic?.faceUp).toBe(true);
    expect(pendingV070ConfessionBattleChoice(state))
      .toEqual(expect.objectContaining({
        kind: 'replacement',
        playerId: 'A',
        owner: 'A',
        sourceInstanceId: source,
        candidateInstanceIds: expect.arrayContaining([replacement]),
      }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_confession_battle',
      playerId: 'A',
      cardInstanceId: replacement,
    });

    expect(state.battleRuntime?.stage).toBe('outcome');
    expect(state.battleRuntime?.participants.A.tactic)
      .toEqual(expect.objectContaining({
        instanceId: replacement,
        owner: 'A',
        role: 'tactic',
        faceUp: true,
      }));
    expect(state.battleRuntime?.participants.A.reserve).toContain(source);
    expect(state.battleRuntime?.participants.A.reserve)
      .not.toContain(replacement);
    expect(state.battleRuntime?.participants.B.tactic)
      .toEqual(expect.objectContaining({
        instanceId: target,
        faceUp: true,
      }));
    expect(hasV070BattleCardEffectApplied(state, source)).toBe(true);
    expect(state.events.some(event =>
      event.type === 'confession_battle_target_revealed'
      && (event.payload as { targetInstanceId?: string }).targetInstanceId
        === target
    )).toBe(true);
    expect(state.events.some(event =>
      event.type === 'confession_battle_replaced'
      && (event.payload as { sourceInstanceId?: string }).sourceInstanceId
        === source
    )).toBe(true);
  });

  test('declining replacement keeps the revealed Confession as the Tactic', () => {
    let { state, source, target } = prepareTactics(startBattle());

    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });
    expect(pendingV070ConfessionBattleChoice(state)?.kind)
      .toBe('replacement');

    state = reduceV070BattleAction(state, {
      type: 'resolve_confession_battle',
      playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('outcome');
    expect(state.battleRuntime?.participants.A.tactic)
      .toEqual(expect.objectContaining({
        instanceId: source,
        faceUp: true,
      }));
    expect(state.battleRuntime?.participants.B.tactic)
      .toEqual(expect.objectContaining({
        instanceId: target,
        faceUp: true,
      }));
    expect(state.battleRuntime?.participants.A.reserve)
      .not.toContain(source);
    expect(hasV070BattleCardEffectApplied(state, source)).toBe(true);
  });

  test('a banked Counterintelligence prevents the opposing reveal clause but does not prevent the optional replacement clause', () => {
    let { state, source, target } = prepareTactics(startBattle());
    const asset = 'confession-counterintelligence-asset';
    state.cardInstances[asset] = {
      instanceId: asset,
      cardId: 'neutral-counterintelligence',
      owner: 'B',
    };
    state.players.B.zones.assetBank.push(asset);

    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('reveal_tactics');
    expect(state.battleRuntime?.participants.B.tactic)
      .toEqual(expect.objectContaining({
        instanceId: target,
        faceUp: false,
      }));
    expect(pendingV070ConfessionBattleChoice(state))
      .toEqual(expect.objectContaining({
        kind: 'replacement',
        sourceInstanceId: source,
      }));
    expect(state.events.some(event =>
      event.type === 'counterintelligence_prevented_reveal'
      && (event.payload as { sourceInstanceId?: string }).sourceInstanceId
        === source
    )).toBe(true);
  });

  test('a face-down Counterintelligence Tactic prevents the entire Confession effect and gains +1 Battle Total', () => {
    let { state, source, replacement } = prepareTactics(
      startBattle(),
      'neutral-counterintelligence',
    );

    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('outcome');
    expect(pendingV070ConfessionBattleChoice(state)).toBeNull();
    expect(state.battleRuntime?.participants.A.tactic?.instanceId)
      .toBe(source);
    expect(state.battleRuntime?.participants.A.reserve)
      .toContain(replacement);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
    expect(state.events.some(event =>
      event.type === 'confession_battle_effect_prevented'
      && (event.payload as { sourceInstanceId?: string }).sourceInstanceId
        === source
    )).toBe(true);
    expect(state.events.some(event =>
      event.type === 'confession_battle_replaced'
    )).toBe(false);
  });
});
