import { validateVisualPolicy } from './art-direction.mjs';

export function requireCurrentArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`Current-game authority expected ${label} to be an array.`);
  }
  return value;
}

function requireCurrentObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`Current-game authority expected ${label} to be an object.`);
  }
  return value;
}

function requireCurrentText(value, label) {
  if (!String(value || '').trim()) {
    throw new Error(`Current-game authority expected ${label} to contain rule text.`);
  }
  return value;
}

function validateLeader(leader) {
  if (!leader?.id || !leader?.faction || !leader?.name) {
    throw new Error('A current Leader definition is incomplete.');
  }
  const sections = requireCurrentArray(leader.sections, `${leader.id} Leader sections`);
  if (!sections.length) throw new Error(`Current Leader ${leader.id} has no sections.`);

  const classifications = new Set(['Faction Victory', 'Faction Feature', 'Leader Ability', 'Resource', 'Progression']);
  for (const section of sections) {
    if (!section?.name || !classifications.has(section.classification)) {
      throw new Error(`Current Leader ${leader.id} has an invalid section classification.`);
    }
    if (section.items !== undefined) {
      const items = requireCurrentArray(section.items, `${leader.id} grouped ability items`);
      if (!['Faction Feature', 'Leader Ability'].includes(section.classification) || !items.length) {
        throw new Error(`Current Leader ${leader.id} groups items outside a Faction Feature or Leader Ability.`);
      }
      for (const item of items) {
        if (!item?.name || !item?.text) {
          throw new Error(`Current Leader ${leader.id} has an incomplete grouped ability.`);
        }
        if (section.classification === 'Faction Feature' && item.classification !== 'Leader Ability') {
          throw new Error(`Current Leader ${leader.id} Faction Feature items must be classified as Leader Abilities.`);
        }
      }
    }
  }
  if (!sections.some(section => section.classification === 'Faction Victory')) {
    throw new Error(`Current Leader ${leader.id} is missing Faction Victory.`);
  }
  const hasLeaderAbility = sections.some(section => section.classification === 'Leader Ability')
    || sections.some(section => section.classification === 'Faction Feature'
      && section.items?.some(item => item.classification === 'Leader Ability'));
  if (!hasLeaderAbility) {
    throw new Error(`Current Leader ${leader.id} is missing Leader Ability.`);
  }
}

function validateMysticsStarterRites(authority) {
  const policy = authority.mystics?.selectionPolicy;
  const rites = requireCurrentArray(authority.mystics?.rites, 'Mystics Rite pool');
  const selectedCount = Number(policy?.selectedCount);
  if (!Number.isInteger(selectedCount) || selectedCount <= 0) {
    throw new Error('Current Mystics Rite selection policy has no valid selectedCount.');
  }
  const riteIds = new Set(rites.map(rite => rite?.id).filter(Boolean));
  for (const deck of requireCurrentArray(authority.starterDecks?.decks, 'starter Decks')) {
    if (deck.factionId !== 'mystics') continue;
    const selected = requireCurrentArray(deck.selectedRites, `${deck.id} selected Rites`);
    const order = requireCurrentArray(deck.recommendedRiteOrder, `${deck.id} recommended Rite order`);
    if (selected.length !== selectedCount || new Set(selected).size !== selected.length) {
      throw new Error(`Mystics starter ${deck.id} must select exactly ${selectedCount} different Rites.`);
    }
    if (selected.some(id => !riteIds.has(id))) {
      throw new Error(`Mystics starter ${deck.id} references an unknown selected Rite.`);
    }
    if (order.length !== selected.length || new Set(order).size !== order.length) {
      throw new Error(`Mystics starter ${deck.id} recommended Rite order must contain each selected Rite exactly once.`);
    }
    const selectedSorted = [...selected].sort();
    const orderSorted = [...order].sort();
    if (selectedSorted.some((id, index) => id !== orderSorted[index])) {
      throw new Error(`Mystics starter ${deck.id} recommended Rite order is not a permutation of its selected Rites.`);
    }
  }
}

function validateFactionFeatures(authority) {
  const taxonomy = authority.factionFeatureTaxonomy;
  if (!taxonomy?.factionFeature || !taxonomy?.leaderAbility || !taxonomy?.actionProfiles) {
    throw new Error('Current-game authority is missing the Faction Feature taxonomy.');
  }
  const profiles = new Set(['1 Action', 'No Action', 'Automatic']);
  for (const profile of profiles) {
    if (!taxonomy.actionProfiles[profile]) throw new Error(`Faction Feature taxonomy is missing ${profile}.`);
  }

  for (const factionId of ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']) {
    for (const feature of requireCurrentArray(authority.factionFeatures?.[factionId], `${factionId} Faction Features`)) {
      if (!feature?.name || !profiles.has(feature.profile) || !feature?.timing) {
        throw new Error(`Current ${factionId} Faction Feature is incomplete.`);
      }
    }
  }
  const militaryFeatures = authority.factionFeatures.military;
  if (militaryFeatures.length !== 1 || militaryFeatures[0]?.name !== 'Orders') {
    throw new Error('Military must expose Orders as its shared Faction Feature.');
  }
  for (const leader of requireCurrentArray(authority.leaders, 'Leaders')) {
    if (leader.faction !== 'military') continue;
    const orders = leader.sections?.find(section => section.name === 'Orders');
    if (!orders || orders.classification !== 'Faction Feature') {
      throw new Error(`Current Military Leader ${leader.id} must expose Orders as a Faction Feature section.`);
    }
    if (!orders.items?.length || orders.items.some(item => item.classification !== 'Leader Ability')) {
      throw new Error(`Current Military Leader ${leader.id} must classify each individual Order as a Leader Ability.`);
    }
  }
}

function validateTrackerPresentation(authority) {
  const components = [
    ...requireCurrentArray(authority.componentContract?.components, 'component contract components'),
    ...requireCurrentArray(authority.componentContract?.sharedComponents, 'shared component contract components'),
  ];
  for (const component of components.filter(item => item?.family === 'tracker')) {
    const presentation = component.presentation?.tracker;
    const scaleMaximum = Number(presentation?.scaleMaximum);
    const labelSizePt = Number(presentation?.labelSizePt);
    if (
      !presentation
      || !Number.isInteger(scaleMaximum)
      || scaleMaximum <= 0
      || !Number.isFinite(labelSizePt)
      || labelSizePt <= 0
      || !String(presentation.title || '').trim()
      || typeof presentation.capLabel !== 'string'
      || !String(presentation.instruction || '').trim()
    ) {
      throw new Error(`Current tracker ${component.id || '(missing id)'} has incomplete presentation authority.`);
    }
  }
}

function validateBattleCommitmentOrder(authority) {
  const order = authority.gameplay?.battle?.commitment_order;
  const expected = ['attacker', 'defender'];
  const gambits = requireCurrentArray(order?.gambits, 'normal Gambit commitment order');
  const tactics = requireCurrentArray(order?.tactics, 'normal Tactic commitment order');
  if (JSON.stringify(gambits) !== JSON.stringify(expected)) {
    throw new Error('Normal Gambit commitment order must be attacker then defender.');
  }
  if (JSON.stringify(tactics) !== JSON.stringify(expected)) {
    throw new Error('Normal Tactic commitment order must be attacker then defender.');
  }
  if (!String(order?.face_state || '').trim() || !String(order?.text || '').trim()) {
    throw new Error('Battle commitment order must define normal face state and explanatory text.');
  }
}

function validateSharedGameplayBaseline(authority) {
  const gameplay = requireCurrentObject(authority.gameplay, 'gameplay');
  const battle = requireCurrentObject(gameplay.battle, 'shared battle rules');
  const battlefield = requireCurrentObject(gameplay.battlefield, 'shared battlefield rules');
  const turn = requireCurrentObject(gameplay.turn, 'shared turn rules');
  const cardRules = requireCurrentObject(gameplay.card_rules, 'shared card rules');

  const battleTotal = requireCurrentObject(battle.battle_total, 'ordinary battle-total rules');
  if (battleTotal.ordinary_die_count !== 1) {
    throw new Error('Ordinary battle-total rules must define one normal battle die before modifiers or dice-selection rules.');
  }
  requireCurrentText(battleTotal.calculation, 'battle-total calculation');
  requireCurrentText(battleTotal.winner, 'battle-total winner rule');

  const advantage = requireCurrentObject(battle.advantage_disadvantage, 'Advantage and Disadvantage rules');
  if (advantage.instances_stack !== true || advantage.fixed_stacking_cap !== null) {
    throw new Error('Advantage and Disadvantage must remain additive instances with no fixed stacking cap.');
  }
  for (const key of ['cancellation', 'advantage_roll', 'disadvantage_roll', 'neutral_roll']) {
    requireCurrentText(advantage[key], `Advantage/Disadvantage ${key}`);
  }

  const normalResult = requireCurrentObject(battle.normal_result, 'normal battle result');
  for (const key of ['losing_attacker', 'losing_defender', 'winning_attacker', 'winning_defender', 'additional_retreat']) {
    requireCurrentText(normalResult[key], `normal battle result ${key}`);
  }

  const aftermath = requireCurrentObject(battle.aftermath, 'Aftermath rules');
  const expectedAftermath = [
    'determine_result',
    'replace_loss_with_withdrawal',
    'immediate_result_triggers',
    'normal_retreat_and_occupation',
    'additional_position_effects',
    'other_pre_clear_aftermath_effects',
    'clear_battle_cards',
    'card_movement_triggers',
    'end_of_aftermath',
  ];
  const aftermathSequence = requireCurrentArray(aftermath.sequence, 'Aftermath sequence');
  if (JSON.stringify(aftermathSequence) !== JSON.stringify(expectedAftermath)) {
    throw new Error('Current Aftermath sequence is incomplete or out of order.');
  }
  const aftermathSteps = requireCurrentObject(aftermath.steps, 'Aftermath step rules');
  for (const step of expectedAftermath) requireCurrentText(aftermathSteps[step], `Aftermath step ${step}`);
  const battleCardClear = requireCurrentObject(aftermath.battle_card_clear, 'battle-card clearing rules');
  for (const key of ['gambits', 'tactics', 'remaining_reserve', 'specific_destination_override', 'source_return']) {
    requireCurrentText(battleCardClear[key], `battle-card clearing rule ${key}`);
  }

  const draw = requireCurrentObject(turn.draw, 'Draw rules');
  if (draw.normal_cards !== 1 || draw.graveyard_recycles !== false) {
    throw new Error('Current Draw rules must preserve one normal Draw and keep the Graveyard outside normal recycling.');
  }
  for (const key of ['recycle', 'partial_resolution', 'normal_draw_failure']) {
    requireCurrentText(draw[key], `Draw rule ${key}`);
  }

  const actions = requireCurrentObject(turn.actions, 'Action rules');
  if (actions.normal_total !== turn.normal_actions || actions.maximum_per_phase !== turn.maximum_actions_per_phase) {
    throw new Error('Structured Action rules disagree with the current turn limits.');
  }
  for (const key of ['normal_timing', 'additional_actions', 'same_phase_permission', 'direct_permission']) {
    requireCurrentText(actions[key], `Action rule ${key}`);
  }

  const cleanup = requireCurrentObject(turn.cleanup, 'Cleanup rules');
  for (const key of ['hand_limit', 'procedure', 'expiration']) {
    requireCurrentText(cleanup[key], `Cleanup rule ${key}`);
  }

  requireCurrentText(battlefield.position, 'Position rule');
  const movementRules = requireCurrentObject(battlefield.movement_rules, 'battlefield movement rules');
  for (const key of ['voluntary_fall_back_boundary', 'tokens_cannot_pass', 'additional_movement', 'battle_ends_sequence', 'new_sequence_after_battle']) {
    requireCurrentText(movementRules[key], `movement rule ${key}`);
  }
  requireCurrentText(battlefield.occupation, 'Occupation rule');
  requireCurrentText(battlefield.counterattack, 'Counterattack rule');

  const goldenRules = requireCurrentObject(cardRules.golden_rules, 'shared golden rules');
  for (const key of ['specificity', 'may', 'must', 'instruction_order', 'partial_resolution']) {
    requireCurrentText(goldenRules[key], `golden rule ${key}`);
  }

  const sharedTiming = requireCurrentObject(cardRules.shared_timing, 'shared timing rules');
  for (const key of ['alternation', 'controller_order', 'simultaneous_reveal']) {
    requireCurrentText(sharedTiming[key], `shared timing rule ${key}`);
  }

  const reveal = requireCurrentObject(cardRules.reveal, 'reveal rules');
  for (const key of ['card', 'zone']) requireCurrentText(reveal[key], `reveal rule ${key}`);

  const negation = requireCurrentObject(cardRules.negation, 'negation rules');
  for (const key of ['effect', 'gambit_destination', 'tactic_destination', 'too_late']) {
    requireCurrentText(negation[key], `negation rule ${key}`);
  }

  const replacement = requireCurrentObject(cardRules.replacement, 'replacement rules');
  for (const key of ['same_role', 'eligibility', 'face_state', 'no_reopen', 'remaining_timing']) {
    requireCurrentText(replacement[key], `replacement rule ${key}`);
  }

  const revisingChoice = requireCurrentObject(cardRules.revising_choice, 'revised-choice rules');
  for (const key of ['procedure', 'no_implicit_window']) {
    requireCurrentText(revisingChoice[key], `revised-choice rule ${key}`);
  }

  const overlay = requireCurrentObject(cardRules.overlay, 'Overlay rules');
  if (overlay.is_asset !== false || overlay.control_follows_territory !== true || overlay.ownership_changes !== false) {
    throw new Error('Current Overlay identity, control, or ownership defaults are incomplete.');
  }
  for (const key of [
    'active_layer',
    'covered_layer',
    'dormant_timer',
    'dormant_removal_conditions',
    'orientation',
    'default_removal_destination',
    'you_reference',
  ]) {
    requireCurrentText(overlay[key], `Overlay rule ${key}`);
  }

  const restoration = authority.provenance?.currentDevelopmentInputs?.v072SharedBaselineRestoration;
  if (restoration !== '/docs/v0.7.2-shared-baseline-restoration.json') {
    throw new Error('Current-game authority is missing shared-baseline restoration provenance.');
  }

  const liveObjectText = JSON.stringify({
    cards: gameplay.cards,
    territories: gameplay.territories,
    leaders: authority.leaders,
    proposals: authority.proposals,
    mystics: authority.mystics,
  });
  const liveDependencies = [
    [/\bAdvantage\b|\bDisadvantage\b/u, battle.advantage_disadvantage, 'Advantage/Disadvantage'],
    [/\bnegat(?:e|ed|es|ing|ion)\b/iu, cardRules.negation, 'negation'],
    [/\bCounterattack\b/u, battlefield.counterattack, 'Counterattack'],
    [/\bOverlay\b/u, cardRules.overlay, 'Overlay'],
    [/\breplac(?:e|ed|es|ing|ement)\b/iu, cardRules.replacement, 'replacement'],
    [/\brevis(?:e|ed|es|ing)\b/iu, cardRules.revising_choice, 'revised-choice'],
  ];
  for (const [pattern, rule, label] of liveDependencies) {
    if (pattern.test(liveObjectText) && !rule) {
      throw new Error(`Live canonical objects use ${label} semantics without a shared authority rule.`);
    }
  }
}

export function validateCurrentGameAuthority(authority) {
  if (authority?.schemaVersion !== 2 || authority?.authority !== 'current-game') {
    throw new Error('Invalid complete current-game authority.');
  }
  if (!authority.version || !authority.displayVersion || !authority.gameplay || !authority.provenance) {
    throw new Error('Current-game authority is missing identity, gameplay, or provenance.');
  }
  validateVisualPolicy(authority.visualPolicy);
  for (const forbidden of ['sources', 'resolution', 'baseVersion', 'factionOverrides']) {
    if (Object.prototype.hasOwnProperty.call(authority, forbidden)) {
      throw new Error(`Current-game authority still exposes transitional field ${forbidden}.`);
    }
  }

  const gameplay = authority.gameplay;
  requireCurrentArray(gameplay.cards, 'playable cards');
  requireCurrentArray(gameplay.territories, 'Territories');
  requireCurrentArray(gameplay.factions, 'factions');
  requireCurrentArray(authority.proposals, 'Proposals');
  requireCurrentArray(authority.starterDecks?.decks, 'starter Decks');
  requireCurrentArray(authority.leaders, 'Leaders');
  validateMysticsStarterRites(authority);
  validateFactionFeatures(authority);
  validateTrackerPresentation(authority);
  validateBattleCommitmentOrder(authority);
  validateSharedGameplayBaseline(authority);
  authority.leaders.forEach(validateLeader);

  const ids = new Set();
  for (const card of gameplay.cards) {
    if (!card?.id || !card?.name || ids.has(card.id)) {
      throw new Error(`Duplicate or incomplete playable card ${card?.id || '(missing id)'}.`);
    }
    ids.add(card.id);
  }

  const headingRules = gameplay.card_rules?.effect_headings;
  const supportedHeadings = new Set(requireCurrentArray(headingRules?.supported, 'supported card effect headings'));
  const declaredPresentHeadings = new Set(requireCurrentArray(headingRules?.all_present_headings, 'present card effect headings'));
  const retiredHeadings = new Set(requireCurrentArray(headingRules?.retired, 'retired card effect headings'));
  const actualHeadings = new Set();

  for (const card of gameplay.cards) {
    for (const effect of requireCurrentArray(card.effects, `${card.id} effects`)) {
      const label = String(effect?.label || '').trim();
      if (!label) throw new Error(`Current card ${card.id} has an effect without a heading.`);
      if (!supportedHeadings.has(label)) {
        throw new Error(`Current card ${card.id} uses unsupported effect heading ${label}.`);
      }
      if (retiredHeadings.has(label)) {
        throw new Error(`Current card ${card.id} still uses retired effect heading ${label}.`);
      }
      actualHeadings.add(label);
    }
  }

  if (actualHeadings.size !== declaredPresentHeadings.size
    || [...actualHeadings].some(label => !declaredPresentHeadings.has(label))) {
    throw new Error('Current card effect-heading taxonomy does not match the headings actually present on cards.');
  }

  const territoryIds = new Set();
  for (const territory of gameplay.territories) {
    if (!territory?.id || territoryIds.has(territory.id)) {
      throw new Error(`Duplicate or incomplete Territory ${territory?.id || '(missing id)'}.`);
    }
    territoryIds.add(territory.id);
  }

  const active = JSON.stringify({
    gameplay: authority.gameplay,
    proposals: authority.proposals,
    arcaneSymbol: authority.arcaneSymbol,
    factionFeatureTaxonomy: authority.factionFeatureTaxonomy,
    factionFeatures: authority.factionFeatures,
    leaders: authority.leaders,
    mystics: authority.mystics,
  });
  const retired = active.match(/\bpending(?:-|\s+)battles?\b|\bFaction Actions?\b|\bFaction Abilit(?:y|ies)\b|\bfaction procedure\b/iu);
  if (retired) throw new Error(`Current-game authority still contains retired terminology: ${retired[0]}.`);

  return authority;
}
