import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const AUTHORITY_PATH = 'game-data/current-game.json';
const ART_DIRECTION_PATH = 'tts/artwork-direction-overrides.js';

const clone = value => JSON.parse(JSON.stringify(value));
const readText = relative => readFile(resolve(ROOT, String(relative).replace(/^\/+/, '')), 'utf8');
const readJson = relative => readText(relative).then(JSON.parse);

function effectAliasKey(label) {
  return String(label || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function stripInternalMetadata(value) {
  if (Array.isArray(value)) return value.map(stripInternalMetadata);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !['auditHeadings', 'audit_notes', 'language_review', 'v063_language_review'].includes(key))
      .map(([key, child]) => [key, stripInternalMetadata(child)]),
  );
}

function parseArtDirection(source) {
  const match = String(source || '').match(/window\.GAUNTLET_ART_DIRECTION\s*=\s*Object\.freeze\(\{([\s\S]*?)\}\);?/);
  if (!match) return {};
  const body = match[1]
    .trim()
    .replace(/,\s*$/u, '')
    .replace(/([,{]\s*)(focus|focusX|focusY|zoom|fit|smart)\s*:/gu, '$1"$2":');
  return JSON.parse(`{${body}}`);
}

function resolveCards(baseCards, changes, rules) {
  const byId = new Map();
  const nameToId = new Map();
  for (const source of baseCards || []) {
    const card = clone(source);
    byId.set(card.id, card);
    nameToId.set(card.name, card.id);
  }
  for (const retired of changes.retired_cards || []) {
    const id = retired.id || nameToId.get(retired.name);
    const removed = byId.get(id);
    if (!removed) throw new Error(`Cannot retire unresolved card ${retired.id || retired.name}.`);
    byId.delete(id);
    nameToId.delete(removed.name);
  }
  for (const source of changes.cards || []) {
    const card = clone(source);
    const previous = byId.get(card.id);
    if (previous?.name && previous.name !== card.name) nameToId.delete(previous.name);
    byId.set(card.id, card);
    nameToId.set(card.name, card.id);
  }

  const cards = [...byId.values()];
  const resolved = new Map(cards.map(card => [card.id, clone(card)]));
  for (const override of rules.card_text_overrides || []) {
    const card = resolved.get(override.id);
    if (!card) throw new Error(`Cannot apply text override to ${override.id}.`);
    const index = card.effects?.findIndex(effect => effect?.label === override.label) ?? -1;
    if (index < 0) throw new Error(`Cannot find ${override.label} on ${override.id}.`);
    const effects = card.effects.map((effect, effectIndex) =>
      effectIndex === index ? { ...effect, text: override.text } : effect
    );
    const next = { ...card, effects };
    const alias = effectAliasKey(override.label);
    if (alias && Object.prototype.hasOwnProperty.call(next, alias)) next[alias] = override.text;
    resolved.set(card.id, next);
  }
  return cards.map(card => resolved.get(card.id));
}

function resolveBattle(baseBattle, rules) {
  const battle = { ...(baseBattle || {}), ...(rules.battle || {}) };
  for (const field of rules.battle?.remove_fields || []) delete battle[field];
  delete battle.remove_fields;
  return battle;
}

function resolveFactionRules(baseRules, manifest) {
  const rules = clone(baseRules || {});
  for (const [factionId, source] of Object.entries(rules)) {
    const current = { ...(source || {}) };
    if (Object.prototype.hasOwnProperty.call(current, 'faction_action_phase')) {
      current.faction_feature_action_phase = current.faction_action_phase;
      delete current.faction_action_phase;
    }
    if (Object.prototype.hasOwnProperty.call(current, 'faction_actions')) {
      current.faction_features_1_action = (manifest.factionFeatures?.[factionId] || [])
        .filter(feature => feature.profile === '1 Action')
        .map(feature => feature.name);
      delete current.faction_actions;
    }
    if (Object.prototype.hasOwnProperty.call(current, 'faction_abilities')) {
      current.leader_abilities = clone(current.faction_abilities);
      delete current.faction_abilities;
    }
    if (Object.prototype.hasOwnProperty.call(current, 'mission_control_type')) {
      current.mission_control_classification = 'Leader Ability';
      delete current.mission_control_type;
    }
    if (Object.prototype.hasOwnProperty.call(current, 'final_judgment_type')) {
      current.final_judgment_classification = 'Leader Ability';
      delete current.final_judgment_type;
    }
    rules[factionId] = current;
  }

  for (const [factionId, override] of Object.entries(manifest.factionOverrides || {})) {
    if (override?.factionRules) {
      rules[factionId] = { ...(rules[factionId] || {}), ...clone(override.factionRules) };
    }
  }

  const terms = manifest.factionFeatures?.diplomats?.find(feature => feature.name === 'Terms');
  if (rules.diplomats && terms?.timing) rules.diplomats.terms_timing = terms.timing;

  if (rules.financiers?.financial_capacity) {
    rules.financiers.financial_capacity = rules.financiers.financial_capacity.replace(
      'provided at least one is a Financier Faction Action.',
      'provided at least one Action is spent on a Financier Faction Feature marked 1 Action.',
    );
  }
  return rules;
}

function validateFlattened(authority) {
  if (authority.schemaVersion !== 2 || authority.authority !== 'current-game' || authority.version !== 'v0.7.0') {
    throw new Error('Flattened authority identity is invalid.');
  }
  if (authority.gameplay?.cards?.length !== 142) throw new Error('Expected 142 playable cards.');
  if (authority.gameplay?.territories?.length !== 25) throw new Error('Expected 25 Territories.');
  if (authority.gameplay?.factions?.length !== 6) throw new Error('Expected six factions.');
  if (authority.leaders?.length !== 12) throw new Error('Expected 12 Leaders.');
  if (authority.proposals?.length !== 9) throw new Error('Expected nine Proposals.');
  if (authority.starterDecks?.decks?.length !== 12) throw new Error('Expected 12 starter Decks.');

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
  if (retired) throw new Error(`Flattened active authority still contains retired terminology: ${retired[0]}.`);
  if ('sources' in authority || 'resolution' in authority || 'baseVersion' in authority || 'factionOverrides' in authority) {
    throw new Error('Flattened authority still exposes transitional runtime-layer fields.');
  }
}

const manifest = await readJson(AUTHORITY_PATH);
if (manifest.schemaVersion === 2) {
  validateFlattened(manifest);
  console.log('Current-game authority is already flattened v0.7.0.');
  process.exit(0);
}
if (manifest.schemaVersion !== 1 || manifest.authority !== 'current-game' || !manifest.sources) {
  throw new Error('Expected the transitional current-game manifest.');
}

const historicalInputs = clone(manifest.sources);
const [
  base,
  changes,
  territories,
  proposals,
  arcaneSymbol,
  rules,
  componentContract,
  starterDecks,
  artDirectionText,
] = await Promise.all([
  readJson(historicalInputs.baseGameplay),
  readJson(historicalInputs.cardChanges),
  readJson(historicalInputs.territories),
  readJson(historicalInputs.proposals),
  readJson(historicalInputs.arcaneSymbol),
  readJson(historicalInputs.rules),
  readJson(historicalInputs.componentContract),
  readJson(historicalInputs.starterDecks),
  readText(ART_DIRECTION_PATH),
]);

const baseGameplay = clone(base.gameplay);
const cards = resolveCards(baseGameplay.cards, changes, rules);
const battle = resolveBattle(baseGameplay.battle, rules);
const factionRules = resolveFactionRules(baseGameplay.faction_rules, manifest);
const factions = baseGameplay.factions.map(faction => ({
  ...clone(faction),
  ...clone(manifest.factionOverrides?.[faction.id] || {}),
  leaders: manifest.leaders.filter(leader => leader.faction === faction.id).map(clone),
}));

baseGameplay.cards = cards;
baseGameplay.territories = clone(territories.territories);
baseGameplay.battle = battle;
baseGameplay.factions = factions;
baseGameplay.faction_rules = factionRules;

const authority = {
  schemaVersion: 2,
  authority: 'current-game',
  version: 'v0.7.0',
  displayVersion: 'v0.7.0',
  status: 'release-ready',
  runtimePolicy: 'This file is the complete current gameplay authority. Runtime consumers load it directly; historical source and change documents are provenance only and are never layered over this authority.',
  provenance: {
    historicalBaseVersion: 'v0.6.3',
    transitionalSourceVersion: 'v0.6.4-candidate',
    note: 'The historical inputs below document how v0.7.0 was derived. They are not runtime inputs, override layers, or current authorities.',
    historicalInputs,
  },
  gameplay: stripInternalMetadata(baseGameplay),
  proposals: stripInternalMetadata(proposals.proposals || []),
  arcaneSymbol: stripInternalMetadata(arcaneSymbol),
  componentContract: stripInternalMetadata(componentContract),
  starterDecks: stripInternalMetadata(starterDecks),
  factionFeatureTaxonomy: clone(manifest.factionFeatureTaxonomy),
  factionFeatures: clone(manifest.factionFeatures),
  leaders: clone(manifest.leaders),
  mystics: clone(manifest.mystics || {}),
  artDirection: stripInternalMetadata(parseArtDirection(artDirectionText)),
};

validateFlattened(authority);
await writeFile(resolve(ROOT, AUTHORITY_PATH), `${JSON.stringify(authority, null, 2)}\n`);
console.log(`Flattened current-game authority: ${authority.gameplay.cards.length} cards, ${authority.gameplay.territories.length} Territories, ${authority.leaders.length} Leaders.`);
