import { describe, expect, test } from 'vitest';
import {
  createV070StarterGame,
  reduceV070SetupAction,
  type V070GameState,
} from './engine';
import { reduceV070TurnAction } from './turn-engine';
import { reduceV070BattleAction } from './battle-engine';
import {
  activeV070DecoysBattleInstanceIds,
  registerV070DecoysBattleEffect,
} from './decoys-battle';
import { eligibleV070PalisadeWallGambits } from './palisade-wall-battle';
import { eligibleV070AssassinsGambits } from './assassins-battle';
import { eligibleV070CapitalPunishmentTargets } from './capital-punishment-battle';
import { eligibleV070DisruptionTargets } from './disruption-battle';
import {
  isV070BattleCardEffectNegated,
  negateV070BattleCardEffect,
} from './battle-effect-status';
import { pendingV070BattleRevealChoice } from './battle-reveal-choices';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'decoys-battle',
    seed: 'decoys-battle-seed',
    players: {
      A: { name: 'Alpha', starterDeckId: 'financiers-banker-sound-investment' },
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

  state = reduceV070TurnAction(state, { type: 'resolve_capture', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'draw_turn_card', playerId: 'A' });
  state = reduceV070TurnAction(state, { type: 'pass_opening', playerId: 'A' });
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
  const instanceId = `decoys-${owner}-${suffix}`;
  state.cardInstances[instanceId] = { instanceId, cardId, owner };
  return instanceId;
}

function commitGambit(
  state: V070GameState,
  owner: 'A' | 'B',
  instanceId: string,
  additional = false,
): void {
  const commitment = {
    instanceId,
    owner,
    role: 'gambit' as const,
    faceUp: true,
  };
  if (additional) {
    state.battleRuntime!.participants[owner].additionalGambits.push(commitment);
  } else {
    state.battleRuntime!.participants[owner].gambit = commitment;
  }
}

function commitTactic(
  state: V070GameState,
  owner: 'A' | 'B',
  instanceId: string,
): void {
  state.battleRuntime!.participants[owner].tactic = {
    instanceId,
    owner,
    role: 'tactic',
    faceUp: true,
  };
}

describe('v0.7.0 Decoys battle protection', () => {
  test('an active eligible Decoys is the only target exposed to supported opposing negate/remove effects', () => {
    const state = startBattle();
    const decoys = injectCard(state, 'B', 'neutral-decoys', 'protected');
    const other = injectCard(state, 'B', 'neutral-rallying-cry', 'other');
    commitGambit(state, 'B', decoys);
    commitGambit(state, 'B', other, true);
    registerV070DecoysBattleEffect(state, 'B', decoys);

    expect(activeV070DecoysBattleInstanceIds(state, 'B')).toEqual([decoys]);
    expect(eligibleV070PalisadeWallGambits(state, 'A')).toEqual([decoys]);
    expect(eligibleV070AssassinsGambits(state, 'A')).toEqual([decoys]);
    expect(eligibleV070CapitalPunishmentTargets(state, 'A')).toEqual([decoys]);
    expect(eligibleV070DisruptionTargets(state, 'A', 'gambit')).toEqual([decoys]);
  });

  test('Decoys does not override an effect for which that Decoys is not itself eligible', () => {
    const state = startBattle();
    const decoys = injectCard(state, 'B', 'neutral-decoys', 'tactic');
    const gambit = injectCard(state, 'B', 'neutral-rallying-cry', 'gambit');
    commitTactic(state, 'B', decoys);
    commitGambit(state, 'B', gambit);
    registerV070DecoysBattleEffect(state, 'B', decoys);

    expect(eligibleV070PalisadeWallGambits(state, 'A')).toEqual([gambit]);
    expect(eligibleV070AssassinsGambits(state, 'A')).toEqual([gambit]);
    expect(eligibleV070DisruptionTargets(state, 'A', 'gambit')).toEqual([gambit]);
    expect(eligibleV070CapitalPunishmentTargets(state, 'A')).toEqual([decoys]);
  });

  test('after Decoys is negated, its target-priority restriction no longer protects another eligible card', () => {
    const state = startBattle();
    const decoys = injectCard(state, 'B', 'neutral-decoys', 'negated');
    const other = injectCard(state, 'B', 'neutral-rallying-cry', 'released');
    const source = injectCard(state, 'A', 'neutral-palisade-wall', 'source');
    commitGambit(state, 'B', decoys);
    commitGambit(state, 'B', other, true);
    commitGambit(state, 'A', source);
    registerV070DecoysBattleEffect(state, 'B', decoys);

    negateV070BattleCardEffect(state, decoys, source, 'neutral-palisade-wall');

    expect(isV070BattleCardEffectNegated(state, decoys)).toBe(true);
    expect(activeV070DecoysBattleInstanceIds(state, 'B')).toEqual([]);
    expect(eligibleV070AssassinsGambits(state, 'A')).toEqual([other]);
    expect(eligibleV070CapitalPunishmentTargets(state, 'A')).toEqual([other]);
  });

  test('shared reveal timing lets an attacker Decoys take the hit before a defender Assassins reaches another Gambit', () => {
    let state = startBattle();
    const decoys = injectCard(state, 'A', 'neutral-decoys', 'integration');
    const other = injectCard(state, 'A', 'neutral-new-recruits', 'integration-other');
    const assassins = injectCard(state, 'B', 'intelligence-assassins', 'integration');

    state.players.A.zones.hand.push(decoys);
    state.players.B.zones.hand.push(assassins);
    state = reduceV070BattleAction(state, {
      type: 'set_gambit', playerId: 'A', cardInstanceId: decoys,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit', playerId: 'B', cardInstanceId: assassins,
    });
    state.battleRuntime!.participants.A.additionalGambits.push({
      instanceId: other,
      owner: 'A',
      role: 'gambit',
      faceUp: false,
    });

    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits', playerId: 'A',
    });

    expect(pendingV070BattleRevealChoice(state)).toBeNull();
    expect(isV070BattleCardEffectNegated(state, decoys)).toBe(true);
    expect(isV070BattleCardEffectNegated(state, other)).toBe(false);
    expect(state.battleRuntime?.participants.A.battleModifier).toBe(1);
    expect(state.battleRuntime?.stage).toBe('choose_tactics');
  });
});
