import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { ROOT, loadCurrentGameAuthority } from './current-game-authority.mjs';

const CONTRACT_PATH = resolve(ROOT, 'config/rules-surface-contract.json');
const SOURCES_PATH = resolve(ROOT, 'config/rules-publication-sources.json');
const sourceManifest = JSON.parse(await readFile(SOURCES_PATH, 'utf8'));
const comprehensiveSource = sourceManifest?.surfaces?.['comprehensive-rules']?.path;
if (!comprehensiveSource) throw new Error('Rules publication source manifest is missing the Comprehensive Rules path.');
const OUTPUT_PATH = resolve(ROOT, comprehensiveSource);
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

const INTERNAL_TREE_FIELDS = new Set([
  'normalization',
  'id',
  'artwork',
  'cardBack',
  'completedArtwork',
  'headerLines',
  'style',
  'bank_procedure_source',
  'removal_classification_source',
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

function partHeader(id, partTitle, covers) {
  const markers = covers.map(ruleId => `<!-- RULES-COVER:${ruleId} -->`).join('\n');
  return `<!-- RULES-PART:${id} -->\n## ${partTitle}${markers ? `\n${markers}` : ''}`;
}

function renderTree(value, level = 4, options = {}) {
  const { omit = INTERNAL_TREE_FIELDS, arrayLabel = 'Entry' } = options;
  if (value == null || typeof value !== 'object') return formatPrimitive(value);

  if (Array.isArray(value)) {
    if (value.every(item => item == null || typeof item !== 'object')) return ordered(value);
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
      primitiveLines.push(`- **${title(key)}:** ${formatPrimitive(child)}`);
    } else if (Array.isArray(child) && child.every(item => item == null || typeof item !== 'object')) {
      if (child.length) nested.push(`${'#'.repeat(Math.min(level, 6))} ${title(key)}\n\n${ordered(child)}`);
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
  if (!features.length) return 'No shared Faction Features are registered.';
  return features.map(feature => {
    const profile = [feature.profile, feature.timing, feature.cost].filter(Boolean).join(' · ');
    const details = Object.entries(feature)
      .filter(([key]) => !['name', 'profile', 'timing', 'cost'].includes(key) && !INTERNAL_TREE_FIELDS.has(key))
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
    return `### ${leader.name}\n\n${leader.note ? `*${leader.note}*\n\n` : ''}${blocks || 'This Leader has no separate Leader Ability.'}`;
  }).join('\n\n');
}

function renderFactionPart(authority, partIndex, factionId, extras = []) {
  const faction = getFaction(authority, factionId);
  const procedures = authority.gameplay.faction_rules?.[factionId];
  if (!procedures) throw new Error(`Missing canonical faction procedures: ${factionId}`);

  const resource = faction.resource ? ` Its principal resource or progression is **${faction.resource}**.` : '';
  const extraText = extras.map(({ heading, value }) => `### ${heading}\n\n${renderTree(value, 4)}`).join('\n\n');

  return `${partHeader(...PARTS[partIndex])}

${faction.name} can always win by running the Gauntlet. ${faction.victory}${resource}

### Faction Features

${renderFeatureMetadata(authority, factionId)}

### Procedures

${renderTree(procedures, 4)}

${extraText ? `${extraText}\n\n` : ''}### Leaders

${renderLeaderAbilities(faction)}`;
}

function renderFoundations(authority) {
  const taxonomy = authority.factionFeatureTaxonomy;
  const components = authority.componentContract;
  if (!taxonomy || !components) throw new Error('Foundations authority is incomplete.');

  const shared = (components.sharedComponents || []).map(component => {
    const quantity = component.quantityPerPlayer != null
      ? `${component.quantityPerPlayer} per player`
      : component.quantity != null ? `${component.quantity}` : null;
    return `**${component.name}**${quantity ? ` — ${quantity}` : ''}${component.shareable ? ' (shareable)' : ''}`;
  });

  const byFaction = new Map();
  for (const component of components.components || []) {
    const faction = component.faction || 'shared';
    if (!byFaction.has(faction)) byFaction.set(faction, []);
    const quantity = component.quantity != null && component.quantity !== 1 ? ` ×${component.quantity}` : '';
    byFaction.get(faction).push(`${component.name}${quantity}`);
  }

  const factionComponentLines = authority.gameplay.factions
    .map(faction => {
      const names = byFaction.get(faction.id) || [];
      return names.length ? `- **${faction.name}:** ${names.join(', ')}.` : null;
    })
    .filter(Boolean);

  return `${partHeader(...PARTS[0])}

The rules in this document describe the game as players use it at the table. Component-production details, file formats, rendering policies, and other implementation metadata are not gameplay rules and are intentionally omitted.

### I.1 Faction Features and Leader Abilities

${taxonomy.factionFeature}

${taxonomy.leaderAbility}

When a Feature or Ability is marked **1 Action**, using it spends an Action at the stated legal timing. **No Action** means it may be used at its stated timing without spending an Action; it does not grant another Action. **Automatic** means it applies when its condition and timing occur without spending an Action.

### I.2 Shared play components

Each player uses the normal shared play components listed below in addition to their Deck, Leader, three Territories, and faction-specific materials.

${bullets(shared)}

### I.3 Faction-specific materials

Faction trackers, references, Deeds, Proposals, Rites, and similar materials are part of the player's game package, not ordinary cards in the Deck. Their own faction rules control how they enter play, move, or are used.

${factionComponentLines.join('\n')}`;
}

function renderConstructionSetup(authority) {
  const deck = authority.gameplay.deck_construction;
  const setup = authority.gameplay.setup;
  const starting = authority.gameplay.battlefield.starting_position;
  if (!deck || !setup) throw new Error('Construction/setup authority is incomplete.');

  const steps = setup.sequence.map((id, index) => `${index + 1}. ${setup.steps[id]}`).join('\n');
  const opening = setup.opening_selection;

  return `${partHeader(...PARTS[1])}

### II.1 Deck construction

A legal Deck contains at least **${deck.minimum_cards} playable cards** and no more than **${deck.maximum_deckbuilding_value} total deckbuilding value**. Choose exactly **${deck.factions_per_deck} faction** and **${deck.leaders_per_deck} Leader**. ${deck.allowed_playable_cards}

A card marked Unique is limited to **${deck.unique_copy_limit} copy**. ${deck.non_unique_copy_rule}

Each player also chooses exactly **${deck.territories_per_player} different Territories**, with at most **${deck.maximum_arenas} Arena**. Territories are not part of the Deck and do not count toward either the minimum card count or deckbuilding value. Opponents may choose the same Territory titles. The chosen Leader begins face up.

### II.2 Supplemental components

Faction trackers, reference cards, Proposal cards, Deeds, Rites, Ritual cards, and other supplemental components remain outside the Deck by default. They are not shuffled into the Draw Pile, drawn as ordinary cards, played as ordinary playable cards, banked as Assets, discarded, or sent to the Graveyard unless a specific rule says to do so. They do not count toward Deck size or deckbuilding value.

A specific faction, Leader, card, or component rule overrides these defaults when it expressly gives a supplemental component another procedure.

### II.3 Setup sequence

Set up the game in this order:

${steps}

### II.4 Opening selection

Each player draws **${opening.draw}** cards, chooses **${opening.discard}** of them, and places the chosen card face up in their Discard Pile. The other **${opening.keep}** cards form that player's opening Hand. This choice is mandatory.

The opening discard creates the Discard Pile before the first turn, but it does **not** count as discarding a card for another cost, trigger, or effect unless a rule expressly refers to the opening discard.

### II.5 Territory arrangement and reveal

Players arrange Territories only after seeing their opening Hand and opening discard, and before the first-player roll. Each player secretly orders their three Territories. When both players are ready, join the two lines and reveal all six Territories simultaneously. They remain face up unless an effect says otherwise.

### II.6 Starting positions and first player

${starting}

Setup placement is not movement, does not count as entering a Position, and does not trigger effects that care about entering.

After both players have completed opening selection and Territory arrangement, each player rolls one die. The higher result takes the first turn; reroll ties.`;
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

To play a card for its Action effect:

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

### IV.1 Gauntlet, Position, and Front Line

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

When movement enters the opponent's Position:

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
  const noWinner = authority.gameplay.card_rules.battle_ends_without_winner;
  const aftermathSteps = aftermath.sequence.map((id, index) => `${index + 1}. ${aftermath.steps[id]}`).join('\n');
  const withdrawal = battle.withdrawal_procedure;

  return `${partHeader(...PARTS[4])}

### V.1 Normal battle sequence

Conduct a normal battle in this order:

${orderedTitles(battle.sequence)}

${battle.commitment_order.text}

${battle.commitment_order.face_state}

Each player may normally set ${battle.normal_gambits} Gambit${battle.normal_gambits === 1 ? '' : 's'}, form a Reserve of ${battle.normal_reserve_size} cards, and choose ${battle.normal_tactics} Tactic${battle.normal_tactics === 1 ? '' : 's'} unless a rule or effect changes those quantities.

### V.2 Gambits, Reserves, and Tactics

A normal Gambit comes from **${battle.commitment_sources.gambit}**. After Gambits are set, each player physically sets their Hand aside without changing its zone, then draws the applicable number of cards from the **Draw Pile** to form a private **Reserve**. The owner may inspect and arrange their Reserve.

A normal Tactic comes from the **${battle.commitment_sources.tactic}**. A rule that names another source overrides that default. Reserve cards are not part of the Hand merely because the Hand is set aside during the battle.

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

Withdrawal is different from retreat: ${withdrawal.result_semantics} ${withdrawal.classification}

By default, a withdrawing attacker returns to the Position from which they entered the contested Position, and a withdrawing defender moves one Position toward their own end. If only the attacker withdraws, the defender stays in the contested Position. If only the defender withdraws, the attacker stays and becomes the occupier when applicable. If both withdraw, move the attacker first and then the defender; neither becomes the occupier because of that withdrawal.

${withdrawal.onset}

${withdrawal.after_onset}

### V.9 Battle ending without a winner

A battle that ends without a winner produces neither a winner nor a loser. Effects already applied remain applied, but unresolved effects that depend on a battle result do not apply.

${noWinner.onset}

${noWinner.after_onset_unresolved_battle_effects}

${noWinner.after_onset_clear_cards}

${noWinner.position_and_occupation}

When applicable, continue the remaining non-result Aftermath and cleanup procedures. Victory, loss, and retreat triggers do not occur merely because the battle sequence ended.

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
  const bind = rules.bind;

  return `${partHeader(...PARTS[6])}

### VII.1 Card zones

**Draw Pile.** ${zones.draw_pile.text}

**Hand.** ${zones.hand.text}

**Discard Pile.** ${zones.discard_pile.text} ${zones.discard_pile.circulation ? `It is ${zones.discard_pile.circulation}.` : ''}

**Graveyard.** ${zones.graveyard.text} ${zones.graveyard.circulation ? `It is ${zones.graveyard.circulation}.` : ''}

**Asset Bank.** ${zones.asset_bank.text}

**Gambit Area.** ${zones.gambit_area.text}

**Reserve.** ${zones.reserve.text}

**Tactic Area.** ${zones.tactic_area.text}

**Leader and Faction Area.** ${zones.leader_and_faction_area.text}

### VII.2 Effect headings

An effect heading tells you which printed effect is being used and, usually, when or how it is used. The supported headings are ${headings.supported.map(heading => `**${heading}**`).join(', ')}.

The ordinary card-role headings are ${headings.ordinary_role_headings.join(', ')}. ${headings.gambit_tactic_default_timing}

Mission, Overlay, Terms, Sanctions, and Reaction are special or procedural headings. Their own rules determine the relevant timing, source, and destination. Using one printed effect does not cause the card's other printed effects to apply unless a rule says so.

### VII.3 Banking Assets

${rules.inherent_bank_action.text}

The normal Asset limit is **${assets.normal_limit}**. ${assets.forced_discard_when_over_limit}

${assets.replace_at_limit}

If the Asset chosen to make room cannot leave play, the replacement cannot be completed. Consequences of that Asset leaving play still occur normally. Banking the replacement does not require a second Action.

${assets.ability_action_rule}

A special banking procedure printed by another rule overrides the inherent Bank Action when the two differ.

### VII.4 Directly permitted card procedures

A card or rule that directly permits a procedure at a stated timing does not spend an additional Action by default. If that instruction expressly identifies an Action, it still uses the applicable Action permission.

### VII.5 Asset Removal

Removal is a defined event for Assets. Involuntary Asset loss ${removal.involuntary_asset_loss ? 'is' : 'is not'} Removal. Voluntary use or discard ${removal.voluntary_use_or_discard_is_removal ? 'is' : 'is not'} Removal. Normal self-expiration ${removal.normal_self_expiration_is_removal ? 'is' : 'is not'} Removal. A forced discard caused by a reduced Asset limit ${removal.reduced_asset_limit_forced_discard_is_removal ? 'is' : 'is not'} Removal.

Removal itself ${removal.assigns_destination ? 'assigns' : 'does not assign'} a destination. Follow the effect or normal card procedure that caused the Asset to leave for its destination.

### VII.6 Bound cards

A bound card sits outside the normal card zones and is unavailable for ordinary play, movement, or effects except as instructed by the effect to which it is bound. Face-up bound cards are public; the owner may inspect their own face-down bound cards.

${bind.binding_end}

${bind.default_host_departure_destination}

${bind.excess_bound_cards_after_limit_reduction}

A card-specific destination or resolution overrides the shared bound-card default.

### VII.7 Revealing cards and zones

${rules.reveal.card}

${rules.reveal.zone}`;
}

function renderEffectsTiming(authority) {
  const rules = authority.gameplay.card_rules;
  const tactics = rules.additional_tactics;
  const movement = rules.effect_granted_movement;
  const interference = rules.reveal_stage_interference;
  const negation = rules.negation;
  const replacement = rules.replacement;
  const repeat = rules.applying_and_repeating_effects;
  const shorthand = rules.compact_shorthand;

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

A player may choose only an option that is actually available. ${rules.choices.no_valid_option}

### VIII.3 Shared timing

${rules.shared_timing.alternation}

${rules.shared_timing.controller_order}

${rules.shared_timing.simultaneous_reveal}

### VIII.4 Additional Tactics

The default source for an additional Tactic is ${tactics.default_source}. Eligibility ${tactics.eligibility_required ? 'is' : 'is not'} required. Before the normal reveal, place the additional Tactic ${tactics.before_reveal_face_state}; after the normal reveal, play it ${tactics.after_reveal_face_state}. An additional Tactic ${tactics.does_not_reopen_prior_windows ? 'does not reopen' : 'reopens'} prior timing windows and ${tactics.normal_tactic_destination_by_default ? 'uses' : 'does not use'} the normal Tactic destination by default.

### VIII.5 Reveal-stage interference

${interference.definition}

Resolve reveal-stage interference before ordinary effects at the same reveal stage. If multiple interference effects remain at that timing, use the shared-timing rule among them. After interference is complete, resolve the remaining ordinary effects normally.

${interference.ordinary_reveal_effect_exclusion}

An interference effect cannot cancel an effect that has already been applied.

### VIII.6 Negation

${negation.effect}

${negation.gambit_destination}

${negation.tactic_destination}

${negation.too_late}

### VIII.7 Replacement

${replacement.same_role}

${replacement.eligibility}

${replacement.face_state}

${replacement.no_reopen}

${replacement.remaining_timing}

### VIII.8 Revising a choice

${rules.revising_choice.procedure}

${rules.revising_choice.no_implicit_window}

### VIII.9 Compact shorthand

Rules text may use the following compact forms when their meaning is unambiguous:

${bullets(Object.values(shorthand.meanings))}

Reserve is the default source for a Tactic unless another source is named. Rerolls use the new result by default. Multiple Reserve-size and Tactic-count modifiers add together unless a more specific rule says otherwise.

### VIII.10 Applying, copying, and repeating effects

Applying, copying, or repeating an effect creates a new application at the current legal timing. The printed conditions and legal targets still apply, and choices and costs are made again for that application. The source card does not move merely because its effect is being applied again.

${repeat.controller}

${repeat.source_play_trigger_rule}

${repeat.repeat_chain}

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

An Overlay is a persistent card attached to a Territory. ${overlay.active_layer}

${overlay.covered_layer}

${overlay.dormant_timer} ${overlay.dormant_removal_conditions}

Control of an Overlay follows control of its Territory, but ownership does not change. ${overlay.orientation}

An Overlay is not an Asset. ${overlay.default_removal_destination}

${overlay.you_reference}

### IX.2 Cards becoming Territories

${rules.cards_becoming_territories.manifest_destiny}`;
}

function resolveAuthorityPath(authority, path) {
  let value = authority;
  for (const segment of path) {
    if (value == null || !(segment in value)) throw new Error(`Part XVI term source does not resolve: ${path.join('.')}`);
    value = value[segment];
  }
  return value;
}

function renderDefinitionsIndex(authority, contract) {
  const registry = contract?.publicationArchitecture?.comprehensiveRules?.termRegistry;
  if (!Array.isArray(registry) || registry.length === 0) throw new Error('Part XVI requires a non-empty Comprehensive Rules termRegistry.');

  const byId = new Map(registry.map(entry => [entry.id, entry]));
  const definitionEntries = [];
  const indexEntries = [];

  for (const entry of registry) {
    const sourceValue = entry.definitionSource ? resolveAuthorityPath(authority, entry.definitionSource.path) : null;
    if (sourceValue != null && typeof sourceValue !== 'string') throw new Error(`Part XVI definition source must resolve to a string: ${entry.id}`);

    const reference = entry.sections.join('; ');
    const sourceBody = sourceValue && /[.!?]$/.test(sourceValue.trim()) ? sourceValue : sourceValue ? `${sourceValue}.` : null;
    const body = sourceBody || `See ${reference}.`;
    const related = (entry.seeAlso || []).map(id => byId.get(id)?.term).filter(Boolean);
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
  if (!comprehensive || comprehensive.dependencyMode !== 'direct') throw new Error('Comprehensive Rules renderer requires dependencyMode "direct".');
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
    renderFactionPart(authority, 10, 'diplomats', [{ heading: 'Proposal corpus', value: authority.proposals }]),
    renderFactionPart(authority, 11, 'financiers'),
    renderFactionPart(authority, 12, 'intelligence'),
    renderFactionPart(authority, 13, 'mystics', [{ heading: 'Rites and Ritual of Ascension', value: authority.mystics }]),
    renderFactionPart(authority, 14, 'inquisition'),
    renderDefinitionsIndex(authority, contract),
  ];

  return `<!-- GENERATED FILE: scripts/render-comprehensive-rules.mjs -->
<!-- DO NOT EDIT DIRECTLY. Change game-data/current-game.json or the renderer, then regenerate. -->
<!-- RULES-SURFACE:comprehensive-rules -->
<!-- AUTHORITY:game-data/current-game.json -->

# Comprehensive Gauntlet Rules

> **Player-facing technical rules.** This publication is generated from \`game-data/current-game.json\` through explicit rules-writing templates. It is intended for players resolving exact rules questions, not for exposing the structure of the underlying data model.

The Comprehensive Rules are the complete technical rules corpus for the current game. The Player's Guide and Faction Guides are teaching surfaces and may simplify presentation, but they do not override these rules or the underlying gameplay authority.

${sections.join('\n\n')}
`;
}

const authority = await loadCurrentGameAuthority();
const contract = JSON.parse(await readFile(CONTRACT_PATH, 'utf8'));
const output = renderComprehensiveRules(authority, contract);

if (mode === 'write') {
  await writeFile(OUTPUT_PATH, output);
  console.log(`Rendered ${comprehensiveSource} from current gameplay authority.`);
} else {
  const current = await readFile(OUTPUT_PATH, 'utf8');
  if (current !== output) {
    console.error('Comprehensive Rules are stale. Run: node scripts/render-comprehensive-rules.mjs --write');
    console.error('---BEGIN EXPECTED COMPREHENSIVE RULES---');
    console.error(output);
    console.error('---END EXPECTED COMPREHENSIVE RULES---');
    process.exitCode = 1;
  } else {
    console.log('Comprehensive Rules match the player-facing direct authority projection.');
  }
}
