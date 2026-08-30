import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const cardPath = path.join(root, 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json');
const canonicalPath = path.join(root, 'artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Canonical_Data_Candidate.json');
const referencePath = path.join(root, 'artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Complete_Card_Reference_Candidate.md');

const cardsSource = JSON.parse(fs.readFileSync(cardPath, 'utf8'));
const data = JSON.parse(fs.readFileSync(canonicalPath, 'utf8'));
const reference = fs.readFileSync(referencePath, 'utf8').replace(/\r\n/g, '\n');

assert.equal(data.version, 'v0.6.3-candidate');
assert.equal(data.name, 'Gauntlet v0.6.3 Canonical Data Candidate');
assert.match(data.status, /not published/i);
assert.equal(data.inherits_from, 'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json');
assert.equal(data.release_manifest, null);
assert.equal(data.cards.length, 128);
assert.equal(data.territories.length, 25);

const counts = data.cards.reduce((map, card) => {
  map[card.allegiance] = (map[card.allegiance] || 0) + 1;
  return map;
}, {});
assert.deepEqual(counts, {
  Mystics: 13,
  Inquisition: 13,
  Neutral: 50,
  Intelligence: 13,
  Military: 13,
  Financiers: 13,
  Diplomats: 13,
});

assert.deepEqual(data.setup.sequence, [
  'prepare_faction_components',
  'shuffle_deck_to_draw_pile',
  'draw_four',
  'discard_one_face_up',
  'arrange_territories',
  'form_and_reveal_gauntlet',
  'place_player_tokens',
  'determine_first_player',
]);
assert.deepEqual(data.setup.opening_selection, {
  draw: 4,
  discard: 1,
  discard_face_up: true,
  keep: 3,
  mandatory: true,
  creates_discard_pile_before_first_turn: true,
});
assert.equal(data.setup.territory_arrangement.informed_by_opening_hand, true);
assert.equal(data.setup.territory_arrangement.informed_by_opening_discard, true);
assert.equal(data.setup.territory_arrangement.informed_by_initiative, false);
assert.equal(data.setup.starting_position.is_movement, false);
assert.equal(data.setup.starting_position.counts_as_entering, false);
assert.equal(data.setup.starting_position.triggers_enter_effects, false);
assert.match(data.setup.initiative.timing, /after both players complete opening selection and Territory arrangement/i);

assert.equal(data.deck_construction.opening_draw, 4);
assert.equal(data.deck_construction.opening_discard, 1);
assert.equal(data.deck_construction.opening_discard_face_up, true);
assert.equal(data.deck_construction.opening_hand, 3);
assert.equal(data.deck_construction.territory_arrangement_after_opening_selection, true);
assert.equal(data.deck_construction.first_player_after_territory_arrangement, true);

assert.match(data.battlefield.starting_position, /begins on the Territory at that player's own end/i);
assert.match(data.battlefield.victory, /either capturing the Territory at the opponent's end or winning the opponent's Last Stand/i);
assert.match(data.battlefield.capture, /immediately runs the Gauntlet and wins/i);
assert.equal(data.battlefield.last_stand.final_territory_control_required, false);
assert.equal(data.battlefield.last_stand.final_territory_capture_required, false);
assert.equal(data.battlefield.last_stand.separate_movement_sequence_required, true);
assert.match(data.battlefield.last_stand.access, /separate legal movement sequence/i);

assert.deepEqual(data.card_rules.effect_headings.supported, ['Action', 'Asset', 'Gambit', 'Tactic', 'Gambit/Tactic']);
assert.deepEqual(data.card_rules.effect_headings.retired, ['Activate', 'Battle', 'Use']);
assert.equal(data.card_rules.inherent_bank_action.applies_to_cards_with_asset_effect, true);
assert.equal(data.card_rules.directly_permitted_card_procedures.spend_additional_action_by_default, false);
assert.equal(data.card_rules.effect_granted_movement.begins_new_sequence_when_none_in_progress, true);
assert.equal(data.card_rules.additional_tactics.default_source, 'Reserve');
assert.equal(data.card_rules.asset_removal.defined_event, true);
assert.equal(data.card_rules.asset_removal.voluntary_use_or_discard_is_removal, false);
assert.match(data.card_rules.bind.default_host_departure_destination, /Discard Piles/);
assert.equal(data.card_rules.reveal_stage_interference.resolves_before_ordinary_effects_at_same_stage, true);
assert.equal(data.card_rules.compact_shorthand.rerolls_use_new_result_by_default, true);
assert.equal(data.card_rules.applying_and_repeating_effects.new_application_at_current_timing, true);
assert.equal(data.card_rules.battle_ends_without_winner.neither_player_wins_or_loses, true);

assert.equal(data.governing_sources.shared_rules, 'docs/Gauntlet_v0.6.3_Shared_Rules_Candidate.md');
assert.equal(data.governing_sources.general_card_rules, 'docs/Gauntlet_v0.6.3_General_Card_Rules_Candidate.md');
assert.equal(data.governing_sources.inherited_base, 'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json');
assert.equal(data.starter_decks.version, 'v0.6.2-inherited');
assert.match(data.starter_decks.status, /pending v0.6.3/i);

// Every playable card must remain byte-semantically identical to the final card
// candidate. Preserve its existing provenance fields and add only a separate
// pointer to the v0.6.3 integration source.
const sourceById = new Map(cardsSource.cards.map((card) => [card.id, card]));
for (const card of data.cards) {
  const sourceCard = sourceById.get(card.id);
  assert(sourceCard, `Integrated candidate contains unknown card ${card.id}`);
  const { v063_source: v063Source, ...integratedCard } = card;
  assert.equal(v063Source, 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json');
  assert.deepEqual(integratedCard, sourceCard, `Integrated card drift: ${card.name}`);
}
assert.deepEqual(data.territories, cardsSource.territories, 'Territory data must remain inherited unchanged at this stage');

// Late v0.6.3 balance decisions from the starter-exclusion review are explicit
// invariants. These do not modify costs or any Financier Deed-purchase rule.
const cardsByName = new Map(data.cards.map((card) => [card.name, card]));
const effectText = (card, label) => card.effects.find((effect) => effect.label === label)?.text;
const armistice = cardsByName.get('Armistice');
const contingency = cardsByName.get('Contingency Plan');
const manifest = cardsByName.get('Manifest Destiny');
assert.equal(armistice?.cost, 4);
assert.equal(effectText(armistice, 'Asset'), 'Neither player can start a battle. At the start of your Opening, discard two cards from your Hand or discard this card. You cannot voluntarily discard this card at another time.');
assert.equal(contingency?.cost, 1);
assert.equal(effectText(contingency, 'Asset'), 'If this card is Removed, +1 Card.');
assert.equal(effectText(contingency, 'Gambit/Tactic'), 'If your opponent controls more Territories than you, +2 Battle Total.');
assert.equal(manifest?.cost, 5);
assert(manifest?.rules_notes?.includes('After entering the Gauntlet, this card is a normal Territory with a normal Deed.'));

// Retired setup/victory language must not survive outside the historical
// normalization/provenance record.
const playerState = structuredClone(data);
delete playerState.normalization;
const playerStateText = JSON.stringify(playerState);
for (const obsolete of [
  "Each Player Token begins immediately before that player's end of the Gauntlet.",
  "Capture the opponent's final Territory, advance beyond it, begin a Last Stand battle, and win that battle.",
  'Playable Deck',
]) {
  assert(!playerStateText.includes(obsolete), `Obsolete structured-data wording survives: ${obsolete}`);
}

assert(reference.includes('# Gauntlet v0.6.3 Complete Card Reference Candidate'));
assert(reference.includes('**Cards:** 128'));
assert(reference.includes('**Territories:** 25'));
for (const card of data.cards) {
  assert(reference.includes(`### ${card.name}`), `Complete Card Reference missing ${card.name}`);
  for (const effect of card.effects) {
    assert(reference.includes(`**${effect.label}:** ${effect.text}`), `Complete Card Reference drift for ${card.name} / ${effect.label}`);
  }
}
assert(reference.includes('**Rules:** After entering the Gauntlet, this card is a normal Territory with a normal Deed.'), 'Complete Card Reference must expose Manifest Destiny\'s normal Deed.');
for (const territory of data.territories) {
  assert(reference.includes(`## ${territory.name}`), `Complete Card Reference missing Territory ${territory.name}`);
  const effects = territory.effects?.length ? territory.effects : [{ label: 'Text', text: territory.text }];
  for (const effect of effects) {
    assert(reference.includes(`**${effect.label}:** ${effect.text}`), `Complete Card Reference drift for Territory ${territory.name}`);
  }
}
assert(!reference.includes('Playable Deck'), 'Complete Card Reference uses retired Playable Deck terminology');
assert(!reference.includes('**Battle:**'), 'Complete Card Reference contains retired Battle card heading');
assert(!reference.includes('**Activate:**'), 'Complete Card Reference contains retired Activate card heading');

if (process.env.GITHUB_BASE_REF) {
  const baseRef = `origin/${process.env.GITHUB_BASE_REF}`;
  const changedFiles = execFileSync('git', ['diff', '--name-only', `${baseRef}...HEAD`], { encoding: 'utf8' })
    .split(/\r?\n/)
    .filter(Boolean);
  const modifiedV062 = changedFiles.filter((file) => file.startsWith('releases/v0.6.2/'));
  assert.deepEqual(modifiedV062, [], `v0.6.3 canonical-data work must not modify immutable v0.6.2 release files: ${modifiedV062.join(', ')}`);
}

console.log('v0.6.3 canonical-data candidate validated: 128 exact cards with preserved provenance, 25 inherited Territories, current setup/victory/card rules, synchronized Complete Card Reference, and late balance corrections.');
