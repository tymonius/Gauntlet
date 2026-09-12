import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const authorityPath = path.join(root, 'game-data/current-game.json');
const contractPath = path.join(root, 'config/rules-surface-contract.json');

const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'));
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

const factionIds = ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition'];

// Faction Features are taxonomy/profile metadata. Exact procedures live once in their
// canonical gameplay.faction_rules block (or the dedicated Mystics/Proposal corpora).
for (const factionId of factionIds) {
  for (const feature of authority.factionFeatures?.[factionId] || []) {
    delete feature.text;
    delete feature.rules;
  }
}

// Military: normalize the complete Command loop and the current Fortify wording.
const military = authority.gameplay.faction_rules.military;
military.orders = 'Orders are the Military Faction Feature. The chosen Leader supplies that player’s available Orders as Leader Abilities. Spend the listed Command and resolve the Order at its stated timing without spending an Action.';
military.fortify = 'During the Aftermath of a battle you won while occupying an enemy-controlled Territory, spend 2 Command to capture the Territory you occupy, if able.';
military.command.may_trigger_on_either_players_turn = true;
military.command.first_win_at_cap_consumes_trigger = true;
military.command.gain_timing = 'After a battle has a winner and before later effects caused by that victory. Command gained this way is available for later Aftermath Orders.';
military.command.withdrawal_does_not_trigger = true;

// Diplomats: imposition after refused Terms is optional, unlike ratification after accepted
// Terms. Preserve that distinction explicitly in the canonical procedure.
const diplomats = authority.gameplay.faction_rules.diplomats;
diplomats.terms.eligibility = 'A Proposal is eligible only if its printed Requirement is satisfied and the Diplomat can stake its listed Influence.';
diplomats.terms.refused = 'Apply the Proposal’s Refused effect and continue the battle unless that effect ends the sequence. Before dice, the Diplomat may use Leverage. If the Diplomat wins, return the stake and, if the Proposal was unratified, the Diplomat may impose and ratify it and normally gain 2 Influence unless that Proposal says otherwise. If the Diplomat loses, lose the stake.';
diplomats.ratification.imposition_optional = true;

// Financiers: the limit changes immediately with the underlying board/Treasury state even
// though excess Capital is only removed at end of turn.
const financiers = authority.gameplay.faction_rules.financiers;
financiers.capital.limit_recalculates_immediately = true;

// Intelligence: make the hidden Active Mission state and exact Interference choice semantics
// explicit rather than relying on teaching prose.
const intelligence = authority.gameplay.faction_rules.intelligence;
intelligence.missions.active_state = {
  owner_may_inspect: true,
  opponent_knows_slot_is_occupied: true,
  requirement_hidden_from_opponent: true,
  requirement_counts_only_while_active: true,
  cannot_use_other_printed_effects_while_active: true,
  starting_is_not_playing_card_for_another_effect: true,
};
intelligence.special_operations.active_state = {
  owner_may_inspect: true,
  opponent_knows_slot_is_occupied: true,
  requirement_hidden_from_opponent: true,
  cannot_use_other_printed_effects_while_active: true,
};
intelligence.interference.removal_optional = true;

// Mystics already have a dedicated canonical Rite corpus. Keep lifecycle rules there only,
// and make the two remaining general lifecycle points explicit.
delete authority.gameplay.faction_rules.mystics.rite_lifecycle;
delete authority.mystics.generalRules?.normalization;
authority.mystics.generalRules.selection_order = 'You may begin your three selected Rites in any order.';
authority.mystics.generalRules.completion = 'A begun Rite completes automatically when its printed completion condition occurs, subject to the later-turn and one-completion-per-turn rules.';

// Inquisition: preserve the technical sequencing around its two Leader Abilities in the
// faction procedure block so the Comprehensive Rules do not have to infer it from examples.
const inquisition = authority.gameplay.faction_rules.inquisition;
inquisition.final_judgment = {
  timing: 'After winning a battle, after battle cards are cleared.',
  limit: 'Once per turn',
  text: 'Immediately Purge. Reduce that Purge’s Conviction cost by 1, to a minimum of 1.',
  normal_conviction_gain_precedes_when_applicable: true,
  directly_permitted_purge: true,
};
inquisition.relentless_pursuit = {
  cost: '2 Conviction',
  timing: 'After defeating an attacking opponent',
  limit: 'Once per turn',
  text: 'Finish that battle’s Aftermath, end the defeated attacker’s turn, resolve that turn’s Cleanup, then before your normal turn begins Advance one Position toward their end. If that movement initiates a battle, you are the attacker. Resolve that battle completely, then begin your normal turn with Capture if the game has not ended.',
  separate_movement_sequence_between_turns: true,
  does_not_replace_normal_movement: true,
  terms_apply_normally_to_pursuit_battle: true,
  withdrawal_does_not_trigger: true,
};

// Each faction feature registry entry fingerprints both profile metadata and the one canonical
// faction procedure block. Dedicated Proposal/Rite corpora remain separate dependency IDs.
for (const factionId of factionIds) {
  const registry = contract.ruleRegistry?.find(entry => entry.id === `faction.${factionId}.features`);
  if (!registry) throw new Error(`Missing registry entry faction.${factionId}.features`);
  registry.sources = [
    {
      path: ['factionFeatures', factionId],
      optional: true,
    },
    {
      path: ['gameplay', 'faction_rules', factionId],
    },
  ];
}

fs.writeFileSync(authorityPath, `${JSON.stringify(authority, null, 2)}\n`, 'utf8');
fs.writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
console.log('Finalized single-source faction authority and registry dependencies.');
