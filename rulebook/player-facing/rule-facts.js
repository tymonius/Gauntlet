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
    'mystics.rites.count': (authority?.mystics?.rites || []).length,
    'mystics.rites.selected_count': Number(authority?.mystics?.selectionPolicy?.selectedCount),
  };

  for (const [id, allegiance] of FACTIONS) {
    facts[`cards.${id}.count`] = cardCount(authority, allegiance);
  }

  for (const [id, value] of Object.entries(facts)) {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Rulebook fact ${id} is missing or invalid: ${value}`);
    }
  }
  return Object.freeze(facts);
}

function formatFact(value, format) {
  if (format === 'number') return String(value);
  if (format === 'word') return ruleNumberWord(value);
  throw new Error(`Unsupported Rulebook fact format: ${format}`);
}

const MARKER = /([A-Za-z0-9]+)<!-- RULE-FACT:([a-z0-9_.-]+):(number|word) -->/g;

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

  const ritePool = ruleNumberWord(facts['mystics.rites.count']);
  const riteSelected = ruleNumberWord(facts['mystics.rites.selected_count']);
  output = replaceClaim(
    output,
    /\| Rite pool \| [A-Za-z]+ Rites; choose exactly [a-z]+ during game-package construction\. \|/g,
    `| Rite pool | ${ritePool[0].toUpperCase() + ritePool.slice(1)} Rites; choose exactly ${riteSelected} during game-package construction. |`,
    'Mystics Rite-pool summary',
    changes,
  );

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
