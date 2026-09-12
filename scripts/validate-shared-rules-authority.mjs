import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const authority = JSON.parse(fs.readFileSync(path.join(root, 'game-data/current-game.json'), 'utf8'));
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config/rules-surface-contract.json'), 'utf8'));
const gameplay = authority.gameplay;

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function registryPath(id, expectedPath) {
  const entry = contract.ruleRegistry?.find(item => item.id === id);
  invariant(entry, `Missing rule registry entry ${id}.`);
  const paths = (entry.sources || []).map(source => (source.path || []).join('.'));
  invariant(paths.includes(expectedPath), `${id} must fingerprint ${expectedPath}.`);
}

invariant(gameplay?.shared_rules_normalization?.mechanics_changed === false, 'Shared-rules normalization must declare mechanics_changed=false.');
invariant(gameplay?.shared_rules_normalization?.normalization_issue === 1685, 'Shared-rules normalization must remain tied to #1685.');

// Deck and game-package construction.
const deck = gameplay.deck_construction;
invariant(deck.minimum_cards === 30 && deck.maximum_deckbuilding_value === 60, 'Deck size/value limits drifted.');
invariant(String(deck.allowed_playable_cards || '').includes('Neutral') && String(deck.allowed_playable_cards || '').includes('selected faction'), 'Deck faction eligibility is incomplete.');
invariant(deck.unique_copy_limit === 1, 'Unique cards must remain limited to one copy per Deck.');
invariant(deck.territories_per_player === 3 && deck.territories_must_be_different === true, 'Territory construction rules drifted.');
invariant(deck.maximum_arenas === 1, 'Arena construction limit drifted.');
invariant(deck.territories_are_part_of_deck === false && deck.territories_count_toward_minimum_cards === false && deck.territories_count_toward_deckbuilding_value === false, 'Territory/Deck accounting rules are incomplete.');
invariant(deck.supplemental_components?.default_part_of_deck === false && deck.supplemental_components?.count_toward_deck_size === false && deck.supplemental_components?.count_toward_card_value === false, 'Supplemental-component Deck accounting rules are incomplete.');
invariant(deck.supplemental_components?.default_drawable === false && deck.supplemental_components?.default_playable === false && deck.supplemental_components?.default_discardable === false && deck.supplemental_components?.default_bankable === false && deck.supplemental_components?.default_graveyard_eligible === false, 'Supplemental-component normal-zone exclusions are incomplete.');

// Setup.
const setup = gameplay.setup;
invariant(Array.isArray(setup.sequence) && setup.sequence.length === 8, 'Setup sequence drifted.');
for (const step of setup.sequence) invariant(setup.steps?.[step], `Setup step ${step} lacks a canonical procedure.`);
invariant(setup.opening_selection?.draw === 4 && setup.opening_selection?.discard === 1 && setup.opening_selection?.keep === 3, 'Opening selection counts drifted.');
invariant(setup.opening_selection?.counts_as_discard_for_other_cost_or_effect === false, 'Opening discard cost/effect classification is missing.');
invariant(String(setup.opening_selection?.other_cost_or_effect_exception || '').includes('opening discard'), 'Opening discard exception is missing.');
invariant(setup.territory_reveal?.simultaneous === true && setup.territory_reveal?.default_face_up_after_reveal === true, 'Territory reveal semantics are incomplete.');

// Zones own identity/information state. Turn/battle procedures remain the sole authority for
// hand limits, Reserve size, battle-card sources/destinations, and normal recycling.
const zones = gameplay.card_zones;
for (const zone of ['draw_pile', 'hand', 'discard_pile', 'graveyard', 'asset_bank', 'gambit_area', 'reserve', 'tactic_area', 'leader_and_faction_area']) {
  invariant(zones?.[zone]?.text, `Missing canonical card-zone definition: ${zone}.`);
}
invariant(zones.reserve?.separate_from_hand === true && zones.reserve?.owner_may_inspect_and_arrange === true, 'Reserve zone information-state rules are incomplete.');
invariant(String(zones.discard_pile?.circulation || '').includes('recyclable') && String(zones.graveyard?.circulation || '').includes('outside normal circulation'), 'Discard/Graveyard circulation classification is incomplete.');
for (const [zone, fields] of Object.entries({
  hand: ['normal_cleanup_limit'],
  discard_pile: ['recyclable'],
  graveyard: ['normal_recycling'],
  gambit_area: ['source', 'normal_destination'],
  reserve: ['normal_size', 'source', 'normal_destination'],
  tactic_area: ['default_source', 'normal_destination']
})) {
  for (const field of fields) invariant(!Object.hasOwn(zones[zone], field), `card_zones.${zone}.${field} duplicates procedural authority.`);
}
registryPath('core.card-zones', 'gameplay.card_zones');

// Actions and Assets.
const actions = gameplay.turn.actions;
invariant(actions.normal_total === 1 && gameplay.turn.maximum_actions_per_phase === 1, 'Normal Action limits drifted.');
invariant(actions.legal_uses?.action_card && actions.legal_uses?.faction_feature_or_leader_ability && actions.legal_uses?.discard_asset, 'Normal Action uses are incomplete.');
invariant(actions.action_card_play?.source === 'Hand' && actions.action_card_play?.default_destination === 'Discard Pile', 'Action-card play source/default destination drifted.');
invariant(Array.isArray(actions.action_card_play?.steps) && actions.action_card_play.steps.length === 5, 'Action-card play procedure is incomplete.');
invariant(actions.asset_discard?.action_cost === 1, 'Discarding an Asset must cost one Action.');
invariant(actions.asset_ability_action_default === false, 'Asset abilities must not spend Actions by default.');

const cardRules = gameplay.card_rules;
const assets = cardRules.assets;
invariant(assets?.only_banked_effect_heading === true && assets?.bank_heading === 'Asset', 'Asset must remain the only banked-card effect heading.');
invariant(String(assets?.normal_limit || '').includes('Territories you control'), 'Normal Asset limit must equal Territories controlled.');
invariant(assets?.replacement_is_separate_action === false && assets?.replaced_asset_departure_consequences_apply === true, 'Asset replacement procedure is incomplete.');
invariant(assets?.prevented_departure_prevents_replacement === true, 'Preventing an Asset departure must prevent replacement-at-limit.');
invariant(assets?.bank_procedure_source === 'gameplay.card_rules.inherent_bank_action', 'Asset bank procedure must remain single-source.');
invariant(assets?.removal_classification_source === 'gameplay.card_rules.asset_removal', 'Asset Removal classification must remain single-source.');
invariant(!Object.hasOwn(assets, 'inherent_bank_action') && !Object.hasOwn(assets, 'forced_limit_discard_is_removal'), 'Asset procedure data is duplicated inside card_rules.assets.');
invariant(cardRules.inherent_bank_action?.applies_to_cards_with_asset_effect === true && String(cardRules.inherent_bank_action?.text || '').includes('As an Action'), 'Canonical inherent Bank Action drifted.');
invariant(cardRules.asset_removal?.reduced_asset_limit_forced_discard_is_removal === true, 'Forced Asset-limit discard must remain Removal.');
registryPath('core.cards.assets', 'gameplay.card_rules.assets');

// Movement and battle commitments.
const movement = gameplay.battlefield.movement_rules;
invariant(movement?.normal_distance === 1, 'Normal movement distance drifted.');
invariant(String(movement?.choices?.advance || '').includes('opponent') && String(movement?.choices?.fall_back || '').includes('own end') && movement?.choices?.hold, 'Advance/Hold/Fall Back definitions are incomplete.');
invariant(movement?.resolve_one_position_at_a_time === true, 'Movement must resolve one Position at a time.');
invariant(Array.isArray(movement?.entering_opponent_position) && movement.entering_opponent_position.length === 3, 'Battle-initiation movement procedure is incomplete.');

const battle = gameplay.battle;
invariant(battle.commitment_sources?.gambit === 'Hand', 'Normal Gambit source must be Hand.');
invariant(String(battle.commitment_sources?.tactic || '').startsWith('Reserve'), 'Normal Tactic source must be Reserve.');
invariant(battle.normal_reserve_size === 3 && battle.remaining_reserve_destination === 'Discard Pile', 'Canonical Reserve size/destination drifted.');
invariant(battle.reserve?.source === 'Draw Pile' && battle.reserve?.temporary_private_zone === true && battle.reserve?.hand_set_aside_without_zone_change === true, 'Reserve formation/state rules are incomplete.');
invariant(battle.reserve?.owner_may_inspect_and_arrange === true && String(battle.reserve?.formation || '').includes('without changing their zone'), 'Reserve privacy/formation rules are incomplete.');
invariant(!Object.hasOwn(battle.reserve, 'normal_size') && !Object.hasOwn(battle.reserve, 'remaining_cards_normal_destination'), 'battle.reserve duplicates root Reserve size/destination authority.');
invariant(battle.withdrawal_procedure?.positional_default?.attacker && battle.withdrawal_procedure?.positional_default?.defender, 'Withdrawal positional defaults are incomplete.');
invariant(battle.withdrawal_procedure?.only_attacker_withdraws && battle.withdrawal_procedure?.only_defender_withdraws && battle.withdrawal_procedure?.both_withdraw, 'Withdrawal branch outcomes are incomplete.');
invariant(String(battle.withdrawal_procedure?.onset || '').includes('without an Aftermath'), 'Onset withdrawal must skip Aftermath.');
invariant(String(battle.withdrawal_procedure?.after_onset || '').includes('clears committed battle cards'), 'Post-Onset withdrawal cleanup is incomplete.');
registryPath('core.battle.reserve', 'gameplay.battle.reserve');
registryPath('core.battle.withdrawal-procedure', 'gameplay.battle.withdrawal_procedure');

// Bound cards.
const bind = cardRules.bind;
invariant(bind?.outside_normal_zones === true, 'Bound cards must remain outside normal zones.');
invariant(bind?.face_up_public === true && bind?.face_down_owner_inspection_only === true, 'Bound-card information state is incomplete.');
invariant(String(bind?.normal_availability || '').includes('cannot be played, moved, or affected'), 'Bound-card availability restriction is incomplete.');
invariant(bind?.specific_destination_overrides_default === true, 'Card-specific bound-card destinations must override defaults.');
registryPath('core.cards.bind', 'gameplay.card_rules.bind');

// Choices, multiple battle cards, and reveal-stage interference.
invariant(cardRules.choices?.available_options_only === true && String(cardRules.choices?.no_valid_option || '').includes('ignored'), 'Choice legality/no-valid-option rule is incomplete.');
invariant(cardRules.multiple_gambits_or_tactics?.permission_optional_by_default === true, 'Additional Gambit/Tactic permission must be optional by default.');
invariant(String(cardRules.multiple_gambits_or_tactics?.simultaneous_tactic_choice || '').includes('simultaneously'), 'Multi-Tactic simultaneous selection rule is missing.');
invariant(!Object.hasOwn(cardRules.multiple_gambits_or_tactics, 'modifier_stacking'), 'Reserve/Tactic modifier stacking must live only in compact shorthand authority.');
invariant(Array.isArray(cardRules.reveal_stage_interference?.procedure) && cardRules.reveal_stage_interference.procedure.length === 3, 'Reveal-stage interference ordering is incomplete.');
invariant(cardRules.reveal_stage_interference?.cannot_cancel_applied_effect === true, 'Reveal-stage interference must not cancel an already-applied effect.');
registryPath('core.cards.choices', 'gameplay.card_rules.choices');

// Shorthand.
const shorthand = cardRules.compact_shorthand;
for (const key of ['+N Reserve', '−N Reserve', '+N Tactic', '+N Card(s)', '+N Action', '+N Resource', 'Resource = N', '+N Battle Total', 'Retreat +N', 'gain advantage', 'gain double advantage', 'gain disadvantage', 'Advance Front Line N', 'condition prefix']) {
  invariant(shorthand?.meanings?.[key], `Missing canonical shorthand meaning: ${key}.`);
}
invariant(shorthand?.multiple_reserve_and_tactic_modifiers_add === true, 'Reserve/Tactic shorthand modifiers must stack.');
registryPath('core.cards.shorthand', 'gameplay.card_rules.compact_shorthand');

// Repeated/copied effects and battles ending without a winner.
const repeated = cardRules.applying_and_repeating_effects;
invariant(repeated?.new_application_at_current_timing === true && repeated?.printed_conditions_and_legal_targets_still_required === true && repeated?.choices_and_costs_are_made_again === true, 'Repeated-effect application semantics drifted.');
invariant(repeated?.source_card_does_not_move_by_default === true && repeated?.source_play_triggers_do_not_repeat === true, 'Repeated effects must not replay or move their source by default.');
invariant(String(repeated?.repeat_chain || '').includes('cannot create another copied or repeated effect in the same chain'), 'Repeat/copy chain bound is incomplete.');
registryPath('core.cards.repeat', 'gameplay.card_rules.applying_and_repeating_effects');

const noWinner = cardRules.battle_ends_without_winner;
invariant(noWinner?.neither_player_wins_or_loses === true && noWinner?.already_applied_effects_remain_applied === true, 'No-winner result semantics drifted.');
invariant(String(noWinner?.onset || '').includes('no Aftermath'), 'No-winner Onset procedure is incomplete.');
invariant(String(noWinner?.after_onset_unresolved_battle_effects || '').includes('unresolved Gambit or Tactic effects do not apply'), 'No-winner unresolved battle-card rule is incomplete.');
invariant(String(noWinner?.after_onset_clear_cards || '').includes('clear committed cards'), 'No-winner card clearing rule is incomplete.');
invariant(String(noWinner?.position_and_occupation || '').includes('Occupation'), 'No-winner positional/Occupation rule is incomplete.');
invariant(noWinner?.win_loss_conditions_do_not_apply === true, 'Win/loss-conditioned effects must not apply without a winner.');
registryPath('core.cards.no-winner', 'gameplay.card_rules.battle_ends_without_winner');

// Cards that become Territories.
invariant(String(cardRules.cards_becoming_territories?.manifest_destiny || '').includes('normal Territory with a normal Deed'), 'Manifest Destiny Territory semantics are missing.');
registryPath('core.cards.becoming-territories', 'gameplay.card_rules.cards_becoming_territories');

console.log('Canonical shared rules authority is complete, single-source, and registered for direct publication.');
