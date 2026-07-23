import { militaryCardDefinitions } from '../cards';
import type { GameState, PlayerID } from '../types';
import type { AppStateAction } from '../state';
import { cardValue, deedOwner, toPrivateGameView } from '../state';
import { buildBattleRevealOptions } from './battle-reveal-options';
import { buildIntelligenceMissionOptions } from './intelligence-options';

export interface GuidedOption { label: string; action: AppStateAction; sourceCardId?: string; cardText?: string; }
export function activeViewer(game: GameState): PlayerID { return game.priorityPlayer ?? game.activePlayer; }
function exactCardText(cardId: string): string | undefined { const card = militaryCardDefinitions.find((candidate) => candidate.id === cardId); if (!card) return undefined; const sections: string[] = [`${card.name} — Cost ${card.cost}`, `Action: ${card.action}`, `Battle: ${card.battle}`]; if (card.supplemental) sections.push(...card.supplemental); return sections.join('\n\n'); }
function militaryOption(label: string, action: AppStateAction, sourceCardId: string): GuidedOption { return { label, action, sourceCardId, cardText: exactCardText(sourceCardId) }; }
function affordableBattleCollateralSelections(cardIds: string[], capital: number, cost: number): string[][] {
  const selections: string[][] = [];
  const limit = Math.min(cardIds.length, 12);
  for (let mask = 0; mask < (1 << limit); mask += 1) {
    const selected = cardIds.slice(0, limit).filter((_, index) => (mask & (1 << index)) !== 0);
    if (capital + selected.reduce((sum, cardId) => sum + cardValue(cardId), 0) >= cost) selections.push(selected);
  }
  if (cardIds.length > limit) {
    const all = [...cardIds];
    if (capital + all.reduce((sum, cardId) => sum + cardValue(cardId), 0) >= cost) selections.push(all);
  }
  return selections;
}

function pendingFinancierOptions(game: GameState, playerId: PlayerID): GuidedOption[] | undefined {
  const pending = game.pendingFinancierChoice;
  if (!pending || pending.playerId !== playerId) return undefined;
  const option = (label: string, choice: string, cardId?: string, amount?: number, spaceId?: string, cardIds?: string[]): GuidedOption => ({ label, action: { type: 'resolve_financier_choice', playerId, choice, cardId, amount, spaceId, cardIds } });
  switch (pending.kind) {
    case 'play_the_market': return pending.options.map((roll) => option(`Roll ${roll} for ${pending.cardId}`, String(roll), undefined, roll));
    case 'subsidize': return pending.options.map((bonus) => option(bonus === 0 ? 'Pass Subsidize' : `Subsidize for +${bonus}`, String(bonus), undefined, bonus));
    case 'liquidation_purchase': return [option('Decline the immediate Deed purchase', 'pass'), ...pending.spaceOptions.map((spaceId) => option(`Immediately buy the Deed to ${spaceId}`, 'purchase', undefined, undefined, spaceId))];
    case 'margin_loan_repayment': return [option(`Repay Margin Loan for ${pending.repaymentCost} Capital`, 'repay'), option(`Default and lose ${pending.collateralCardId}`, 'default')];
    case 'battle_speculation': return pending.options.map((choice) => option(choice === 'spend' ? 'Spend 1 Capital on Speculation' : 'Pass Speculation', choice));
    case 'battle_liquidation': return [option('Pass Battle Liquidation', 'pass'), ...pending.treasuryOptions.map((cardId) => option(`Liquidate ${cardId}`, 'liquidate', cardId))];
    case 'battle_tariffs': return [option(`Grant ${pending.ownerId} +1 from Tariffs`, 'grant_bonus'), ...pending.handOptions.map((cardId) => option(`Discard ${cardId} to avoid Tariffs`, 'discard', cardId))];
    case 'battle_divestment': return [option('Pass Battle Divestment', 'pass'), ...pending.deedOptions.map((spaceId) => option(`Divest the Deed to ${spaceId}`, 'divest', undefined, undefined, spaceId))];
    case 'battle_margin_loan': return [option('Pass Battle Margin Loan', 'pass'), ...pending.collateralOptions.map((cardId) => option(`Collateralize ${cardId}`, 'collateralize', cardId))];
    case 'battle_property_dues': return [option(`Allow ${pending.ownerId} to collect 3 Capital`, 'pay_dues'), ...pending.handOptions.map((cardId) => option(`Discard ${cardId} to avoid Property Dues`, 'discard', cardId))];
    case 'battle_capital_gains': return pending.eligibleCardIds.map((cardId) => option(`Place ${cardId} in Treasury with Capital Gains`, cardId, cardId));
    case 'battle_monetary_crisis': return pending.handOptions.map((cardId) => option(`Keep ${cardId}; discard the rest`, cardId, cardId));
    case 'battle_leveraged_buyout': return [
      option('Decline the battle Leveraged Buyout', 'pass'),
      ...affordableBattleCollateralSelections(pending.collateralOptions, pending.capitalAvailable, pending.cost).map((cardIds) => option(cardIds.length === 0 ? `Buy ${pending.spaceId} with Capital` : `Buy ${pending.spaceId} using ${cardIds.join(', ')} as collateral`, 'purchase', undefined, undefined, pending.spaceId, cardIds)),
    ];
    case 'leveraged_buyout_target': return pending.spaceOptions.map((spaceId) => option(`Buy the Deed to ${spaceId}`, 'select', undefined, undefined, spaceId));
    case 'leveraged_buyout_collateral': {
      const options: GuidedOption[] = [];
      if (pending.capitalAvailable >= pending.cost) options.push(option(`Pay ${pending.cost} Capital with no collateral`, 'purchase', undefined, undefined, pending.spaceId, []));
      for (const cardId of pending.collateralOptions) if (pending.capitalAvailable + cardValue(cardId) >= pending.cost) options.push(option(`Use ${cardId} as Leveraged Buyout collateral`, 'purchase', undefined, undefined, pending.spaceId, [cardId]));
      const allValue = pending.collateralOptions.reduce((sum, cardId) => sum + cardValue(cardId), 0);
      if (pending.collateralOptions.length > 1 && pending.capitalAvailable + allValue >= pending.cost) options.push(option(`Use all available collateral (${pending.collateralOptions.join(', ')})`, 'purchase', undefined, undefined, pending.spaceId, [...pending.collateralOptions]));
      return options;
    }
    case 'corner_the_market_purchase': return [option('Stop buying Deeds', 'pass'), ...pending.spaceOptions.map((spaceId) => option(`Buy the Deed to ${spaceId}`, 'purchase', undefined, undefined, spaceId))];
    case 'deed_purchase': return [option(`Pay ${pending.cost} Capital`, 'capital'), ...pending.collateralOptions.map((cardId) => option(`Use ${cardId} as collateral`, 'collateral', cardId))];
  }
}

function pendingDiplomatOptions(game: GameState, playerId: PlayerID): GuidedOption[] | undefined {
  const pending = game.pendingDiplomatChoice;
  if (!pending || pending.playerId !== playerId) return undefined;
  const option = (label: string, choice: string, extra: Partial<Extract<AppStateAction, { type: 'resolve_diplomat_choice' }>> = {}): GuidedOption => ({ label, action: { type: 'resolve_diplomat_choice', playerId, choice, ...extra } });
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
  const financierPending = pendingFinancierOptions(game, playerId); if (financierPending) return financierPending;
  const diplomatPending = pendingDiplomatOptions(game, playerId); if (diplomatPending) return diplomatPending;
  const militaryPending = pendingMilitaryOptions(game, playerId); if (militaryPending) return militaryPending;
  const view = toPrivateGameView(game, playerId); const options: GuidedOption[] = [];
  const discard = game.pendingAssetBankDiscards?.[playerId]; if (discard) { if (discard.discardCount === 1) for (const cardId of discard.options) options.push({ label: `Discard ${cardId} from Asset Bank`, action: { type: 'resolve_asset_bank_discard', playerId, cardIds: [cardId] } }); return options; }
  if (game.pendingLeaderAbilityWindow?.playerId === playerId) { for (const ability of view.legalLeaderAbilities ?? []) options.push({ label: `Use ${ability.name}`, action: { type: 'use_leader_ability', playerId, abilityId: ability.abilityId } }); options.push({ label: 'Pass Leader ability window', action: { type: 'pass_leader_ability_window', playerId } }); return options; }
  if (game.phase === 'turn_start') options.push({ label: 'Draw 1 card', action: { type: 'draw_card', playerId } });
  if (game.phase === 'action_before_movement' || game.phase === 'action_after_movement') for (const play of view.legalActionPlays ?? []) options.push({ label: `Play Action ${play.cardId}`, action: { type: 'play_action_card', playerId, cardId: play.cardId } });
  const player = game.players[playerId];
  options.push(...buildIntelligenceMissionOptions(game, playerId));
  if (game.phase === 'action_after_movement' && player.factionId === 'financiers' && player.actionsRemaining > 0 && playerId === game.activePlayer) {
    for (const cardId of player.zones.hand) {
      options.push({ label: `Place ${cardId} in Treasury`, action: { type: 'place_treasury_card', playerId, cardId } });
      options.push({ label: `Play the Market with ${cardId}`, action: { type: 'begin_play_the_market', playerId, cardId } });
    }
    for (const space of game.board.spaces.filter((candidate) => candidate.kind === 'territory' && deedOwner(game, candidate.id) !== playerId)) options.push({ label: `Buy Deed to ${space.id}`, action: { type: 'begin_deed_purchase', playerId, spaceId: space.id } });
    if (player.financiers?.hostileTakeoverEligibleSpaceId) options.push({ label: `Hostile Takeover ${player.financiers.hostileTakeoverEligibleSpaceId}`, action: { type: 'use_hostile_takeover', playerId } });
  }
  if (game.phase === 'movement') for (const space of adjacentSpaces(game, playerId)) options.push({ label: `Move to ${space.id}${space.occupant ? ` occupied by ${space.occupant}` : ''}`, action: { type: 'move_player', playerId, toSpaceId: space.id } });
  for (const play of view.battle?.legalBattlePlays ?? []) { if (play.action === 'commit_battle_hand_card' && play.cardId) options.push({ label: `Commit ${play.cardId} from hand`, action: { type: 'commit_battle_hand_card', playerId, cardId: play.cardId } }); else if (play.action === 'play_battle_draw_card' && play.cardId) options.push({ label: `Play battle-drawn ${play.cardId}`, action: { type: 'play_battle_draw_card', playerId, cardId: play.cardId } }); else if (play.action === 'pass_battle_hand_commit') options.push({ label: 'Pass hand commitment', action: { type: 'pass_battle_hand_commit', playerId } }); else if (play.action === 'pass_battle_draw_play') options.push({ label: 'Pass Battle Hand selection', action: { type: 'pass_battle_draw_play', playerId } }); }
  if (game.battle?.stage === 'battle_draw') options.push({ label: 'Draw Battle Hand', action: { type: 'draw_battle_cards', playerId } });
  if (game.battle?.stage === 'dice') {
    if (!game.battle.effectsResolved.includes('before_battle_resolution')) options.push(...buildBattleRevealOptions(game, playerId));
    else for (const value of [1, 2, 3, 4, 5, 6]) options.push({ label: `Roll ${value}`, action: { type: 'roll_battle_die', playerId, value } });
  }
  if (game.battle?.stage === 'resolution') options.push({ label: 'Resolve battle', action: { type: 'resolve_battle', playerId } });
  if (game.phase !== 'battle' && game.phase !== 'game_over' && playerId === game.activePlayer) options.push({ label: 'End turn', action: { type: 'end_turn', playerId } });
  return options;
}
