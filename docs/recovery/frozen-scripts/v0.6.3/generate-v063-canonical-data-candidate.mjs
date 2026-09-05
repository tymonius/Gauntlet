import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { normalizeV063LastStandValue } from '../rules-assistant/v063-last-stand-language.js';

const root = process.cwd();
const cardCandidatePath = path.join(root, 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json');
const outputDir = path.join(root, 'artifacts/v0.6.3/canonical');
const outputPath = path.join(outputDir, 'Gauntlet_v0.6.3_Canonical_Data_Candidate.json');

const source = JSON.parse(fs.readFileSync(cardCandidatePath, 'utf8'));
const shared = fs.readFileSync(path.join(root, 'docs/Gauntlet_v0.6.3_Shared_Rules_Candidate.md'), 'utf8').replace(/\r\n/g, '\n');
const generalCards = fs.readFileSync(path.join(root, 'docs/Gauntlet_v0.6.3_General_Card_Rules_Candidate.md'), 'utf8').replace(/\r\n/g, '\n');

for (const marker of [
  'Draw four cards, choose one card from those four, and place it face up in your Discard Pile.',
  'After seeing your opening Hand and opening discard, secretly arrange your three Territory Cards',
  'A player runs the Gauntlet and wins immediately when that player either captures the Territory at the opponent\'s end of the Gauntlet or forces the opponent to make a Last Stand and wins the resulting battle.',
  'The advancing player does not need to control or have captured the final Territory before forcing the opponent to make a Last Stand.',
  'The attacker must receive another movement sequence from a rule or effect.',
]) {
  assert(shared.includes(marker), `Shared-rules source is missing required canonical-data marker: ${marker}`);
}

for (const marker of [
  'Asset is the only banked-card effect heading in v0.6.3.',
  'When a rule or effect directly instructs or permits a player to play, bank, place, reveal, or otherwise use a card at a stated timing',
  'If the effect grants movement while no movement sequence is in progress, it begins a new movement sequence.',
  'Unless an effect says otherwise, the source of a Tactic is the player\'s **Reserve**.',
  '**Remove** is a defined Asset event.',
  'Unless an effect gives a different instruction, when a card leaves play, cards bound to it are put in their owners\' Discard Piles.',
  'resolve reveal-stage interference before ordinary effects at that stage',
  'When an effect tells you to **apply** another card\'s effect or **repeat** an effect',
  'When a rule or effect ends a battle **without a winner**',
]) {
  assert(generalCards.includes(marker), `General-card-rules source is missing required canonical-data marker: ${marker}`);
}

const data = structuredClone(source);
data.version = 'v0.6.3-candidate';
data.name = 'Gauntlet v0.6.3 Canonical Data Candidate';
data.date = '2026-08-11';
data.status = 'Integrated v0.6.3 canonical-data candidate — not published';
data.inherits_from = 'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json';
data.release_manifest = null;

data.governing_sources = {
  shared_rules: 'docs/Gauntlet_v0.6.3_Shared_Rules_Candidate.md',
  general_card_rules: 'docs/Gauntlet_v0.6.3_General_Card_Rules_Candidate.md',
  card_text: 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json',
  player_facing_candidates: 'scripts/generate-v063-player-facing-candidates.mjs',
  inherited_faction_components: 'releases/v0.6.2/Gauntlet_v0.6.2_Faction_and_Component_Guide.md',
  inherited_starter_decks: 'docs/Gauntlet_v0.6.2_Starter_Decks_Candidate.json',
  inherited_base: 'releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json',
};

data.deck_construction = {
  ...data.deck_construction,
  opening_draw: 4,
  opening_discard: 1,
  opening_discard_face_up: true,
  opening_hand: 3,
  territory_arrangement_after_opening_selection: true,
  first_player_after_territory_arrangement: true,
};

data.setup = {
  sequence: [
    'prepare_faction_components',
    'shuffle_deck_to_draw_pile',
    'draw_four',
    'discard_one_face_up',
    'arrange_territories',
    'form_and_reveal_gauntlet',
    'place_player_tokens',
    'determine_first_player',
  ],
  opening_selection: {
    draw: 4,
    discard: 1,
    discard_face_up: true,
    keep: 3,
    mandatory: true,
    creates_discard_pile_before_first_turn: true,
  },
  territory_arrangement: {
    timing: 'After opening selection and before the first-player roll.',
    informed_by_opening_hand: true,
    informed_by_opening_discard: true,
    informed_by_initiative: false,
  },
  starting_position: {
    text: "Each Player Token begins on the Territory at that player's own end of the Gauntlet.",
    is_movement: false,
    counts_as_entering: false,
    triggers_enter_effects: false,
  },
  initiative: {
    timing: 'After both players complete opening selection and Territory arrangement.',
    method: 'Each player rolls one die; higher result takes the first turn; reroll ties.',
  },
};

data.battlefield = {
  ...data.battlefield,
  starting_position: "Each Player Token begins on the Territory at that player's own end of the Gauntlet. Setup placement is not movement and does not count as entering.",
  capture: "During Capture, if your token is on or beyond the next opposing Territory immediately beyond your Front Line, add that Territory to your Front Line. Normal Capture advances the Front Line by at most one Territory per turn. Capturing the Territory at the opponent's end immediately runs the Gauntlet and wins.",
  victory: "Run the Gauntlet and win immediately by either capturing the Territory at the opponent's end or forcing the opponent to make a Last Stand and winning the resulting battle.",
  last_stand: {
    ...data.battlefield.last_stand,
    access: "After the opponent is forced beyond their own end, an attacker on the opponent's final Territory may force the opponent to make a Last Stand by using a separate legal movement sequence to Advance beyond that end.",
    final_territory_control_required: false,
    final_territory_capture_required: false,
    separate_movement_sequence_required: true,
  },
};

data.card_rules = {
  effect_headings: {
    supported: ['Action', 'Asset', 'Gambit', 'Tactic', 'Gambit/Tactic'],
    retired: ['Activate', 'Battle', 'Use'],
    gambit_tactic_default_timing: 'A Gambit/Tactic, Gambit, or Tactic effect with no later printed timing applies at that role\'s normal reveal stage.',
  },
  inherent_bank_action: {
    applies_to_cards_with_asset_effect: true,
    text: 'Bank: As an Action, play this card from your Hand and bank it.',
    special_banking_procedure_overrides_default: true,
  },
  directly_permitted_card_procedures: {
    spend_additional_action_by_default: false,
    exception: 'An instruction that expressly identifies an Action still uses the applicable Action permission.',
  },
  effect_granted_movement: {
    begins_new_sequence_when_none_in_progress: true,
    may_create_pending_battle_by_default: true,
    may_initiate_legal_last_stand_by_default: true,
    pending_battle_ends_sequence: true,
  },
  additional_tactics: {
    default_source: 'Reserve',
    eligibility_required: true,
    before_reveal_face_state: 'face down',
    after_reveal_face_state: 'face up',
    does_not_reopen_prior_windows: true,
    normal_tactic_destination_by_default: true,
  },
  sanctions: {
    retains_refusing_opponent: true,
    default_expiration: "After that opponent later accepts the owner's Terms, put the Sanction in its owner's Discard Pile.",
  },
  asset_removal: {
    defined_event: true,
    involuntary_asset_loss: true,
    voluntary_use_or_discard_is_removal: false,
    normal_self_expiration_is_removal: false,
    reduced_asset_limit_forced_discard_is_removal: true,
    assigns_destination: false,
  },
  bind: {
    default_host_departure_destination: "Bound cards go to their owners' Discard Piles unless an effect gives another destination.",
    excess_bound_cards_after_limit_reduction: 'Choose and discard excess bound cards immediately until the limit is satisfied.',
  },
  reveal_stage_interference: {
    resolves_before_ordinary_effects_at_same_stage: true,
    scope: 'Effects that reveal, negate, return, discard, replace, or otherwise prevent another Gambit or Tactic at that reveal stage from applying normally.',
  },
  compact_shorthand: {
    reserve_default_tactic_source: true,
    rerolls_use_new_result_by_default: true,
    supported_examples: ['+N Reserve', '+N Tactic', '+N Card(s)', '+N Action', '+N Battle Total', 'Retreat +N', 'Command = N', 'Conviction = N', 'Advance Front Line N'],
  },
  applying_and_repeating_effects: {
    new_application_at_current_timing: true,
    printed_conditions_and_legal_targets_still_required: true,
    choices_and_costs_are_made_again: true,
    source_card_does_not_move_by_default: true,
    bounded_repeat_chain: true,
  },
  battle_ends_without_winner: {
    neither_player_wins_or_loses: true,
    already_applied_effects_remain_applied: true,
    unresolved_result_dependent_effects_do_not_apply: true,
    remaining_non_result_aftermath_and_cleanup_continue_when_applicable: true,
  },
};

data.cards = data.cards.map((card) => ({
  ...card,
  v063_source: 'artifacts/v0.6.3/Gauntlet_v0.6.3_Card_Text_Candidate.json',
}));

data.starter_decks = {
  ...data.starter_decks,
  version: 'v0.6.2-inherited',
  status: 'Deck lists inherited pending v0.6.3 starter/territory-order presentation propagation.',
};

data.normalization = {
  ...data.normalization,
  stage: 'final-v0.6.3-card-text-integrated',
  canonical_data_integration: {
    shared_setup_and_victory: true,
    general_card_rules: true,
    exact_final_card_text: true,
    territories_inherited_from_v062: true,
    published_release: false,
  },
};

const normalizedData = normalizeV063LastStandValue(data);
fs.mkdirSync(outputDir, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(normalizedData, null, 2) + '\n', 'utf8');
console.log(`Generated ${path.relative(root, outputPath)} with ${normalizedData.cards.length} cards and ${normalizedData.territories.length} Territories.`);
