import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type { BattleParticipantState, BattlePlayedCard, GameState, PlayerID } from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { continueIntelligenceBattle } from './intelligence-battle';
import { initializeGame } from './initialize';
import {
  COUNTERWORKS,
  counterworksOverlayInactive,
  processCounterworksOverlayQueue,
  queueCounterworksOverlayPlacement,
} from './neutral-counterworks';

const FOG = 'intelligence-fog-of-war';
const CIRCLE = 'mystics-circle-of-bones';
const FEALTY = 'neutral-fealty';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-counterworks-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Builder',
        factionId: 'military',
        leaderName: 'General',
        deck: [FOG, CIRCLE, FEALTY],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Engineer',
        factionId: 'diplomats',
        leaderName: 'Ambassador',
        deck: [COUNTERWORKS, FEALTY, CIRCLE],
        territories: ['p2-one', 'p2-two', 'p2-three'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  return state;
}

function participant(playerId: PlayerID, handCommit?: BattlePlayedCard): BattleParticipantState {
  return {
    playerId,
    handCommit,
    passedHandCommit: !handCommit,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    initialBattleHand: [],
    battleDraw: [],
    battleDrawPlayed: [],
    battleDrawCount: 3,
    battleDrawPlayLimit: 1,
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function beginBattle(state: GameState, counterworksOwner: PlayerID = 'player_2'): void {
  const first = state.board.spaces.find((space) => space.id === 'space-1')!;
  const second = state.board.spaces.find((space) => space.id === 'space-2')!;
  first.occupant = 'player_1';
  second.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = first.id;
  state.players.player_2.occupiedSpaceId = second.id;
  const source: BattlePlayedCard = {
    cardId: COUNTERWORKS,
    owner: counterworksOwner,
    origin: 'hand',
    faceDown: true,
    canceled: false,
  };
  state.phase = 'battle';
  state.battle = {
    id: 'counterworks-battle',
    stage: 'normal_reveal',
    location: second.id,
    attackerOrigin: first.id,
    attacker: participant('player_1', counterworksOwner === 'player_1' ? source : undefined),
    defender: participant('player_2', counterworksOwner === 'player_2' ? source : undefined),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

describe('Neutral Counterworks', () => {
  it('registers both canonical forms and banks its Action form', () => {
    expect(getCardPlayRule(COUNTERWORKS)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });
  });

  it('offers a face-up opposing Counterworks Asset before placing an Overlay', () => {
    const state = game();
    const space = state.board.spaces.find((candidate) => candidate.id === 'space-2')!;
    state.players.player_1.zones.removed = [FOG];
    state.players.player_2.zones.assetBank = [COUNTERWORKS];

    queueCounterworksOverlayPlacement(state, {
      kind: 'fog_of_war_action',
      playerId: 'player_1',
      cardId: FOG,
      spaceId: space.id,
      source: { zone: 'removed' },
    });
    processCounterworksOverlayQueue(state);

    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'counterworks_asset',
      playerId: 'player_2',
      overlayCardId: FOG,
    });
    expect(space.overlays ?? []).toHaveLength(0);
  });

  it('lets the Asset pass and then places the Overlay normally', () => {
    let state = game();
    const spaceId = 'space-2';
    state.players.player_1.zones.removed = [FOG];
    state.players.player_2.zones.assetBank = [COUNTERWORKS];
    queueCounterworksOverlayPlacement(state, {
      kind: 'fog_of_war_action', playerId: 'player_1', cardId: FOG, spaceId, source: { zone: 'removed' },
    });
    processCounterworksOverlayQueue(state);

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'pass',
    }).state;

    const space = state.board.spaces.find((candidate) => candidate.id === spaceId)!;
    expect(space.overlays).toEqual(expect.arrayContaining([
      expect.objectContaining({ cardId: FOG, owner: 'player_1' }),
    ]));
    expect(state.players.player_1.zones.removed).not.toContain(FOG);
    expect(state.players.player_2.zones.assetBank).toContain(COUNTERWORKS);
  });

  it('discards the Asset to prevent the Overlay and returns its card to owner Discard', () => {
    let state = game();
    const spaceId = 'space-2';
    state.players.player_1.zones.removed = [FOG];
    state.players.player_2.zones.assetBank = [COUNTERWORKS];
    queueCounterworksOverlayPlacement(state, {
      kind: 'fog_of_war_action', playerId: 'player_1', cardId: FOG, spaceId, source: { zone: 'removed' },
    });
    processCounterworksOverlayQueue(state);

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'use',
    }).state;

    expect(state.board.spaces.find((candidate) => candidate.id === spaceId)?.overlays ?? []).toHaveLength(0);
    expect(state.players.player_1.zones.discard).toContain(FOG);
    expect(state.players.player_2.zones.assetBank).not.toContain(COUNTERWORKS);
    expect(state.players.player_2.zones.graveyard).toContain(COUNTERWORKS);
  });

  it('reveals its Battle form early and can deactivate one exact Overlay copy', () => {
    let state = game();
    beginBattle(state);
    const space = state.board.spaces.find((candidate) => candidate.id === state.battle!.location)!;
    space.overlays = [
      { cardId: FOG, owner: 'player_1', faceUp: true },
      { cardId: FOG, owner: 'player_1', faceUp: true },
    ];

    continueIntelligenceBattle(state);
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'counterworks_battle', playerId: 'player_2' });
    const pending = state.pendingNeutralChoice;
    if (!pending || pending.kind !== 'counterworks_battle') throw new Error('missing Counterworks choice');
    const second = pending.overlayOptions[1]!;

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'deactivate_overlay',
      targetKey: second.targetKey,
    }).state;

    expect(counterworksOverlayInactive(state, space.id, space.overlays![0]!, 0, 'counterworks-battle')).toBe(false);
    expect(counterworksOverlayInactive(state, space.id, space.overlays![1]!, 1, 'counterworks-battle')).toBe(true);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('arms one prevention that ignores the owner’s Overlay and consumes the next opposing one', () => {
    let state = game();
    beginBattle(state, 'player_2');
    continueIntelligenceBattle(state);
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice', playerId: 'player_2', choice: 'prevent_overlay',
    }).state;

    const spaceId = state.battle!.location;
    state.players.player_2.zones.removed = [CIRCLE];
    queueCounterworksOverlayPlacement(state, {
      kind: 'circle_of_bones_action', playerId: 'player_2', cardId: CIRCLE, spaceId, source: { zone: 'removed' }, battleId: state.battle!.id,
    });
    processCounterworksOverlayQueue(state);
    expect(state.battle?.counterworksOverlayPreventions?.[0]?.consumed).not.toBe(true);

    state.players.player_1.zones.removed = [FOG];
    queueCounterworksOverlayPlacement(state, {
      kind: 'fog_of_war_action', playerId: 'player_1', cardId: FOG, spaceId, source: { zone: 'removed' }, battleId: state.battle!.id,
    });
    processCounterworksOverlayQueue(state);

    expect(state.battle?.counterworksOverlayPreventions?.[0]?.consumed).toBe(true);
    expect(state.players.player_1.zones.discard).toContain(FOG);
    expect(state.board.spaces.find((candidate) => candidate.id === spaceId)?.overlays).toEqual([
      expect.objectContaining({ cardId: CIRCLE, owner: 'player_2' }),
    ]);
  });

  it('uses a recent-battle prevention during cleanup', () => {
    const state = game();
    const spaceId = 'space-2';
    state.recentBattleResult = {
      battleId: 'finished-battle', turn: state.turn, winner: 'player_2', loser: 'player_1',
      attacker: 'player_1', defender: 'player_2', location: spaceId, attackerOrigin: 'space-1', retreatDirection: -1,
      counterworksOverlayPreventions: [{ battleId: 'finished-battle', playerId: 'player_2', spaceId }],
    };
    state.players.player_1.zones.graveyard = [CIRCLE];
    queueCounterworksOverlayPlacement(state, {
      kind: 'circle_of_bones_battle', playerId: 'player_1', cardId: CIRCLE, spaceId,
      source: { zone: 'graveyard' }, battleId: 'finished-battle',
    });
    processCounterworksOverlayQueue(state);

    expect(state.recentBattleResult.counterworksOverlayPreventions?.[0]?.consumed).toBe(true);
    expect(state.players.player_1.zones.discard).toContain(CIRCLE);
    expect(state.players.player_1.zones.graveyard).not.toContain(CIRCLE);
    expect(state.board.spaces.find((candidate) => candidate.id === spaceId)?.overlays ?? []).toHaveLength(0);
  });
});
