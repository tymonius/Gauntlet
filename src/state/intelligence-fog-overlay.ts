import type {
  BattleParticipantState,
  GameEvent,
  GameState,
  PlayerID,
  SpaceID,
} from '../types';
import type { ActionCardTarget, AppStateAction } from './actions';

export const FOG_OF_WAR_OVERLAY = 'intelligence-fog-of-war';

export class FogOfWarOverlayError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FogOfWarOverlayError';
  }
}

function publicLog(game: GameState, actor: PlayerID, type: string, message: string, payload?: unknown): void {
  game.log.push({
    id: `${game.id}-event-${game.log.length + 1}`,
    turn: game.turn,
    actor,
    type,
    message,
    payload,
    visibility: 'public',
  } satisfies GameEvent);
}

function removeOne(cards: string[], cardId: string): boolean {
  const index = cards.indexOf(cardId);
  if (index < 0) return false;
  cards.splice(index, 1);
  return true;
}

function actionTargetsFromLatestLog(game: GameState, playerId: PlayerID): ActionCardTarget[] | undefined {
  const event = [...game.log].reverse().find((candidate) => {
    if (candidate.type !== 'play_action_card' || candidate.actor !== playerId) return false;
    const payload = candidate.payload as { cardId?: string } | undefined;
    return payload?.cardId === FOG_OF_WAR_OVERLAY;
  });
  return (event?.payload as { targets?: ActionCardTarget[] } | undefined)?.targets;
}

function targetSpaceId(targets?: ActionCardTarget[]): SpaceID | undefined {
  return targets?.find((target): target is Extract<ActionCardTarget, { kind: 'space' }> => target.kind === 'space')?.spaceId;
}

export function fogOfWarOverlayTargets(game: GameState): SpaceID[] {
  return game.board.spaces
    .filter((space) => space.kind === 'territory')
    .filter((space) => !(space.overlays ?? []).some((overlay) => overlay.cardId === FOG_OF_WAR_OVERLAY))
    .map((space) => space.id);
}

export function canPlaceFogOfWarOverlay(game: GameState): boolean {
  return fogOfWarOverlayTargets(game).length > 0;
}

export function playFogOfWarOverlay(
  game: GameState,
  playerId: PlayerID,
  targets?: ActionCardTarget[],
): void {
  const spaceId = targetSpaceId(targets ?? actionTargetsFromLatestLog(game, playerId));
  if (!spaceId) throw new FogOfWarOverlayError('Fog of War requires a Territory target.');
  const space = game.board.spaces.find((candidate) => candidate.id === spaceId);
  if (!space || space.kind !== 'territory') throw new FogOfWarOverlayError('Fog of War must be placed on a Territory.');
  if ((space.overlays ?? []).some((overlay) => overlay.cardId === FOG_OF_WAR_OVERLAY)) {
    throw new FogOfWarOverlayError('That Territory already has a Fog of War Overlay.');
  }

  const player = game.players[playerId];
  if (!removeOne(player.zones.removed, FOG_OF_WAR_OVERLAY)) {
    throw new FogOfWarOverlayError('Fog of War did not reach its temporary Action destination.');
  }
  space.overlays ??= [];
  space.overlays.push({ cardId: FOG_OF_WAR_OVERLAY, owner: playerId, faceUp: true });
  publicLog(
    game,
    playerId,
    'intelligence_fog_of_war_overlay_placed',
    `${player.name} placed Fog of War on a Territory.`,
    { spaceId },
  );
}

function participantFor(game: GameState, playerId: PlayerID): BattleParticipantState {
  const battle = game.battle;
  if (!battle) throw new FogOfWarOverlayError('There is no active battle.');
  if (battle.attacker.playerId === playerId) return battle.attacker;
  if (battle.defender.playerId === playerId) return battle.defender;
  throw new FogOfWarOverlayError(`${playerId} is not participating in the battle.`);
}

function opposingPlayer(game: GameState, playerId: PlayerID): PlayerID {
  const battle = game.battle;
  if (!battle) throw new FogOfWarOverlayError('There is no active battle.');
  return battle.attacker.playerId === playerId ? battle.defender.playerId : battle.attacker.playerId;
}

function handChoiceComplete(participant: BattleParticipantState): boolean {
  return participant.passedHandCommit || Boolean(participant.handCommit);
}

function battleHandChoiceComplete(participant: BattleParticipantState): boolean {
  return participant.passedBattleDrawPlay
    || participant.battleDrawPlayed.length >= participant.battleDrawPlayLimit;
}

function hasPendingFactionWindow(game: GameState): boolean {
  return Boolean(
    game.pendingIntelligenceChoice
    || game.pendingMilitaryChoice
    || game.pendingMilitaryTimingChoice
    || game.pendingDiplomatChoice
    || game.pendingFinancierChoice
    || game.pendingLeaderAbilityWindow
    || Object.keys(game.pendingAssetBankDiscards ?? {}).length > 0,
  );
}

export function activateFogOfWarOverlayForBattle(game: GameState): boolean {
  const battle = game.battle;
  if (!battle || battle.fogOfWarOverlayOwner) return false;
  const space = game.board.spaces.find((candidate) => candidate.id === battle.location);
  const overlays = (space?.overlays ?? []).filter((overlay) => overlay.cardId === FOG_OF_WAR_OVERLAY);
  if (!space || overlays.length === 0) return false;

  space.overlays = (space.overlays ?? []).filter((overlay) => overlay.cardId !== FOG_OF_WAR_OVERLAY);
  for (const overlay of overlays) game.players[overlay.owner].zones.discard.push(overlay.cardId);

  const owners = [...new Set(overlays.map((overlay) => overlay.owner))];
  if (owners.length === 1) {
    battle.fogOfWarOverlayOwner = owners[0];
    publicLog(
      game,
      owners[0],
      'intelligence_fog_of_war_overlay_activated',
      'Fog of War changed the commitment order for the battle.',
      { spaceId: space.id, battleId: battle.id },
    );
  } else {
    publicLog(
      game,
      battle.attacker.playerId,
      'intelligence_fog_of_war_overlays_conflicted',
      'Opposing Fog of War Overlays conflicted, so the battle uses normal commitment order.',
      { spaceId: space.id, battleId: battle.id, owners },
    );
  }
  return true;
}

export function requireFogOfWarOverlayOrder(game: GameState, action: AppStateAction): void {
  const battle = game.battle;
  const owner = battle?.fogOfWarOverlayOwner;
  if (!battle || !owner || action.playerId !== owner) return;
  const opponent = participantFor(game, opposingPlayer(game, owner));

  if (battle.stage === 'hand_commit'
    && (action.type === 'commit_battle_hand_card' || action.type === 'pass_battle_hand_commit')
    && !handChoiceComplete(opponent)) {
    throw new FogOfWarOverlayError('Fog of War requires the opponent to make their hand commitment choice first.');
  }

  if (battle.stage === 'battle_play_selection'
    && (action.type === 'play_battle_draw_card' || action.type === 'pass_battle_draw_play')
    && !battleHandChoiceComplete(opponent)) {
    throw new FogOfWarOverlayError('Fog of War requires the opponent to make their Battle Hand choice first.');
  }
}

export function prioritizeFogOfWarOverlayChoice(game: GameState): void {
  const battle = game.battle;
  const owner = battle?.fogOfWarOverlayOwner;
  if (!battle || !owner || hasPendingFactionWindow(game)) return;
  const opponentId = opposingPlayer(game, owner);
  const ownerParticipant = participantFor(game, owner);
  const opponentParticipant = participantFor(game, opponentId);

  if (battle.stage === 'hand_commit') {
    if (!handChoiceComplete(opponentParticipant)) game.priorityPlayer = opponentId;
    else if (!handChoiceComplete(ownerParticipant)) game.priorityPlayer = owner;
    return;
  }

  if (battle.stage === 'battle_play_selection') {
    if (!battleHandChoiceComplete(opponentParticipant)) game.priorityPlayer = opponentId;
    else if (!battleHandChoiceComplete(ownerParticipant)) game.priorityPlayer = owner;
  }
}
