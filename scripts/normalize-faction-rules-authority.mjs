import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const ROOT = process.cwd();
const AUTHORITY_PATH = path.join(ROOT, 'game-data/current-game.json');
const write = process.argv.includes('--write');

function invariant(condition, message) {
  if (!condition) throw new Error(message);
}

function findFeature(authority, factionId, name) {
  const feature = authority.factionFeatures?.[factionId]?.find(entry => entry.name === name);
  invariant(feature, `Missing ${factionId} feature: ${name}`);
  return feature;
}

function mergeFeature(authority, factionId, name, patch) {
  Object.assign(findFeature(authority, factionId, name), patch);
}

export function normalizeFactionRulesAuthority(input) {
  const authority = structuredClone(input);

  invariant(authority?.version === 'v0.7.2-candidate', `Expected v0.7.2-candidate authority, found ${authority?.version}`);
  invariant(authority.gameplay?.faction_rules, 'gameplay.faction_rules is missing');
  invariant(authority.factionFeatures, 'factionFeatures is missing');

  const normalization = {
    mechanics_changed: false,
    normalization_issue: 1681,
    purpose: 'Promote already-current faction procedures into canonical structured authority for direct technical publication.',
  };

  // Military is already mechanically complete across the faction record, Leader sections, and Orders feature.
  // Add only an explicit normalization marker and resource semantics so validators can assert the complete loop.
  authority.gameplay.faction_rules.military = {
    ...authority.gameplay.faction_rules.military,
    normalization,
    command: {
      starting: 0,
      minimum: 0,
      maximum: 2,
      gain: 'The first time each turn you win a battle, gain 1 Command.',
      first_win_only_each_turn: true,
      available_immediately: true,
    },
  };
  mergeFeature(authority, 'military', 'Orders', {
    text: 'Orders are the Military Faction Feature. The chosen Leader supplies that player’s available Orders as Leader Abilities. Spend the listed Command and resolve the Order at its stated timing without spending an Action.',
  });

  authority.gameplay.faction_rules.diplomats = {
    ...authority.gameplay.faction_rules.diplomats,
    normalization,
    influence: {
      starting: 1,
      minimum: 0,
      maximum: 10,
      staked_is_spent: false,
      staked_is_available: false,
      leverage_spending_returns_with_stake: false,
    },
    terms: {
      timing: 'During Onset, before Gambits.',
      opportunity: 'The attacker has the first opportunity to offer Terms. If the attacker passes, the defender may offer. Once either player offers Terms, the other cannot offer Terms in that battle sequence even if the Proposal is refused.',
      procedure: 'Choose one eligible Proposal whose Requirement is satisfied and stake its listed Influence. The opponent accepts or refuses.',
      accepted: 'Return the stake. Apply the Proposal’s Accepted effect. Accepted Terms end the battle sequence during Onset. If the Proposal was unratified, ratify it and normally gain 1 Influence.',
      refused: 'Apply the Proposal’s Refused effect and continue the battle unless that effect ends the sequence. Before dice, the Diplomat may use Leverage. If the Diplomat wins, return the stake and, if the Proposal was unratified, impose and ratify it and normally gain 2 Influence unless that Proposal says otherwise. If the Diplomat loses, lose the stake.',
      no_winner: 'If the battle ends without a winner after Terms were refused, return the stake. Do not impose the Proposal from that battle result.',
    },
    ratification: {
      accepted_new_reward: 1,
      imposed_new_reward: 2,
      already_ratified_reward: 0,
      already_ratified_reusable: true,
      counts_each_proposal_once: true,
      text: 'An unratified Proposal becomes a Treaty Article when accepted or when imposed after the Diplomat wins following refused Terms. A ratified Proposal remains usable, but ratifying it again gives no normal ratification reward and does not add another Treaty Article.',
    },
    leverage: {
      timing: 'After refused Terms and before battle dice are rolled.',
      costs: { '1': 1, '2': 3, '3': 6, '4': 10 },
      text: 'Spend available Influence to increase your battle total. The total cost for +N is triangular: 1 + 2 + … + N Influence.',
    },
    peace_treaty: {
      threshold: 6,
      timing: 'At the start of the Diplomat’s turn, after Capture and before Draw.',
      text: 'If six different Proposals are ratified at this check, the Diplomat wins immediately.',
    },
  };
  mergeFeature(authority, 'diplomats', 'Terms', {
    text: authority.gameplay.faction_rules.diplomats.terms.procedure,
    rules: authority.gameplay.faction_rules.diplomats.terms,
  });
  mergeFeature(authority, 'diplomats', 'Leverage', {
    text: authority.gameplay.faction_rules.diplomats.leverage.text,
    rules: authority.gameplay.faction_rules.diplomats.leverage,
  });

  authority.gameplay.faction_rules.financiers = {
    ...authority.gameplay.faction_rules.financiers,
    normalization,
    capital: {
      starting: 2,
      minimum: 0,
      limit_formula: 'Territories you control + total card value in your Treasury',
      may_exceed_limit_temporarily: true,
      limit_enforcement: 'At the end of every turn, including the opponent’s turn, if Capital exceeds the current Capital Limit, reduce Capital to that limit.',
    },
    treasury: {
      action_cost: 1,
      timing: 'Denouement',
      text: 'Place one card from your Hand face up in your Treasury.',
      public: true,
      is_asset: false,
      normal_play_or_effect_access: false,
      value_contributes_to_capital_limit: true,
    },
    income: {
      timing: 'After Capture at the start of your turn.',
      text: 'Gain 1 Capital for each Deed you own.',
    },
    financial_capacity_rules: {
      timing: 'After Capture and before Draw.',
      qualification: 'Treasury value is greater than the number of Territories you control.',
      determine_once: true,
      text: 'If qualified, you may take one Action during Opening and one Action during Denouement that turn. You still cannot take two Actions in the same phase. At least one of those Actions must be spent on a Financier Faction Feature marked 1 Action. A Leader Ability does not by itself satisfy that requirement.',
      qualifying_features: ['Treasury', 'Deeds', 'Play the Market'],
    },
    deeds: {
      action_cost: 1,
      timing: 'Denouement',
      ownership_independent_of_control: true,
      ownership_independent_of_occupation: true,
      text: 'Pay the Deed’s full current cost, then take its Deed Card from the shared supply or from an opposing Financier.',
      cost: {
        base: 'min(Deeds you own + 1, 6)',
        position_modifiers: {
          control: -1,
          occupy: 0,
          neither: 1,
        },
        buyout_premium: 'If the Deed is owned by an opposing Financier, add min(Deeds that opposing Financier owns, 6). Otherwise add 0.',
        minimum: 1,
        sequential_recalculation: true,
        formula: 'max(1, min(Deeds you own + 1, 6) + position modifier + buyout premium)',
      },
    },
    play_the_market: {
      action_cost: 1,
      timing: 'Denouement',
      cost: 'Discard one card from your Hand.',
      roll: {
        '1': 'Put the discarded card in your Graveyard; gain 0 Capital.',
        '2-3': 'Gain 1 Capital.',
        '4-5': 'Gain Capital equal to the discarded card’s value.',
        '6': 'Gain Capital equal to twice the discarded card’s value.',
      },
    },
    subsidize: {
      timing: 'Before dice are rolled.',
      action_cost: 0,
      costs: { '1': 1, '2': 3, '3': 6, '4': 10 },
      text: 'Spend Capital to increase your battle total. The total cost for +N is triangular: 1 + 2 + … + N Capital.',
    },
    controlling_interest: {
      text: 'If you own the Deeds to every Territory currently in the Gauntlet, you win immediately.',
      immediate: true,
    },
  };
  mergeFeature(authority, 'financiers', 'Treasury', {
    text: authority.gameplay.faction_rules.financiers.treasury.text,
    rules: authority.gameplay.faction_rules.financiers.treasury,
  });
  mergeFeature(authority, 'financiers', 'Deeds', {
    text: authority.gameplay.faction_rules.financiers.deeds.text,
    rules: authority.gameplay.faction_rules.financiers.deeds,
  });
  mergeFeature(authority, 'financiers', 'Play the Market', {
    text: 'Discard one card from your Hand, roll one die, and resolve the Play the Market result table.',
    rules: authority.gameplay.faction_rules.financiers.play_the_market,
  });
  mergeFeature(authority, 'financiers', 'Subsidize', {
    text: authority.gameplay.faction_rules.financiers.subsidize.text,
    rules: authority.gameplay.faction_rules.financiers.subsidize,
  });
  mergeFeature(authority, 'financiers', 'Financial Capacity', {
    text: authority.gameplay.faction_rules.financiers.financial_capacity_rules.text,
    rules: authority.gameplay.faction_rules.financiers.financial_capacity_rules,
  });
  mergeFeature(authority, 'financiers', 'Income', {
    text: authority.gameplay.faction_rules.financiers.income.text,
    rules: authority.gameplay.faction_rules.financiers.income,
  });

  authority.gameplay.faction_rules.intelligence = {
    ...authority.gameplay.faction_rules.intelligence,
    normalization,
    intel: {
      starting: 0,
      minimum: 0,
      maximum: null,
      turn_start_gain: 'At the start of your turn, gain Intel equal to your Operation Progress.',
    },
    operation_progress: {
      starting: 0,
      minimum: 0,
      maximum: null,
      text: 'Operation Progress is the number of normal Missions you have completed. Increase it by 1 whenever you complete a normal Mission. It is not normally spent.',
    },
    mission_slot: {
      maximum: 1,
      active_mission_and_special_operation_share_slot: true,
      eligible_card: 'An Intelligence card with a printed Mission requirement.',
    },
    missions: {
      start: {
        action_cost: 1,
        timing: 'Denouement',
        text: 'Choose an eligible Intelligence card in your Hand with a printed Mission requirement and place it face down near your Leader as your Active Mission.',
        cannot_complete_turn_started: true,
      },
      complete: {
        action_cost: 1,
        timing: 'A later Denouement after the printed Mission requirement has been satisfied.',
        text: 'Reveal the Active Mission, increase Operation Progress by 1, gain Intel equal to the card’s value, then put the completed Mission in your Discard Pile.',
        destination: 'Discard Pile',
      },
      abort: {
        action_cost: 1,
        timing: 'Denouement',
        cost: 'Intel equal to the Mission card’s value',
        text: 'Reveal the Active Mission, spend Intel equal to its value, and put it in your Discard Pile.',
        destination: 'Discard Pile',
        qualifies_for_operational_capacity: false,
      },
      fail: {
        text: 'If a rule, effect, or continuing requirement causes a Mission to fail, reveal it and put it in your Graveyard.',
        destination: 'Graveyard',
      },
    },
    special_operations: {
      readiness: 'Operation Progress exceeds the number of Territories the opponent controls.',
      start: {
        action_cost: 1,
        timing: 'Denouement',
        requirements: ['Readiness is true.', 'The Mission / Special Operation slot is empty.', 'You have an eligible Intelligence card with a printed Mission requirement in Hand.'],
        text: 'Place the eligible card face down as your Special Operation.',
      },
      readiness_must_continue: true,
      readiness_failure: 'If Operation Progress stops exceeding the number of Territories the opponent controls while a Special Operation is active, reveal it and put it in your Graveyard.',
      complete: {
        action_cost: 1,
        timing: 'Denouement after its printed Mission requirement has been satisfied while readiness remains true.',
        intel_cost_formula: 'max(1, Territories currently in the Gauntlet - Special Operation card value)',
        text: 'Reveal the Special Operation and pay its Intel cost. If you can pay, win immediately through Special Operation.',
        increases_operation_progress: false,
        grants_normal_mission_intel: false,
      },
    },
    surveillance: {
      gambit: {
        timing: 'After the opponent sets a face-down Gambit.',
        cost: '1 Intel',
        limit: 'Once per battle',
        text: 'Reveal that Gambit.',
      },
      tactic: {
        timing: 'After the opponent chooses face-down Tactics.',
        cost: '1 Intel per opposing Tactic revealed',
        limit: 'Once per battle',
        text: 'Reveal the chosen opposing Tactics you pay to reveal.',
      },
    },
    interference: {
      timing: 'Immediately after an opposing Gambit or Tactic is revealed through Surveillance.',
      cost: '2 additional Intel per revealed card removed',
      gambit_destination: 'Hand',
      tactic_destination: 'Reserve',
      replacement_source: 'The same source as the removed card',
      replacement_face_state: 'face down',
      replacement_optional: true,
      replacement_does_not_reopen_surveillance_or_interference: true,
      revise_own_choice: 'If you had already made your own Gambit or Tactic choice at that stage, after the opponent makes any replacement you may revise your own choice using the information already gained.',
      direct_interference: 'If an opposing Gambit or Tactic is chosen face up, there is nothing to reveal. At that stage’s normal response timing, you may spend 2 Intel to use Direct Interference. It uses that stage’s Interference opportunity and does not create an additional Interference use.',
    },
  };
  mergeFeature(authority, 'intelligence', 'Missions', {
    text: 'Start, Complete, or Abort the single Active Mission using the canonical Mission procedures.',
    rules: authority.gameplay.faction_rules.intelligence.missions,
  });
  mergeFeature(authority, 'intelligence', 'Special Operations', {
    text: 'When ready, use the shared Mission slot to prepare and complete a Special Operation for the Intelligence faction victory.',
    rules: authority.gameplay.faction_rules.intelligence.special_operations,
  });
  mergeFeature(authority, 'intelligence', 'Surveillance', {
    text: 'Spend Intel at the Gambit or Tactic choice stage to reveal opposing face-down battle-card choices, subject to the separate once-per-battle limit at each stage.',
    rules: authority.gameplay.faction_rules.intelligence.surveillance,
  });
  mergeFeature(authority, 'intelligence', 'Interference', {
    text: 'Immediately after an eligible opposing battle-card reveal, spend Intel to remove that card and permit a replacement from the same source without reopening the information window.',
    rules: authority.gameplay.faction_rules.intelligence.interference,
  });
  mergeFeature(authority, 'intelligence', 'Operational Capacity', {
    rules: {
      text: authority.gameplay.faction_rules.intelligence.operational_capacity,
      qualifying_features: authority.gameplay.faction_rules.intelligence.operational_capacity_qualifying_features,
      excluded_features: authority.gameplay.faction_rules.intelligence.operational_capacity_excluded_features,
    },
  });

  authority.mystics.generalRules = {
    ...authority.mystics.generalRules,
    normalization,
    one_active_rite: 'You may have only one begun but incomplete Rite at a time.',
    completion_delay: 'A Rite cannot complete during the turn it begins.',
    completion_limit: 'Only one Rite may be completed per turn.',
    interruption: 'If a Rite is interrupted, it resets and costs already paid are not returned unless the Rite says otherwise.',
    completed_rites_persist: 'Completed Rites remain complete. Interrupting a later Rite or the Ritual of Ascension does not erase Rites already completed.',
    bound_card_default: 'When a Rite or Ritual binding ends without another destination instruction, its bound cards go to their owners’ Graveyards. A more specific Rite or Ritual destination overrides this default.',
  };
  authority.gameplay.faction_rules.mystics = {
    ...authority.gameplay.faction_rules.mystics,
    normalization,
    rite_lifecycle: authority.mystics.generalRules,
  };
  mergeFeature(authority, 'mystics', 'Rites', {
    text: 'Spend 1 Action during Denouement to begin one incomplete selected Rite, reveal it, and follow its printed Begin instruction. The canonical Rite lifecycle rules govern completion and interruption.',
    rules: authority.mystics.generalRules,
  });
  mergeFeature(authority, 'mystics', 'Invocation', {
    text: authority.mystics.unlocks.find(entry => entry.name === 'Invocation')?.text,
  });
  mergeFeature(authority, 'mystics', 'Transmutation', {
    text: authority.mystics.unlocks.find(entry => entry.name === 'Transmutation')?.text,
  });
  mergeFeature(authority, 'mystics', 'Convergence', {
    text: authority.mystics.ritual.convergence,
  });
  mergeFeature(authority, 'mystics', 'Ritual of Ascension', {
    text: authority.mystics.ritual.begin,
    rules: authority.mystics.ritual,
  });

  authority.gameplay.faction_rules.inquisition = {
    ...authority.gameplay.faction_rules.inquisition,
    normalization,
    conviction: {
      starting: 0,
      minimum: 0,
      maximum: 4,
      timing: 'First qualifying Aftermath each turn.',
      text: 'The first time each turn one or more opposing cards enter the Graveyard during an Aftermath, gain 1 Conviction, up to the maximum of 4.',
      per_qualifying_aftermath_gain: 1,
      once_per_turn: true,
      may_trigger_on_either_players_turn: true,
      does_not_require_win: true,
    },
    condemnation: {
      timing: 'During the Aftermath.',
      text: 'Opposing Tactics go to their owner’s Graveyard instead of their Discard Pile.',
      remaining_reserve_unchanged: true,
    },
    blasphemy: {
      timing: 'Opposing Arcane Action or reveal.',
      text: 'Gain 1 Conviction whenever the opponent plays an Arcane card for its Action effect or reveals an Arcane Gambit or Tactic they control.',
      separate_from_normal_conviction_gain: true,
    },
    purge: {
      action_cost: 1,
      timings: ['Opening', 'Denouement'],
      action_purge_limit: 'Once per turn',
      options: {
        '1': 'Choose one: put the top card of the opponent’s Discard Pile in their Graveyard; or choose up to two cards there with combined value 2 or less and put them in their Graveyard.',
        '2': 'Choose one opposing Asset and put it in its owner’s Graveyard.',
        '3': 'The opponent chooses one card from their Hand and puts it in their Graveyard.',
        '4': 'Reveal the opponent’s Hand; choose one card and put it in their Graveyard.',
      },
      discard_pile_top: 'The top of the Discard Pile is its most recently placed card.',
      combined_value_choice_preserves_remaining_order: true,
      two_phase_permission: 'If one Action that turn is Purge, you may also take one Action in the other Action phase that turn. You still cannot take two Actions in the same phase.',
      directly_permitted_purge: 'A Purge directly permitted by a rule or Leader Ability does not spend an Action, does not use the once-per-turn permission to spend an Action on Purge, and does not activate the two-phase Action permission by itself.',
    },
    purification: {
      timing: 'After the opponent’s normal start-of-turn draw attempt.',
      text: 'If the opponent draws no cards because both their Draw Pile and Discard Pile are empty, you win immediately.',
      other_failed_draws_do_not_trigger: true,
    },
  };
  mergeFeature(authority, 'inquisition', 'Conviction', {
    text: authority.gameplay.faction_rules.inquisition.conviction.text,
    rules: authority.gameplay.faction_rules.inquisition.conviction,
  });
  mergeFeature(authority, 'inquisition', 'Condemnation', {
    text: authority.gameplay.faction_rules.inquisition.condemnation.text,
    rules: authority.gameplay.faction_rules.inquisition.condemnation,
  });
  mergeFeature(authority, 'inquisition', 'Blasphemy', {
    text: authority.gameplay.faction_rules.inquisition.blasphemy.text,
    rules: authority.gameplay.faction_rules.inquisition.blasphemy,
  });
  mergeFeature(authority, 'inquisition', 'Purge', {
    text: 'Spend the listed Conviction to perform one Purge option. An Action Purge may be taken during Opening or Denouement once per turn and can enable one Action in the other Action phase that turn.',
    rules: authority.gameplay.faction_rules.inquisition.purge,
  });
  mergeFeature(authority, 'inquisition', 'Purification', {
    text: authority.gameplay.faction_rules.inquisition.purification.text,
    rules: authority.gameplay.faction_rules.inquisition.purification,
  });

  return authority;
}

const inputText = fs.readFileSync(AUTHORITY_PATH, 'utf8');
const input = JSON.parse(inputText);
const normalized = normalizeFactionRulesAuthority(input);
const outputText = `${JSON.stringify(normalized, null, 2)}\n`;

if (write) {
  fs.writeFileSync(AUTHORITY_PATH, outputText, 'utf8');
  console.log('Normalized faction procedures into game-data/current-game.json without intended gameplay changes.');
} else if (inputText !== outputText) {
  console.error('Faction authority is not normalized. Run: node scripts/normalize-faction-rules-authority.mjs --write');
  process.exitCode = 1;
} else {
  console.log('Faction authority normalization is current.');
}