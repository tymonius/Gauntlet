import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const readJson = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const fail = (message) => {
  console.error(`reconstruction-version-plan: ${message}`);
  process.exitCode = 1;
};
const assert = (condition, message) => {
  if (!condition) fail(message);
};

const plan = readJson('config/reconstruction-version-plan.json');
const resolutions = readJson('config/reconstruction-version-resolutions.json');
const candidates = readJson('config/reconstruction-decision-candidates.json');
const lifecycle = readJson('config/release-lifecycle.json');
const candidateById = new Map(candidates.decisions.map((d) => [d.id, d]));

assert(plan.baseline_release === 'v0.6.1', 'baseline must remain v0.6.1');
assert(plan.publication_unlocked === false, 'publication must remain locked');
assert(resolutions.publication_unlocked === false, 'resolution record may not unlock publication');
assert(JSON.stringify(plan.publication_order) === JSON.stringify(['clean-v0.6.2', 'clean-v0.6.3']), 'publication order must remain clean v0.6.2 then clean v0.6.3');

const v062 = plan.targets?.['clean-v0.6.2'];
const v063 = plan.targets?.['clean-v0.6.3'];
assert(v062 && v063, 'both clean-v0.6.2 and clean-v0.6.3 targets are required');
assert(v062.authority_base === 'v0.6.1', 'clean v0.6.2 must derive from v0.6.1 authority');
assert(v063.authority_base === 'clean-v0.6.2', 'clean v0.6.3 must derive from certified clean v0.6.2');
assert(v062.status === 'authority_certified', 'clean v0.6.2 must be certified before clean v0.6.3 construction');
assert(v062.authority_build_unlocked === true, 'clean v0.6.2 authority must remain available as the certified base');
assert(v063.status === 'authority_build_approved', 'clean v0.6.3 authority build must be approved after v0.6.2 certification');
assert(v063.authority_build_unlocked === true, 'clean v0.6.3 authority construction must be unlocked after v0.6.2 certification');

assert(v062.approval?.pr === 606, 'clean v0.6.2 authority-build approval must still cite PR #606');
assert(v062.approval?.merged_at === '2026-08-13T07:24:17Z', 'clean v0.6.2 authority-build approval must retain the PR #606 merge time');
assert(v062.approval?.merge_commit === 'e84e27958c7f6d8d4bd0390bdbac456b40adef1b', 'clean v0.6.2 authority-build approval must retain the PR #606 merge commit');
assert(v062.certification?.faction_authority_pr === 609, 'certification must pin faction authority PR #609');
assert(v062.certification?.faction_authority_merge_commit === 'ded1206b7bd9a83b4d32ce3f2ef063ee609d8461', 'certification must pin the PR #609 merge commit');
assert(v062.certification?.rulebook_authority_pr === 611, 'certification must pin Rulebook authority PR #611');
assert(v062.certification?.rulebook_authority_merge_commit === '5c8181c9a70af9dfdcd8b91153c80b6b6943e52e', 'certification must pin the PR #611 merge commit');
assert(v062.certification?.manifest === 'artifacts/reconstruction/clean-v0.6.2/certification/authority-set.json', 'certification manifest path drifted');
assert(v063.unlock?.basis === 'certified_clean_v0.6.2_authority', 'clean v0.6.3 unlock must derive from certified clean v0.6.2 authority');
assert(v063.unlock?.manifest === v062.certification?.manifest, 'clean v0.6.3 unlock must point to the certified authority manifest');

assert(v062.evidence_anchor?.commit === '4436004a11b97704758dd0300f7eef969e6b78f9', 'clean v0.6.2 evidence anchor must remain the final pre-v0.6.3 evidence state');
assert(v063.evidence_anchor?.commit === 'feb53d48f254355a07d092f6ba68162241d22e9d', 'clean v0.6.3 evidence anchor must remain the preserved post-hotfix evidence state');
assert(v062.evidence_anchor?.role === 'evidence_only' && v063.evidence_anchor?.role === 'evidence_only', 'withdrawn release anchors are evidence only');

for (const forbidden of [
  'releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md',
  'releases/v0.6.2/Gauntlet_v0.6.2_Faction_and_Component_Guide.md',
]) {
  assert(v062.forbidden_authority_sources?.includes(forbidden), `clean v0.6.2 must forbid ${forbidden} as authority`);
}
for (const forbidden of [
  'releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md',
  'releases/v0.6.3/Gauntlet_v0.6.3_Faction_and_Component_Guide.md',
]) {
  assert(v063.forbidden_authority_sources?.includes(forbidden), `clean v0.6.3 must forbid ${forbidden} as authority`);
}

for (const id of v062.required_shared_rules ?? []) {
  assert(candidateById.has(id), `clean v0.6.2 references unknown normalized candidate ${id}`);
}
for (const id of v063.required_v063_deltas ?? []) {
  assert(candidateById.has(id), `clean v0.6.3 references unknown normalized candidate ${id}`);
}

const resolutionById = new Map((resolutions['clean-v0.6.2']?.candidate_resolutions ?? []).map((r) => [r.candidate_id, r]));
for (const [id, expectedRegistry, expectedDisposition] of [
  ['rules-action-economy-rebuild', 'defer', 'adopt'],
  ['rules-pending-battle-terms-onset', 'defer', 'adopt'],
  ['faction-inquisition-purge-phase-model', 'defer', 'adopt'],
  ['setup-v062-bottom-deck-opening', 'reject', 'adopt'],
]) {
  const candidate = candidateById.get(id);
  const resolution = resolutionById.get(id);
  assert(candidate, `required version-scoped candidate missing: ${id}`);
  assert(candidate?.recommendation === expectedRegistry, `${id} normalized recommendation unexpectedly changed from ${expectedRegistry}`);
  assert(resolution?.registry_recommendation === expectedRegistry, `${id} resolution must record its normalized recommendation`);
  assert(resolution?.version_disposition === expectedDisposition, `${id} must resolve to ${expectedDisposition} for clean v0.6.2`);
  assert(Array.isArray(resolution?.evidence) && resolution.evidence.length > 0, `${id} resolution needs evidence`);
}

const recovered = new Map((resolutions['clean-v0.6.2']?.additional_recovered_decisions ?? []).map((r) => [r.id, r]));
assert(recovered.get('v062-specific-overrides-broad-conflict')?.version_disposition === 'adopt', 'v0.6.2 specificity rule must remain recovered');
assert(recovered.get('v062-active-player-marker')?.version_disposition === 'preserve_downstream', 'v0.6.2 active-player marker must remain downstream');
assert(recovered.get('v062-starters-pr500')?.version_disposition === 'preserve_downstream', 'v0.6.2 PR #500 starter catalog must remain downstream');

assert(v062.setup_invariants?.opening_draw === 4, 'clean v0.6.2 opening draw must be four');
assert(v062.setup_invariants?.opening_keep === 3, 'clean v0.6.2 opening Hand must keep three');
assert(v062.setup_invariants?.fourth_card_destination === 'face_down_bottom_of_draw_pile', 'clean v0.6.2 fourth opening card must go beneath Draw Pile');
assert(v062.setup_invariants?.opening_discard === false, 'clean v0.6.2 must not use the v0.6.3 opening discard');
assert(v062.setup_invariants?.territory_arrangement_after_opening_hand_selection === true, 'clean v0.6.2 Territory arrangement must follow opening-Hand selection');
assert(v062.setup_invariants?.starting_position === 'before_own_end_territory', 'clean v0.6.2 retains the pre-v0.6.3 starting position');
assert(v062.victory_invariants?.final_territory_capture_alone_wins === false, 'clean v0.6.2 must not backport final-Territory immediate victory');
assert(v062.victory_invariants?.last_stand_is_independent_route === false, 'clean v0.6.2 must not backport the independent Last Stand route');
assert(v062.identity_invariants?.neutral_reserves_title === 'Reserves' && v062.identity_invariants?.neutral_reserves_id === 'neutral-reserves', 'clean v0.6.2 Reserves identity drifted');
assert(v062.identity_invariants?.smugglers_title === "Smuggler's Pass" && v062.identity_invariants?.smugglers_id === 'territory-smuggler-s-pass', "clean v0.6.2 Smuggler's Pass identity drifted");
assert(v062.presentation_boundaries?.deck_draw_pile_v063_cleanup === false, 'v0.6.3 Deck/Draw Pile cleanup must not be backported');
assert(v062.presentation_boundaries?.retire_battle_heading === false, 'v0.6.3 battle-role heading migration must not be backported');
assert(v062.presentation_boundaries?.asset_only_banked_heading === false, 'v0.6.3 Asset-only heading migration must not be backported');
assert(v062.presentation_boundaries?.inherent_bank_action === false, 'v0.6.3 inherent Bank Action must not be backported');

assert(JSON.stringify(v062.action_invariants?.turn_sequence) === JSON.stringify(['Capture', 'Draw', 'Opening', 'Movement', 'Denouement', 'Cleanup']), 'clean v0.6.2 turn sequence drifted');
assert(v062.action_invariants?.normal_actions_per_turn === 1, 'clean v0.6.2 normal Action total must be one');
assert(v062.action_invariants?.normal_actions_per_phase_max === 1, 'clean v0.6.2 normal per-phase Action maximum must be one');
assert(v062.action_invariants?.faction_action_and_faction_ability_distinct === true, 'clean v0.6.2 must preserve Faction Action / Faction Ability distinction');
assert(v062.action_invariants?.additional_or_immediate_action_windows === false, 'clean v0.6.2 may not create additional/immediate Action windows');
assert(v062.battle_invariants?.accepted_terms_prevent_battle === true, 'accepted Terms must prevent the battle from beginning');
assert(JSON.stringify(v062.battle_invariants?.prebattle_sequence) === JSON.stringify(['pending_battle', 'terms', 'onset']), 'clean v0.6.2 pre-battle sequence drifted');
assert(v062.battle_invariants?.defensive_edge === true && v062.battle_invariants?.straight_unmodified_tiebreak_roll === true, 'clean v0.6.2 tie model drifted');
assert(v062.battle_invariants?.front_line_control_contiguous === true, 'clean v0.6.2 Front Line model drifted');

assert(v063.setup_invariants?.fourth_card_destination === 'face_up_discard_pile', 'clean v0.6.3 must use a face-up opening discard');
assert(v063.setup_invariants?.opening_discard === true, 'clean v0.6.3 opening discard must be enabled');
assert(v063.setup_invariants?.starting_position === 'on_own_end_territory', 'clean v0.6.3 tokens start on own-end Territory');
assert(v063.setup_invariants?.setup_placement_is_movement === false && v063.setup_invariants?.setup_placement_is_entry === false, 'clean v0.6.3 setup placement is neither movement nor entry');
assert(v063.victory_invariants?.final_territory_capture_alone_wins === true, 'clean v0.6.3 final-Territory capture must be an independent normal victory');
assert(v063.victory_invariants?.last_stand_is_independent_route === true, 'clean v0.6.3 Last Stand must be an independent normal victory');
assert(v063.victory_invariants?.last_stand_requires_separate_movement_sequence === true, 'clean v0.6.3 Last Stand requires a separate legal movement sequence');
assert(v063.identity_invariants?.neutral_reserves_title === 'Second Line' && v063.identity_invariants?.neutral_reserves_id === 'neutral-reserves', 'Second Line rename must preserve neutral-reserves');
assert(v063.identity_invariants?.smugglers_title === "Smuggler's Run" && v063.identity_invariants?.smugglers_id === 'territory-smuggler-s-pass', "Smuggler's Run rename must preserve territory-smuggler-s-pass");

const supersessions = resolutions['clean-v0.6.3']?.supersessions ?? [];
const openingSupersession = supersessions.find((s) => s.earlier_decision === 'setup-v062-bottom-deck-opening');
assert(openingSupersession?.replacement === 'setup-draw4-discard1-keep3', 'clean v0.6.3 must explicitly supersede the v0.6.2 bottom-deck opening');
assert(v063.starter_policy?.candidate_source === 'https://github.com/tymonius/Gauntlet/pull/573', 'clean v0.6.3 starter candidate must point to PR #573');
assert(v063.starter_policy?.status === 'downstream_only_until_clean_v063_authority_exists', 'v0.6.3 starters remain downstream until authority exists');

assert(lifecycle.current_release === 'v0.6.1', 'public current release must remain v0.6.1 during reconstruction');
const releases = lifecycle.releases ?? {};
assert(releases['v0.6.2']?.status === 'withdrawn', 'v0.6.2 must remain withdrawn during reconstruction');
assert(releases['v0.6.3']?.status === 'withdrawn', 'v0.6.3 must remain withdrawn during reconstruction');

if (!process.exitCode) {
  console.log('Reconstruction version plan validated: clean v0.6.2 is certified; clean v0.6.3 authority construction is unlocked; publication remains locked.');
}
