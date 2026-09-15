const INTERNAL_FIELDS = new Set([
  'normalization',
  'id',
  'artwork',
  'cardBack',
  'completedArtwork',
  'headerLines',
  'style',
]);

const PART_NUMERALS = {
  military: 'X',
  diplomats: 'XI',
  financiers: 'XII',
  intelligence: 'XIII',
  mystics: 'XIV',
  inquisition: 'XV',
};

function required(value, label) {
  if (value === undefined || value === null) throw new Error(`Missing faction rules authority field: ${label}`);
  return value;
}

function partHeader(part) {
  const [id, title, covers] = part;
  const markers = covers.map(ruleId => `<!-- RULES-COVER:${ruleId} -->`).join('\n');
  return `<!-- RULES-PART:${id} -->\n## ${title}${markers ? `\n${markers}` : ''}`;
}

function getFaction(authority, factionId) {
  const faction = authority.gameplay.factions.find(entry => entry.id === factionId);
  if (!faction) throw new Error(`Missing faction definition: ${factionId}`);
  return faction;
}

function getProcedures(authority, factionId) {
  return required(authority.gameplay.faction_rules?.[factionId], `gameplay.faction_rules.${factionId}`);
}

function assertKnownKeys(object, allowed, label) {
  const unknown = Object.keys(object || {}).filter(key => !allowed.includes(key) && !INTERNAL_FIELDS.has(key));
  if (unknown.length) {
    throw new Error(`${label} contains unhandled authority fields: ${unknown.join(', ')}`);
  }
}

function numbered(values) {
  return values.map((value, index) => `${index + 1}. ${value}`).join('\n');
}

function renderCostMap(costs, unit) {
  return Object.entries(costs || {})
    .map(([bonus, cost]) => `- **+${bonus}:** ${cost} ${unit}`)
    .join('\n');
}

function namedEntries(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') return Object.values(value);
  return [];
}

function renderFeatures(authority, factionId) {
  const features = authority.factionFeatures?.[factionId] || [];
  if (!features.length) return 'No shared Faction Features are registered.';
  return features.map(feature => {
    const descriptor = [feature.profile, feature.timing, feature.cost].filter(Boolean).join(' · ');
    const detailLines = Object.entries(feature)
      .filter(([key, value]) => !['name', 'profile', 'timing', 'cost'].includes(key)
        && !INTERNAL_FIELDS.has(key)
        && (value == null || typeof value !== 'object'))
      .map(([key, value]) => {
        const label = key.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
        return `- **${label}:** ${value}`;
      });
    return `#### ${feature.name}\n\n${descriptor ? `**${descriptor}**` : ''}${detailLines.length ? `\n\n${detailLines.join('\n')}` : ''}`.trim();
  }).join('\n\n');
}

function renderLeaders(faction, heading) {
  const leaders = faction.leaders.map(leader => {
    const abilities = leader.sections.filter(section => section.classification === 'Leader Ability');
    const blocks = abilities.map(ability => {
      const descriptor = [ability.cost, ability.descriptor].filter(Boolean).join(' · ');
      if (Array.isArray(ability.items)) {
        const items = ability.items.map(item => {
          const itemDescriptor = [item.cost, item.descriptor].filter(Boolean).join(' · ');
          return `###### ${item.name}\n\n${itemDescriptor ? `**${itemDescriptor}**\n\n` : ''}${item.text || ''}`;
        }).join('\n\n');
        return `##### ${ability.name}\n\n${descriptor ? `**${descriptor}**\n\n` : ''}${items}`;
      }
      return `##### ${ability.name}\n\n${descriptor ? `**${descriptor}**\n\n` : ''}${ability.text || ''}`;
    }).join('\n\n');
    return `#### ${leader.name}\n\n${leader.note ? `*${leader.note}*\n\n` : ''}${blocks || 'This Leader has no separate Leader Ability.'}`;
  }).join('\n\n');

  return `### ${heading} Leaders\n\n${leaders}`;
}

function factionIntro(faction) {
  const resource = faction.resource ? ` Its principal resource or progression is **${faction.resource}**.` : '';
  const victory = faction.victory.trim();
  let additional = '';
  if (victory !== 'Run the Gauntlet.') {
    const sharedPrefix = 'Run the Gauntlet or ';
    additional = victory.startsWith(sharedPrefix)
      ? ` An additional victory route is to ${victory.slice(sharedPrefix.length, -1)}.`
      : ` An additional victory route is: ${victory}`;
  }
  return `${faction.name} can always win by running the Gauntlet.${additional}${resource}`;
}

function renderMilitary(authority, part) {
  const faction = getFaction(authority, 'military');
  const p = getProcedures(authority, 'military');
  assertKnownKeys(p, ['resource', 'fortify', 'orders', 'leader_abilities', 'faction_features_1_action', 'command'], 'Military procedures');
  const c = required(p.command, 'military.command');

  return `${partHeader(part)}

${factionIntro(faction)}

### X.1 Command

Command begins at **${c.starting}**, cannot fall below **${c.minimum}**, and normally cannot exceed **${c.maximum}**.

${c.gain}

${c.gain_timing}

This Command trigger can occur on either player's turn, but only on the first battle you win during that turn. If that first win occurs while you are already at the Command maximum, the trigger is still used for that turn. A withdrawal has no winner and does not generate Command.

### X.2 Orders

${p.orders}

The chosen Leader determines which Orders are available.

### X.3 Fortify

${p.fortify}

Fortify is still subject to the normal Front Line and Capture rules; "if able" prevents it from creating non-contiguous control.

### X.4 Faction Features

${renderFeatures(authority, 'military')}

${renderLeaders(faction, 'X.5')}`;
}

function renderDiplomats(authority, part) {
  const faction = getFaction(authority, 'diplomats');
  const p = getProcedures(authority, 'diplomats');
  assertKnownKeys(p, [
    'starting_influence',
    'peace_treaty_threshold',
    'terms_timing',
    'accepted_reward',
    'imposed_reward',
    'leverage_costs',
    'influence',
    'terms',
    'ratification',
    'leverage',
    'peace_treaty',
  ], 'Diplomat procedures');

  const influence = required(p.influence, 'diplomats.influence');
  const terms = required(p.terms, 'diplomats.terms');
  const ratification = required(p.ratification, 'diplomats.ratification');
  const leverage = required(p.leverage, 'diplomats.leverage');
  const peace = required(p.peace_treaty, 'diplomats.peace_treaty');
  const proposals = namedEntries(required(authority.proposals, 'proposals'));

  const proposalText = proposals.map(proposal => {
    const name = required(proposal.name, 'proposal.name');
    return `#### ${name}

**Stake:** ${proposal.stake} Influence  
**Requirement:** ${proposal.requirement}

**Accepted:** ${proposal.accepted}

**Refused:** ${proposal.refused}`;
  }).join('\n\n');

  return `${partHeader(part)}

${factionIntro(faction)}

### XI.1 Influence

Influence begins at **${influence.starting}**, cannot fall below **${influence.minimum}**, and cannot exceed **${influence.maximum}**.

Influence staked for Terms is not spent, but it is unavailable while staked. Influence spent on Leverage is spent normally and does not return when a stake is returned.

### XI.2 Terms

${terms.timing}

${terms.opportunity}

${terms.eligibility}

${terms.procedure}

**If accepted:** ${terms.accepted}

**If refused:** ${terms.refused}

**No winner:** ${terms.no_winner}

### XI.3 Ratification and Peace Treaty

${ratification.text}

Imposition after a qualifying win is optional. Ratifying a new Proposal through accepted Terms normally grants **${ratification.accepted_new_reward} Influence**; ratifying a new Proposal by imposition normally grants **${ratification.imposed_new_reward} Influence**. A Proposal already ratified remains usable but grants **${ratification.already_ratified_reward}** normal ratification Influence and counts only once toward Peace Treaty.

${peace.timing}

${peace.text}

### XI.4 Leverage

${leverage.timing}

${leverage.text}

${renderCostMap(leverage.costs || p.leverage_costs, 'Influence')}

### XI.5 Proposal corpus

${proposalText}

### XI.6 Faction Features

${renderFeatures(authority, 'diplomats')}

${renderLeaders(faction, 'XI.7')}`;
}

function renderFinanciers(authority, part) {
  const faction = getFaction(authority, 'financiers');
  const p = getProcedures(authority, 'financiers');
  assertKnownKeys(p, [
    'starting_capital',
    'financial_capacity',
    'faction_feature_action_phase',
    'capital',
    'treasury',
    'income',
    'financial_capacity_rules',
    'deeds',
    'play_the_market',
    'subsidize',
    'controlling_interest',
  ], 'Financier procedures');

  const capital = required(p.capital, 'financiers.capital');
  const treasury = required(p.treasury, 'financiers.treasury');
  const capacity = required(p.financial_capacity_rules, 'financiers.financial_capacity_rules');
  const deeds = required(p.deeds, 'financiers.deeds');
  const market = required(p.play_the_market, 'financiers.play_the_market');
  const subsidize = required(p.subsidize, 'financiers.subsidize');
  const control = required(p.controlling_interest, 'financiers.controlling_interest');

  const marketRolls = Object.entries(required(market.roll, 'financiers.play_the_market.roll'))
    .map(([roll, text]) => `- **${roll.replaceAll('_', '–')}:** ${text}`)
    .join('\n');
  const modifiers = Object.entries(required(deeds.cost.position_modifiers, 'financiers.deeds.cost.position_modifiers'))
    .map(([position, modifier]) => `- **${position[0].toUpperCase()}${position.slice(1)}:** ${modifier >= 0 ? '+' : ''}${modifier}`)
    .join('\n');

  return `${partHeader(part)}

${factionIntro(faction)}

### XII.1 Capital and Capital Limit

Capital begins at **${capital.starting}** and cannot fall below **${capital.minimum}**.

The Capital Limit is **${capital.limit_formula}**. Recalculate that limit immediately whenever its inputs change. Capital may temporarily exceed the limit. ${capital.limit_enforcement}

### XII.2 Treasury and Income

**Treasury — ${treasury.timing}, ${treasury.action_cost} Action.** ${treasury.text}

The Treasury is public, is not an Asset, and its cards are unavailable to normal play or effect access while there. Each Treasury card's value contributes to the Capital Limit.

**Income.** ${p.income.text} Timing: ${p.income.timing}

### XII.3 Financial Capacity

${capacity.timing}

**Qualification:** ${capacity.qualification}

${capacity.text}

Determine qualification once at that timing for the turn. The qualifying 1-Action Financier Faction Features are: ${(capacity.qualifying_features || []).join(', ')}.

### XII.4 Deeds

${deeds.text}

Deed ownership is independent of Territory control and occupation.

The current Deed cost is:

**${deeds.cost.formula}**

Base cost: ${deeds.cost.base}. ${deeds.cost.buyout_premium} The minimum cost is ${deeds.cost.minimum}. Recalculate sequentially after each purchase or buyout.

Position modifier:

${modifiers}

### XII.5 Play the Market

**${market.timing}, ${market.action_cost} Action.** Cost: ${market.cost}

${marketRolls}

### XII.6 Subsidize

${subsidize.timing}

${subsidize.text}

${renderCostMap(subsidize.costs, 'Capital')}

### XII.7 Controlling Interest

${control.text}

This victory is immediate when its condition becomes true.

### XII.8 Faction Features

${renderFeatures(authority, 'financiers')}

${renderLeaders(faction, 'XII.9')}`;
}

function renderIntelligence(authority, part) {
  const faction = getFaction(authority, 'intelligence');
  const p = getProcedures(authority, 'intelligence');
  assertKnownKeys(p, [
    'faction_feature_action_phase',
    'mission_control_classification',
    'turn_start_intel',
    'operational_capacity',
    'faction_features_1_action',
    'operational_capacity_qualifying_features',
    'operational_capacity_excluded_features',
    'intel',
    'operation_progress',
    'mission_slot',
    'missions',
    'special_operations',
    'surveillance',
    'interference',
  ], 'Intelligence procedures');

  const intel = required(p.intel, 'intelligence.intel');
  const progress = required(p.operation_progress, 'intelligence.operation_progress');
  const slot = required(p.mission_slot, 'intelligence.mission_slot');
  const missions = required(p.missions, 'intelligence.missions');
  const special = required(p.special_operations, 'intelligence.special_operations');
  const surveillance = required(p.surveillance, 'intelligence.surveillance');
  const interference = required(p.interference, 'intelligence.interference');

  return `${partHeader(part)}

${factionIntro(faction)}

### XIII.1 Intel and Operation Progress

Intel begins at **${intel.starting}**, cannot fall below **${intel.minimum}**, and has ${intel.maximum == null ? 'no maximum' : `a maximum of ${intel.maximum}`}.

${intel.turn_start_gain || p.turn_start_intel}

${progress.text} Operation Progress begins at **${progress.starting}**, cannot fall below **${progress.minimum}**, and has ${progress.maximum == null ? 'no maximum' : `a maximum of ${progress.maximum}`}.

### XIII.2 Operational Capacity

${p.operational_capacity}

The qualifying Denouement uses are: ${(p.operational_capacity_qualifying_features || []).join(', ')}. ${(p.operational_capacity_excluded_features || []).join(', ')} does not qualify.

### XIII.3 Mission slot and normal Missions

The Mission / Special Operation slot holds at most **${slot.maximum}** active card. A normal Mission and a Special Operation share that slot. **Eligibility:** ${slot.eligible_card}

**Start (${missions.start.action_cost} Action).** ${missions.start.timing} ${missions.start.text} A Mission cannot complete on the turn it was started.

**Complete (${missions.complete.action_cost} Action).** ${missions.complete.timing} ${missions.complete.text}

**Abort (${missions.abort.action_cost} Action).** ${missions.abort.timing} ${missions.abort.text}

**Failure.** ${missions.fail.text}

While a Mission is active, its owner may inspect it and the opponent knows the slot is occupied, but the printed requirement remains hidden. The requirement counts only while the card is active. Its other printed effects cannot be used while active, and starting it is not playing the card for another effect.

### XIII.4 Special Operations

**Readiness:** ${special.readiness}

Readiness must continue while the Special Operation remains active. ${special.readiness_failure}

**Start (${special.start.action_cost} Action).** ${special.start.timing} ${special.start.text}

Requirements:

${numbered(special.start.requirements)}

**Complete (${special.complete.action_cost} Action).** ${special.complete.timing} Intel cost: **${special.complete.intel_cost_formula}**. ${special.complete.text}

Completing a Special Operation does not increase Operation Progress and does not grant the normal Mission Intel reward.

While active, the owner may inspect the Special Operation and the opponent knows the slot is occupied, but its printed requirement remains hidden and its other printed effects cannot be used.

### XIII.5 Surveillance

**Gambit:** ${surveillance.gambit.timing} Spend ${surveillance.gambit.cost}. ${surveillance.gambit.text} Limit: ${surveillance.gambit.limit}.

**Tactic:** ${surveillance.tactic.timing} Spend ${surveillance.tactic.cost}. ${surveillance.tactic.text} Limit: ${surveillance.tactic.limit}.

### XIII.6 Interference

${interference.timing}

Spend ${interference.cost}. A removed Gambit goes to **${interference.gambit_destination}**; a removed Tactic goes to **${interference.tactic_destination}**. Removal is optional.

The opponent may replace a removed card. Replacement source: ${interference.replacement_source}. The replacement is ${interference.replacement_face_state}. Replacement is optional. ${interference.replacement_does_not_reopen_surveillance_or_interference ? 'A replacement does not reopen Surveillance or Interference at that stage.' : ''}

${interference.revise_own_choice}

${interference.direct_interference}

### XIII.7 Faction Features

${renderFeatures(authority, 'intelligence')}

${renderLeaders(faction, 'XIII.8')}`;
}

function renderMystics(authority, part) {
  const faction = getFaction(authority, 'mystics');
  const p = getProcedures(authority, 'mystics');
  assertKnownKeys(p, [
    'faction_feature_action_phase',
    'guardians_protection_values',
    'faction_features_1_action',
  ], 'Mystics procedures');

  const mystics = required(authority.mystics, 'mystics');
  const rites = namedEntries(required(mystics.rites, 'mystics.rites'));
  const ritual = required(mystics.ritual, 'mystics.ritual');
  const unlocks = namedEntries(required(mystics.unlocks, 'mystics.unlocks'));
  const selection = required(mystics.selectionPolicy, 'mystics.selectionPolicy');
  const general = required(mystics.generalRules, 'mystics.generalRules');

  const riteText = rites.map(rite => {
    const reminder = rite.reminder?.text ? `\n\n**Reminder:** ${rite.reminder.text}` : '';
    return `#### ${rite.name}

**Begin:** ${rite.begin}

**Complete:** ${rite.complete}

**Interrupted:** ${rite.interrupted}${reminder}`;
  }).join('\n\n');

  const unlockText = unlocks.map(unlock => `- **${unlock.count} — ${unlock.name}:** ${unlock.text}`).join('\n');
  const generalText = Object.values(general).map(text => `- ${text}`).join('\n');
  const guardianValues = Object.entries(p.guardians_protection_values)
    .map(([stage, value]) => `- **${stage.replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}:** minimum value ${value}`)
    .join('\n');

  return `${partHeader(part)}

${factionIntro(faction)}

### XIV.1 Rite selection and general rules

${selection.rule}

${generalText}

### XIV.2 The six Rites

${riteText}

### XIV.3 Unlocks

${unlockText}

### XIV.4 Ritual of Ascension

**Begin:** ${ritual.begin}

**Convergence:** ${ritual.convergence}

**Complete:** ${ritual.complete}

**Interrupted:** ${ritual.interrupted}

### XIV.5 Guardians of the Circle protection values

When Guardians of the Circle is used, its Arcane-card value threshold follows the current number of completed Rites:

${guardianValues}

### XIV.6 Faction Features

${renderFeatures(authority, 'mystics')}

${renderLeaders(faction, 'XIV.7')}`;
}

function renderInquisition(authority, part) {
  const faction = getFaction(authority, 'inquisition');
  const p = getProcedures(authority, 'inquisition');
  assertKnownKeys(p, [
    'purge_once_per_turn',
    'purge_two_phase_permission',
    'final_judgment_classification',
    'purge_phases',
    'conviction',
    'condemnation',
    'blasphemy',
    'purge',
    'purification',
    'final_judgment',
    'relentless_pursuit',
  ], 'Inquisition procedures');

  const conviction = required(p.conviction, 'inquisition.conviction');
  const condemnation = required(p.condemnation, 'inquisition.condemnation');
  const blasphemy = required(p.blasphemy, 'inquisition.blasphemy');
  const purge = required(p.purge, 'inquisition.purge');
  const purification = required(p.purification, 'inquisition.purification');
  const judgment = required(p.final_judgment, 'inquisition.final_judgment');
  const pursuit = required(p.relentless_pursuit, 'inquisition.relentless_pursuit');

  const purgeOptions = Object.entries(purge.options)
    .map(([cost, text]) => `- **${cost} Conviction:** ${text}`)
    .join('\n');

  return `${partHeader(part)}

${factionIntro(faction)}

### XV.1 Conviction

Conviction begins at **${conviction.starting}**, cannot fall below **${conviction.minimum}**, and cannot exceed **${conviction.maximum}**.

**Timing:** ${conviction.timing}

${conviction.text}

This normal Aftermath gain occurs at most once per turn, may trigger on either player's turn, and does not require the Inquisition to win the battle.

### XV.2 Condemnation and Blasphemy

**Condemnation — ${condemnation.timing}** ${condemnation.text} Cards remaining in Reserve are unaffected.

**Blasphemy — ${blasphemy.timing}** ${blasphemy.text} This gain is separate from the normal Conviction gain during Aftermath.

### XV.3 Purge

Purge costs **${purge.action_cost} Action** and may be used during ${p.purge_phases.join(' or ')}. The normal Action use of Purge is limited to once per turn.

${purge.two_phase_permission}

${purge.directly_permitted_purge}

The top of a Discard Pile is its most recently placed card. When a Purge lets you choose cards with a combined value, cards not chosen keep their existing order.

Purge options:

${purgeOptions}

### XV.4 Purification

**Timing:** ${purification.timing}

${purification.text}

Other failed draws do not trigger Purification.

### XV.5 Leader-specific technical procedures

#### Final Judgment

**${judgment.timing} · ${judgment.limit}.** ${judgment.text}

When applicable, the normal Conviction gain from that Aftermath occurs before Final Judgment. The Purge granted by Final Judgment is directly permitted rather than an Action use of Purge.

#### Relentless Pursuit

**${pursuit.cost} · ${pursuit.timing} · ${pursuit.limit}.** ${pursuit.text}

This is a separate movement sequence between turns and does not replace the Inquisition player's normal Movement. Terms apply normally if it initiates a battle. A withdrawal does not satisfy its defeat trigger.

### XV.6 Faction Features

${renderFeatures(authority, 'inquisition')}

${renderLeaders(faction, 'XV.7')}`;
}

export function renderPlayerFacingFactionPart(authority, part, factionId) {
  switch (factionId) {
    case 'military': return renderMilitary(authority, part);
    case 'diplomats': return renderDiplomats(authority, part);
    case 'financiers': return renderFinanciers(authority, part);
    case 'intelligence': return renderIntelligence(authority, part);
    case 'mystics': return renderMystics(authority, part);
    case 'inquisition': return renderInquisition(authority, part);
    default: throw new Error(`Unsupported player-facing faction renderer: ${factionId}`);
  }
}
