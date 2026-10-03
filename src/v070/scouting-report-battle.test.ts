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
  v070BattleRevealEffectClass,
} from './battle-effects';
import {
  V070_SCOUTING_REPORT_BATTLE_TEXT,
  V070_SCOUTING_REPORT_ID,
  pendingV070ScoutingReportBattleChoice,
} from './scouting-report-battle';
import {
  V070_CONFESSION_ID,
} from './confession-battle';
import {
  pendingV070PreNormalRevealEffectOrderChoice,
} from './battle-pre-normal-reveal';
import { hasV070BattleCardEffectApplied } from './battle-effect-status';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'scouting-report-battle',
    seed: 'scouting-report-battle-seed',
    players: {
      A: {
        name: 'Alpha',
        starterDeckId: 'mystics-spirit-walker-old-ways',
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
  const instanceId = `scouting-report-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
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
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: a,
  });
  return reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: b,
  });
}

function reachTactics(state: V070GameState): V070GameState {
  state = setGambits(state);
  return reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });
}

describe('Scouting Report battle effect', () => {
  test('binds exact unchanged frozen/current authority and is reveal-stage interference', () => {
    for (const content of [
      v070CanonicalContent,
      currentCanonicalContent,
    ]) {
      expect(content.cardsById.get(V070_SCOUTING_REPORT_ID)?.effects
        .find(effect => effect.label === 'Gambit/Tactic')?.text)
        .toBe(V070_SCOUTING_REPORT_BATTLE_TEXT);
    }
    expect(v070BattleEffectHandler(V070_SCOUTING_REPORT_ID)?.expectedText)
      .toBe(V070_SCOUTING_REPORT_BATTLE_TEXT);
    expect(V070_SUPPORTED_REVEAL_EFFECT_IDS)
      .toContain(V070_SCOUTING_REPORT_ID);
    expect(v070BattleRevealEffectClass(V070_SCOUTING_REPORT_ID))
      .toBe('interference');
  });

  test('as a Gambit, reveals an opposing face-down Gambit before normal reveal and may replace itself from Reserve face up', () => {
    let state = startBattle();
    const source = injectCard(
      state,
      'A',
      V070_SCOUTING_REPORT_ID,
      'gambit-source',
    );
    const target = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'gambit-target',
    );
    state = setGambits(state, source, target);

    const replacement =
      state.battleRuntime!.participants.A.reserve[0];
    state.cardInstances[replacement].cardId =
      'neutral-rallying-cry';

    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('reveal_gambits');
    expect(state.battleRuntime?.participants.A.gambit)
      .toEqual(expect.objectContaining({
        instanceId: source,
        faceUp: true,
      }));
    expect(state.battleRuntime?.participants.B.gambit)
      .toEqual(expect.objectContaining({
        instanceId: target,
        faceUp: true,
      }));
    expect(pendingV070ScoutingReportBattleChoice(state))
      .toEqual(expect.objectContaining({
        kind: 'replacement',
        playerId: 'A',
        owner: 'A',
        sourceInstanceId: source,
        role: 'gambit',
        candidateInstanceIds: expect.arrayContaining([replacement]),
      }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_scouting_report_battle',
      playerId: 'A',
      cardInstanceId: replacement,
    });

    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battleRuntime?.participants.A.gambit)
      .toEqual(expect.objectContaining({
        instanceId: replacement,
        owner: 'A',
        role: 'gambit',
        faceUp: true,
      }));
    expect(state.battleRuntime?.participants.A.reserve)
      .not.toContain(replacement);
    expect(state.players.A.zones.graveyard).toContain(source);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
    expect(hasV070BattleCardEffectApplied(state, source)).toBe(true);
    expect(state.events.some(event =>
      event.type === 'scouting_report_battle_replaced'
      && (event.payload as { replacementInstanceId?: string })
        .replacementInstanceId === replacement
    )).toBe(true);
  });

  test('as a Tactic, replacement enters face up and its still-available effect applies at the normal Tactic reveal', () => {
    let state = reachTactics(startBattle());
    const a = state.battleRuntime!.participants.A;
    const b = state.battleRuntime!.participants.B;
    const source = a.reserve[0];
    const replacement = a.reserve[1];
    const target = b.reserve[0];

    state.cardInstances[source].cardId = V070_SCOUTING_REPORT_ID;
    state.cardInstances[replacement].cardId = 'neutral-rallying-cry';
    state.cardInstances[target].cardId = 'neutral-rallying-cry';

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
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });

    expect(state.battleRuntime?.stage).toBe('reveal_tactics');
    expect(pendingV070ScoutingReportBattleChoice(state)?.kind)
      .toBe('replacement');

    state = reduceV070BattleAction(state, {
      type: 'resolve_scouting_report_battle',
      playerId: 'A',
      cardInstanceId: replacement,
    });

    expect(state.battleRuntime?.stage).toBe('outcome');
    expect(state.battleRuntime?.participants.A.tactic)
      .toEqual(expect.objectContaining({
        instanceId: replacement,
        faceUp: true,
      }));
    expect(state.players.A.zones.graveyard).toContain(source);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
  });

  test('a banked Counterintelligence prevents the opposing reveal but Scouting Report may still replace itself', () => {
    let state = startBattle();
    const source = injectCard(
      state,
      'A',
      V070_SCOUTING_REPORT_ID,
      'asset-block-source',
    );
    const target = injectCard(
      state,
      'B',
      'neutral-rallying-cry',
      'asset-block-target',
    );
    const asset = injectCard(
      state,
      'B',
      'neutral-counterintelligence',
      'asset-block-counterintelligence',
    );
    state.players.B.zones.assetBank.push(asset);
    state = setGambits(state, source, target);

    const replacement =
      state.battleRuntime!.participants.A.reserve[0];
    state.cardInstances[replacement].cardId =
      'neutral-rallying-cry';

    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(state.battleRuntime?.participants.B.gambit)
      .toEqual(expect.objectContaining({
        instanceId: target,
        faceUp: false,
      }));
    expect(pendingV070ScoutingReportBattleChoice(state))
      .toEqual(expect.objectContaining({
        kind: 'replacement',
        sourceInstanceId: source,
      }));

    state = reduceV070BattleAction(state, {
      type: 'resolve_scouting_report_battle',
      playerId: 'A',
      cardInstanceId: replacement,
    });

    expect(state.players.A.zones.graveyard).toContain(source);
    expect(state.events.some(event =>
      event.type === 'counterintelligence_prevented_reveal'
      && (event.payload as { sourceInstanceId?: string }).sourceInstanceId
        === source
    )).toBe(true);
  });

  test('a face-down Counterintelligence at the same stage prevents the entire effect and gains +1 Battle Total', () => {
    let state = startBattle();
    const source = injectCard(
      state,
      'A',
      V070_SCOUTING_REPORT_ID,
      'reaction-source',
    );
    const target = injectCard(
      state,
      'B',
      'neutral-counterintelligence',
      'reaction-target',
    );
    state = setGambits(state, source, target);

    const replacement =
      state.battleRuntime!.participants.A.reserve[0];
    state.cardInstances[replacement].cardId =
      'neutral-rallying-cry';

    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    expect(pendingV070ScoutingReportBattleChoice(state)).toBeNull();
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
    expect(state.battleRuntime?.participants.A.gambit?.instanceId)
      .toBe(source);
    expect(state.players.A.zones.graveyard).not.toContain(source);
    expect(state.battleRuntime?.participants.A.reserve)
      .toContain(replacement);
    expect(state.battleRuntime?.participants.B.battleModifier).toBe(1);
    expect(state.events.some(event =>
      event.type === 'scouting_report_battle_effect_prevented'
      && (event.payload as { sourceInstanceId?: string }).sourceInstanceId
        === source
    )).toBe(true);
  });

  test('Scouting Report and Confession controlled by the same player open a controller-order choice before normal Tactic reveal', () => {
    let state = reachTactics(startBattle());
    const a = state.battleRuntime!.participants.A;
    const b = state.battleRuntime!.participants.B;
    const scouting = a.reserve[0];
    const confession = a.reserve[1];
    const target = b.reserve[0];

    state.cardInstances[scouting].cardId = V070_SCOUTING_REPORT_ID;
    state.cardInstances[confession].cardId = V070_CONFESSION_ID;
    state.cardInstances[target].cardId = 'neutral-rallying-cry';

    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
      cardInstanceId: scouting,
    });
    state.battleRuntime!.participants.A.additionalTactics.push({
      instanceId: confession,
      owner: 'A',
      role: 'tactic',
      faceUp: false,
    });
    state.battleRuntime!.participants.A.reserve =
      state.battleRuntime!.participants.A.reserve.filter(
        instanceId => instanceId !== confession,
      );
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
      cardInstanceId: target,
    });

    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });

    expect(pendingV070PreNormalRevealEffectOrderChoice(state))
      .toEqual({
        playerId: 'A',
        role: 'tactic',
        candidateSourceInstanceIds: [scouting, confession],
      });
    expect(state.battleRuntime?.participants.A.tactic?.faceUp)
      .toBe(false);
    expect(state.battleRuntime?.participants.A.additionalTactics[0]?.faceUp)
      .toBe(false);
    expect(state.battleRuntime?.participants.B.tactic?.faceUp)
      .toBe(false);
  });
});
