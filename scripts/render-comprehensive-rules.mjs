import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, loadCurrentGameAuthority } from './current-game-authority.mjs';

const CONTRACT_PATH = resolve(ROOT, 'config/rules-surface-contract.json');
const OUTPUT_PATH = resolve(ROOT, 'rulebook/comprehensive/comprehensive-rules.md');
const mode = process.argv.includes('--write') ? 'write' : 'check';

const PARTS = [
  ['foundations', 'Part I — Foundations', ['core.factions.framework', 'core.components']],
  ['construction-setup', 'Part II — Game Construction and Setup', ['core.deck-construction', 'core.setup', 'core.battlefield.starting-position']],
  ['turn-structure', 'Part III — Turn Structure', ['core.turn', 'core.turn.sequence', 'core.turn.draw', 'core.turn.actions', 'core.turn.cleanup']],
  ['movement-battlefield', 'Part IV — Movement and Battlefield State', ['core.battlefield', 'core.battlefield.position', 'core.battlefield.movement', 'core.battlefield.occupation', 'core.battlefield.counterattack', 'core.battle.movement-initiation']],
  ['battles', 'Part V — Battles', ['core.battle', 'core.battle.battle-total', 'core.battle.advantage-disadvantage', 'core.battle.normal-result', 'core.battle.aftermath', 'core.battle.reserve', 'core.battle.withdrawal-procedure', 'core.cards.no-winner']],
  ['territory-victory', 'Part VI — Territory and Victory Rules', ['core.battlefield.capture', 'core.battlefield.front-line', 'core.battlefield.last-stand', 'core.battlefield.victory']],
  ['cards-zones', 'Part VII — Cards and Zones', ['core.cards', 'core.cards.reveal', 'core.card-zones', 'core.cards.assets', 'core.cards.bind']],
  ['effects-timing', 'Part VIII — Effects and Timing', ['core.cards.golden-rules', 'core.cards.shared-timing', 'core.cards.reveal', 'core.cards.negation', 'core.cards.replacement', 'core.cards.revising-choice', 'core.battle', 'core.cards.choices', 'core.cards.shorthand', 'core.cards.repeat']],
  ['persistent-shared', 'Part IX — Persistent and Special Shared Rules', ['core.cards.overlay', 'core.cards.becoming-territories']],
  ['military', 'Part X — Military Rules', ['faction.military.definition', 'faction.military.features']],
  ['diplomats', 'Part XI — Diplomat Rules', ['faction.diplomats.definition', 'faction.diplomats.features', 'faction.diplomats.proposals']],
  ['financiers', 'Part XII — Financier Rules', ['faction.financiers.definition', 'faction.financiers.features']],
  ['intelligence', 'Part XIII — Intelligence Rules', ['faction.intelligence.definition', 'faction.intelligence.features']],
  ['mystics', 'Part XIV — Mystics Rules', ['faction.mystics.definition', 'faction.mystics.features', 'faction.mystics.rites']],
  ['inquisition', 'Part XV — Inquisition Rules', ['faction.inquisition.definition', 'faction.inquisition.features']],
  ['definitions-index', 'Part XVI — Definitions and Index', []],
];

const TITLE_CASE = new Map([
  ['capture', 'Capture'],
  ['draw', 'Draw'],
  ['opening', 'Opening'],
  ['movement', 'Movement'],
  ['denouement', 'Denouement'],
  ['cleanup', 'Cleanup'],
  ['onset', 'Onset'],
  ['set_gambits', 'Set Gambits'],
  ['form_reserves', 'Form Reserves'],
  ['reveal_gambits', 'Reveal Gambits'],
  ['choose_tactics', 'Choose Tactics'],
  ['reveal_tactics', 'Reveal Tactics'],
  ['outcome', 'Determine the Outcome'],
  ['aftermath', 'Aftermath'],
]);

function title(value) {
  return TITLE_CASE.get(value) || String(value)
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, character => character.toUpperCase());
}

function ordered(values) {
  return values.map((value, index) => `${index + 1}. ${typeof value === 'string' ? value : formatPrimitive(value)}`).join('\n');
}

function orderedTitles(values) {
  return values.map((value, index) => `${index + 1}. **${title(value)}**`).join('\n');
}

function bullets(values) {
  return values.filter(value => value != null && value !== '').map(value => `- ${value}`).join('\n');
}

function formatPrimitive(value) {
  if (value == null) return 'None';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function formatFieldPrimitive(key, value) {
  if (value == null && key === 'maximum') return 'No fixed maximum';
  if (value == null && key === 'requirement') return 'No additional requirement';
  return formatPrimitive(value);
}

function partHeader(id, partTitle, covers) {
  const markers = covers.map(ruleId => `<!-- RULES-COVER:${ruleId} -->`).join('\n');
  return `<!-- RULES-PART:${id} -->\n## ${partTitle}${markers ? `\n${markers}` : ''}`;
}

function stagedPart(id, partTitle, covers, note) {
  return `${partHeader(id, partTitle, covers)}\n\n> **Projection staged.** ${note}`;
}

function renderTree(value, level = 4, options = {}) {
  const { omit = new Set(['normalization']), arrayLabel = 'Entry' } = options;
  if (value == null || typeof value !== 'object') return formatPrimitive(value);

  if (Array.isArray(value)) {
    if (value.every(item => item == null || typeof item !== 'object')) {
      return ordered(value);
    }
    return value.map((item, index) => {
      const preferred = item && typeof item === 'object' && (item.name || item.id);
      return `${'#'.repeat(Math.min(level, 6))} ${preferred || `${arrayLabel} ${index + 1}`}\n\n${renderTree(item, Math.min(level + 1, 6), options)}`;
    }).join('\n\n');
  }

  const primitiveLines = [];
  const nested = [];
  for (const [key, child] of Object.entries(value)) {
    if (omit.has(key)) continue;
    if (child == null || typeof child !== 'object') {
      primitiveLines.push(`- **${title(key)}:** ${formatFieldPrimitive(key, child)}`);
    } else if (Array.isArray(child) && child.every(item => item == null || typeof item !== 'object')) {
      if (child.length === 0) {
        primitiveLines.push(`- **${title(key)}:** None`);
      } else {
        nested.push(`${'#'.repeat(Math.min(level, 6))} ${title(key)}\n\n${ordered(child)}`);
      }
    } else {
      nested.push(`${'#'.repeat(Math.min(level, 6))} ${title(key)}\n\n${renderTree(child, Math.min(level + 1, 6), options)}`);
    }
  }
  return [primitiveLines.join('\n'), ...nested].filter(Boolean).join('\n\n');
}

function getFaction(authority, id) {
  const faction = authority.gameplay.factions.find(entry => entry.id === id);
  if (!faction) throw new Error(`Missing faction definition: ${id}`);
  return faction;
}

function renderFeatureMetadata(authority, factionId) {
  const features = authority.factionFeatures?.[factionId] || [];
  if (!features.length) return 'No shared Faction Feature metadata is registered.';
  return features.map(feature => {
    const profile = [feature.profile, feature.timing, feature.cost].filter(Boolean).join(' · ');
    const details = Object.entries(feature)
      .filter(([key]) => !['name', 'profile', 'timing', 'cost'].includes(key))
      .map(([key, value]) => `- **${title(key)}:** ${formatPrimitive(value)}`)
      .join('\n');
    return `#### ${feature.name}\n\n${profile ? `**${profile}**\n\n` : ''}${details}`.trim();
  }).join('\n\n');
}

function renderLeaderAbilities(faction) {
  return faction.leaders.map(leader => {
    const abilities = leader.sections.filter(section => section.classification === 'Leader Ability');
    const blocks = abilities.map(ability => {
      const descriptor = [ability.cost, ability.descriptor].filter(Boolean).join(' · ');
      if (Array.isArray(ability.items)) {
        const items = ability.items.map(item => {
          const itemDescriptor = [item.cost, item.descriptor].filter(Boolean).join(' · ');
          return `##### ${item.name}\n\n${itemDescriptor ? `**${itemDescriptor}**\n\n` : ''}${item.text || ''}`;
        }).join('\n\n');
        return `#### ${ability.name}\n\n${descriptor ? `**${descriptor}**\n\n` : ''}${items}`;
      }
      return `#### ${ability.name}\n\n${descriptor ? `**${descriptor}**\n\n` : ''}${ability.text || ''}`;
    }).join('\n\n');

    return `### ${leader.name}\n\n${leader.note ? `*${leader.note}*\n\n` : ''}${blocks || 'No Leader Ability is registered.'}`;
  }).join('\n\n');
}

function renderFactionPart(authority, partIndex, factionId, extras = []) {
  const faction = getFaction(authority, factionId);
  const procedures = authority.gameplay.faction_rules?.[factionId];
  if (!procedures) throw new Error(`Missing canonical faction procedures: ${factionId}`);

  const identity = bullets([
    `**Faction:** ${faction.name}`,
    `**Color:** ${faction.color}`,
    faction.resource ? `**Resource / progression:** ${faction.resource}` : null,
    `**Playable faction cards in authority:** ${faction.card_count}`,
  ]);

  const extraText = extras.map(({ heading, value }) => `### ${heading}\n\n${renderTree(value, 4)}`).join('\n\n');

  return `${partHeader(...PARTS[partIndex])}

### Faction identity

${identity}

### Victory route summary

${faction.victory}

### Shared Faction Feature metadata

${renderFeatureMetadata(authority, factionId)}

### Canonical faction procedures

${renderTree(procedures, 4)}

${extraText ? `${extraText}\n\n` : ''}### Leaders

${renderLeaderAbilities(faction)}`;
}

function renderFoundations(authority) {
  const taxonomy = authority.factionFeatureTaxonomy;
  const components = authority.componentContract;
  if (!taxonomy || !components) throw new Error('Foundations authority is incomplete.');

  const families = Object.entries(components.canonicalFamilies || {}).map(([id, family]) =>
    `- **${title(id)}:** ${family.orientation || 'unspecified orientation'}; back policy ${family.backPolicy || 'unspecified'}.`
  );

  const shared = (components.sharedComponents || []).map(component => {
    const quantity = component.quantityPerPlayer != null ? `${component.quantityPerPlayer} per player` :
      component.quantity != null ? `${component.quantity}` : 'quantity not specified';
    return `- **${component.name}:** ${quantity}${component.shareable ? '; shareable' : ''}.`;
  });

  const factionComponents = (components.components || []).map(component => {
    const quantity = component.quantity != null ? `quantity ${component.quantity}` : 'quantity not specified';
    const tracked = component.trackedValue
      ? `; tracks ${component.trackedValue.name} from ${component.trackedValue.starting} with minimum ${component.trackedValue.minimum}${component.trackedValue.maximum == null ? ' and no fixed maximum' : ` and maximum ${component.trackedValue.maximum}`}`
      : '';
    return `- **${component.name}:** ${component.faction || 'shared'} ${component.family || 'component'}, ${quantity}${tracked}.`;
  });

  return `${partHeader(...PARTS[0])}

### I.1 Faction Features and Leader Abilities

${taxonomy.factionFeature}

${taxonomy.leaderAbility}

Action profiles:

${bullets(Object.entries(taxonomy.actionProfiles).map(([profile, text]) => `**${profile}:** ${text}`))}

### I.2 Canonical component families

${bullets(families.map(line => line.replace(/^- /, '')))}

${components.standardBack?.note || ''}

### I.3 Shared components

${bullets(shared.map(line => line.replace(/^- /, '')))}

### I.4 Faction and supplemental components

${bullets(factionComponents.map(line => line.replace(/^- /, '')))}

${components.effectiveBackPolicy?.note || ''}`;
}

function renderConstructionSetup(authority) {
  const deck = authority.gameplay.deck_construction;
  const setup = authority.gameplay.setup;
  const starting = authority.gameplay.battlefield.starting_position;
  if (!deck || !setup) throw new Error('Construction/setup authority is incomplete.');

  const supplemental = deck.supplemental_components || {};
  const steps = setup.sequence.map((id, index) => `${index + 1}. ${setup.steps[id]}`).join('\n');

  return `${partHeader(...PARTS[1])}

### II.1 Deck construction

- A Deck contains at least **${deck.minimum_cards} playable cards** and no more than **${deck.maximum_deckbuilding_value} total deckbuilding value**.
- A Deck uses exactly **${deck.factions_per_deck} faction** and **${deck.leaders_per_deck} Leader**.
- ${deck.allowed_playable_cards}
- A Unique card is limited to **${deck.unique_copy_limit} copy**. ${deck.non_unique_copy_rule}
- Choose exactly **${deck.territories_per_player} different Territories**, with at most **${deck.maximum_arenas} Arena**. Territories ${deck.territories_must_be_different ? 'must' : 'need not'} be different.
- Territories ${deck.territories_are_part_of_deck ? 'are' : 'are not'} part of the Deck, ${deck.territories_count_toward_minimum_cards ? 'do' : 'do not'} count toward the minimum card count, and ${deck.territories_count_toward_deckbuilding_value ? 'do' : 'do not'} count toward deckbuilding value.
- Opponents ${deck.opponents_may_choose_same_territory_titles ? 'may' : 'may not'} choose the same Territory titles.
- The chosen Leader ${deck.leader_begins_face_up ? 'begins face up' : 'does not begin face up'}.

### II.2 Supplemental components

${bullets(Object.entries(supplemental)
    .map(([key, value]) => `**${title(key)}:** ${formatPrimitive(value)}`))}

### II.3 Setup sequence

${steps}

### II.4 Opening selection

${renderTree(setup.opening_selection, 4)}

### II.5 Territory arrangement and reveal

${renderTree(setup.territory_arrangement, 4)}

${renderTree(setup.territory_reveal, 4)}

### II.6 Starting Positions and first player

${starting}

${renderTree(setup.starting_position, 4)}

${renderTree(setup.initiative, 4)}`;
}

function renderTurn(authority) {
  const turn = authority.gameplay.turn;
  const actions = turn.actions;
  return `${partHeader(...PARTS[2])}

### III.1 Turn sequence

Complete every normal turn in this order:

${orderedTitles(turn.sequence)}

### III.2 Actions

${actions.normal_timing}

Legal normal Action uses:

${bullets(Object.values(actions.legal_uses))}

Action-card procedure:

${ordered(actions.action_card_play.steps)}

${actions.asset_discard.text}

${actions.asset_ability_action_rule}

${actions.additional_actions}

${actions.same_phase_permission}

${actions.direct_permission}

### III.3 Draw

The active player normally draws ${turn.draw.normal_cards} card${turn.draw.normal_cards === 1 ? '' : 's'}.

${turn.draw.recycle}

${turn.draw.partial_resolution}

${turn.draw.normal_draw_failure}

Cards in the Graveyard ${turn.draw.graveyard_recycles ? 'are' : 'are not'} recycled into the Draw Pile by the normal draw procedure.

### III.4 Movement choice

During Movement, choose one of the normal movement options:

${bullets(turn.movement_choices.map(choice => `**${choice}**`))}

### III.5 Cleanup

${turn.cleanup.procedure}

${turn.cleanup.hand_limit}

${turn.cleanup.expiration}`;
}

function renderMovement(authority) {
  const battlefield = authority.gameplay.battlefield;
  const movement = battlefield.movement_rules;
  const battle = authority.gameplay.battle;

  return `${partHeader(...PARTS[3])}

### IV.1 Gauntlet and Position

${battlefield.gauntlet}

${battlefield.position}

${battlefield.front_line}

### IV.2 Normal movement

Normal movement is ${movement.normal_distance} Position.

- **Advance:** ${movement.choices.advance}
- **Hold:** ${movement.choices.hold}
- **Fall Back:** ${movement.choices.fall_back}

${movement.voluntary_fall_back_boundary}

${movement.tokens_cannot_pass}

${movement.additional_movement}

${movement.battle_ends_sequence}

${movement.new_sequence_after_battle}

### IV.3 Entering the opponent's Position

${ordered(movement.entering_opponent_position)}

${battle.movement}

### IV.4 Occupation

${battlefield.occupation}

### IV.5 Counterattack

${battlefield.counterattack}`;
}

function renderBattles(authority) {
  const battle = authority.gameplay.battle;
  const advantage = battle.advantage_disadvantage;
  const result = battle.normal_result;
  const aftermath = battle.aftermath;
  const aftermathSteps = aftermath.sequence.map((id, index) => `${index + 1}. ${aftermath.steps[id]}`).join('\n');
  const noWinner = authority.gameplay.card_rules.battle_ends_without_winner;

  return `${partHeader(...PARTS[4])}

### V.1 Normal battle sequence

Conduct a normal battle in this order:

${orderedTitles(battle.sequence)}

${battle.commitment_order.text}

${battle.commitment_order.face_state}

Each player may normally set ${battle.normal_gambits} Gambit${battle.normal_gambits === 1 ? '' : 's'}, form a Reserve of ${battle.normal_reserve_size} cards, and choose ${battle.normal_tactics} Tactic${battle.normal_tactics === 1 ? '' : 's'} unless a rule or effect changes those quantities.

### V.2 Commitment sources and Reserve

- **Gambit source:** ${battle.commitment_sources.gambit}
- **Tactic source:** ${battle.commitment_sources.tactic}

${renderTree(battle.reserve, 4)}

### V.3 Onset

${battle.onset}

${battle.battle_fought}

### V.4 Battle total

${battle.battle_total.calculation}

${battle.battle_total.winner}

A player normally rolls ${battle.battle_total.ordinary_die_count} battle die${battle.battle_total.ordinary_die_count === 1 ? '' : 's'} before advantage, disadvantage, or another rule changes that roll.

### V.5 Advantage and disadvantage

${advantage.cancellation}

${advantage.advantage_roll}

${advantage.disadvantage_roll}

${advantage.neutral_roll}

${advantage.fixed_stacking_cap == null ? 'There is no fixed stacking cap.' : `The fixed stacking cap is ${advantage.fixed_stacking_cap}.`}

### V.6 Defensive Edge and Tiebreak Roll

${battle.defensive_edge}

If a tied battle total is not resolved by Defensive Edge or another applicable rule, make a Tiebreak Roll. ${battle.tiebreak_roll}

### V.7 Normal result

${bullets([
    result.losing_attacker,
    result.losing_defender,
    result.winning_attacker,
    result.winning_defender,
    result.additional_retreat,
  ])}

### V.8 Retreat and withdrawal

${battle.retreat}

${battle.withdrawal}

${renderTree(battle.withdrawal_procedure, 4)}

### V.9 Battle ending without a winner

${renderTree(noWinner, 4)}

### V.10 Aftermath

Resolve the Aftermath in this order:

${aftermathSteps}

When battle cards are cleared:

${bullets([
    aftermath.battle_card_clear.gambits,
    aftermath.battle_card_clear.tactics,
    aftermath.battle_card_clear.remaining_reserve,
    aftermath.battle_card_clear.specific_destination_override,
    aftermath.battle_card_clear.source_return,
  ])}`;
}

function renderTerritoryVictory(authority) {
  const battlefield = authority.gameplay.battlefield;
  const lastStand = battlefield.last_stand;
  return `${partHeader(...PARTS[5])}

### VI.1 Front Line

${battlefield.front_line}

### VI.2 Capture

${battlefield.capture}

### VI.3 Running the Gauntlet

${battlefield.victory}

### VI.4 Last Stand

${lastStand.access}

Control of the opponent's final Territory ${lastStand.final_territory_control_required ? 'is' : 'is not'} required to initiate the Last Stand. Capture of that Territory ${lastStand.final_territory_capture_required ? 'is' : 'is not'} required.

${lastStand.text}`;
}

function renderCardsAndZones(authority) {
  const zones = authority.gameplay.card_zones;
  const rules = authority.gameplay.card_rules;
  const headings = rules.effect_headings;
  const assets = rules.assets;
  const removal = rules.asset_removal;

  return `${partHeader(...PARTS[6])}

### VII.1 Card zones

${renderTree(zones, 4)}

### VII.2 Effect headings

Supported printed effect headings are:

${bullets(headings.supported.map(heading => `**${heading}**`))}

${headings.gambit_tactic_default_timing}

The ordinary role headings are ${headings.ordinary_role_headings.join(', ')}. The special or procedural headings are ${headings.special_or_procedural_headings.join(', ')}.

### VII.3 Banking Assets

${rules.inherent_bank_action.text}

A special banking procedure ${rules.inherent_bank_action.special_banking_procedure_overrides_default ? 'overrides' : 'does not override'} the inherent Bank Action.

${renderTree(assets, 4)}

### VII.4 Directly permitted card procedures

A directly permitted card procedure ${rules.directly_permitted_card_procedures.spend_additional_action_by_default ? 'spends' : 'does not spend'} an additional Action by default. ${rules.directly_permitted_card_procedures.exception}

### VII.5 Asset Removal

Removal is a defined event for Assets. Involuntary Asset loss ${removal.involuntary_asset_loss ? 'is' : 'is not'} Removal. Voluntary use or discard ${removal.voluntary_use_or_discard_is_removal ? 'is' : 'is not'} Removal. Normal self-expiration ${removal.normal_self_expiration_is_removal ? 'is' : 'is not'} Removal. A forced discard caused by a reduced Asset limit ${removal.reduced_asset_limit_forced_discard_is_removal ? 'is' : 'is not'} Removal. Removal itself ${removal.assigns_destination ? 'assigns' : 'does not assign'} a destination.

### VII.6 Bound cards

${renderTree(rules.bind, 4)}

### VII.7 Revealing cards and zones

${rules.reveal.card}

${rules.reveal.zone}`;
}

function renderEffectsTiming(authority) {
  const rules = authority.gameplay.card_rules;
  const tactics = rules.additional_tactics;
  const movement = rules.effect_granted_movement;
  const repeat = rules.applying_and_repeating_effects;

  return `${partHeader(...PARTS[7])}

### VIII.1 Golden rules

${bullets([
    rules.golden_rules.specificity,
    rules.golden_rules.may,
    rules.golden_rules.must,
    rules.golden_rules.instruction_order,
    rules.golden_rules.partial_resolution,
  ])}

### VIII.2 Choices

${renderTree(rules.choices, 4)}

### VIII.3 Shared timing

${rules.shared_timing.alternation}

${rules.shared_timing.controller_order}

${rules.shared_timing.simultaneous_reveal}

### VIII.4 Additional Tactics

The default source for an additional Tactic is ${tactics.default_source}. Eligibility ${tactics.eligibility_required ? 'is' : 'is not'} required. Before the normal reveal, place the additional Tactic ${tactics.before_reveal_face_state}; after the normal reveal, play it ${tactics.after_reveal_face_state}. An additional Tactic ${tactics.does_not_reopen_prior_windows ? 'does not reopen' : 'reopens'} prior timing windows and ${tactics.normal_tactic_destination_by_default ? 'uses' : 'does not use'} the normal Tactic destination by default.

### VIII.5 Reveal-stage interference

${renderTree(rules.reveal_stage_interference, 4)}

### VIII.6 Negation

${renderTree(rules.negation, 4)}

### VIII.7 Replacement

${renderTree(rules.replacement, 4)}

### VIII.8 Revising a choice

${rules.revising_choice.procedure}

${rules.revising_choice.no_implicit_window}

### VIII.9 Compact shorthand

${renderTree(rules.compact_shorthand, 4)}

### VIII.10 Applying, copying, and repeating effects

${renderTree(repeat, 4)}

### VIII.11 Effect-granted movement

Effect-granted movement ${movement.begins_new_sequence_when_none_in_progress ? 'begins a new movement sequence when none is in progress' : 'does not begin a new movement sequence when none is in progress'}. It ${movement.may_create_pending_battle_by_default ? 'may' : 'may not'} create a pending battle by default and ${movement.may_initiate_legal_last_stand_by_default ? 'may' : 'may not'} initiate a legal Last Stand by default. A pending battle ${movement.pending_battle_ends_sequence ? 'ends' : 'does not end'} that movement sequence.

### VIII.12 Sanctions default

A Sanction ${rules.sanctions.retains_refusing_opponent ? 'retains' : 'does not retain'} the refusing opponent as its referenced opponent. ${rules.sanctions.default_expiration}`;
}

function renderPersistentShared(authority) {
  const rules = authority.gameplay.card_rules;
  const overlay = rules.overlay;
  return `${partHeader(...PARTS[8])}

### IX.1 Overlays

${renderTree(overlay, 4)}

### IX.2 Cards becoming Territories

${renderTree(rules.cards_becoming_territories, 4)}`;
}

function resolveAuthorityPath(authority, path) {
  let value = authority;
  for (const segment of path) {
    if (value == null || !(segment in value)) {
      throw new Error(`Part XVI term source does not resolve: ${path.join('.')}`);
    }
    value = value[segment];
  }
  return value;
}

function renderDefinitionsIndex(authority, contract) {
  const registry = contract?.publicationArchitecture?.comprehensiveRules?.termRegistry;
  if (!Array.isArray(registry) || registry.length === 0) {
    throw new Error('Part XVI requires a non-empty Comprehensive Rules termRegistry.');
  }

  const byId = new Map(registry.map(entry => [entry.id, entry]));
  const definitionEntries = [];
  const indexEntries = [];

  for (const entry of registry) {
    const sourceValue = entry.definitionSource
      ? resolveAuthorityPath(authority, entry.definitionSource.path)
      : null;
    if (sourceValue != null && typeof sourceValue !== 'string') {
      throw new Error(`Part XVI definition source must resolve to a string: ${entry.id}`);
    }

    const reference = entry.sections.join('; ');
    const body = sourceValue || `See ${reference}.`;
    const related = (entry.seeAlso || [])
      .map(id => byId.get(id)?.term)
      .filter(Boolean);
    const relatedText = related.length ? ` See also ${related.map(term => `**${term}**`).join(', ')}.` : '';
    definitionEntries.push({ term: entry.term, text: `**${entry.term}.** ${body}${relatedText}` });
    indexEntries.push({ term: entry.term, text: `- **${entry.term}:** ${reference}` });

    for (const alias of entry.aliases || []) {
      definitionEntries.push({ term: alias, text: `**${alias}.** See **${entry.term}**.` });
      indexEntries.push({ term: alias, text: `- **${alias}:** See **${entry.term}** — ${reference}` });
    }
  }

  const sortEntries = entries => entries.sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
  const definitions = sortEntries(definitionEntries).map(entry => entry.text).join('\n\n');
  const index = sortEntries(indexEntries).map(entry => entry.text).join('\n');

  return `${partHeader(...PARTS[15])}\n\n### XVI.1 Defined Terms and Cross-References\n\n${definitions}\n\n### XVI.2 Rules Index\n\n${index}`;
}

function validateArchitecture(contract) {
  const comprehensive = contract?.publicationArchitecture?.comprehensiveRules;
  if (!comprehensive || comprehensive.dependencyMode !== 'direct') {
    throw new Error('Comprehensive Rules renderer requires dependencyMode "direct".');
  }
  const expectedIds = PARTS.map(([id]) => id);
  const contractIds = (comprehensive.parts || []).map(part => part.id);
  if (JSON.stringify(expectedIds) !== JSON.stringify(contractIds)) {
    throw new Error(`Comprehensive Rules part order changed. Expected ${expectedIds.join(', ')}; contract has ${contractIds.join(', ')}.`);
  }
}

export function renderComprehensiveRules(authority, contract) {
  validateArchitecture(contract);

  const sections = [
    renderFoundations(authority),
    renderConstructionSetup(authority),
    renderTurn(authority),
    renderMovement(authority),
    renderBattles(authority),
    renderTerritoryVictory(authority),
    renderCardsAndZones(authority),
    renderEffectsTiming(authority),
    renderPersistentShared(authority),
    renderFactionPart(authority, 9, 'military'),
    renderFactionPart(authority, 10, 'diplomats', [
      { heading: 'Proposal corpus', value: authority.proposals },
    ]),
    renderFactionPart(authority, 11, 'financiers'),
    renderFactionPart(authority, 12, 'intelligence'),
    renderFactionPart(authority, 13, 'mystics', [
      { heading: 'Rites and Ritual of Ascension', value: authority.mystics },
    ]),
    renderFactionPart(authority, 14, 'inquisition'),
    renderDefinitionsIndex(authority, contract),
  ];

  return `<!-- GENERATED FILE: scripts/render-comprehensive-rules.mjs -->
<!-- DO NOT EDIT DIRECTLY. Change game-data/current-game.json or the renderer, then regenerate. -->
<!-- RULES-SURFACE:comprehensive-rules -->
<!-- AUTHORITY:game-data/current-game.json -->

# Comprehensive Gauntlet Rules

> **Direct authority projection.** This file is generated from \`game-data/current-game.json\`. Parts I–XVI are active generated projections. Part XVI uses publication-only term metadata from the rules-surface contract while all mechanical definitions remain direct projections of canonical gameplay authority.

The Comprehensive Rules are the single technical rules corpus. The Player's Guide and Faction Guides are teaching surfaces and may simplify wording without changing mechanics.

${sections.join('\n\n')}
`;
}

const authority = await loadCurrentGameAuthority();
const contract = JSON.parse(await readFile(CONTRACT_PATH, 'utf8'));
const output = renderComprehensiveRules(authority, contract);

if (mode === 'write') {
  await writeFile(OUTPUT_PATH, output);
  console.log('Rendered rulebook/comprehensive/comprehensive-rules.md from current gameplay authority.');
} else {
  const current = await readFile(OUTPUT_PATH, 'utf8');
  if (current !== output) {
    console.error('Comprehensive Rules are stale. Run: node scripts/render-comprehensive-rules.mjs --write');
    process.exitCode = 1;
  } else {
    console.log('Comprehensive Rules match the direct authority projection.');
  }
}
