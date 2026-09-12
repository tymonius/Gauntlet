import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const authorityPath = path.join(root, 'game-data/current-game.json');
const contractPath = path.join(root, 'config/rules-surface-contract.json');

const authority = JSON.parse(fs.readFileSync(authorityPath, 'utf8'));
const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));

if (authority.version !== 'v0.7.2-candidate') {
  throw new Error(`Expected v0.7.2-candidate authority, found ${authority.version}`);
}

const gameplay = authority.gameplay;
if (!gameplay) throw new Error('Missing gameplay authority.');

// Provenance marker only. Exact mechanics remain in their natural shared-rule domains below.
gameplay.shared_rules_normalization = {
  mechanics_changed: false,
  normalization_issue: 1685,
  purpose: 'Promote already-current shared procedures from the reviewed Rulebook into canonical structured authority for direct technical publication.'
};

// Deck/game-package construction.
Object.assign(gameplay.deck_construction, {
  allowed_playable_cards: 'A Deck may contain only Neutral cards and cards belonging to the selected faction.',
  unique_copy_limit: 1,
  non_unique_copy_rule: 'Unless marked Unique, a card may appear in any quantity permitted by the available card pool.',
  territories_must_be_different: true,
  territories_are_part_of_deck: false,
  territories_count_toward_minimum_cards: false,
  territories_count_toward_deckbuilding_value: false,
  opponents_may_choose_same_territory_titles: true,
  leader_begins_face_up: true,
  supplemental_components: {
    default_part_of_deck: false,
    default_shuffled_into_draw_pile: false,
    default_drawable: false,
    default_playable: false,
    default_discardable: false,
    default_bankable: false,
    default_graveyard_eligible: false,
    count_toward_deck_size: false,
    count_toward_card_value: false,
    exception: 'A specific rule may override these defaults.'
  }
});

// Setup already has the correct sequence IDs; attach complete canonical procedures to them.
gameplay.setup.steps = {
  prepare_faction_components: 'Place Leaders, trackers, references, supplemental components, and apply any setup rules that add cards to or remove cards from the Deck.',
  shuffle_deck_to_draw_pile: 'Shuffle the remaining cards in your Deck to form your Draw Pile.',
  draw_four: 'Draw four cards.',
  discard_one_face_up: 'Choose one of those four cards and place it face up in your Discard Pile. The other three cards form your opening Hand.',
  arrange_territories: 'After seeing your opening Hand and opening discard, secretly arrange your three Territory Cards in a line facing you.',
  form_and_reveal_gauntlet: 'Join both Territory lines to create one six-Territory column, then reveal all six Territories simultaneously. They remain face up unless an effect says otherwise.',
  place_player_tokens: 'Place each Player Token on the Territory at that player’s own end of the Gauntlet. Setup placement is not movement, does not count as entering, and does not trigger enter effects.',
  determine_first_player: 'After both players complete opening selection and Territory arrangement, each player rolls one die. Higher result takes the first turn; reroll ties.'
};
gameplay.setup.opening_selection.discard_is_cost_or_effect = false;
gameplay.setup.opening_selection.discard_is_cost_or_effect_exception = 'Only if a rule expressly refers to the opening discard.';
gameplay.setup.territory_reveal = {
  simultaneous: true,
  default_face_up_after_reveal: true
};

// Canonical card zones and temporary battle areas.
gameplay.card_zones = {
  draw_pile: {
    visibility: 'face down',
    text: 'The face-down pile formed from the Deck. Draw cards from its top.'
  },
  hand: {
    visibility: 'private',
    normal_cleanup_limit: 3,
    text: 'The private cards held by a player. Physically setting the Hand aside during a battle does not move those cards to another zone.'
  },
  discard_pile: {
    visibility: 'face up',
    recyclable: true,
    text: 'A face-up pile of recyclable cards. When a Draw Pile cannot complete a draw, shuffle the Discard Pile to form a new Draw Pile.'
  },
  graveyard: {
    visibility: 'face up',
    normal_recycling: false,
    text: 'A face-up pile outside normal circulation. Cards there are not reshuffled unless an effect moves them.'
  },
  asset_bank: {
    visibility: 'public',
    text: 'The public area containing a player’s banked Assets.'
  },
  gambit_area: {
    temporary: true,
    source: 'Hand',
    normal_destination: 'Graveyard',
    text: 'The temporary area containing cards set from Hand as Gambits for the current battle.'
  },
  reserve: {
    temporary: true,
    visibility: 'private',
    normal_size: 3,
    source: 'Draw Pile',
    separate_from_hand: true,
    owner_may_inspect_and_arrange: true,
    normal_destination: 'Discard Pile',
    text: 'A temporary private zone formed during one battle. Each player normally draws three cards to form it. Cards remaining there normally go to the Discard Pile during the Aftermath.'
  },
  tactic_area: {
    temporary: true,
    default_source: 'Reserve',
    normal_destination: 'Discard Pile',
    text: 'The temporary area containing cards chosen or added as Tactics for the current battle.'
  },
  leader_and_faction_area: {
    visibility: 'public by default',
    text: 'Keep the Leader and all faction trackers, references, progress cards, and other public faction components together and visible unless their own rules say otherwise.'
  }
};

// Action uses and card-play procedure.
Object.assign(gameplay.turn.actions, {
  legal_uses: {
    action_card: 'Play one card from Hand for its Action effect.',
    faction_feature_or_leader_ability: 'Use one Faction Feature or Leader Ability marked 1 Action when its timing permits.',
    discard_asset: 'Discard one Asset you control.'
  },
  action_card_play: {
    source: 'Hand',
    steps: [
      'Take an Action during a phase in which that Action is legal.',
      'Play the card from Hand.',
      'Satisfy all requirements and costs.',
      'Resolve the Action effect.',
      'Put the card in the Discard Pile unless it becomes an Asset, becomes an Overlay, or its effect gives another destination.'
    ],
    default_destination: 'Discard Pile'
  },
  asset_discard: {
    timing: ['Opening', 'Denouement'],
    action_cost: 1,
    text: 'Take an Action to discard one Asset you control.'
  },
  asset_ability_action_default: false,
  asset_ability_action_rule: 'Using an Asset does not take an Action unless the Asset or another rule expressly says otherwise.'
});

// Ordinary movement choices.
Object.assign(gameplay.battlefield.movement_rules, {
  normal_distance: 1,
  choices: {
    advance: 'Move one Position toward the opponent’s end.',
    hold: 'Remain in your current Position.',
    fall_back: 'Move one Position toward your own end.'
  },
  resolve_one_position_at_a_time: true,
  entering_opponent_position: [
    'Move the attacking token into the contested Position.',
    'Establish the attacker, defender, contested Position, and the attacker’s previous Position.',
    'Enter Onset immediately.'
  ]
});

// Battle commitment sources, Reserve procedure, and withdrawal/no-winner position handling.
gameplay.battle.commitment_sources = {
  gambit: 'Hand',
  tactic: 'Reserve unless a rule or effect names another source'
};
gameplay.battle.reserve = {
  normal_size: 3,
  source: 'Draw Pile',
  temporary_private_zone: true,
  hand_set_aside_without_zone_change: true,
  owner_may_inspect_and_arrange: true,
  remaining_cards_normal_destination: 'Discard Pile',
  formation: 'After Gambits are set, set Hands physically aside without changing their zone and draw the applicable number of cards from the Draw Pile to form each player’s Reserve.'
};
gameplay.battle.withdrawal_procedure = {
  positional_default: {
    attacker: 'Return to the Position from which the attacker entered the contested Position.',
    defender: 'Move one Position toward the defender’s own end.'
  },
  only_attacker_withdraws: 'The defender remains in the contested Position.',
  only_defender_withdraws: 'The attacker remains in the contested Position and becomes its occupier if it is an opposing Territory the attacker does not control.',
  both_withdraw: 'Move the attacker first, then the defender. Neither becomes the occupier because of that withdrawal.',
  result_semantics: 'Withdrawal ends the battle sequence without determining a winner. There is no winner or loser, and victory, loss, and retreat triggers do not occur.',
  onset: 'Withdrawal during Onset ends the battle sequence without setting Gambits, without a battle result, and without an Aftermath.',
  after_onset: 'After Onset has completed and the battle has proceeded to Gambits, a later withdrawal completes remaining applicable non-result Aftermath procedures and clears committed battle cards normally.',
  classification: 'Withdrawal does not count as Fall Back or ordinary movement unless an effect says otherwise.'
};

// Shared choice, battle-card permission, Asset, binding, shorthand, repetition, and no-winner rules.
const cardRules = gameplay.card_rules;
cardRules.choices = {
  available_options_only: true,
  no_valid_option: 'If no valid option is available, that choice is ignored.'
};
cardRules.multiple_gambits_or_tactics = {
  permission_optional_by_default: true,
  simultaneous_tactic_choice: 'When several Tactics are chosen as part of the same choice, choose them simultaneously.',
  later_added_tactic_uses_additional_tactic_rules: true,
  modifier_stacking: 'Multiple applicable +N Reserve and +N Tactic instructions add together unless a rule or effect expressly says otherwise.'
};
cardRules.assets = {
  bank_heading: 'Asset',
  only_banked_effect_heading: true,
  inherent_bank_action: 'Bank: As an Action, play this card from your Hand and bank it.',
  inherent_bank_counts_as_action_effect_that_banks: true,
  special_banking_procedure_overrides_default: true,
  normal_limit: 'The number of Territories you control.',
  limit_recalculates_with_control: true,
  forced_discard_when_over_limit: 'If the Asset limit falls below the number of banked Assets, immediately discard Assets until within the limit.',
  forced_limit_discard_is_removal: true,
  replace_at_limit: 'When banking an Asset at the Asset limit, you may discard one Asset you control to make room and bank the new Asset as part of the same effect.',
  replacement_is_separate_action: false,
  prevented_departure_prevents_replacement: true,
  replaced_asset_departure_consequences_apply: true,
  ability_action_default: false,
  ability_action_rule: 'An Asset ability uses an Action only when the Asset or another rule expressly identifies an Action.'
};
Object.assign(cardRules.bind, {
  outside_normal_zones: true,
  face_up_public: true,
  face_down_owner_inspection_only: true,
  normal_availability: 'A bound card cannot be played, moved, or affected except as instructed by the effect to which it is bound.',
  binding_end: 'When the binding ends, follow the binding effect’s instructions; a card-specific destination or resolution overrides shared defaults.',
  specific_destination_overrides_default: true
});
Object.assign(cardRules.reveal_stage_interference, {
  definition: 'An effect of a revealed Gambit or Tactic that reveals, negates, returns, discards, replaces, or otherwise prevents another Gambit or Tactic at that same reveal stage from applying normally.',
  procedure: [
    'Resolve reveal-stage interference before ordinary effects at that stage.',
    'If multiple interference effects remain at the same timing, use the shared-timing rule among them.',
    'After interference is complete, resolve the remaining ordinary effects normally.'
  ],
  cannot_cancel_applied_effect: true,
  ordinary_reveal_effect_exclusion: 'An effect that only applies its own result, copies another effect, or replaces its own card remains an ordinary reveal effect unless it interferes with another Gambit or Tactic at that same stage.'
});
cardRules.compact_shorthand.meanings = {
  '+N Reserve': 'Add N cards to the player’s Reserve at the stated timing. During Reserve formation, increase the normal Reserve size by N.',
  '−N Reserve': 'Reduce that Reserve quantity by N; any stated or applicable minimum still applies.',
  '+N Tactic': 'Permit N additional Tactics under the additional-Tactic rules. Reserve is the default source unless another source is named.',
  '+N Card(s)': 'Draw N cards from the Draw Pile into Hand unless another player or destination is identified.',
  '+N Action': 'Grant N additional Actions during the current phase. Increase the number of Actions permitted in that phase; do not reopen a phase that has ended. If another phase is named, apply the Action there instead.',
  '+N Resource': 'Gain N of the named resource, including Capital, Influence, Command, or Conviction.',
  'Resource = N': 'Set the named resource to N.',
  '+N Battle Total': 'Add N to that player’s battle total.',
  'Retreat +N': 'Increase the distance of the identified retreat by N Positions; this modifies that retreat rather than creating a separate retreat.',
  'gain advantage': 'Gain one instance of advantage.',
  'gain double advantage': 'Gain two instances of advantage.',
  'gain disadvantage': 'Gain one instance of disadvantage.',
  'Advance Front Line N': 'Advance the player’s Front Line by N Territories, subject to stated conditions and the normal Front Line rules.',
  'condition prefix': 'A condition prefix such as Attacker, Defender, Counterattack, Win, or Lose applies only to the clause that immediately follows it.'
};
cardRules.compact_shorthand.multiple_reserve_and_tactic_modifiers_add = true;
Object.assign(cardRules.applying_and_repeating_effects, {
  controller: 'The player instructed to apply or repeat the effect controls that application.',
  source_play_triggers_do_not_repeat: true,
  source_play_trigger_rule: 'Because the source card was not played, set, or chosen again, triggers that care about those events do not occur merely because its effect was applied or repeated.',
  repeat_chain: 'A copied or repeated effect may create one further application if its own printed text instructs it to do so. That further application cannot create another copied or repeated effect in the same chain.'
});
Object.assign(cardRules.battle_ends_without_winner, {
  onset: 'If the sequence ends during Onset, no Gambits are set, no battle result occurs, and no Aftermath is resolved.',
  after_onset_unresolved_battle_effects: 'If Onset has completed and the battle has proceeded to Gambits, unresolved Gambit or Tactic effects do not apply after the battle-ending instruction unless that instruction expressly says otherwise.',
  after_onset_clear_cards: 'After Onset, clear committed cards and cards remaining in Reserve normally unless the ending effect gives them another destination.',
  position_and_occupation: 'Apply normal positional consequences, including Occupation when applicable, based on the Player Tokens that remain after any instructed withdrawal.',
  win_loss_conditions_do_not_apply: true
});
cardRules.cards_becoming_territories = {
  manifest_destiny: 'Whenever Manifest Destiny enters the Gauntlet as a Territory, it is a normal Territory with a normal Deed. Existing Deed purchase costs, caps, procedures, income rules, and Controlling Interest rules apply unchanged.'
};

function upsertRegistry(id, sources) {
  const existing = contract.ruleRegistry.find(entry => entry.id === id);
  if (existing) {
    existing.scope = 'core';
    existing.sources = sources;
    return;
  }
  const beforeFaction = contract.ruleRegistry.findIndex(entry => String(entry.id).startsWith('faction.'));
  const entry = { id, scope: 'core', sources };
  if (beforeFaction === -1) contract.ruleRegistry.push(entry);
  else contract.ruleRegistry.splice(beforeFaction, 0, entry);
}

upsertRegistry('core.card-zones', [{ path: ['gameplay', 'card_zones'] }]);
upsertRegistry('core.cards.choices', [{ path: ['gameplay', 'card_rules', 'choices'] }]);
upsertRegistry('core.cards.assets', [{ path: ['gameplay', 'card_rules', 'assets'] }]);
upsertRegistry('core.cards.bind', [{ path: ['gameplay', 'card_rules', 'bind'] }]);
upsertRegistry('core.cards.shorthand', [{ path: ['gameplay', 'card_rules', 'compact_shorthand'] }]);
upsertRegistry('core.cards.repeat', [{ path: ['gameplay', 'card_rules', 'applying_and_repeating_effects'] }]);
upsertRegistry('core.cards.no-winner', [{ path: ['gameplay', 'card_rules', 'battle_ends_without_winner'] }]);
upsertRegistry('core.cards.becoming-territories', [{ path: ['gameplay', 'card_rules', 'cards_becoming_territories'] }]);
upsertRegistry('core.battle.reserve', [{ path: ['gameplay', 'battle', 'reserve'] }]);
upsertRegistry('core.battle.withdrawal-procedure', [{ path: ['gameplay', 'battle', 'withdrawal_procedure'] }]);

fs.writeFileSync(authorityPath, `${JSON.stringify(authority, null, 2)}\n`, 'utf8');
fs.writeFileSync(contractPath, `${JSON.stringify(contract, null, 2)}\n`, 'utf8');
console.log('Normalized shared rules into canonical current-game authority without intended gameplay changes.');
