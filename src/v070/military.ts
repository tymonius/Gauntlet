import {
  V070GameActionError,
  appendV070Event,
  type V070GameState,
} from './engine';
import {
  beginEffectGrantedV070Movement,
  retreatV070Position,
  type PlayerId,
} from './rules';
import { advanceV070FrontLine } from './front-line';
import { openV070BlockadeChoicesForPositionChange } from './movement-triggers';
import { v070QuicksandCapsMovement } from './territories';

export const V070_MILITARY_COMMAND_MAX = 2 as const;

export function gainV070MilitaryCommandForBattleWin(
  state: V070GameState,
  winner: PlayerId,
): void {
  const military = state.players[winner]?.military;
  if (!military || military.commandGainTurn === state.turnNumber) return;

  military.commandGainTurn = state.turnNumber;
  const before = military.command;
  military.command = Math.min(
    V070_MILITARY_COMMAND_MAX,
    military.command + 1,
  );

  appendV070Event(state, {
    type: 'military_command_gained',
    actor: winner,
    visibility: 'public',
    payload: {
      amount: military.command - before,
      balance: military.command,
      capped: before >= V070_MILITARY_COMMAND_MAX,
      turnNumber: state.turnNumber,
    },
  });
}

export function spendV070MilitaryCommand(
  state: V070GameState,
  playerId: PlayerId,
  amount: number,
  order: string,
): void {
  const military = state.players[playerId]?.military;
  if (!military) {
    throw new V070GameActionError(
      `${playerId} is not using the Military faction.`,
    );
  }
  if (!Number.isInteger(amount) || amount < 1) {
    throw new V070GameActionError(
      'Military Command costs must be positive integers.',
    );
  }
  if (military.command < amount) {
    throw new V070GameActionError(
      `${order} requires ${amount} Command.`,
    );
  }

  military.command -= amount;
}

export function useV070GeneralOnward(
  state: V070GameState,
  playerId: PlayerId,
): void {
  requireMilitaryLeader(state, playerId, 'general', 'Onward');
  const turn = state.turnState;
  if (state.activePlayer !== playerId
    || !turn
    || turn.phase !== 'movement'
    || !turn.movementSequenceOpen
    || turn.movementSequenceSource !== 'normal'
    || state.battle) {
    throw new V070GameActionError(
      'Onward may be used only during your open normal Movement sequence.',
    );
  }
  if (v070QuicksandCapsMovement(state, playerId)) {
    throw new V070GameActionError(
      'Quicksand prevents increasing this Movement sequence.',
    );
  }

  spendV070MilitaryCommand(state, playerId, 1, 'Onward');
  turn.movementStepQueue.push({
    source: 'General Onward',
    choiceRestriction: 'any',
    battleRestriction: 'allowed',
  });
  turn.movementRemaining = turn.movementStepQueue.length;

  appendOrderEvent(state, playerId, 'Onward', 1, {
    movementRemaining: turn.movementRemaining,
  });
}

export function v070GeneralRoutAvailableAtEndOfAftermath(
  state: V070GameState,
): boolean {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || runtime.stage !== 'aftermath'
    || !runtime.aftermathCardsCleared
    || runtime.pendingRunGauntletWinner
    || battle.winner !== battle.attacker) {
    return false;
  }
  const attacker = state.players[battle.attacker];
  return attacker.leaderId === 'general'
    && Boolean(attacker.military)
    && (attacker.military?.command ?? 0) >= 2;
}

export function useV070GeneralRout(
  state: V070GameState,
  playerId: PlayerId,
): void {
  requireMilitaryLeader(state, playerId, 'general', 'Rout');
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || runtime.stage !== 'aftermath'
    || !runtime.aftermathCardsCleared
    || !runtime.routWindowOpen
    || battle.winner !== playerId
    || battle.attacker !== playerId) {
    throw new V070GameActionError(
      'Rout may be used only at the end of Aftermath after winning as attacker.',
    );
  }
  if (!state.turnState) {
    throw new V070GameActionError(
      'Rout requires the active turn movement context.',
    );
  }

  spendV070MilitaryCommand(state, playerId, 2, 'Rout');
  const phase = state.turnState.phase;
  state.turnState = beginEffectGrantedV070Movement(
    state.turnState,
    1,
    {
      source: 'General Rout',
      choiceRestriction: 'advance_required',
      battleRestriction: 'allowed',
    },
  );
  state.battle = null;
  state.battleRuntime = null;

  appendOrderEvent(state, playerId, 'Rout', 2, {
    phase,
    movementRemaining: 1,
  });
}

export function useV070GeneralRally(
  state: V070GameState,
  playerId: PlayerId,
): void {
  requireMilitaryLeader(state, playerId, 'general', 'Rally');
  const battle = requireBattleBeforeDice(state);
  if (battle.attacker !== playerId) {
    throw new V070GameActionError(
      'Rally may be used only while attacking in a battle you initiated.',
    );
  }

  spendV070MilitaryCommand(state, playerId, 1, 'Rally');
  const participant = state.battleRuntime!.participants[playerId];
  participant.battleModifier += 1;

  appendOrderEvent(state, playerId, 'Rally', 1, {
    battleModifier: participant.battleModifier,
  });
}

export function useV070CommandantEntrench(
  state: V070GameState,
  playerId: PlayerId,
): void {
  requireMilitaryLeader(state, playerId, 'commandant', 'Entrench');
  const battle = requireBattleBeforeDice(state);
  if (battle.defender !== playerId) {
    throw new V070GameActionError(
      'Entrench may be used only while defending in a battle you did not initiate.',
    );
  }

  spendV070MilitaryCommand(state, playerId, 1, 'Entrench');
  const participant = state.battleRuntime!.participants[playerId];
  participant.battleModifier += 1;

  appendOrderEvent(state, playerId, 'Entrench', 1, {
    battleModifier: participant.battleModifier,
  });
}

export function useV070CommandantRepel(
  state: V070GameState,
  playerId: PlayerId,
): void {
  requireMilitaryLeader(state, playerId, 'commandant', 'Repel');
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || runtime.stage !== 'aftermath'
    || runtime.aftermathCardsCleared
    || battle.winner !== playerId
    || battle.defender !== playerId
    || battle.loser !== battle.attacker) {
    throw new V070GameActionError(
      'Repel may be used during Aftermath only after winning as defender.',
    );
  }

  spendV070MilitaryCommand(state, playerId, 1, 'Repel');

  const loser = battle.attacker;
  const from = battle.positions[loser];
  const to = retreatV070Position(
    loser,
    from,
    battle.territoryCount,
  );
  battle.positions[loser] = to;
  if (from !== to) {
    openV070BlockadeChoicesForPositionChange(
      state,
      loser,
      from,
      to,
    );
  }

  appendOrderEvent(state, playerId, 'Repel', 1, {
    loser,
    from,
    to,
    moved: from !== to,
  });
}

export function useV070CommandantFortify(
  state: V070GameState,
  playerId: PlayerId,
): { reachedOpponentEnd: boolean } {
  requireMilitaryLeader(state, playerId, 'commandant', 'Fortify');
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle
    || !runtime
    || runtime.stage !== 'aftermath'
    || runtime.aftermathCardsCleared
    || battle.winner !== playerId) {
    throw new V070GameActionError(
      'Fortify may be used during Aftermath only after winning the battle.',
    );
  }

  const position = battle.positions[playerId];
  const territory = Number.isInteger(position)
    ? state.board[position]
    : undefined;
  if (!territory || territory.controller === playerId) {
    throw new V070GameActionError(
      'Fortify requires winning while occupying an enemy Territory.',
    );
  }

  spendV070MilitaryCommand(state, playerId, 2, 'Fortify');
  const result = advanceV070FrontLine(
    state,
    playerId,
    1,
    'Commandant Fortify',
  );

  appendOrderEvent(state, playerId, 'Fortify', 2, {
    captures: result.captures,
    reachedOpponentEnd: result.reachedOpponentEnd,
  });

  return { reachedOpponentEnd: result.reachedOpponentEnd };
}

function requireMilitaryLeader(
  state: V070GameState,
  playerId: PlayerId,
  leaderId: 'general' | 'commandant',
  order: string,
): void {
  const player = state.players[playerId];
  if (!player?.military || player.leaderId !== leaderId) {
    throw new V070GameActionError(
      `${order} is available only to the ${leaderId === 'general' ? 'General' : 'Commandant'}.`,
    );
  }
}

function requireBattleBeforeDice(state: V070GameState) {
  const battle = state.battle;
  const runtime = state.battleRuntime;
  if (!battle || !runtime || runtime.stage !== 'outcome') {
    throw new V070GameActionError(
      'This Military Order may be used only before battle dice are rolled.',
    );
  }
  if (runtime.participants.A.battleDice.length > 0
    || runtime.participants.B.battleDice.length > 0) {
    throw new V070GameActionError(
      'This Military Order must be used before either player rolls battle dice.',
    );
  }
  return battle;
}

function appendOrderEvent(
  state: V070GameState,
  playerId: PlayerId,
  order: string,
  cost: number,
  details: Record<string, unknown>,
): void {
  appendV070Event(state, {
    type: 'military_order_used',
    actor: playerId,
    visibility: 'public',
    payload: {
      order,
      commandCost: cost,
      commandRemaining:
        state.players[playerId].military?.command ?? 0,
      ...details,
    },
  });
}
