import { readFile, readdir } from 'node:fs/promises';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const VERSION = 'v0.6.3';
export const CANONICAL_DATA_SOURCE = 'releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json';
export const OUTPUT_ROOT = join(ROOT, 'tts', 'generated', VERSION);

export const GROUP_ORDER = Object.freeze([
  'neutral',
  'military',
  'diplomats',
  'financiers',
  'intelligence',
  'mystics',
  'inquisition',
]);

export const PLAYABLE_BACK_FACTIONS = Object.freeze([
  'military',
  'diplomats',
  'financiers',
  'intelligence',
  'mystics',
  'inquisition',
]);

export const EXPECTED_COUNTS = Object.freeze({
  neutral: 50,
  military: 13,
  diplomats: 13,
  financiers: 13,
  intelligence: 13,
  mystics: 13,
  inquisition: 13,
  territories: 25,
});

const ART_EXTENSIONS = new Set(['.png', '.webp', '.jpg', '.jpeg']);

export function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function sectionsFromEffects(effects) {
  const sections = {};
  for (const effect of effects || []) {
    const label = String(effect?.label || '').trim();
    const text = String(effect?.text || '').trim();
    if (!label || !text) continue;
    sections[label] = sections[label] ? `${sections[label]}\n${text}` : text;
  }
  return sections;
}

function playableCardFromCanonical(card) {
  const faction = slugify(card.allegiance);
  if (!GROUP_ORDER.includes(faction)) {
    throw new Error(`Unknown canonical allegiance for ${card.id}: ${card.allegiance}.`);
  }

  return {
    id: card.id,
    kind: 'playable',
    name: card.name,
    faction,
    factionLabel: card.allegiance,
    cost: Number(card.cost),
    complexity: card.complexity || 'Unspecified',
    trait: card.trait || '',
    form: card.card_form || '',
    unique: Boolean(card.unique),
    sections: sectionsFromEffects(card.effects),
    source: card.source || CANONICAL_DATA_SOURCE,
  };
}

function territoryFromCanonical(territory) {
  return {
    id: territory.id,
    kind: 'territory',
    name: territory.name,
    arena: Boolean(territory.arena),
    complexity: territory.complexity || 'Unspecified',
    watchlist: territory.watchlist || 'None',
    status: territory.status || 'Approved',
    text: String(territory.text || '').trim(),
    source: territory.source || CANONICAL_DATA_SOURCE,
  };
}

async function walkImages(directory, files = []) {
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') return files;
    throw error;
  }

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    if (entry.isDirectory()) await walkImages(fullPath, files);
    else if (ART_EXTENSIONS.has(extname(entry.name).toLowerCase())) files.push(fullPath);
  }
  return files;
}

function artworkKeys(file) {
  const base = slugify(file.slice(0, -extname(file).length).split(sep).at(-1));
  const keys = new Set([base]);
  keys.add(base.replace(/-(?:alt|alternate|v\d+|\d+)$/, ''));
  return [...keys].filter(Boolean);
}

async function buildArtworkIndex() {
  const files = await walkImages(join(ROOT, 'images', 'artwork', 'cards'));
  const index = new Map();
  for (const file of files) {
    for (const key of artworkKeys(file)) {
      if (!index.has(key)) index.set(key, []);
      index.get(key).push(file);
    }
  }
  return index;
}

function chooseArtwork(card, artworkIndex) {
  const matches = artworkIndex.get(slugify(card.name)) || [];
  if (!matches.length) return null;
  const factionFolder = `${sep}${card.faction}${sep}`;
  const preferred = matches.find((path) => path.includes(factionFolder)) || matches[0];
  return relative(ROOT, preferred).split(sep).join('/');
}

function stableCardSort(a, b) {
  const groupDifference = GROUP_ORDER.indexOf(a.faction) - GROUP_ORDER.indexOf(b.faction);
  return groupDifference || a.name.localeCompare(b.name, 'en-US');
}

export async function buildCatalog() {
  const canonical = JSON.parse(await readFile(join(ROOT, CANONICAL_DATA_SOURCE), 'utf8'));
  if (canonical.version !== VERSION) {
    throw new Error(`Canonical data version is ${canonical.version}; expected ${VERSION}.`);
  }
  if (!Array.isArray(canonical.cards) || !Array.isArray(canonical.territories)) {
    throw new Error(`Canonical data is missing cards or territories: ${CANONICAL_DATA_SOURCE}.`);
  }

  const playableCards = canonical.cards.map(playableCardFromCanonical).sort(stableCardSort);
  const territories = canonical.territories
    .map(territoryFromCanonical)
    .sort((a, b) => a.name.localeCompare(b.name, 'en-US'));

  const artworkIndex = await buildArtworkIndex();
  const cardsWithArtwork = playableCards.map((card) => ({
    ...card,
    artwork: chooseArtwork(card, artworkIndex),
  }));

  const counts = Object.fromEntries(
    GROUP_ORDER.map((faction) => [
      faction,
      cardsWithArtwork.filter((card) => card.faction === faction).length,
    ]),
  );
  counts.territories = territories.length;

  for (const [key, expected] of Object.entries(EXPECTED_COUNTS)) {
    if (counts[key] !== expected) {
      throw new Error(`Canonical ${key} count is ${counts[key]}; expected ${expected}.`);
    }
  }

  const ids = [...cardsWithArtwork, ...territories].map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate canonical card IDs detected.');

  return {
    schemaVersion: 2,
    gameVersion: VERSION,
    sourceHierarchy: [CANONICAL_DATA_SOURCE],
    counts,
    playableCards: cardsWithArtwork,
    territories,
    missingArtwork: cardsWithArtwork.filter((card) => !card.artwork).map((card) => card.id),
  };
}
