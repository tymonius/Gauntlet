import { validateVisualPolicy } from './art-direction.mjs';

export function requireCurrentArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`Current-game authority expected ${label} to be an array.`);
  }
  return value;
}

function validateLeader(leader) {
  if (!leader?.id || !leader?.faction || !leader?.name) {
    throw new Error('A current Leader definition is incomplete.');
  }
  const sections = requireCurrentArray(leader.sections, `${leader.id} Leader sections`);
  if (!sections.length) throw new Error(`Current Leader ${leader.id} has no sections.`);

  const classifications = new Set(['Faction Victory', 'Leader Ability', 'Resource', 'Progression']);
  for (const section of sections) {
    if (!section?.name || !classifications.has(section.classification)) {
      throw new Error(`Current Leader ${leader.id} has an invalid section classification.`);
    }
    if (section.items !== undefined) {
      const items = requireCurrentArray(section.items, `${leader.id} grouped Leader Ability items`);
      if (section.classification !== 'Leader Ability' || !items.length) {
        throw new Error(`Current Leader ${leader.id} groups items outside a Leader Ability.`);
      }
      for (const item of items) {
        if (!item?.name || !item?.text) {
          throw new Error(`Current Leader ${leader.id} has an incomplete grouped ability.`);
        }
      }
    }
  }
  if (!sections.some(section => section.classification === 'Faction Victory')) {
    throw new Error(`Current Leader ${leader.id} is missing Faction Victory.`);
  }
  if (!sections.some(section => section.classification === 'Leader Ability')) {
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
  if (authority.factionFeatures.military.length) {
    throw new Error('Military Orders are Leader Abilities and must not appear as shared Military Faction Features.');
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
