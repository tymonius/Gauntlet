import { describe, expect, it } from 'vitest';
import type { GameState } from '../types';
import { initializeGame } from './initialize';
import {
  DIPLOMAT_PERSISTENT_CARDS,
  bankSanctionAfterRefusal,
  canCaptureSpace,
  effectiveAssetBankLimit,
  openBlockadeMovementChoice,
  openCensureChoiceAfterAction,
  playClemency,
  playDemilitarizedZone,
  removeBlockadesAfterControlChange,
  removeSanctionsAfterAcceptedTerms,
  resolveBlockadeMovement,
  resolveCensure,
  resolveClemency,
  resolveDemilitarizedZoneBattle,
} from './diplomat-persistent';

function game(): GameState {
  const state = initializeGame({
    id: 'persistent-diplomat-test', version: 'v0.6.0', shuffleDecks: false,
    players: [
      { id: 'player_1', name: 'Diplomat', factionId: 'diplomats', leaderName: 'Ambassador', deck: ['d1','d2','d3','d4'], territories: ['d-t1','d-t2','d-t3'] },
      { id: 'player_2', name: 'Opponent', deck: ['o1','o2','o3','o4'], territories: ['o-t1','o-t2','o-t3'] },
    ],
  });
  state.players.player_1.resources!.influence!.value = 1;
  return state;
}

describe('persistent Diplomat cards', () => {
  it('resolves both Clemency options', () => {
    const release = game();
    release.players.player_1.zones.hand.push(DIPLOMAT_PERSISTENT_CARDS.clemency);
    release.players.player_2.zones.graveyard.push('fallen');
    playClemency(release, 'player_1', 'player_2', 'fallen');
    resolveClemency(release, 'player_2', 'release');
    expect(release.players.player_2.zones.discard).toContain('fallen');
    expect(release.players.player_1.resources!.influence!.value).toBe(2);

    const leave = game();
    leave.players.player_1.zones.hand.push(DIPLOMAT_PERSISTENT_CARDS.clemency);
    leave.players.player_2.zones.graveyard.push('fallen');
    playClemency(leave, 'player_1', 'player_2', 'fallen');
    resolveClemency(leave, 'player_2', 'leave');
    expect(leave.players.player_1.zones.hand).toHaveLength(4);
  });

  it('protects a Demilitarized Zone from capture and discards it after the first battle', () => {
    const state = game();
    const space = state.board.spaces.find((candidate) => candidate.kind === 'territory')!;
    state.players.player_1.zones.hand.push(DIPLOMAT_PERSISTENT_CARDS.demilitarizedZone);
    playDemilitarizedZone(state, 'player_1', space.id);
    expect(canCaptureSpace(state, space.id)).toBe(false);
    resolveDemilitarizedZoneBattle(state, space.id);
    expect(canCaptureSpace(state, space.id)).toBe(true);
    expect(state.players.player_1.zones.discard).toContain(DIPLOMAT_PERSISTENT_CARDS.demilitarizedZone);
  });

  it('stacks Embargoes and reduces the Asset-bank limit to a minimum of zero', () => {
    const state = game();
    state.players.player_1.zones.hand.push(DIPLOMAT_PERSISTENT_CARDS.embargo, DIPLOMAT_PERSISTENT_CARDS.embargo);
    bankSanctionAfterRefusal(state, 'player_1', 'player_2', DIPLOMAT_PERSISTENT_CARDS.embargo);
    bankSanctionAfterRefusal(state, 'player_1', 'player_2', DIPLOMAT_PERSISTENT_CARDS.embargo);
    expect(effectiveAssetBankLimit(state, 'player_2')).toBe(1);
  });

  it('triggers Censure only once each turn', () => {
    const state = game();
    state.players.player_1.zones.hand.push(DIPLOMAT_PERSISTENT_CARDS.censure);
    bankSanctionAfterRefusal(state, 'player_1', 'player_2', DIPLOMAT_PERSISTENT_CARDS.censure);
    expect(openCensureChoiceAfterAction(state, 'player_2')).toBe(true);
    resolveCensure(state, 'player_2', 'diplomat_draw');
    expect(openCensureChoiceAfterAction(state, 'player_2')).toBe(false);
  });

  it('applies Blockade movement pressure and removes it when control changes', () => {
    const state = game();
    const target = state.board.spaces.find((candidate) => candidate.kind === 'territory' && candidate.controller === 'player_2')!;
    target.revealed = true;
    state.players.player_1.zones.hand.push(DIPLOMAT_PERSISTENT_CARDS.blockade);
    bankSanctionAfterRefusal(state, 'player_1', 'player_2', DIPLOMAT_PERSISTENT_CARDS.blockade, target.id);
    expect(openBlockadeMovementChoice(state, 'player_2', target.id)).toBe(true);
    resolveBlockadeMovement(state, 'player_2', 'influence');
    expect(state.players.player_1.resources!.influence!.value).toBe(2);
    target.controller = 'player_1';
    removeBlockadesAfterControlChange(state);
    expect(target.overlays?.some((overlay) => overlay.cardId === DIPLOMAT_PERSISTENT_CARDS.blockade)).toBe(false);
  });

  it('removes all sanctions against an opponent after accepted Terms', () => {
    const state = game();
    state.players.player_1.zones.hand.push(DIPLOMAT_PERSISTENT_CARDS.censure, DIPLOMAT_PERSISTENT_CARDS.embargo);
    bankSanctionAfterRefusal(state, 'player_1', 'player_2', DIPLOMAT_PERSISTENT_CARDS.censure);
    bankSanctionAfterRefusal(state, 'player_1', 'player_2', DIPLOMAT_PERSISTENT_CARDS.embargo);
    removeSanctionsAfterAcceptedTerms(state, 'player_1', 'player_2');
    expect(state.players.player_1.diplomats?.sanctionStates).toHaveLength(0);
    expect(state.players.player_1.zones.discard).toEqual(expect.arrayContaining([DIPLOMAT_PERSISTENT_CARDS.censure, DIPLOMAT_PERSISTENT_CARDS.embargo]));
  });
});
