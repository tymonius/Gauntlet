import { describe, expect, it } from 'vitest';
import { initializeGame } from '../state';
import type { GameState } from '../types';
import { buildGuidedOptions } from './guided-options';

function game(): GameState {
  return initializeGame({
    id: 'guided-options-test', version: '0.5.6-dev', shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Player One', factionId: 'military', leaderName: 'General', deck: ['military-brothers-in-arms','military-reserve-force','military-hold-the-line','military-shock-and-awe'], territories: ['p1-t1','p1-t2','p1-t3'] },
      { id: 'player_2', name: 'Player Two', deck: ['p2-c1','p2-c2','p2-c3','p2-c4'], territories: ['p2-t1','p2-t2','p2-t3'] },
    ],
  });
}

describe('Military guided options', () => {
  it('shows exact card text for a banked precommit activation', () => {
    const state = game();
    state.pendingMilitaryTimingChoice = { kind: 'military_asset_precommit', playerId: 'player_1', sourceCardId: 'military-hold-the-line', options: ['use', 'pass'] };
    state.priorityPlayer = 'player_1';
    const options = buildGuidedOptions(state);
    expect(options.map((option) => option.label)).toEqual(['Use military-hold-the-line', 'Pass military-hold-the-line']);
    expect(options[0].cardText).toContain('Hold the Line');
    expect(options[0].cardText).toContain('draw two additional cards');
  });

  it('enumerates every legal Brothers in Arms card pairing plus neither', () => {
    const state = game();
    state.pendingMilitaryTimingChoice = { kind: 'brothers_in_arms_selection', playerId: 'player_1', sourceCardId: 'military-brothers-in-arms', handOptions: ['hand-a','hand-b'], battleHandOptions: ['battle-a','battle-b'], mayChooseNeither: true };
    state.priorityPlayer = 'player_1';
    const options = buildGuidedOptions(state);
    expect(options).toHaveLength(5);
    expect(options[0].action).toMatchObject({ type: 'resolve_military_timing_choice', choice: 'neither' });
    expect(options[4].action).toMatchObject({ cardId: 'hand-b', secondaryCardId: 'battle-b' });
  });

  it('offers Reserve Force replacement choices by hand card', () => {
    const state = game();
    state.pendingMilitaryTimingChoice = { kind: 'reserve_force_after_reveal', playerId: 'player_1', sourceCardId: 'military-reserve-force', storedCard: 'stored-card', handOptions: ['hand-a','hand-b'], options: ['deploy_stored','replace_from_hand','pass'] };
    state.priorityPlayer = 'player_1';
    const options = buildGuidedOptions(state);
    expect(options.map((option) => option.label)).toEqual(['Deploy stored stored-card','Replace Reserve Force with hand-a','Replace Reserve Force with hand-b','Pass Reserve Force']);
  });

  it('offers Hold the Line and Shock and Awe pass choices', () => {
    const hold = game();
    hold.pendingMilitaryTimingChoice = { kind: 'hold_the_line_after_reveal', playerId: 'player_1', sourceCardId: 'military-hold-the-line', drawnCards: ['a','b'], options: ['a','b'], mayPass: true };
    hold.priorityPlayer = 'player_1';
    expect(buildGuidedOptions(hold).at(-1)?.label).toBe('Reveal no additional card');

    const shock = game();
    shock.pendingMilitaryTimingChoice = { kind: 'shock_and_awe_after_reveal', playerId: 'player_1', sourceCardId: 'military-shock-and-awe', handOptions: ['a'], mayPass: true };
    shock.priorityPlayer = 'player_1';
    expect(buildGuidedOptions(shock).map((option) => option.label)).toEqual(['Reveal a with Shock and Awe','Reveal no additional card']);
  });
});
