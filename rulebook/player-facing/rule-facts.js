const NUMBER_WORDS = Object.freeze([
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
  'nineteen', 'twenty',
]);

const FACTIONS = Object.freeze([
  ['military', 'Military', 'Military'],
  ['diplomats', 'Diplomats', 'Diplomat'],
  ['financiers', 'Financiers', 'Financier'],
  ['intelligence', 'Intelligence', 'Intelligence'],
  ['mystics', 'Mystics', 'Mystics'],
  ['inquisition', 'Inquisition', 'Inquisition'],
]);

export const RULE_FACT_MARKER_COUNTS = Object.freeze({
  'diplomats.peace_treaty_threshold': 2,
  'cards.military.count': 1,
  'cards.diplomats.count': 1,
  'cards.financiers.count': 1,
  'cards.intelligence.count': 1,
  'cards.mystics.count': 1,
  'cards.inquisition.count': 1,
  'cards.mystics.arcane_count': 1,
  'proposals.count': 1,
});

function faction(authority, id) {
  return authority?.gameplay?.factions?.find(candidate => candidate?.id === id) || null;
}

function cardCount(authority, allegiance) {
  return (authority?.gameplay?.cards || []).filter(card => card?.allegiance === allegiance).length;
}

export function ruleNumberWord(value) {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number >= NUMBER_WORDS.length) {
    throw new Error(`No Rulebook number-word formatter is registered for ${value}.`);
  }
  return NUMBER_WORDS[number];
}

export function deriveRuleFacts(authority) {
  if (!authority?.gameplay?.cards || !authority?.gameplay?.factions) {
    throw new Error('Rulebook fact derivation requires gameplay cards and factions.');
  }

  const mysticsCards = (authority.gameplay.cards || []).filter(card => card?.allegiance === 'Mystics');
  const facts = {
    'diplomats.peace_treaty_threshold': Number(
      faction(authority, 'diplomats')?.factionRules?.peace_treaty_threshold
    ),
    'cards.mystics.arcane_count': mysticsCards.filter(card => card?.trait === 'Arcane').length,
    'proposals.count': (authority?.proposals || []).length,
  };

  const rites = authority?.mystics?.rites;
  if (Array.isArray(rites)) facts['mystics.rites.count'] = rites.length;
  const selectedCount = Number(authority?.mystics?.selectionPolicy?.selectedCount);
  if (Number.isInteger(selectedCount) && selectedCount >= 0) {
    facts['mystics.rites.selected_count'] = selectedCount;
  }

  for (const [id, allegiance] of FACTIONS) {
    facts[`cards.${id}.count`] = cardCount(authority, allegiance);
  }

  for (const [id, value] of Object.entries(facts)) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Rulebook fact ${id} is invalid: ${value}`);
    }
  }
  return Object.freeze(facts);
}



export function deriveCardPoolSummary(cards) {
  const summary = {};
  for (const card of cards || []) {
    if (!card?.allegiance) continue;
    const bucket = summary[card.allegiance] ||= {
      count: 0,
      total_value: 0,
      unique: [],
      cost_curve: {},
    };
    const cost = Number(card.cost || 0);
    bucket.count += 1;
    bucket.total_value += cost;
    bucket.cost_curve[String(cost)] = (bucket.cost_curve[String(cost)] || 0) + 1;
    if (card.unique) bucket.unique.push(card.name);
  }
  for (const bucket of Object.values(summary)) {
    bucket.unique.sort((a, b) => String(a).localeCompare(String(b)));
    bucket.cost_curve = Object.fromEntries(
      Object.entries(bucket.cost_curve).sort(([a], [b]) => Number(a) - Number(b)),
    );
  }
  return summary;
}

export function validateAuthorityEmbeddedFacts(authority) {
  const facts = deriveRuleFacts(authority);
  const errors = [];
  const summary = deriveCardPoolSummary(authority?.gameplay?.cards);

  for (const [id, allegiance] of FACTIONS) {
    const actual = facts[`cards.${id}.count`];
    const factionRecord = faction(authority, id);
    if (Number(factionRecord?.card_count) !== actual) {
      errors.push(`gameplay.factions[${id}].card_count is ${factionRecord?.card_count}; actual card records yield ${actual}`);
    }
    if (Number(authority?.gameplay?.card_pool_summary?.[allegiance]?.count) !== actual) {
      errors.push(`gameplay.card_pool_summary.${allegiance}.count is ${authority?.gameplay?.card_pool_summary?.[allegiance]?.count}; actual card records yield ${actual}`);
    }
    const expectedValue = summary[allegiance]?.total_value;
    if (
      Number.isFinite(expectedValue)
      && Number(authority?.gameplay?.card_pool_summary?.[allegiance]?.total_value) !== expectedValue
    ) {
      errors.push(
        `gameplay.card_pool_summary.${allegiance}.total_value is ${authority?.gameplay?.card_pool_summary?.[allegiance]?.total_value}; actual card records yield ${expectedValue}`,
      );
    }
  }

  const neutral = summary.Neutral;
  if (neutral) {
    if (Number(authority?.gameplay?.card_pool_summary?.Neutral?.count) !== neutral.count) {
      errors.push(
        `gameplay.card_pool_summary.Neutral.count is ${authority?.gameplay?.card_pool_summary?.Neutral?.count}; actual card records yield ${neutral.count}`,
      );
    }
    if (Number(authority?.gameplay?.card_pool_summary?.Neutral?.total_value) !== neutral.total_value) {
      errors.push(
        `gameplay.card_pool_summary.Neutral.total_value is ${authority?.gameplay?.card_pool_summary?.Neutral?.total_value}; actual card records yield ${neutral.total_value}`,
      );
    }
  }

  const diplomats = faction(authority, 'diplomats');
  const treatyThreshold = facts['diplomats.peace_treaty_threshold'];
  const treatyWord = ruleNumberWord(treatyThreshold);
  const expectedLeaderVictory = `At the start of your turn, if ${treatyThreshold} different Proposals are ratified, you win.`;
  for (const leader of diplomats?.leaders || []) {
    const victory = leader?.sections?.find(section => section?.classification === 'Faction Victory' && section?.name === 'Peace Treaty');
    if (victory?.text !== expectedLeaderVictory) {
      errors.push(
        `Diplomat Leader ${leader?.name || leader?.id || 'unknown'} repeats the Peace Treaty threshold as "${victory?.text}", expected "${expectedLeaderVictory}"`,
      );
    }
  }
  const expectedFactionVictory = `Peace Treaty: after the Capture step, have ${treatyWord} different ratified Proposals.`;
  if (diplomats?.victory !== expectedFactionVictory) {
    errors.push(
      `Diplomat faction victory summary is "${diplomats?.victory}", expected "${expectedFactionVictory}"`,
    );
  }

  const transmutationText = String(
    authority?.mystics?.unlocks?.find(unlock => unlock?.name === 'Transmutation')?.text || ''
  ).trim();
  if (transmutationText) {
    output = replaceClaim(
      output,
      /^> .*<!-- RULE-FACT:mystics\.transmutation\.text -->$/m,
      `> ${transmutationText}<!-- RULE-FACT:mystics.transmutation.text -->`,
      'Mystics Transmutation text',
      changes,
    );
  }

  const riteCount = facts['mystics.rites.count'];
  const selectedRites = facts['mystics.rites.selected_count'];
  if (!Number.isInteger(riteCount) || !Number.isInteger(selectedRites)) {
    errors.push('Current mystics authority must provide rites and selectionPolicy.selectedCount.');
  }
  const riteWord = Number.isInteger(riteCount) ? ruleNumberWord(riteCount) : null;
  const selectedWord = Number.isInteger(selectedRites) ? ruleNumberWord(selectedRites) : null;
  if (Number(authority?.mystics?.selectionPolicy?.poolSize) !== riteCount) {
    errors.push(
      `mystics.selectionPolicy.poolSize is ${authority?.mystics?.selectionPolicy?.poolSize}; mystics.rites contains ${riteCount}`,
    );
  }
  const selectionRule = String(authority?.mystics?.selectionPolicy?.rule || '');
  if (!selectionRule.includes(`Choose exactly ${selectedWord} different Rites from the ${riteWord}-Rite pool`)) {
    errors.push('Mystics selectionPolicy.rule does not reflect selectedCount and Rite-pool size.');
  }
  if (!selectionRule.includes(`Completing all ${selectedWord} selected Rites`)) {
    errors.push('Mystics selectionPolicy.rule does not reflect selectedCount in the Ritual requirement.');
  }
  const ritualBegin = String(authority?.mystics?.ritual?.begin || '');
  if (!ritualBegin.includes(`After completing all ${selectedWord} selected Rites`)) {
    errors.push('Mystics ritual.begin does not reflect selectionPolicy.selectedCount.');
  }

  if (errors.length) {
    throw new Error(`Structured current-game authority contains stale derived summaries:\n- ${errors.join('\n- ')}`);
  }

  return facts;
}

function formatFact(value, format) {
  if (format === 'number') return String(value);
  if (format === 'word') return ruleNumberWord(value);
  if (format === 'word-cap') {
    const word = ruleNumberWord(value);
    return word[0].toUpperCase() + word.slice(1);
  }
  throw new Error(`Unsupported Rulebook fact format: ${format}`);
}

const MARKER = /([A-Za-z0-9]+)<!-- RULE-FACT:([a-z0-9_.-]+):(number|word|word-cap) -->/g;

export function synchronizeRuleFactMarkers(markdown, authority) {
  const facts = deriveRuleFacts(authority);
  const seen = new Map();
  const changes = [];

  const output = String(markdown ?? '').replace(MARKER, (whole, current, id, format) => {
    if (!Object.prototype.hasOwnProperty.call(facts, id)) {
      throw new Error(`Unknown Rulebook fact marker: ${id}`);
    }
    seen.set(id, (seen.get(id) || 0) + 1);
    const expected = formatFact(facts[id], format);
    if (current !== expected) changes.push({ id, format, current, expected });
    return `${expected}<!-- RULE-FACT:${id}:${format} -->`;
  });

  const markerErrors = [];
  for (const [id, required] of Object.entries(RULE_FACT_MARKER_COUNTS)) {
    const actual = seen.get(id) || 0;
    if (actual !== required) markerErrors.push(`${id}: expected ${required} marker(s), found ${actual}`);
  }
  if (markerErrors.length) {
    throw new Error(`Current Rulebook fact-marker contract failed:\n- ${markerErrors.join('\n- ')}`);
  }

  return { output, changes, facts };
}

export function validateRuleFactMarkers(markdown, authority) {
  const result = synchronizeRuleFactMarkers(markdown, authority);
  if (result.changes.length) {
    const detail = result.changes
      .map(change => `${change.id} (${change.format}): ${change.current} -> ${change.expected}`)
      .join('\n- ');
    throw new Error(`Current Rulebook contains stale tracked facts:\n- ${detail}`);
  }
  return result.facts;
}

function replaceClaim(markdown, pattern, replacement, label, changes) {
  return markdown.replace(pattern, (...args) => {
    const original = args[0];
    if (original !== replacement) changes.push({ label, original, replacement });
    return replacement;
  });
}

/**
 * Repairs the small set of canonical facts that older release snapshots stored as
 * untracked prose. New current Rulebook drafting should use RULE-FACT markers
 * instead; this function exists for maintained published snapshots and migration.
 */
export function synchronizeKnownRulebookClaims(markdown, authority) {
  const facts = deriveRuleFacts(authority);
  let output = String(markdown ?? '');
  const changes = [];

  const treaty = ruleNumberWord(facts['diplomats.peace_treaty_threshold']);
  output = replaceClaim(
    output,
    /Ratify [a-z]+ different Proposals and survive until the start of your next turn to win through the \*\*Peace Treaty\*\*\./,
    `Ratify ${treaty} different Proposals and survive until the start of your next turn to win through the **Peace Treaty**.`,
    'Diplomat Peace Treaty threshold',
    changes,
  );
  output = replaceClaim(
    output,
    /if [a-z]+ different Proposals are ratified, the Diplomat wins through the Peace Treaty\./,
    `if ${treaty} different Proposals are ratified, the Diplomat wins through the Peace Treaty.`,
    'Diplomat Peace Treaty victory check',
    changes,
  );

  for (const [id, , label] of FACTIONS) {
    const count = facts[`cards.${id}.count`];
    const pattern = new RegExp(`\\| Faction pool \\| \\d+ ${label} card titles\\. \\|`, 'g');
    output = replaceClaim(
      output,
      pattern,
      `| Faction pool | ${count} ${label} card titles. |`,
      `${label} faction-pool count`,
      changes,
    );
  }

  const arcane = ruleNumberWord(facts['cards.mystics.arcane_count']);
  output = replaceClaim(
    output,
    /All [a-z]+ Mystics cards have the Arcane trait\./g,
    `All ${arcane} Mystics cards have the Arcane trait.`,
    'Mystics Arcane-card count',
    changes,
  );

  const proposals = ruleNumberWord(facts['proposals.count']);
  output = replaceClaim(
    output,
    /\| Proposal set \| [A-Za-z]+ double-sided Proposal \/ Treaty Article cards\. \|/g,
    `| Proposal set | ${proposals[0].toUpperCase() + proposals.slice(1)} double-sided Proposal / Treaty Article cards. |`,
    'Proposal-set count',
    changes,
  );

  const invocationText = String(
    authority?.mystics?.unlocks?.find(unlock => unlock?.name === 'Invocation')?.text || ''
  ).trim();
  if (invocationText) {
    output = replaceClaim(
      output,
      /^> .*<!-- RULE-FACT:mystics\.invocation\.text -->$/m,
      `> ${invocationText}<!-- RULE-FACT:mystics.invocation.text -->`,
      'Mystics Invocation text',
      changes,
    );
  }

  const riteCount = facts['mystics.rites.count'];
  const riteSelectedCount = facts['mystics.rites.selected_count'];
  if (Number.isInteger(riteCount) && Number.isInteger(riteSelectedCount)) {
    const ritePool = ruleNumberWord(riteCount);
    const riteSelected = ruleNumberWord(riteSelectedCount);
    output = replaceClaim(
      output,
      /\| Rite pool \| [A-Za-z]+ Rites; choose exactly [a-z]+ during game-package construction\. \|/g,
      `| Rite pool | ${ritePool[0].toUpperCase() + ritePool.slice(1)} Rites; choose exactly ${riteSelected} during game-package construction. |`,
      'Mystics Rite-pool summary',
      changes,
    );
  }

  return { output, changes, facts };
}

export function validateKnownRulebookClaims(markdown, authority) {
  const result = synchronizeKnownRulebookClaims(markdown, authority);
  if (result.changes.length) {
    const detail = result.changes
      .map(change => `${change.label}: "${change.original}" -> "${change.replacement}"`)
      .join('\n- ');
    throw new Error(`Rulebook canonical-fact claims disagree with structured authority:\n- ${detail}`);
  }
  return result.facts;
}
