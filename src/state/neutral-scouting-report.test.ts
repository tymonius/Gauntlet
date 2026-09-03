import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCardPlayRule } from '../cards';
import type {
  BattleParticipantState,
  BattlePlayedCard,
  GameState,
  PlayerID,
} from '../types/v06';
import { applyGameAction } from './apply-neutral';
import { continueIntelligenceBattle } from './intelligence-battle';
import { initializeGame } from './initialize';
import { COUNTERINTELLIGENCE } from './neutral-counterintelligence';
import { SCOUTING_REPORT } from './neutral-scouting-report';
import { toPrivateGameView, toPublicGameView } from './views';

const FIRST = 'card-valor';
const SECOND = 'card-fortifications';
const THIRD = 'card-attrition';

function game(): GameState {
  const state = initializeGame({
    id: 'neutral-scouting-report-test',
    version: 'v0.6.0',
    openingHandSize: 0,
    shuffleDecks: false,
    players: [
      {
        id: 'player_1',
        name: 'Scout',
        factionId: 'military',
        leaderName: 'General',
        deck: [SCOUTING_REPORT, SCOUTING_REPORT, FIRST, SECOND, THIRD],
        territories: ['p1-one', 'p1-two', 'p1-three'],
      },
      {
        id: 'player_2',
        name: 'Opponent',
        factionId: 'intelligence',
        leaderName: 'Ranger',
        deck: [FIRST, SECOND, THIRD, COUNTERINTELLIGENCE],
        territories: ['p2-one', 'p2-two', 'p2-three'],
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
  cardId: string,
  owner: PlayerID,
  origin: 'hand' | 'battle_draw' = 'battle_draw',
  overrides: Partial<BattlePlayedCard> = {},
): BattlePlayedCard {
  return {
    cardId,
    owner,
    origin,
    faceDown: true,
    canceled: false,
    ...overrides,
  };
}

function participant(
  playerId: PlayerID,
  handCommit?: BattlePlayedCard,
  battleDrawPlayed: BattlePlayedCard[] = [],
  battleDraw: string[] = [],
): BattleParticipantState {
  return {
    playerId,
    handCommit,
    passedHandCommit: !handCommit,
    passedBattleDrawPlay: true,
    hasDrawnBattleCards: true,
    battleDraw,
    battleDrawPlayed,
    battleDrawCount: 3,
    battleDrawPlayLimit: Math.max(1, battleDrawPlayed.length),
    rerollsRemaining: 0,
    modifiers: 0,
    retreated: false,
  };
}

function beginPreRevealBattle(
  state: GameState,
  scoutingSource: BattlePlayedCard,
  opponentHandCommit?: BattlePlayedCard,
  opponentBattleCards: BattlePlayedCard[] = [],
  unchosenCards: string[] = [THIRD],
): void {
  state.phase = 'battle';
  state.priorityPlayer = 'player_1';
  state.battle = {
    id: 'scouting-report-battle',
    stage: 'normal_reveal',
    location: 'space-2',
    attackerOrigin: 'space-1',
    attacker: scoutingSource.origin === 'hand'
      ? participant('player_1', scoutingSource, [], unchosenCards)
      : participant('player_1', undefined, [scoutingSource], unchosenCards),
    defender: participant('player_2', opponentHandCommit, opponentBattleCards),
    tiePolicy: 'defender',
    effectsResolved: [],
  };
}

function privateInspectionCard(state: GameState): string | undefined {
  const event = [...state.log].reverse().find((candidate) => (
    candidate.type === 'neutral_scouting_report_action_inspection'
  ));
  return (event?.payload as { cardId?: string } | undefined)?.cardId;
}

afterEach(() => vi.restoreAllMocks());

describe('Neutral Scouting Report', () => {
  it('registers both canonical forms and discards after its Action form', () => {
    expect(getCardPlayRule(SCOUTING_REPORT)).toMatchObject({
      timings: ['action', 'battle_hand_commit', 'battle_draw_play'],
      allowedOrigins: ['hand', 'battle_draw'],
      defaultDestinationByOrigin: { hand: 'discard', battle_draw: 'discard' },
    });
  });

  it('removes exactly one physical Action copy and privately inspects either Draw Pile', () => {
    let state = game();
    state.players.player_1.zones.hand = [SCOUTING_REPORT, SCOUTING_REPORT];
    state.players.player_1.zones.deck = [FIRST, SECOND];
    state.players.player_2.zones.deck = [THIRD];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: SCOUTING_REPORT,
    }).state;

    expect(state.players.player_1.zones.hand).toEqual([SCOUTING_REPORT]);
    expect(state.players.player_1.zones.discard).toEqual([SCOUTING_REPORT]);
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'scouting_report_action',
      playerId: 'player_1',
    });
    expect(toPublicGameView(state).pendingNeutralChoice).toBeUndefined();
    expect(toPrivateGameView(state, 'player_1').pendingNeutralChoice).toEqual(state.pendingNeutralChoice);
    expect(toPrivateGameView(state, 'player_2').pendingNeutralChoice).toBeUndefined();

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'inspect_opponent_draw',
    }).state;

    expect(privateInspectionCard(state)).toBe(THIRD);
    expect(toPublicGameView(state).log.some((event) => JSON.stringify(event).includes(THIRD))).toBe(false);
    expect(toPrivateGameView(state, 'player_1').log.some((event) => JSON.stringify(event).includes(THIRD))).toBe(true);
    expect(toPrivateGameView(state, 'player_2').log.some((event) => JSON.stringify(event).includes(THIRD))).toBe(false);
  });

  it('inspects one deterministic random opposing hand card and respects Counterintelligence', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.75);
    let state = game();
    state.players.player_1.zones.hand = [SCOUTING_REPORT];
    state.players.player_2.zones.hand = [FIRST, SECOND];

    state = applyGameAction(state, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: SCOUTING_REPORT,
    }).state;
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'inspect_opponent_hand',
    }).state;
    expect(privateInspectionCard(state)).toBe(SECOND);

    let blocked = game();
    blocked.players.player_1.zones.hand = [SCOUTING_REPORT];
    blocked.players.player_2.zones.hand = [FIRST];
    blocked.players.player_2.zones.assetBank = [COUNTERINTELLIGENCE];
    blocked = applyGameAction(blocked, {
      type: 'play_action_card',
      playerId: 'player_1',
      cardId: SCOUTING_REPORT,
    }).state;
    blocked = applyGameAction(blocked, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'inspect_opponent_hand',
    }).state;

    expect(privateInspectionCard(blocked)).toBeUndefined();
    expect(blocked.log.some((event) => event.type === 'neutral_counterintelligence_blocked')).toBe(true);
  });

  it('reveals early, privately inspects one selected opposing card, then may pass replacement', () => {
    let state = game();
    beginPreRevealBattle(
      state,
      played(SCOUTING_REPORT, 'player_1', 'hand'),
      played(FIRST, 'player_2', 'hand'),
      [played(SECOND, 'player_2')],
    );

    continueIntelligenceBattle(state);

    expect(state.battle?.attacker.handCommit).toMatchObject({
      cardId: SCOUTING_REPORT,
      faceDown: false,
      earlyEffectResolved: true,
    });
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'scouting_report_battle_inspect',
      playerId: 'player_1',
      targetOptions: expect.arrayContaining([
        expect.objectContaining({ targetKey: 'player_2:hand' }),
        expect.objectContaining({ targetKey: 'player_2:battle_draw:0' }),
      ]),
    });
    expect(toPublicGameView(state).pendingNeutralChoice).toBeUndefined();

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'inspect',
      targetKey: 'player_2:battle_draw:0',
    }).state;

    expect(state.battle?.defender.battleDrawPlayed[0].visibleTo).toContain('player_1');
    expect(toPrivateGameView(state, 'player_1').battle?.defender.battleDrawPlayed[0]).toMatchObject({ cardId: SECOND });
    expect(toPrivateGameView(state, 'player_2').battle?.defender.battleDrawPlayed[0]).toMatchObject({ cardId: SECOND });
    expect(toPublicGameView(state).battle?.defender.battleDrawPlayed[0]).toEqual({ faceDown: true });
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'scouting_report_battle_replace' });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'pass',
    }).state;

    expect(state.pendingNeutralChoice).toBeUndefined();
    expect(state.battle?.stage).toBe('dice');
    expect(state.battle?.defender.handCommit?.faceDown).toBe(false);
    expect(state.battle?.defender.battleDrawPlayed[0].faceDown).toBe(false);
  });

  it('replaces a hand-committed Scouting Report with an unchosen Battle Hand card', () => {
    let state = game();
    beginPreRevealBattle(
      state,
      played(SCOUTING_REPORT, 'player_1', 'hand'),
      played(FIRST, 'player_2', 'hand'),
      [],
      [SECOND, THIRD],
    );

    continueIntelligenceBattle(state);
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'scouting_report_battle_replace' });

    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'replace',
      cardId: SECOND,
    }).state;

    expect(state.players.player_1.zones.graveyard).toContain(SCOUTING_REPORT);
    expect(state.battle?.attacker.handCommit).toBeUndefined();
    expect(state.battle?.attacker.battleDraw).toEqual([THIRD]);
    expect(state.battle?.attacker.battleDrawPlayed).toEqual([
      expect.objectContaining({ cardId: SECOND, origin: 'battle_draw', faceDown: false }),
    ]);
    expect(state.battle?.stage).toBe('dice');
    expect(toPublicGameView(state).battle?.attacker.battleDrawPlayed[0]).toMatchObject({ cardId: SECOND });
  });

  it('replaces a battle-drawn Scouting Report and chains another early Scouting Report', () => {
    let state = game();
    beginPreRevealBattle(
      state,
      played(SCOUTING_REPORT, 'player_1'),
      played(FIRST, 'player_2', 'hand'),
      [],
      [SCOUTING_REPORT, THIRD],
    );

    continueIntelligenceBattle(state);
    state = applyGameAction(state, {
      type: 'resolve_neutral_choice',
      playerId: 'player_1',
      choice: 'replace',
      cardId: SCOUTING_REPORT,
    }).state;

    expect(state.players.player_1.zones.graveyard).toEqual([SCOUTING_REPORT]);
    expect(state.battle?.attacker.battleDraw).toEqual([THIRD]);
    expect(state.battle?.attacker.battleDrawPlayed).toHaveLength(1);
    expect(state.battle?.attacker.battleDrawPlayed[0]).toMatchObject({
      cardId: SCOUTING_REPORT,
      faceDown: false,
      earlyEffectResolved: true,
    });
    expect(state.pendingNeutralChoice).toMatchObject({ kind: 'scouting_report_battle_replace' });
  });

  it('Counterintelligence blocks Battle inspection but not the optional replacement', () => {
    let state = game();
    state.players.player_2.zones.assetBank = [COUNTERINTELLIGENCE];
    beginPreRevealBattle(
      state,
      played(SCOUTING_REPORT, 'player_1', 'hand'),
      played(FIRST, 'player_2', 'hand'),
      [],
      [SECOND],
    );

    continueIntelligenceBattle(state);

    expect(state.log.some((event) => event.type === 'neutral_counterintelligence_blocked')).toBe(true);
    expect(state.battle?.defender.handCommit?.visibleTo).toBeUndefined();
    expect(state.pendingNeutralChoice).toMatchObject({
      kind: 'scouting_report_battle_replace',
      replacementOptions: [SECOND],
    });
  });

  it('ignores canceled and negated Scouting Report sources', () => {
    const canceled = game();
    beginPreRevealBattle(
      canceled,
      played(SCOUTING_REPORT, 'player_1', 'hand', { canceled: true }),
      played(FIRST, 'player_2', 'hand'),
    );
    continueIntelligenceBattle(canceled);
    expect(canceled.pendingNeutralChoice).toBeUndefined();
    expect(canceled.battle?.stage).toBe('dice');

    const negated = game();
    beginPreRevealBattle(
      negated,
      played(SCOUTING_REPORT, 'player_1', 'battle_draw', { negated: true }),
      played(FIRST, 'player_2', 'hand'),
    );
    continueIntelligenceBattle(negated);
    expect(negated.pendingNeutralChoice).toBeUndefined();
    expect(negated.battle?.stage).toBe('dice');
  });
});
