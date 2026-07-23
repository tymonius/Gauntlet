import { militaryCardDefinitions } from '../cards';
import type { GameState, PlayerID } from '../types';
import type { StateAction } from '../state';
import { toPrivateGameView } from '../state';

export interface GuidedOption { label: string; action: StateAction; sourceCardId?: string; cardText?: string; }
export function activeViewer(game: GameState): PlayerID { return game.priorityPlayer ?? game.activePlayer; }
function exactCardText(cardId: string): string | undefined { const card = militaryCardDefinitions.find((candidate) => candidate.id === cardId); if (!card) return undefined; const sections: string[] = [`${card.name} — Cost ${card.cost}`, `Action: ${card.action}`, `Battle: ${card.battle}`]; if (card.supplemental) sections.push(...card.supplemental); return sections.join('\n\n'); }
function militaryOption(label: string, action: StateAction, sourceCardId: string): GuidedOption { return { label, action, sourceCardId, cardText: exactCardText(sourceCardId) }; }

function pendingDiplomatOptions(game: GameState, playerId: PlayerID): GuidedOption[] | undefined {
  const pending = game.pendingDiplomatChoice;
  if (!pending || pending.playerId !== playerId) return undefined;
  const option = (label: string, choice: string, extra: Partial<Extract<StateAction, { type: 'resolve_diplomat_choice' }>> = {}): GuidedOption => ({ label, action: { type: 'resolve_diplomat_choice', playerId, choice, ...extra } });
  switch (pending.kind) {
    case 'offer_terms': return [option('Decline to offer Terms', 'decline'), ...pending.eligibleProposals.map((proposalId) => option(`Offer ${proposalId}`, 'offer', { proposalId }))];
    case 'respond_to_terms': return pending.options.map((choice) => option(`${choice === 'accept' ? 'Accept' : 'Refuse'} Terms`, choice));
    case 'leverage': return pending.options.map((amount) => option(`Spend ${amount} Influence on Leverage`, String(amount), { amount }));
    case 'political_capital': return [option('Preserve no Influence', 'resolve', { cardIds: [] }), ...pending.handOptions.map((cardId) => option(`Sacrifice ${cardId}`, 'resolve', { cardIds: [cardId] }))];
    case 'mutual_disarmament': return pending.handOptions.map((cardId) => option(`Discard ${cardId}`, 'select', { cardId }));
    case 'prisoner_exchange': return [option('Recover no card', 'pass', { cardIds: [] }), ...pending.graveyardOptions.map((cardId) => option(`Move ${cardId} to Discard`, 'select', { cardId }))];
    case 'rebuilding_pact': return [option('Bank no Asset', 'pass', { cardIds: [] }), ...pending.handOptions.map((cardId) => option(`Bank ${cardId}`, 'select', { cardId }))];
    case 'trade_concessions': return [option('Draw two cards', 'draw_two'), ...game.players[playerId].zones.hand.map((cardId) => option(`Bank ${cardId}`, 'bank_asset', { cardId }))];
    case 'nonbinding_resolution': return pending.options.map((choice) => option(choice === 'ratify' ? 'Ratify normally' : 'Leave unratified; Diplomat gains 2 Influence', choice));
    case 'latitude_refusal': return pending.proposalIds.map((proposalId) => option(`Resolve ${proposalId}`, 'select', { proposalId }));
    case 'clemency': return pending.options.map((choice) => option(choice === 'release' ? `Move ${pending.cardId} to Discard` : `Leave ${pending.cardId} in Graveyard`, choice));
    case 'censure': return [option('Let the Diplomat draw', 'diplomat_draw'), ...game.players[playerId].zones.hand.map((cardId) => option(`Discard ${cardId}`, 'discard', { cardId }))];
    case 'demilitarized_zone_upkeep': return [option('Withdraw from the Demilitarized Zone', 'withdraw'), ...game.players[playerId].zones.hand.map((cardId) => option(`Discard ${cardId} to remain`, 'discard', { cardId }))];
    case 'sanction_movement': return [option('Let the Diplomat gain 1 Influence', 'influence'), ...game.players[playerId].zones.hand.map((cardId) => option(`Discard ${cardId}`, 'discard', { cardId }))];
  }
}

function pendingMilitaryOptions(game: GameState, playerId: PlayerID): GuidedOption[] | undefined {
  const timing = game.pendingMilitaryTimingChoice;
  if (timing?.playerId === playerId) {
    const base = (label: string, choice: string, cardId?: string, secondaryCardId?: string) => militaryOption(label, { type: 'resolve_military_timing_choice', playerId, choice, cardId, secondaryCardId }, timing.sourceCardId);
    switch (timing.kind) {
      case 'brothers_in_arms_precommit': case 'military_asset_precommit': return timing.options.map((choice) => base(`${choice === 'use' ? 'Use' : 'Pass'} ${timing.sourceCardId}`, choice));
      case 'brothers_in_arms_selection': { const options: GuidedOption[] = [base('Choose neither card', 'neither')]; for (const handCard of timing.handOptions) for (const battleCard of timing.battleHandOptions) options.push(base(`Commit ${handCard} and reveal ${battleCard}`, 'select', handCard, battleCard)); return options; }
      case 'reserve_force_after_reveal': { const options: GuidedOption[] = []; if (timing.options.includes('deploy_stored') && timing.storedCard) options.push(base(`Deploy stored ${timing.storedCard}`, 'deploy_stored')); if (timing.options.includes('replace_from_hand')) for (const cardId of timing.handOptions) options.push(base(`Replace Reserve Force with ${cardId}`, 'replace_from_hand', cardId)); if (timing.options.includes('pass')) options.push(base('Pass Reserve Force', 'pass')); return options; }
      case 'hold_the_line_after_reveal': return [...timing.options.map((cardId) => base(`Reveal ${cardId} with Hold the Line`, cardId, cardId)), base('Reveal no additional card', 'pass')];
      case 'shock_and_awe_after_reveal': return [...timing.handOptions.map((cardId) => base(`Reveal ${cardId} with Shock and Awe`, cardId, cardId)), base('Reveal no additional card', 'pass')];
    }
  }
  const aftermath = game.pendingMilitaryChoice;
  if (aftermath?.playerId === playerId) {
    const base = (label: string, choice: string, cardId?: string) => militaryOption(label, { type: 'resolve_military_choice', playerId, choice, cardId }, aftermath.sourceCardId);
    switch (aftermath.kind) { case 'battlefield_promotion': return aftermath.options.map((cardId) => base(`Return ${cardId} to hand`, cardId, cardId)); case 'countercharge': case 'war_crimes': return aftermath.options.map((choice) => base(`${choice === 'use' ? 'Use' : 'Pass'} ${aftermath.sourceCardId}`, choice)); case 'shock_and_awe': return aftermath.options.map((choice) => base(`Choose ${choice}`, choice)); }
  }
  return undefined;
}

function adjacentSpaces(game: GameState, playerId: PlayerID) { const current = game.board.spaces.find((space) => space.occupant === playerId); if (!current) return []; return game.board.spaces.filter((space) => Math.abs(space.index - current.index) === 1); }
export function buildGuidedOptions(game: GameState): GuidedOption[] {
  const playerId = activeViewer(game);
  const diplomatPending = pendingDiplomatOptions(game, playerId); if (diplomatPending) return diplomatPending;
  const militaryPending = pendingMilitaryOptions(game, playerId); if (militaryPending) return militaryPending;
  const view = toPrivateGameView(game, playerId); const options: GuidedOption[] = [];
  const discard = game.pendingAssetBankDiscards?.[playerId]; if (discard) { if (discard.discardCount === 1) for (const cardId of discard.options) options.push({ label: `Discard ${cardId} from Asset Bank`, action: { type: 'resolve_asset_bank_discard', playerId, cardIds: [cardId] } }); return options; }
  if (game.pendingLeaderAbilityWindow?.playerId === playerId) { for (const ability of view.legalLeaderAbilities ?? []) options.push({ label: `Use ${ability.name}`, action: { type: 'use_leader_ability', playerId, abilityId: ability.abilityId } }); options.push({ label: 'Pass Leader ability window', action: { type: 'pass_leader_ability_window', playerId } }); return options; }
  if (game.phase === 'turn_start') options.push({ label: 'Draw 1 card', action: { type: 'draw_card', playerId } });
  if (game.phase === 'action_before_movement' || game.phase === 'action_after_movement') for (const play of view.legalActionPlays ?? []) options.push({ label: `Play Action ${play.cardId}`, action: { type: 'play_action_card', playerId, cardId: play.cardId } });
  if (game.phase === 'movement') for (const space of adjacentSpaces(game, playerId)) options.push({ label: `Move to ${space.id}${space.occupant ? ` occupied by ${space.occupant}` : ''}`, action: { type: 'move_player', playerId, toSpaceId: space.id } });
  for (const play of view.battle?.legalBattlePlays ?? []) { if (play.action === 'commit_battle_hand_card' && play.cardId) options.push({ label: `Commit ${play.cardId} from hand`, action: { type: 'commit_battle_hand_card', playerId, cardId: play.cardId } }); else if (play.action === 'play_battle_draw_card' && play.cardId) options.push({ label: `Play battle-drawn ${play.cardId}`, action: { type: 'play_battle_draw_card', playerId, cardId: play.cardId } }); else if (play.action === 'pass_battle_hand_commit') options.push({ label: 'Pass hand commitment', action: { type: 'pass_battle_hand_commit', playerId } }); else if (play.action === 'pass_battle_draw_play') options.push({ label: 'Pass Battle Hand selection', action: { type: 'pass_battle_draw_play', playerId } }); }
  if (game.battle?.stage === 'battle_draw') options.push({ label: 'Draw Battle Hand', action: { type: 'draw_battle_cards', playerId } });
  if (game.battle?.stage === 'dice') for (const value of [1, 2, 3, 4, 5, 6]) options.push({ label: `Roll ${value}`, action: { type: 'roll_battle_die', playerId, value } });
  if (game.battle?.stage === 'resolution') options.push({ label: 'Resolve battle', action: { type: 'resolve_battle', playerId } });
  if (game.phase !== 'battle' && game.phase !== 'game_over' && playerId === game.activePlayer) options.push({ label: 'End turn', action: { type: 'end_turn', playerId } });
  return options;
}
