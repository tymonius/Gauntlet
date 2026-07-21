import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const VERSION = 'v0.6.0';
const DATE = 'July 20, 2026';

const sourceSpecs = [
  { id: 'neutral', name: 'Neutral', path: 'docs/Gauntlet_v0.6_Neutral_Card_Pool.md', start: '# Cost 1', headingLevel: 2, allegiance: 'Neutral' },
  { id: 'military', name: 'Military', path: 'releases/v0.6.0/faction-guides/military/Gauntlet_v0.6_Military_Faction_Guide.md', start: '# 6. Canonical Military card pool', end: '# 7. Card-pool summary', headingLevel: 2, allegiance: 'Military' },
  { id: 'diplomats', name: 'Diplomats', path: 'releases/v0.6.0/faction-guides/diplomat/Gauntlet_v0.6_Diplomat_Faction_Guide.md', start: '# 6. Canonical card pool', end: '# 7. Card-pool summary', headingLevel: 2, allegiance: 'Diplomats' },
  { id: 'financiers', name: 'Financiers', path: 'releases/v0.6.0/faction-guides/financier/Gauntlet_v0.6_Financier_Faction_Guide.md', start: '## 6. Canonical Financier card pool', end: '## 7. Card-pool summary', headingLevel: 3, allegiance: 'Financiers' },
  { id: 'intelligence', name: 'Intelligence', path: 'releases/v0.6.0/faction-guides/intelligence/Gauntlet_v0.6_Intelligence_Faction_Guide.md', start: '# 6. Canonical Intelligence card pool', end: '# 7. Card-pool summary', headingLevel: 2, allegiance: 'Intelligence' },
  { id: 'mystics', name: 'Mystics', path: 'releases/v0.6.0/faction-guides/mystics/Gauntlet_v0.6_Mystics_Faction_Guide.md', start: '## 7. Canonical Mystics card pool', end: '## 8. Package summary and development watchlist', headingLevel: 3, allegiance: 'Mystics' },
  { id: 'inquisition', name: 'Inquisition', path: 'releases/v0.6.0/faction-guides/inquisition/Gauntlet_v0.6_Inquisition_Faction_Guide.md', start: '## 6. Canonical Inquisition card pool', end: '## 7. Card-pool summary', headingLevel: 3, allegiance: 'Inquisition' }
];

const factionMetadata = [
  { id: 'military', name: 'Military', color: 'crimson red', resource: 'Command (maximum 2)', leaders: [{ name: 'General', image: 'images/sketches/general.png' }, { name: 'Commandant', image: 'images/sketches/commandant.png' }], victory: 'Run the Gauntlet.' },
  { id: 'diplomats', name: 'Diplomats', color: 'royal blue', resource: 'Influence (0–10)', leaders: [{ name: 'Ambassador', image: 'images/sketches/ambassador.png' }, { name: 'Senator', image: 'images/sketches/senator.png' }], victory: 'Run the Gauntlet or complete the Peace Treaty.' },
  { id: 'financiers', name: 'Financiers', color: 'emerald green', resource: 'Capital (dynamic limit)', leaders: [{ name: 'Banker', image: 'images/sketches/banker.png' }, { name: 'Executive', image: 'images/sketches/executive.png' }], victory: 'Run the Gauntlet or achieve Controlling Interest.' },
  { id: 'intelligence', name: 'Intelligence', color: 'charcoal/black', resource: 'Intel and Operation Progress', leaders: [{ name: 'Ranger', image: 'images/sketches/ranger.png' }, { name: 'Spymaster', image: 'images/sketches/spymaster.png' }], victory: 'Run the Gauntlet or complete a Special Operation.' },
  { id: 'mystics', name: 'Mystics', color: 'deep violet', resource: null, leaders: [{ name: 'Alchemist', image: 'images/sketches/alchemist.png' }, { name: 'Spirit Walker', image: 'images/sketches/spirit walker.png' }], victory: 'Run the Gauntlet or complete Ritual.' },
  { id: 'inquisition', name: 'Inquisition', color: 'antique gold/ochre', resource: 'Conviction (maximum 4)', leaders: [{ name: 'Grand Inquisitor', image: 'images/sketches/grand inquisitor.png' }, { name: 'Witch Hunter', image: 'images/sketches/witch hunter.png' }], victory: 'Run the Gauntlet or achieve Purification.' }
];

function read(relativePath) {
  return fs.readFileSync(path.join(ROOT, relativePath), 'utf8').replace(/\r\n/g, '\n');
}

function section(text, start, end) {
  const startIndex = start ? text.indexOf(start) : 0;
  if (startIndex < 0) throw new Error(`Missing section start: ${start}`);
  const from = startIndex + (start ? start.length : 0);
  const endIndex = end ? text.indexOf(end, from) : text.length;
  if (end && endIndex < 0) throw new Error(`Missing section end: ${end}`);
  return text.slice(from, endIndex);
}

function slugify(value) {
  return value.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function metadata(block, label) {
  const match = block.match(new RegExp(`^\\*\\*${label}:\\*\\*\\s*(.+?)\\s*$`, 'mi'));
  return match ? match[1].trim().replace(/\s{2,}$/g, '') : null;
}

function cleanQuoteLine(line) {
  return line.replace(/^>\s?/, '').replace(/\s{2}$/g, '').trimEnd();
}

function parseEffects(block) {
  const quoteLines = block.split('\n').filter(line => /^>/.test(line)).map(cleanQuoteLine);
  const effects = [];
  let current = null;

  for (const line of quoteLines) {
    const labelMatch = line.match(/^\*\*([^*]+):\*\*\s*(.*)$/);
    if (labelMatch) {
      current = { label: labelMatch[1].trim(), text: labelMatch[2].trim() };
      effects.push(current);
      continue;
    }

    if (!line && !current) continue;
    if (!current) {
      current = { label: 'Rule', text: '' };
      effects.push(current);
    }

    const cleaned = line.replace(/^[-*]\s+/, '• ');
    if (!cleaned && !current.text) continue;
    current.text += `${current.text ? '\n' : ''}${cleaned}`;
  }

  return effects.map(effect => ({ ...effect, text: effect.text.trim() })).filter(effect => effect.text);
}

function parseCards(spec) {
  const source = read(spec.path);
  const body = section(source, spec.start, spec.end);
  const heading = '#'.repeat(spec.headingLevel);
  const regex = new RegExp(`^${heading} (.+)$`, 'gm');
  const matches = [...body.matchAll(regex)];
  const cards = [];

  for (let index = 0; index < matches.length; index += 1) {
    const name = matches[index][1].trim();
    const start = matches[index].index + matches[index][0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : body.length;
    const block = body.slice(start, end);
    const costText = metadata(block, 'Cost');
    if (!costText || !/^\d+$/.test(costText)) continue;
    const effects = parseEffects(block);
    cards.push({
      id: `${spec.id}-${slugify(name)}`,
      name,
      allegiance: spec.allegiance,
      cost: Number(costText),
      complexity: metadata(block, 'Complexity'),
      trait: metadata(block, 'Trait'),
      card_form: metadata(block, 'Card form'),
      unique: Boolean(metadata(block, 'Unique')),
      unique_rule: metadata(block, 'Unique'),
      effects,
      action: effects.find(effect => effect.label === 'Action')?.text ?? null,
      battle: effects.find(effect => effect.label === 'Battle')?.text ?? null,
      mission: effects.find(effect => effect.label === 'Mission')?.text ?? null,
      source: spec.path
    });
  }
  return cards;
}

function parseTerritories() {
  const sourcePath = 'docs/Gauntlet_v0.6_Territory_Pool.md';
  const source = read(sourcePath);
  const body = section(source, '# Standard Territories');
  const regex = /^## (\d+)\. (.+)$/gm;
  const matches = [...body.matchAll(regex)];
  return matches.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < matches.length ? matches[index + 1].index : body.length;
    const block = body.slice(start, end);
    const quote = block.split('\n').filter(line => /^>/.test(line)).map(cleanQuoteLine).join('\n').trim();
    return {
      id: `territory-${slugify(match[2])}`,
      number: Number(match[1]),
      name: match[2].trim(),
      arena: match[2].startsWith('Arena:'),
      complexity: metadata(block, 'Complexity'),
      text: quote,
      source: sourcePath
    };
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function validate(cards, territories) {
  const counts = Object.fromEntries(['Neutral', ...factionMetadata.map(f => f.name)].map(name => [name, cards.filter(card => card.allegiance === name).length]));
  assert(counts.Neutral === 50, `Expected 50 Neutral cards; found ${counts.Neutral}`);
  for (const faction of factionMetadata) assert(counts[faction.name] === 12, `Expected 12 ${faction.name} cards; found ${counts[faction.name]}`);
  assert(cards.length === 122, `Expected 122 playable card designs; found ${cards.length}`);
  assert(territories.length === 25, `Expected 25 Territories; found ${territories.length}`);
  assert(territories.filter(t => t.arena).length === 4, 'Expected four Arenas');

  const cardNames = new Set();
  for (const card of cards) {
    assert(!cardNames.has(card.name), `Duplicate card title: ${card.name}`);
    cardNames.add(card.name);
    assert(card.cost >= 1 && card.cost <= 5, `Invalid cost for ${card.name}`);
    assert(card.effects.length > 0, `No parsed effects for ${card.name}`);
  }

  const retired = /\bHeartlands?\b|Homeland Advantage|battle[- ]draw|battle[- ]drawn|\bAction card\b|\bBattle card\b/i;
  for (const item of [...cards, ...territories]) {
    const text = JSON.stringify(item);
    assert(!retired.test(text), `Retired terminology remains in ${item.name}: ${text.match(retired)?.[0]}`);
  }

  for (const faction of factionMetadata) {
    for (const leader of faction.leaders) assert(fs.existsSync(path.join(ROOT, leader.image)), `Missing leader image: ${leader.image}`);
  }

  return counts;
}

function buildReference(data) {
  const lines = [
    '# Gauntlet v0.6.0 Reference Guide', '',
    '## Setup', '',
    '1. Shuffle the Playable Deck to form the Draw Pile.',
    '2. Secretly arrange three Territories.',
    '3. Join both Territory lines and reveal all six.',
    '4. Prepare the Leader and supplemental components.',
    '5. Place the Player Token before that player’s end of the Gauntlet.',
    '6. Draw three cards.',
    '7. Roll to determine the first player; reroll ties.', '',
    '## Turn', '',
    '1. Capture a Territory occupied but not controlled.',
    '2. Draw one card.',
    '3. Use the Action Opportunity before movement, if desired.',
    '4. Advance, hold, or withdraw; resolve any battle.',
    '5. Use the Action Opportunity after movement if the first was unused.',
    '6. Resolve end-of-turn effects and discard down to three cards.', '',
    '## Battle', '',
    '1. Resolve begin-battle effects.',
    '2. Attacker commits from hand or declines; defender does the same.',
    '3. Attacker forms a Battle Hand and chooses a card or declines; defender does the same.',
    '4. Resolve special reveal effects, then reveal all used cards.',
    '5. Resolve Battle effects.',
    '6. Roll battle dice; combine advantage and disadvantage, rerolls, and modifiers.',
    '7. Determine the winner; apply Defender’s Advantage where applicable.',
    '8. Resolve retreat and occupation.',
    '9. Put hand commitments in the Graveyard and all Battle Hand cards in the Discard Pile unless stated otherwise.', '',
    '## Running the Gauntlet', '',
    '1. Win on the opponent’s final Territory.',
    '2. The opponent retreats beyond the Gauntlet; occupy the final Territory.',
    '3. Capture it at the start of the next turn if still occupied.',
    '4. Advance beyond it to initiate the opponent’s Last Stand.',
    '5. The defender has Defender’s Advantage and +1.',
    '6. Win the Last Stand to run the Gauntlet and win.', '',
    '## Factions', '',
    '| Faction | Resource / Progression | Victory | Leaders |',
    '|---|---|---|---|',
    ...data.factions.map(faction => `| ${faction.name} | ${faction.resource ?? 'Three Rites; no resource'} | ${faction.victory} | ${faction.leaders.map(leader => leader.name).join(', ')} |`), '',
    '## Card Pool', '',
    '| Pool | Cards | Total value | Unique cards |',
    '|---|---:|---:|---|',
    ...Object.entries(data.card_pool_summary).map(([pool, summary]) => `| ${pool} | ${summary.count} | ${summary.total_value} | ${summary.unique.join(', ') || 'None'} |`), '',
    '## Territory Pool', '',
    ...data.territories.map(territory => `- **${territory.name}**${territory.arena ? ' *(Arena)*' : ''}: ${territory.text.replace(/\n/g, ' ')}`), '',
    `Generated from the canonical v0.6.0 sources on ${DATE}.`
  ];
  return `${lines.join('\n')}\n`;
}

const cards = sourceSpecs.flatMap(parseCards);
const territories = parseTerritories();
const counts = validate(cards, territories);
const cardPoolSummary = {};
for (const name of ['Neutral', ...factionMetadata.map(f => f.name)]) {
  const pool = cards.filter(card => card.allegiance === name);
  cardPoolSummary[name] = {
    count: pool.length,
    total_value: pool.reduce((sum, card) => sum + card.cost, 0),
    unique: pool.filter(card => card.unique).map(card => card.name),
    cost_curve: Object.fromEntries([1, 2, 3, 4, 5].map(cost => [cost, pool.filter(card => card.cost === cost).length]))
  };
}

const canonical = {
  version: VERSION,
  name: 'Faction Framework Release',
  date: DATE,
  status: 'Canonical pre-release edition',
  deck_construction: { minimum_playable_cards: 30, maximum_deckbuilding_value: 60, opening_hand: 3, hand_limit: 3, territories_per_player: 3, maximum_arenas: 1, factions_per_deck: 1, leaders_per_deck: 1 },
  battlefield: {
    gauntlet: 'Six Territory Cards arranged in one column.',
    starting_position: 'Each Player Token begins immediately before that player’s end of the Gauntlet.',
    capture: 'At the start of a turn, capture a Territory occupied but not controlled.',
    victory: 'Capture the opponent’s final Territory, advance beyond it, and win the opponent’s Last Stand.',
    last_stand: { defender_advantage: true, defender_bonus: 1 }
  },
  battle: {
    normal_battle_hand_size: 3,
    normal_hand_commitments: 1,
    normal_battle_hand_choices: 1,
    hand_commitment_destination: 'Graveyard',
    battle_hand_destination: 'Discard Pile',
    defender_advantage: 'The defending player wins tied battle totals when defending a Territory they control or during their Last Stand.'
  },
  factions: factionMetadata.map(faction => ({ ...faction, card_count: counts[faction.name], source: sourceSpecs.find(spec => spec.id === faction.id)?.path })),
  card_pool_summary: cardPoolSummary,
  cards,
  territories,
  source_files: {
    rulebook: 'releases/v0.6.0/Gauntlet_v0.6.0_Rulebook.md',
    neutral: sourceSpecs[0].path,
    territories: 'docs/Gauntlet_v0.6_Territory_Pool.md',
    factions: Object.fromEntries(sourceSpecs.slice(1).map(spec => [spec.id, spec.path]))
  }
};

const releaseDir = path.join(ROOT, 'releases/v0.6.0');
fs.mkdirSync(releaseDir, { recursive: true });
fs.writeFileSync(path.join(releaseDir, 'Gauntlet_v0.6.0_Canonical_Data.json'), `${JSON.stringify(canonical, null, 2)}\n`);
fs.writeFileSync(path.join(releaseDir, 'Gauntlet_v0.6.0_Reference_Guide.md'), buildReference(canonical));
fs.writeFileSync(path.join(releaseDir, 'Gauntlet_v0.6.0_Manifest.json'), `${JSON.stringify({
  version: VERSION,
  generated: DATE,
  playable_card_designs: cards.length,
  neutral_cards: counts.Neutral,
  faction_cards: cards.length - counts.Neutral,
  territories: territories.length,
  arenas: territories.filter(t => t.arena).length,
  factions: factionMetadata.length,
  leaders: factionMetadata.reduce((sum, faction) => sum + faction.leaders.length, 0),
  outputs: ['Gauntlet_v0.6.0_Rulebook.md', 'Gauntlet_v0.6.0_Reference_Guide.md', 'Gauntlet_v0.6.0_Canonical_Data.json', 'Gauntlet_v0.6.0_Manifest.json']
}, null, 2)}\n`);

console.log(`Generated ${cards.length} cards, ${territories.length} Territories, ${factionMetadata.length} factions, and ${factionMetadata.reduce((sum, faction) => sum + faction.leaders.length, 0)} Leaders.`);
