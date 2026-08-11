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

console.log('v0.6.3 canonical-data publication boundary validated: integrated candidate is explicitly not yet a published release.');
