import fs from 'node:fs';
import path from 'node:path';

const authority = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'game-data/current-game.json'), 'utf8'));

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function feature(factionId, name) {
  const entry = authority.factionFeatures?.[factionId]?.find(item => item.name === name);
  invariant(entry, `Missing ${factionId} Faction Feature ${name}.`);
  invariant(String(entry.text || '').trim(), `${factionId}/${name} is missing canonical procedure text.`);
  return entry;
}

const factionRules = authority.gameplay?.faction_rules;
invariant(factionRules, 'Missing gameplay.faction_rules.');

for (const factionId of ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']) {
  const marker = factionRules[factionId]?.normalization;
  invariant(marker?.mechanics_changed === false, `${factionId} normalization must declare mechanics_changed=false.`);
  invariant(marker?.normalization_issue === 1681, `${factionId} normalization must remain tied to #1681.`);
}

// Military
const military = factionRules.military;
invariant(military.command?.starting === 0 && military.command?.maximum === 2, 'Military Command bounds drifted.');
invariant(military.command?.first_win_only_each_turn === true, 'Military first-win Command rule is missing.');
invariant(military.command?.available_immediately === true, 'Military newly gained Command must be immediately available.');
feature('military', 'Orders');

// Diplomats
const diplomats = factionRules.diplomats;
invariant(diplomats.influence?.starting === 1 && diplomats.influence?.minimum === 0 && diplomats.influence?.maximum === 10, 'Diplomat Influence bounds drifted.');
invariant(diplomats.influence?.staked_is_spent === false && diplomats.influence?.staked_is_available === false, 'Diplomat stake semantics drifted.');
invariant(diplomats.ratification?.accepted_new_reward === 1 && diplomats.ratification?.imposed_new_reward === 2, 'Diplomat ratification rewards drifted.');
invariant(diplomats.ratification?.already_ratified_reusable === true && diplomats.ratification?.already_ratified_reward === 0, 'Diplomat repeated-Proposal rules drifted.');
invariant(diplomats.peace_treaty?.threshold === 6, 'Peace Treaty threshold drifted.');
invariant(diplomats.leverage?.costs?.['1'] === 1 && diplomats.leverage?.costs?.['2'] === 3 && diplomats.leverage?.costs?.['3'] === 6 && diplomats.leverage?.costs?.['4'] === 10, 'Leverage cost table drifted.');
for (const name of ['Terms', 'Leverage']) invariant(feature('diplomats', name).rules, `Diplomats/${name} is missing structured rules.`);

// Financiers
const financiers = factionRules.financiers;
invariant(financiers.capital?.starting === 2 && financiers.capital?.minimum === 0, 'Financier Capital start/minimum drifted.');
invariant(financiers.capital?.may_exceed_limit_temporarily === true, 'Financier temporary excess-Capital rule is missing.');
invariant(financiers.treasury?.action_cost === 1 && financiers.treasury?.timing === 'Denouement', 'Treasury Action profile drifted.');
invariant(financiers.income?.text === 'Gain 1 Capital for each Deed you own.', 'Financier Income rule drifted.');
invariant(financiers.financial_capacity_rules?.determine_once === true, 'Financial Capacity must be determined once at its timing.');
invariant(financiers.deeds?.ownership_independent_of_control === true && financiers.deeds?.ownership_independent_of_occupation === true, 'Deed ownership independence drifted.');
invariant(financiers.deeds?.cost?.minimum === 1 && financiers.deeds?.cost?.sequential_recalculation === true, 'Deed cost floor/recalculation rule drifted.');
invariant(financiers.play_the_market?.roll?.['1'] && financiers.play_the_market?.roll?.['2-3'] && financiers.play_the_market?.roll?.['4-5'] && financiers.play_the_market?.roll?.['6'], 'Play the Market result table is incomplete.');
invariant(financiers.subsidize?.costs?.['4'] === 10, 'Subsidize triangular cost table drifted.');
invariant(financiers.controlling_interest?.immediate === true, 'Controlling Interest must remain immediate.');
for (const name of ['Treasury', 'Deeds', 'Play the Market', 'Subsidize', 'Financial Capacity', 'Income']) invariant(feature('financiers', name).rules, `Financiers/${name} is missing structured rules.`);

// Intelligence
const intelligence = factionRules.intelligence;
invariant(intelligence.intel?.starting === 0 && intelligence.intel?.maximum === null, 'Intel bounds drifted.');
invariant(intelligence.operation_progress?.starting === 0 && intelligence.operation_progress?.maximum === null, 'Operation Progress bounds drifted.');
invariant(intelligence.mission_slot?.maximum === 1 && intelligence.mission_slot?.active_mission_and_special_operation_share_slot === true, 'Mission slot rule drifted.');
invariant(intelligence.missions?.start?.cannot_complete_turn_started === true, 'Mission completion-delay rule is missing.');
invariant(intelligence.missions?.complete?.destination === 'Discard Pile', 'Completed Mission destination drifted.');
invariant(intelligence.missions?.abort?.qualifies_for_operational_capacity === false, 'Abort Mission must not qualify for Operational Capacity.');
invariant(intelligence.missions?.fail?.destination === 'Graveyard', 'Failed Mission destination drifted.');
invariant(intelligence.special_operations?.readiness_must_continue === true, 'Special Operation continuing-readiness rule is missing.');
invariant(intelligence.special_operations?.complete?.increases_operation_progress === false && intelligence.special_operations?.complete?.grants_normal_mission_intel === false, 'Special Operation must remain distinct from normal Mission completion.');
invariant(intelligence.surveillance?.gambit?.cost === '1 Intel' && intelligence.surveillance?.tactic?.cost === '1 Intel per opposing Tactic revealed', 'Surveillance costs drifted.');
invariant(intelligence.interference?.gambit_destination === 'Hand' && intelligence.interference?.tactic_destination === 'Reserve', 'Interference destinations drifted.');
invariant(intelligence.interference?.replacement_does_not_reopen_surveillance_or_interference === true, 'Interference replacement window rule is missing.');
for (const name of ['Missions', 'Special Operations', 'Surveillance', 'Interference', 'Operational Capacity']) invariant(feature('intelligence', name).rules, `Intelligence/${name} is missing structured rules.`);

// Mystics
const mystics = factionRules.mystics;
const mysticGeneral = authority.mystics?.generalRules;
invariant(mysticGeneral?.one_active_rite, 'Mystics one-active-Rite rule is missing.');
invariant(mysticGeneral?.completion_delay, 'Mystics later-turn Rite completion rule is missing.');
invariant(mysticGeneral?.completion_limit, 'Mystics one-completion-per-turn rule is missing.');
invariant(mysticGeneral?.interruption, 'Mystics interruption/refund rule is missing.');
invariant(mysticGeneral?.completed_rites_persist, 'Mystics completed-Rite persistence rule is missing.');
invariant(mysticGeneral?.bound_card_default, 'Mystics Rite/Ritual binding destination rule is missing.');
invariant(mystics.rite_lifecycle?.bound_card_default === mysticGeneral.bound_card_default, 'Mystics faction rule and dedicated Rite authority disagree.');
for (const name of ['Rites', 'Invocation', 'Transmutation', 'Convergence', 'Ritual of Ascension']) feature('mystics', name);

// Inquisition
const inquisition = factionRules.inquisition;
invariant(inquisition.conviction?.starting === 0 && inquisition.conviction?.maximum === 4, 'Conviction bounds drifted.');
invariant(inquisition.conviction?.once_per_turn === true && inquisition.conviction?.per_qualifying_aftermath_gain === 1, 'Normal Conviction gain rule drifted.');
invariant(inquisition.condemnation?.remaining_reserve_unchanged === true, 'Condemnation must not change unused Reserve cleanup.');
invariant(inquisition.blasphemy?.separate_from_normal_conviction_gain === true, 'Blasphemy independence from normal Conviction gain is missing.');
invariant(Object.keys(inquisition.purge?.options || {}).sort().join(',') === '1,2,3,4', 'Purge option table is incomplete.');
invariant(inquisition.purge?.combined_value_choice_preserves_remaining_order === true, '1-Conviction Purge Discard Pile order rule is missing.');
invariant(inquisition.purge?.action_purge_limit === 'Once per turn', 'Action Purge limit drifted.');
invariant(inquisition.purge?.directly_permitted_purge, 'Directly permitted Purge semantics are missing.');
invariant(inquisition.purification?.other_failed_draws_do_not_trigger === true, 'Purification must remain limited to the normal start-of-turn Draw.');
for (const name of ['Purge', 'Conviction', 'Condemnation', 'Blasphemy', 'Purification']) invariant(feature('inquisition', name).rules, `Inquisition/${name} is missing structured rules.`);

console.log('Canonical faction procedure authority is complete for direct publication.');