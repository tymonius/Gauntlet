import type { CardID, InquisitionPurgeMode, IntelligenceMissionKind, MysticRiteId, PlayerID, ProposalID, SpaceID } from '../types/v06';
import type { BattleCardTarget } from '../effects/v06';

export type ActionCardTarget =
  | { kind: 'player'; playerId: PlayerID }
  | { kind: 'space'; spaceId: SpaceID }
  | { kind: 'card'; cardId: CardID; owner: PlayerID };

export type GameAction =
  | DrawCardAction | RevealSpaceAction | PlayActionCardAction | ResolveAssetBankDiscardAction
  | MovePlayerAction | CommitBattleHandCardAction | PassBattleHandCommitAction
  | DrawBattleCardsAction | PlayBattleDrawCardAction | PassBattleDrawPlayAction
  | RollBattleDieAction | ResolveBattleAction | EndTurnAction;

export type StateAction = GameAction | ResolveBattleRevealAction | UseLeaderAbilityAction | PassLeaderAbilityWindowAction
  | ResolveMilitaryChoiceAction | ResolveMilitaryTimingChoiceAction | ResolveDiplomatChoiceAction
  | UseDiplomatCardAction | PlaceTreasuryCardAction | BeginDeedPurchaseAction
  | BeginPlayTheMarketAction | UseHostileTakeoverAction | ResolveFinancierChoiceAction;

export type IntelligenceStateAction = StartIntelligenceMissionAction | CompleteIntelligenceMissionAction
  | AbortIntelligenceMissionAction | CompleteSpecialOperationAction | ResolveIntelligenceChoiceAction;

export type MysticsStateAction = BeginMysticRiteAction | ResolveMysticsChoiceAction
  | UseMysticTransmutationAction | UseMysticGraveWardAssetAction
  | UseMysticBlackCovenantAction | UseMysticBlackCovenantBattleAction;

export type InquisitionStateAction = UseInquisitionPurgeAction | ResolveInquisitionChoiceAction;

export type AppStateAction = StateAction | IntelligenceStateAction | MysticsStateAction | InquisitionStateAction;

export interface DrawCardAction { type: 'draw_card'; playerId: PlayerID; count?: number; }
export interface RevealSpaceAction { type: 'reveal_space'; playerId: PlayerID; spaceId: SpaceID; }
export interface PlayActionCardAction { type: 'play_action_card'; playerId: PlayerID; cardId: CardID; targets?: ActionCardTarget[]; }
export interface UseLeaderAbilityAction { type: 'use_leader_ability'; playerId: PlayerID; abilityId: string; }
export interface PassLeaderAbilityWindowAction { type: 'pass_leader_ability_window'; playerId: PlayerID; }
export interface ResolveMilitaryChoiceAction { type: 'resolve_military_choice'; playerId: PlayerID; choice: string; cardId?: CardID; }
export interface ResolveMilitaryTimingChoiceAction { type: 'resolve_military_timing_choice'; playerId: PlayerID; choice: string; cardId?: CardID; secondaryCardId?: CardID; }
export interface ResolveDiplomatChoiceAction { type: 'resolve_diplomat_choice'; playerId: PlayerID; choice: string; proposalId?: ProposalID; amount?: number; cardIds?: CardID[]; cardId?: CardID; opponentId?: PlayerID; spaceId?: SpaceID; }
export interface UseDiplomatCardAction { type: 'use_diplomat_card'; playerId: PlayerID; cardId: CardID; opponentId?: PlayerID; targetCardId?: CardID; spaceId?: SpaceID; proposalId?: ProposalID; }
export interface PlaceTreasuryCardAction { type: 'place_treasury_card'; playerId: PlayerID; cardId: CardID; }
export interface BeginDeedPurchaseAction { type: 'begin_deed_purchase'; playerId: PlayerID; spaceId: SpaceID; }
export interface BeginPlayTheMarketAction { type: 'begin_play_the_market'; playerId: PlayerID; cardId: CardID; }
export interface UseHostileTakeoverAction { type: 'use_hostile_takeover'; playerId: PlayerID; }
export interface ResolveFinancierChoiceAction { type: 'resolve_financier_choice'; playerId: PlayerID; choice: string; cardId?: CardID; cardIds?: CardID[]; amount?: number; spaceId?: SpaceID; }
export interface StartIntelligenceMissionAction { type: 'start_intelligence_mission'; playerId: PlayerID; cardId: CardID; kind: IntelligenceMissionKind; }
export interface CompleteIntelligenceMissionAction { type: 'complete_intelligence_mission'; playerId: PlayerID; }
export interface AbortIntelligenceMissionAction { type: 'abort_intelligence_mission'; playerId: PlayerID; }
export interface CompleteSpecialOperationAction { type: 'complete_special_operation'; playerId: PlayerID; }
export interface ResolveIntelligenceChoiceAction { type: 'resolve_intelligence_choice'; playerId: PlayerID; choice: string; cardId?: CardID; targets?: ActionCardTarget[]; }
export interface BeginMysticRiteAction { type: 'begin_mystic_rite'; playerId: PlayerID; riteId: MysticRiteId; cardId: CardID; secondaryCardId?: CardID; source?: 'hand' | 'discard'; }
export interface ResolveMysticsChoiceAction { type: 'resolve_mystics_choice'; playerId: PlayerID; choice: string; targetKey?: string; cardId?: CardID; cardIds?: CardID[]; secondaryCardId?: CardID; spaceId?: SpaceID; targetPlayerId?: PlayerID; value?: number; values?: number[]; }
export interface UseMysticTransmutationAction { type: 'use_mystic_transmutation'; playerId: PlayerID; cardId: CardID; }
export interface UseMysticGraveWardAssetAction { type: 'use_mystic_grave_ward_asset'; playerId: PlayerID; choice: 'pass' | 'use'; entryId: string; }
export interface UseMysticBlackCovenantAction { type: 'use_mystic_black_covenant_action'; playerId: PlayerID; bindingId: string; targets?: ActionCardTarget[]; }
export interface UseMysticBlackCovenantBattleAction { type: 'use_mystic_black_covenant_battle'; playerId: PlayerID; bindingId: string; }
export interface UseInquisitionPurgeAction { type: 'use_inquisition_purge'; playerId: PlayerID; mode: InquisitionPurgeMode; cardId?: CardID; cardIds?: CardID[]; }
export interface ResolveInquisitionChoiceAction { type: 'resolve_inquisition_choice'; playerId: PlayerID; choice?: string; cardId: CardID; cardIds?: CardID[]; targetKey?: string; amount?: number; secondaryAmount?: number; }
export interface ResolveAssetBankDiscardAction { type: 'resolve_asset_bank_discard'; playerId: PlayerID; cardIds: CardID[]; }
export interface MovePlayerAction { type: 'move_player'; playerId: PlayerID; toSpaceId: SpaceID; cardId?: CardID; }
export interface FinishMovementAction { type: 'finish_movement'; playerId: PlayerID; }
export interface UseNeutralReinforcementsAssetAction { type: 'use_neutral_reinforcements_asset'; playerId: PlayerID; }
export interface ResolveNeutralChoiceAction {
  type: 'resolve_neutral_choice';
  playerId: PlayerID;
  choice:
    | 'pass'
    | 'use'
    | 'select_card'
    | 'select_cards'
    | 'inspect_own_draw'
    | 'inspect_opponent_draw'
    | 'inspect_opponent_hand'
    | 'inspect'
    | 'replace'
    | 'keep'
    | 'exchange'
    | 'deactivate_overlay'
    | 'prevent_overlay';
  cardId?: CardID;
  cardIds?: CardID[];
  targetKey?: string;
  value?: number;
  values?: number[];
}
export interface CommitBattleHandCardAction { type: 'commit_battle_hand_card'; playerId: PlayerID; cardId: CardID; }
export interface PassBattleHandCommitAction { type: 'pass_battle_hand_commit'; playerId: PlayerID; }
export interface DrawBattleCardsAction { type: 'draw_battle_cards'; playerId: PlayerID; count?: number; }
export interface PlayBattleDrawCardAction { type: 'play_battle_draw_card'; playerId: PlayerID; cardId: CardID; }
export interface PassBattleDrawPlayAction { type: 'pass_battle_draw_play'; playerId: PlayerID; }
export interface ResolveBattleRevealAction { type: 'resolve_battle_reveal'; playerId: PlayerID; battleCardTargets?: BattleCardTarget[]; }
export interface RollBattleDieAction { type: 'roll_battle_die'; playerId: PlayerID; value?: number; values?: number[]; }
export interface ResolveBattleAction { type: 'resolve_battle'; playerId: PlayerID; battleCardTargets?: BattleCardTarget[]; }
export interface EndTurnAction { type: 'end_turn'; playerId: PlayerID; }

export interface ActionResult { drawnCards?: CardID[]; battleDrawnCards?: CardID[]; }
