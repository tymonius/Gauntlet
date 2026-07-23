import type {
  CardID,
  GameState,
  IntelligenceMissionKind,
  IntelligenceMissionState,
  PlayerID,
} from '../types';
import { markIntelligenceMissionRequirement } from './intelligence-missions';

const SPIES = 'intelligence-spies';
const FOG_OF_WAR = 'intelligence-fog-of-war';
const DISINFORMATION = 'intelligence-disinformation';
const RECONNAISSANCE = 'intelligence-reconnaissance';
const ASSASSINS = 'intelligence-assassins';
const SUBVERSION = 'intelligence-subversion';

interface MissionEntry {
  kind: IntelligenceMissionKind;
  mission: IntelligenceMissionState;
}

function missionEntries(game: GameState, playerId: PlayerID): MissionEntry[] {
  const intelligence = game.players[playerId]?.intelligence;
  if (!intelligence) return [];
  const entries: MissionEntry[] = [];
  if (intelligence.activeMission) entries.push({ kind: 'normal', mission: intelligence.activeMission });
  if (intelligence.specialOperation) entries.push({ kind: 'special_operation', mission: intelligence.specialOperation });
  return entries;
}

function addEvidence(mission: IntelligenceMissionState, evidence: string): void {
  if (!mission.evidence.includes(evidence)) mission.evidence.push(evidence);
}

function opponentId(game: GameState, playerId: PlayerID): PlayerID | undefined {
  return Object.keys(game.players).find((candidate) => candidate !== playerId);
}

function count(cards?: CardID[]): number {
  return cards?.length ?? 0;
}

function latestResolvedBattleLogIndex(game: GameState): number {
  for (let index = game.log.length - 1; index >= 0; index -= 1) {
    if (game.log[index].type === 'battle_resolved') return index;
  }
  return -1;
}

function battleOccurredAfterMissionStarted(game: GameState, mission: IntelligenceMissionState): boolean {
  const resolvedIndex = latestResolvedBattleLogIndex(game);
  return resolvedIndex >= (mission.startedLogIndex ?? 0);
}

export function recordFaceDownCardObservedBeforeReveal(
  game: GameState,
  playerId: PlayerID,
  battleId: string,
  source: string,
): void {
  for (const { mission } of missionEntries(game, playerId)) {
    if (mission.cardId === SPIES && !mission.requirementSatisfied) {
      addEvidence(mission, `spies:observed:${battleId}:${source}`);
    }
  }
}

export function recordOpponentHandLookOutsideBattle(game: GameState, playerId: PlayerID, source: string): void {
  if (game.phase === 'battle') return;
  for (const { mission } of missionEntries(game, playerId)) {
    if (mission.cardId === ASSASSINS && !mission.requirementSatisfied) {
      addEvidence(mission, `assassins:hand-look:${game.log.length}:${source}`);
    }
  }
}

export function recordBankedAssetUse(
  game: GameState,
  assetOwner: PlayerID,
  battleId: string,
  cardId: CardID,
): void {
  for (const player of Object.values(game.players)) {
    if (player.factionId !== 'intelligence' || !player.intelligence) continue;
    for (const { mission } of missionEntries(game, player.id)) {
      if (mission.cardId === SUBVERSION && !mission.requirementSatisfied) {
        addEvidence(mission, `subversion:asset:${battleId}:${assetOwner}:${cardId}`);
      }
    }
  }
}

function satisfiesBattleRequirement(
  game: GameState,
  playerId: PlayerID,
  mission: IntelligenceMissionState,
): boolean {
  const result = game.recentBattleResult;
  if (!result || result.winner !== playerId || !battleOccurredAfterMissionStarted(game, mission)) return false;
  const opponent = opponentId(game, playerId);
  if (!opponent) return false;

  const ownHand = count(result.handCommittedCards?.[playerId]);
  const opposingHand = count(result.handCommittedCards?.[opponent]);
  const opposingBattleHand = count(result.battleHandCards?.[opponent]);

  switch (mission.cardId) {
    case SPIES:
      return mission.evidence.some((entry) => entry.startsWith(`spies:observed:${result.battleId}:`));
    case FOG_OF_WAR:
      return opposingHand > 0 && opposingBattleHand > 0;
    case DISINFORMATION:
      return opposingHand > 0 && ownHand === 0;
    case RECONNAISSANCE: {
      const location = game.board.spaces.find((space) => space.id === result.location);
      return result.defender === playerId
        && location?.kind === 'territory'
        && Boolean(location.controller)
        && location.controller !== playerId;
    }
    case ASSASSINS:
      return opposingHand > 0 && mission.evidence.some((entry) => entry.startsWith('assassins:hand-look:'));
    case SUBVERSION: {
      const prefix = `subversion:asset:${result.battleId}:`;
      const opponentUsedAsset = mission.evidence.some((entry) => entry.startsWith(`${prefix}${opponent}:`));
      const intelligenceUsedAsset = mission.evidence.some((entry) => entry.startsWith(`${prefix}${playerId}:`));
      return opponentUsedAsset && !intelligenceUsedAsset;
    }
    default:
      return false;
  }
}

export function evaluateIntelligenceMissionRequirements(game: GameState): void {
  if (!game.recentBattleResult) return;
  for (const player of Object.values(game.players)) {
    if (player.factionId !== 'intelligence' || !player.intelligence) continue;
    for (const { kind, mission } of missionEntries(game, player.id)) {
      if (mission.requirementSatisfied || !satisfiesBattleRequirement(game, player.id, mission)) continue;
      markIntelligenceMissionRequirement(game, player.id, `battle:${game.recentBattleResult.battleId}`, kind);
    }
  }
}
