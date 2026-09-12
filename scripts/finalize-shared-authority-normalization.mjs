import fs from 'node:fs';
import path from 'node:path';

const authorityPath = path.join(process.cwd(), 'game-data/current-game.json');
const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'));
const gameplay = authority.gameplay;

if (gameplay?.shared_rules_normalization?.normalization_issue !== 1685) {
  throw new Error('Shared rules normalization marker is missing.');
}

// Keep zone authority focused on zone identity/information state. Battle/turn procedures own
// sizes, sources, destinations, and recycling behavior already canonical elsewhere.
const zones = gameplay.card_zones;
delete zones.hand.normal_cleanup_limit;
delete zones.discard_pile.recyclable;
delete zones.graveyard.normal_recycling;
delete zones.gambit_area.source;
delete zones.gambit_area.normal_destination;
delete zones.reserve.normal_size;
delete zones.reserve.source;
delete zones.reserve.normal_destination;
delete zones.tactic_area.default_source;
delete zones.tactic_area.normal_destination;

zones.discard_pile.circulation = 'recyclable through the normal Draw procedure';
zones.graveyard.circulation = 'outside normal circulation unless an effect moves a card';

// The battle root already owns normal Reserve size and normal battle-card destinations.
delete gameplay.battle.reserve.normal_size;
delete gameplay.battle.reserve.remaining_cards_normal_destination;

// Existing inherent_bank_action and asset_removal blocks remain the sole authority for those
// procedures/classifications. The new assets block carries only previously missing Asset rules.
const assets = gameplay.card_rules.assets;
delete assets.inherent_bank_action;
delete assets.special_banking_procedure_overrides_default;
delete assets.forced_limit_discard_is_removal;
assets.bank_procedure_source = 'gameplay.card_rules.inherent_bank_action';
assets.removal_classification_source = 'gameplay.card_rules.asset_removal';

// Modifier stacking belongs to compact shorthand; multi-card permissions own only choice semantics.
delete gameplay.card_rules.multiple_gambits_or_tactics.modifier_stacking;

// State the opening-discard relationship directly instead of an ambiguous classification name.
const opening = gameplay.setup.opening_selection;
opening.counts_as_discard_for_other_cost_or_effect = false;
opening.other_cost_or_effect_exception = 'Only if a rule expressly refers to the opening discard.';
delete opening.discard_is_cost_or_effect;
delete opening.discard_is_cost_or_effect_exception;

fs.writeFileSync(authorityPath, `${JSON.stringify(authority, null, 2)}\n`, 'utf8');
console.log('Finalized shared authority into a lower-duplication single-source layout.');
