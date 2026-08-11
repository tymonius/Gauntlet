import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = 'artifacts/v0.6.3/canonical/Gauntlet_v0.6.3_Canonical_Data_Candidate.json';
const data = JSON.parse(fs.readFileSync(path, 'utf8'));

assert.equal(data.normalization.stage, 'final-v0.6.3-card-text-integrated');
assert.deepEqual(data.normalization.canonical_data_integration, {
  shared_setup_and_victory: true,
  general_card_rules: true,
  exact_final_card_text: true,
  territories_inherited_from_v062: true,
  published_release: false,
});
assert.equal(data.release_manifest, null, 'Development candidate must not claim a release manifest');
assert.equal(data.starter_decks.version, 'v0.6.2-inherited', 'Starter Deck lists must remain explicitly inherited until their v0.6.3 propagation pass');
assert.match(data.status, /not published/i);
assert.equal(data.inherits_from, 'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json');

assert.deepEqual(data.card_rules.effect_headings.ordinary_role_headings, ['Action', 'Asset', 'Gambit', 'Tactic', 'Gambit/Tactic']);
const actualHeadings = [...new Set(data.cards.flatMap((card) => card.effects.map((effect) => effect.label)))];
assert.deepEqual(data.card_rules.effect_headings.all_present_headings, actualHeadings);
assert.deepEqual(
  data.card_rules.effect_headings.special_or_procedural_headings,
  actualHeadings.filter((label) => !data.card_rules.effect_headings.ordinary_role_headings.includes(label))
);
for (const required of ['Terms', 'Accepted', 'Refused', 'Overlay', 'Mission', 'Text', 'Placement', 'Aftermath']) {
  assert(data.card_rules.effect_headings.special_or_procedural_headings.includes(required), `Missing special/procedural effect heading metadata: ${required}`);
}

console.log('v0.6.3 canonical-data publication boundary validated: integrated candidate is explicitly not yet a published release and fully enumerates current effect headings.');
