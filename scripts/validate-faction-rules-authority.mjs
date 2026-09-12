import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const authority = JSON.parse(fs.readFileSync(path.join(root, 'game-data/current-game.json'), 'utf8'));
const contract = JSON.parse(fs.readFileSync(path.join(root, 'config/rules-surface-contract.json'), 'utf8'));

const factionIds = ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition'];

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function feature(factionId, name) {
  const entry = authority.factionFeatures?.[factionId]?.find(item => item.name === name);
  invariant(entry, `Missing ${factionId} Faction Feature ${name}.`);
  invariant(!Object.hasOwn(entry, 'rules'), `${factionId}/${name} duplicates canonical procedure data in factionFeatures.rules.`);
  invariant(!Object.hasOwn(entry, 'text'), `${factionId}/${name} duplicates canonical procedure text in factionFeatures.text.`);
  return entry;
}

function sourcePath(source) {
  return (source?.path || []).join('.');
}

const factionRules = authority.gameplay?.faction_rules;
invariant(factionRules, 'Missing gameplay.faction_rules.');

for (const factionId of factionIds) {
  const marker = factionRules[factionId]?.normalization;
  invariant(marker?.mechanics_changed === false, `${factionId} normalization must declare mechanics_changed=false.`);
  invariant(marker?.normalization_issue === 1681, `${factionId} normalization must remain tied to #1681.`);

  const registry = contract.ruleRegistry?.find(entry => entry.id === `faction.${factionId}.features`);
  invariant(registry, `Missing registry entry faction.${factionId}.features.`);
  const paths = (registry.sources || []).map(sourcePath);
  invariant(paths.includes(`factionFeatures.${factionId}`), `faction.${factionId}.features must depend on faction feature metadata.`);
  invariant(paths.includes(`gameplay.faction_rules.${factionId}`), `faction.${factionId}.features must depend on canonical faction procedures.`);
}

// Military
const military = factionRules.military;
invariant(military.command?.starting === 0 && military.command?.minimum === 0 && military.command?.maximum === 2, 'Military Command bounds drifted.');
invariant(military.command?.first_win_only_each_turn === true, 'Military first-win Command rule is missing.');
invariant(military.command?.first_win_at_cap_consumes_trigger === true, 'Military first win at the Command cap must still consume the turn trigger.');
invariant(military.command?.available_immediately === true, 'Military newly gained Command must be immediately available.');
invariant(military.command?.may_trigger_on_either_players_turn === true, 'Military Command must be able to trigger on either player’s turn.');
invariant(military.command?.withdrawal_does_not_trigger === true, 'Withdrawal must not generate Military Command.');
invariant(String(military.orders || '').includes('without spending an Action'), 'Military Orders procedure is incomplete.');
invariant(String(military.fortify || '').includes('capture the Territory you occupy, if able'), 'Military Fortify authority must match current Leader wording.');
feature('military', 'Orders');

// Diplomats
const diplomats = factionRules.diplomats;
invariant(diplomats.influence?.starting === 1 && diplomats.influence?.minimum === 0 && diplomats.influence?.maximum === 10, 'Diplomat Influence bounds drifted.');
invariant(diplomats.influence?.staked_is_spent === false && diplomats.influence?.staked_is_available === false, 'Diplomat stake semantics drifted.');
invariant(String(diplomats.terms?.eligibility || '').includes('can stake'), 'Diplomat Terms eligibility must include the ability to pay the Stake.');
invariant(diplomats.ratification?.accepted_new_reward === 1 && diplomats.ratification?.imposed_new_reward === 2, 'Diplomat ratification rewards drifted.');
invariant(diplomats.ratification?.already_ratified_reusable === true && diplomats.ratification?.already_ratified_reward === 0, 'Diplomat repeated-Proposal rules drifted.');
invariant(diplomats.ratification?.imposition_optional === true, 'Imposition after refused Terms and a win must remain optional.');
invariant(diplomats.peace_treaty?.threshold === 6, 'Peace Treaty threshold drifted.');
invariant(diplomats.leverage?.costs?.['1'] === 1 && diplomats.leverage?.costs?.['2'] === 3 && diplomats.leverage?.costs?.['3'] === 6 && diplomats.leverage?.costs?.['4'] === 10, 'Leverage cost table drifted.');
feature('diplomats', 'Terms');
feature('diplomats', 'Leverage');

// Financiers
const financiers = factionRules.financiers;
invariant(financiers.capital?.starting === 2 && financiers.capital?.minimum === 0, 'Financier Capital start/minimum drifted.');
invariant(financiers.capital?.may_exceed_limit_temporarily === true, 'Financier temporary excess-Capital rule is missing.');
invariant(financiers.capital?.limit_recalculates_immediately === true, 'Financier Capital Limit must track board/Treasury changes immediately.');
invariant(financiers.treasury?.action_cost === 1 && financiers.treasury?.timing === 'Denouement', 'Treasury Action profile drifted.');
invariant(financiers.income?.text === 'Gain 1 Capital for each Deed you own.', 'Financier Income rule drifted.');
invariant(financiers.financial_capacity_rules?.determine_once === true, 'Financial Capacity must be determined once at its timing.');
invariant(financiers.deeds?.ownership_independent_of_control === true && financiers.deeds?.ownership_independent_of_occupation === true, 'Deed ownership independence drifted.');
invariant(financiers.deeds?.cost?.minimum === 1 && financiers.deeds?.cost?.sequential_recalculation === true, 'Deed cost floor/recalculation rule drifted.');
invariant(financiers.deeds?.cost?.position_modifiers?.control === -1 && financiers.deeds?.cost?.position_modifiers?.occupy === 0 && financiers.deeds?.cost?.position_modifiers?.neither === 1, 'Deed position modifiers drifted.');
invariant(financiers.play_the_market?.roll?.['1'] && financiers.play_the_market?.roll?.['2-3'] && financiers.play_the_market?.roll?.['4-5'] && financiers.play_the_market?.roll?.['6'], 'Play the Market result table is incomplete.');
invariant(financiers.subsidize?.costs?.['1'] === 1 && financiers.subsidize?.costs?.['2'] === 3 && financiers.subsidize?.costs?.['3'] === 6 && financiers.subsidize?.costs?.['4'] === 10, 'Subsidize triangular cost table drifted.');
invariant(financiers.controlling_interest?.immediate === true, 'Controlling Interest must remain immediate.');
for (const name of ['Treasury', 'Deeds', 'Play the Market', 'Subsidize', 'Financial Capacity', 'Income']) feature('financiers', name);

// Intelligence
const intelligence = factionRules.intelligence;
const expectedTurnStartIntel = 'At the start of your turn, gain Intel equal to your Operation Progress.';
invariant(intelligence.intel?.starting === 0 && intelligence.intel?.minimum === 0 && intelligence.intel?.maximum === null, 'Intel bounds drifted.');
invariant(intelligence.intel?.turn_start_gain === expectedTurnStartIntel, 'Intelligence must gain Intel equal to Operation Progress at the start of its turn.');
invariant(intelligence.turn_start_intel === expectedTurnStartIntel, 'Intelligence turn-start Intel summary must stay synchronized with the canonical Intel rule.');
invariant(intelligence.operation_progress?.starting === 0 && intelligence.operation_progress?.maximum === null, 'Operation Progress bounds drifted.');
invariant(String(intelligence.operation_progress?.text || '').includes('Increase it by 1 whenever you complete a normal Mission'), 'Normal Mission completion must increase Operation Progress by 1.');
invariant(String(intelligence.missions?.complete?.text || '').includes('gain Intel equal to the card’s value'), 'Normal Mission completion must grant Intel equal to the Mission card value.');
invariant(intelligence.mission_slot?.maximum === 1 && intelligence.mission_slot?.active_mission_and_special_operation_share_slot === true, 'Mission slot rule drifted.');
invariant(intelligence.missions?.start?.cannot_complete_turn_started === true, 'Mission completion-delay rule is missing.');
invariant(intelligence.missions?.active_state?.owner_may_inspect === true && intelligence.missions?.active_state?.requirement_hidden_from_opponent === true, 'Active Mission information-state rules are missing.');
invariant(intelligence.missions?.active_state?.requirement_counts_only_while_active === true, 'Mission requirement must count only while the card is Active Mission.');
invariant(intelligence.missions?.active_state?.starting_is_not_playing_card_for_another_effect === true, 'Starting a Mission must remain distinct from playing another printed effect.');
invariant(intelligence.missions?.complete?.destination === 'Discard Pile', 'Completed Mission destination drifted.');
invariant(intelligence.missions?.abort?.qualifies_for_operational_capacity === false, 'Abort Mission must not qualify for Operational Capacity.');
invariant(intelligence.missions?.fail?.destination === 'Graveyard', 'Failed Mission destination drifted.');
invariant(intelligence.special_operations?.readiness_must_continue === true, 'Special Operation continuing-readiness rule is missing.');
invariant(intelligence.special_operations?.active_state?.requirement_hidden_from_opponent === true, 'Special Operation information-state rules are missing.');
invariant(intelligence.special_operations?.complete?.increases_operation_progress === false && intelligence.special_operations?.complete?.grants_normal_mission_intel === false, 'Special Operation must remain distinct from normal Mission completion.');
invariant(intelligence.surveillance?.gambit?.cost === '1 Intel' && intelligence.surveillance?.tactic?.cost === '1 Intel per opposing Tactic revealed', 'Surveillance costs drifted.');
invariant(intelligence.interference?.gambit_destination === 'Hand' && intelligence.interference?.tactic_destination === 'Reserve', 'Interference destinations drifted.');
invariant(intelligence.interference?.removal_optional === true, 'Interference must allow the Intelligence player to choose which revealed cards to remove.');
invariant(intelligence.interference?.replacement_does_not_reopen_surveillance_or_interference === true, 'Interference replacement window rule is missing.');
for (const name of ['Missions', 'Special Operations', 'Surveillance', 'Interference', 'Operational Capacity']) feature('intelligence', name);

// Mystics
const mystics = factionRules.mystics;
const mysticGeneral = authority.mystics?.generalRules;
invariant(!Object.hasOwn(mystics, 'rite_lifecycle'), 'Mystics Rite lifecycle must live only in the dedicated Mystics authority corpus.');
invariant(mysticGeneral?.one_active_rite, 'Mystics one-active-Rite rule is missing.');
invariant(mysticGeneral?.selection_order, 'Mystics selected-Rite order rule is missing.');
invariant(mysticGeneral?.completion, 'Mystics automatic printed-condition completion rule is missing.');
invariant(mysticGeneral?.completion_delay, 'Mystics later-turn Rite completion rule is missing.');
invariant(mysticGeneral?.completion_limit, 'Mystics one-completion-per-turn rule is missing.');
invariant(mysticGeneral?.interruption, 'Mystics interruption/refund rule is missing.');
invariant(mysticGeneral?.completed_rites_persist, 'Mystics completed-Rite persistence rule is missing.');
invariant(mysticGeneral?.bound_card_default, 'Mystics Rite/Ritual binding destination rule is missing.');
for (const name of ['Rites', 'Invocation', 'Transmutation', 'Convergence', 'Ritual of Ascension']) feature('mystics', name);

// Inquisition
const inquisition = factionRules.inquisition;
invariant(inquisition.conviction?.starting === 0 && inquisition.conviction?.minimum === 0 && inquisition.conviction?.maximum === 4, 'Conviction bounds drifted.');
invariant(inquisition.conviction?.once_per_turn === true && inquisition.conviction?.per_qualifying_aftermath_gain === 1, 'Normal Conviction gain rule drifted.');
invariant(inquisition.condemnation?.remaining_reserve_unchanged === true, 'Condemnation must not change unused Reserve cleanup.');
invariant(inquisition.blasphemy?.separate_from_normal_conviction_gain === true, 'Blasphemy independence from normal Conviction gain is missing.');
invariant(Object.keys(inquisition.purge?.options || {}).sort().join(',') === '1,2,3,4', 'Purge option table is incomplete.');
invariant(inquisition.purge?.combined_value_choice_preserves_remaining_order === true, '1-Conviction Purge Discard Pile order rule is missing.');
invariant(inquisition.purge?.action_purge_limit === 'Once per turn', 'Action Purge limit drifted.');
invariant(inquisition.purge?.directly_permitted_purge, 'Directly permitted Purge semantics are missing.');
invariant(inquisition.purification?.other_failed_draws_do_not_trigger === true, 'Purification must remain limited to the normal start-of-turn Draw.');
invariant(inquisition.final_judgment?.normal_conviction_gain_precedes_when_applicable === true && inquisition.final_judgment?.directly_permitted_purge === true, 'Final Judgment sequencing is incomplete.');
invariant(inquisition.relentless_pursuit?.separate_movement_sequence_between_turns === true, 'Relentless Pursuit must create a separate between-turn movement sequence.');
invariant(inquisition.relentless_pursuit?.does_not_replace_normal_movement === true && inquisition.relentless_pursuit?.withdrawal_does_not_trigger === true, 'Relentless Pursuit edge semantics are incomplete.');
for (const name of ['Purge', 'Conviction', 'Condemnation', 'Blasphemy', 'Purification']) feature('inquisition', name);

console.log('Canonical faction procedure authority is complete, single-source, and registered for direct publication.');
