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
  V070_GUILT_BY_ASSOCIATION_BATTLE_TEXT,
  V070_GUILT_BY_ASSOCIATION_ID,
  pendingV070GuiltByAssociationAftermath,
} from './guilt-by-association-battle';
import { viewV070GameForPlayer } from './views';

function startBattle(): V070GameState {
  let state = createV070StarterGame({
    gameId: 'guilt-by-association-battle',
    seed: 'guilt-by-association-battle-seed',
    players: {
      A: {
        name: 'Inquisition',
        starterDeckId: 'inquisition-grand-inquisitor-final-judgment',
      },
      B: {
        name: 'Opponent',
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

function inject(
  state: V070GameState,
  owner: 'A' | 'B',
  cardId: string,
  suffix: string,
): string {
  const instanceId = `guilt-${owner}-${suffix}`;
  state.cardInstances[instanceId] = {
    instanceId,
    cardId,
    owner,
  };
  return instanceId;
}

function prepareTwoTitleGuiltBattle(): {
  state: V070GameState;
  guilt: string;
  fealty: string;
  rallyingCry: string;
} {
  let state = startBattle();
  const guilt = inject(
    state,
    'A',
    V070_GUILT_BY_ASSOCIATION_ID,
    'source',
  );
  const fealty = inject(
    state,
    'B',
    'neutral-fealty',
    'opposing-gambit',
  );
  state.players.A.zones.hand.push(guilt);
  state.players.B.zones.hand.push(fealty);

  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'A',
    cardInstanceId: guilt,
  });
  state = reduceV070BattleAction(state, {
    type: 'set_gambit',
    playerId: 'B',
    cardInstanceId: fealty,
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_gambits',
    playerId: 'A',
  });

  expect(
    state.battleRuntime?.guiltByAssociationBattleSources,
  ).toBeUndefined();
  expect(
    state.battleRuntime?.deferredGuiltByAssociationGambitCommitments,
  ).toEqual([
    expect.objectContaining({
      instanceId: guilt,
      owner: 'A',
      role: 'gambit',
    }),
  ]);

  const rallyingCry = inject(
    state,
    'B',
    'neutral-rallying-cry',
    'opposing-tactic',
  );
  state.battleRuntime!.participants.B.reserve.push(rallyingCry);

  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'A',
  });
  state = reduceV070BattleAction(state, {
    type: 'choose_tactic',
    playerId: 'B',
    cardInstanceId: rallyingCry,
  });
  state = reduceV070BattleAction(state, {
    type: 'reveal_tactics',
    playerId: 'A',
  });

  return { state, guilt, fealty, rallyingCry };
}

describe('Guilt by Association battle effect', () => {
  test('binds exact unchanged frozen/current battle authority', () => {
    for (const card of [
      v070CanonicalContent.cardsById.get(
        V070_GUILT_BY_ASSOCIATION_ID,
      ),
      currentCanonicalContent.cardsById.get(
        V070_GUILT_BY_ASSOCIATION_ID,
      ),
    ]) {
      expect(
        card?.effects.find(
          effect => effect.label === 'Gambit/Tactic',
        )?.text,
      ).toBe(V070_GUILT_BY_ASSOCIATION_BATTLE_TEXT);
    }
  });

  test('a Gambit waits until Tactics reveal, then snapshots both opposing committed titles', () => {
    const { state, fealty, rallyingCry } =
      prepareTwoTitleGuiltBattle();

    expect(
      state.battleRuntime?.deferredGuiltByAssociationGambitCommitments,
    ).toEqual([]);
    expect(
      state.battleRuntime?.guiltByAssociationBattleSources,
    ).toEqual([
      expect.objectContaining({
        owner: 'A',
        opponent: 'B',
        candidateCardIds: [
          state.cardInstances[fealty].cardId,
          state.cardInstances[rallyingCry].cardId,
        ],
      }),
    ]);
  });

  test('resolves through shared Aftermath timing, moves every matching title, and gains +2 Conviction for two cards', () => {
    let { state, guilt, fealty, rallyingCry } =
      prepareTwoTitleGuiltBattle();

    const matchOne = inject(
      state,
      'B',
      state.cardInstances[fealty].cardId,
      'discard-match-1',
    );
    const matchTwo = inject(
      state,
      'B',
      state.cardInstances[fealty].cardId,
      'discard-match-2',
    );
    const other = inject(
      state,
      'B',
      state.cardInstances[rallyingCry].cardId,
      'discard-other',
    );
    state.players.B.zones.discardPile.push(
      matchOne,
      matchTwo,
      other,
    );

    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'A',
      values: [6],
    });
    state = reduceV070BattleAction(state, {
      type: 'submit_battle_dice',
      playerId: 'B',
      values: [1],
    });
    expect(state.battleRuntime?.stage).toBe('aftermath');

    state = reduceV070BattleAction(state, {
      type: 'complete_aftermath',
      playerId: 'A',
    });

    const pending = pendingV070GuiltByAssociationAftermath(state);
    expect(pending).toEqual(expect.objectContaining({
      playerId: 'A',
      owner: 'A',
      opponent: 'B',
      sourceInstanceId: guilt,
      candidateCardIds: expect.arrayContaining([
        state.cardInstances[fealty].cardId,
        state.cardInstances[rallyingCry].cardId,
      ]),
    }));

    const opponentView = viewV070GameForPlayer(state, 'B');
    expect(
      opponentView.pendingGuiltByAssociationAftermath,
    ).toEqual(expect.objectContaining({
      playerId: 'A',
      candidateCount: 2,
    }));
    expect(
      opponentView.pendingGuiltByAssociationAftermath
        ?.candidateCardIds,
    ).toBeUndefined();

    expect(state.players.A.inquisition?.conviction).toBe(0);
    state = reduceV070BattleAction(state, {
      type: 'resolve_guilt_by_association_aftermath',
      playerId: 'A',
      targetCardId: state.cardInstances[fealty].cardId,
    });

    expect(state.players.B.zones.discardPile).toContain(other);
    expect(state.players.B.zones.discardPile).not.toContain(matchOne);
    expect(state.players.B.zones.discardPile).not.toContain(matchTwo);
    expect(state.players.B.zones.graveyard).toEqual(
      expect.arrayContaining([matchOne, matchTwo]),
    );
    expect(state.players.A.inquisition?.conviction).toBe(2);
    expect(
      pendingV070GuiltByAssociationAftermath(state),
    ).toBeNull();
    expect(state.events).toEqual(expect.arrayContaining([
      expect.objectContaining({
        type: 'guilt_by_association_battle_resolved',
        actor: 'A',
        visibility: 'public',
        payload: expect.objectContaining({
          movedCount: 2,
        }),
      }),
    ]));
  });

  test('deduplicates duplicate opposing battle cards by title', () => {
    let state = startBattle();
    const guilt = inject(
      state,
      'A',
      V070_GUILT_BY_ASSOCIATION_ID,
      'dedupe-source',
    );
    const first = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'dedupe-gambit',
    );
    state.players.A.zones.hand.push(guilt);
    state.players.B.zones.hand.push(first);

    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'A',
      cardInstanceId: guilt,
    });
    state = reduceV070BattleAction(state, {
      type: 'set_gambit',
      playerId: 'B',
      cardInstanceId: first,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_gambits',
      playerId: 'A',
    });

    const second = inject(
      state,
      'B',
      'neutral-rallying-cry',
      'dedupe-tactic',
    );
    state.battleRuntime!.participants.B.reserve.push(second);
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'A',
    });
    state = reduceV070BattleAction(state, {
      type: 'choose_tactic',
      playerId: 'B',
      cardInstanceId: second,
    });
    state = reduceV070BattleAction(state, {
      type: 'reveal_tactics',
      playerId: 'A',
    });

    expect(
      state.battleRuntime?.guiltByAssociationBattleSources?.[0]
        ?.candidateCardIds,
    ).toEqual(['neutral-rallying-cry']);
  });
});
