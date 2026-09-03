import { describe, expect, it } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { initializeGame } from './initialize';
import { SCORCHED_EARTH } from './neutral-scorched-earth';
import {
  isRuinsOverlay,
  placeRuinsOverlay,
  placeTerritoryOverlay,
  removeCaptureSensitiveOverlaysAfterControlChange,
  topTerritoryOverlay,
} from './territory-overlays';
import { territoryPrintedEffectIsActive } from './territory-printed-effects';

const VALOR = 'card-valor';
const FORTIFICATIONS = 'card-fortifications';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-scorched-earth-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Attacker',
        factionId: 'military',
        leaderName: 'General',
        deck: [SCORCHED_EARTH, SCORCHED_EARTH, VALOR, FORTIFICATIONS],
        territories: ['territory-high-ground', 'territory-watchtower', 'territory-garrison'],
      },
      {
        id: 'player_2',
        name: 'Defender',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [SCORCHED_EARTH, SCORCHED_EARTH, VALOR, FORTIFICATIONS],
        territories: ['territory-watchtower', 'territory-high-ground', 'territory-garrison'],
      },
    ],
  });
  state.activePlayer = 'player_1';
  state.priorityPlayer = 'player_1';
  state.phase = 'action_before_movement';
  state.players.player_1.actionsRemaining = 1;
  state.players.player_1.hasPlayedActionThisTurn = false;
  state.players.player_1.hasPlayedBattleThisTurn = false;
  return state;
}

function played(
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId: SCORCHED_EARTH,
    owner,
    origin,
    faceDown: false,
    canceled: false,
    ...overrides,
  };
}

function participant(
  playerId: PlayerID,
  cards: BattlePlayedCard[] = [],
  roll = playerId === 'player_1' ? 6 : 1,
): BattleParticipantState {
  return {
    playerId,
    handCommit: cards.find((card) => card.origin === 'hand'),
    passedHandCommit: !cards.some((card) => card.origin === 'hand'),
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw: [],
    battleDrawPlayed: cards.filter((card) => card.origin === 'battle_draw'),
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, cards.filter((card) => card.origin === 'battle_draw').length),
    rerollsRemaining: 0,
    diceRoll: roll,
    modifiers: 0,
    retreated: false,
  };
}

function beginDefenderLoss(
  state: GameState,
  defenderCards: BattlePlayedCard[] = [],
  options: {
    controller?: PlayerID;
    attackerRoll?: number;
    defenderRoll?: number;
    lossSuppressed?: boolean;
    assetsProhibited?: boolean;
  } = {},
): void {
  for (const space of state.board.spaces) space.occupant = undefined;
  const origin = state.board.spaces.find((space) => space.id === 'space-2')!;
  const location = state.board.spaces.find((space) => space.id === 'space-3')!;
  origin.occupant = 'player_1';
  location.kind = 'territory';
  location.territoryId = 'territory-watchtower';
  location.revealed = true;
  location.controller = options.controller ?? 'player_2';
  location.occupant = 'player_2';
  state.players.player_1.occupiedSpaceId = origin.id;
  state.players.player_2.occupiedSpaceId = location.id;
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'scorched-earth-battle',
    stage: 'resolution',
    location: location.id,
    attackerOrigin: origin.id,
    attacker: participant('player_1', [], options.attackerRoll ?? 6),
    defender: participant('player_2', defenderCards, options.defenderRoll ?? 1),
    tiePolicy: 'defender',
    effectsResolved: ['before_battle_resolution'],
    lossRetreatEffectsSuppressedFor: options.lossSuppressed ? ['player_2'] : undefined,
    bankedAssetUseProhibited: options.assetsProhibited ? ['player_2'] : undefined,
  };
}

function resolveBattle(state: GameState): GameState {
  return applyGameAction(state, {
    type: 'resolve_battle',
    playerId: 'player_1',
  }).state;
}

function location(state: GameState) {
  return state.board.spaces.find((space) => space.id === 'space-3')!;
}

describe('Neutral Scorched Earth', () => {
  it('registers both forms and banks its Action form', () => {
    expect(getCardPlayRule(SCORCHED_EARTH)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      defaultDestinationByOrigin: { hand: 'asset_bank', battle_draw: 'discard' },
    });

    let state = game();
    state.players.player_1.zones.hand = [SCORCHED_EARTH];
    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: SCORCHED_EARTH,
    }).state;

    expect(state.players.player_1.zones.assetBank).toEqual([SCORCHED_EARTH]);
  });

  it('moves one active Battle copy from its normal destination onto the lost controlled Territory as Ruins', () => {
    let state = game();
    beginDefenderLoss(state, [played('player_2', 'hand')]);

    state = resolveBattle(state);

    expect(state.players.player_2.zones.graveyard).not.toContain(SCORCHED_EARTH);
    expect(topTerritoryOverlay(location(state))).toMatchObject({
      cardId: SCORCHED_EARTH,
      owner: 'player_2',
      kind: 'ruins',
    });
    expect(territoryPrintedEffectIsActive(state, location(state))).toBe(false);
  });

  it('moves a Battle Hand copy from the Discard Pile and stacks physical copies through Ruins replacement', () => {
    let state = game();
    beginDefenderLoss(state, [
      played('player_2', 'hand'),
      played('player_2', 'battle_draw'),
    ]);

    state = resolveBattle(state);

    expect(location(state).overlays).toHaveLength(1);
    expect(topTerritoryOverlay(location(state))).toMatchObject({ cardId: SCORCHED_EARTH, kind: 'ruins' });
    expect(state.players.player_2.zones.graveyard.filter((card) => card === SCORCHED_EARTH)).toHaveLength(1);
    expect(state.players.player_2.zones.discard).not.toContain(SCORCHED_EARTH);
  });

  it('offers each active banked copy after the defender retreats and may place one as Ruins', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [SCORCHED_EARTH, SCORCHED_EARTH];
    beginDefenderLoss(state);

    state = resolveBattle(state);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'scorched_earth_asset',
      playerId: 'player_2',
      triggersRemaining: 2,
    });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'use',
    }).state;
    expect(state.players.player_2.zones.assetBank).toEqual([SCORCHED_EARTH]);
    expect(topTerritoryOverlay(location(state))).toMatchObject({ cardId: SCORCHED_EARTH, kind: 'ruins' });
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'scorched_earth_asset', triggersRemaining: 1 });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_2',
      choice: 'pass',
    }).state;
    expect(state.players.player_2.zones.assetBank).toEqual([SCORCHED_EARTH]);
    expect(state.pendingNeutralChoice).toBeUndefined();
  });

  it('does not trigger after a defensive win, on an uncontrolled Territory, through loss suppression, or for prohibited Assets', () => {
    let win = game();
    win.players.player_2.zones.assetBank = [SCORCHED_EARTH];
    beginDefenderLoss(win, [played('player_2')], { attackerRoll: 1, defenderRoll: 6 });
    win = resolveBattle(win);
    expect(win.pendingNeutralChoice).toBeUndefined();
    expect(location(win).overlays ?? []).toHaveLength(0);

    let uncontrolled = game();
    uncontrolled.players.player_2.zones.assetBank = [SCORCHED_EARTH];
    beginDefenderLoss(uncontrolled, [played('player_2')], { controller: 'player_1' });
    uncontrolled = resolveBattle(uncontrolled);
    expect(uncontrolled.pendingNeutralChoice).toBeUndefined();
    expect(location(uncontrolled).overlays ?? []).toHaveLength(0);

    let suppressed = game();
    suppressed.players.player_2.zones.assetBank = [SCORCHED_EARTH];
    beginDefenderLoss(suppressed, [played('player_2')], { lossSuppressed: true });
    suppressed = resolveBattle(suppressed);
    expect(suppressed.pendingNeutralChoice).toBeUndefined();
    expect(location(suppressed).overlays ?? []).toHaveLength(0);

    let prohibited = game();
    prohibited.players.player_2.zones.assetBank = [SCORCHED_EARTH];
    beginDefenderLoss(prohibited, [], { assetsProhibited: true });
    prohibited = resolveBattle(prohibited);
    expect(prohibited.pendingNeutralChoice).toBeUndefined();
    expect(prohibited.players.player_2.zones.assetBank).toEqual([SCORCHED_EARTH]);
  });

  it('ignores canceled, negated, and virtual Battle copies', () => {
    let state = game();
    beginDefenderLoss(state, [
      played('player_2', 'hand', { canceled: true }),
      played('player_2', 'battle_draw', { negated: true }),
      played('player_2', 'battle_draw', { virtual: true }),
    ]);

    state = resolveBattle(state);

    expect(location(state).overlays ?? []).toHaveLength(0);
  });

  it('replaces preexisting Ruins, preserves ordinary lower Overlays, and sends the old Ruins to its owner’s Graveyard', () => {
    const state = game();
    const space = state.board.spaces.find((candidate) => candidate.id === 'space-3')!;
    space.kind = 'territory';
    space.territoryId = 'territory-watchtower';
    space.revealed = true;
    placeTerritoryOverlay(space, 'mystics-spirit-hollow', 'player_1');
    placeRuinsOverlay(state, space, 'neutral-bombardment', 'player_1');

    placeRuinsOverlay(state, space, SCORCHED_EARTH, 'player_2');

    expect(space.overlays).toHaveLength(2);
    expect(space.overlays?.[0]).toMatchObject({ cardId: 'mystics-spirit-hollow' });
    expect(topTerritoryOverlay(space)).toMatchObject({ cardId: SCORCHED_EARTH, kind: 'ruins' });
    expect(state.players.player_1.zones.graveyard).toContain('neutral-bombardment');
    expect(isRuinsOverlay(topTerritoryOverlay(space))).toBe(true);
  });

  it('keeps Ruins in place when control of the Territory changes', () => {
    const state = game();
    const space = state.board.spaces.find((candidate) => candidate.id === 'space-3')!;
    space.kind = 'territory';
    space.territoryId = 'territory-watchtower';
    space.revealed = true;
    space.controller = 'player_2';
    placeRuinsOverlay(state, space, SCORCHED_EARTH, 'player_2');
    const before = Object.fromEntries(state.board.spaces
      .filter((candidate) => candidate.kind === 'territory')
      .map((candidate) => [candidate.id, candidate.controller]));

    space.controller = 'player_1';
    removeCaptureSensitiveOverlaysAfterControlChange(state, before);

    expect(topTerritoryOverlay(space)).toMatchObject({ cardId: SCORCHED_EARTH, kind: 'ruins' });
    expect(state.players.player_2.zones.graveyard).not.toContain(SCORCHED_EARTH);
  });

  it('treats any exposed Overlay as superseding the printed Territory effect and restores it when uncovered', () => {
    const state = game();
    const space = state.board.spaces.find((candidate) => candidate.id === 'space-3')!;
    space.kind = 'territory';
    space.territoryId = 'territory-watchtower';
    space.revealed = true;

    expect(territoryPrintedEffectIsActive(state, space)).toBe(true);
    placeTerritoryOverlay(space, 'mystics-spirit-hollow', 'player_1');
    expect(territoryPrintedEffectIsActive(state, space)).toBe(false);
    space.overlays = undefined;
    expect(territoryPrintedEffectIsActive(state, space)).toBe(true);
  });

  it('removes only one physical duplicate when played as an Action, committed from hand, or selected from the Battle Hand', () => {
    let action = game();
    action.players.player_1.zones.hand = [SCORCHED_EARTH, SCORCHED_EARTH];
    action = applyGameAction(action, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: SCORCHED_EARTH,
    }).state;
    expect(action.players.player_1.zones.hand).toEqual([SCORCHED_EARTH]);
    expect(action.players.player_1.zones.assetBank).toEqual([SCORCHED_EARTH]);

    let commit = game();
    commit.phase = 'battle';
    commit.players.player_1.zones.hand = [SCORCHED_EARTH, SCORCHED_EARTH];
    commit.battle = {
      id: 'duplicate-commit',
      stage: 'hand_commit',
      location: 'space-3',
      attackerOrigin: 'space-2',
      attacker: { ...participant('player_1', [], 1), passedHandCommit: false },
      defender: participant('player_2', [], 1),
      tiePolicy: 'defender',
      effectsResolved: [],
    };
    commit = applyGameAction(commit, {
      type: 'commit_battle_hand_card',
      playerId: 'player_1',
      cardId: SCORCHED_EARTH,
    }).state;
    expect(commit.players.player_1.zones.hand).toEqual([SCORCHED_EARTH]);

    let selection = game();
    selection.phase = 'battle';
    const attacker = participant('player_1', [], 1);
    attacker.battleDraw = [SCORCHED_EARTH, SCORCHED_EARTH];
    attacker.hasDrawnBattleCards = true;
    attacker.passedBattleDrawPlay = false;
    selection.battle = {
      id: 'duplicate-selection',
      stage: 'battle_play_selection',
      location: 'space-3',
      attackerOrigin: 'space-2',
      attacker,
      defender: participant('player_2', [], 1),
      tiePolicy: 'defender',
      effectsResolved: [],
    };
    selection = applyGameAction(selection, {
      type: 'play_battle_draw_card',
      playerId: 'player_1',
      cardId: SCORCHED_EARTH,
    }).state;
    expect(selection.battle?.attacker.battleDraw).toEqual([SCORCHED_EARTH]);
    expect(selection.battle?.attacker.battleDrawPlayed).toHaveLength(1);
  });
});
