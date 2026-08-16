import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
export const CURRENT_ALIAS_ROOT = join(ROOT, 'tts', 'generated', 'current');

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

const ART_EXTENSIONS = new Set(['.png', '.webp', '.jpg', '.jpeg']);
const LIFECYCLE_SOURCE = 'config/release-lifecycle.json';
const GITHUB_RELEASE_CONTRACT_SOURCE = 'config/github-release-contract.json';

function jsonText(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(join(ROOT, relativePath), 'utf8'));
}

export async function resolveCurrentTtsRelease() {
  const lifecycle = await readJson(LIFECYCLE_SOURCE);
  const releaseContract = await readJson(GITHUB_RELEASE_CONTRACT_SOURCE);
  const version = String(lifecycle.current_release || '').trim();
  const contractVersion = String(releaseContract.current_release?.tag || '').trim();

  if (!version) throw new Error(`${LIFECYCLE_SOURCE} does not declare current_release.`);
  if (contractVersion !== version) {
    throw new Error(`Release metadata disagrees: lifecycle=${version}, GitHub release contract=${contractVersion || 'missing'}.`);
  }

  const lifecycleEntry = lifecycle.releases?.[version];
  if (!lifecycleEntry || lifecycleEntry.status !== 'current' || lifecycleEntry.public_cutover !== true) {
    throw new Error(`${version} is not a current public-cutover release in ${LIFECYCLE_SOURCE}.`);
  }
  if (releaseContract.current_release?.status !== 'current') {
    throw new Error(`${version} is not current in ${GITHUB_RELEASE_CONTRACT_SOURCE}.`);
  }

  const assets = releaseContract.current_release?.assets || [];
  const canonicalDataSource = assets.find((asset) => /_Canonical_Data\.json$/i.test(asset));
  const starterDecksSource = assets.find((asset) => /_Starter_Decks\.json$/i.test(asset)) || null;
  if (!canonicalDataSource) {
    throw new Error(`${GITHUB_RELEASE_CONTRACT_SOURCE} does not publish a canonical-data asset for ${version}.`);
  }

  return Object.freeze({
    version,
    canonicalDataSource,
    starterDecksSource,
    releasePackageRoot: dirname(canonicalDataSource),
    outputRoot: join(ROOT, 'tts', 'generated', version),
    lifecycleSource: LIFECYCLE_SOURCE,
    githubReleaseContractSource: GITHUB_RELEASE_CONTRACT_SOURCE,
  });
}

export async function loadCurrentStarterDecks() {
  const release = await resolveCurrentTtsRelease();
  if (!release.starterDecksSource) {
    throw new Error(`${GITHUB_RELEASE_CONTRACT_SOURCE} does not publish a starter-deck asset for ${release.version}.`);
  }

  const starterDecks = await readJson(release.starterDecksSource);
  if (!Array.isArray(starterDecks.decks) || !starterDecks.decks.length) {
    throw new Error(`Starter-deck data is missing decks: ${release.starterDecksSource}.`);
  }

  return Object.freeze({ release, starterDecks });
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

function playableCardFromCanonical(card, canonicalDataSource) {
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
    source: card.source || canonicalDataSource,
  };
}

function territoryFromCanonical(territory, canonicalDataSource) {
  return {
    id: territory.id,
    kind: 'territory',
    name: territory.name,
    arena: Boolean(territory.arena),
    complexity: territory.complexity || 'Unspecified',
    watchlist: territory.watchlist || 'None',
    status: territory.status || 'Approved',
    text: String(territory.text || '').trim(),
    source: territory.source || canonicalDataSource,
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
  const release = await resolveCurrentTtsRelease();
  const canonical = await readJson(release.canonicalDataSource);

  if (!Array.isArray(canonical.cards) || !Array.isArray(canonical.territories)) {
    throw new Error(`Canonical data is missing cards or territories: ${release.canonicalDataSource}.`);
  }
  if (!canonical.cards.length || !canonical.territories.length) {
    throw new Error(`Canonical data must contain playable cards and Territories: ${release.canonicalDataSource}.`);
  }

  const playableCards = canonical.cards
    .map((card) => playableCardFromCanonical(card, release.canonicalDataSource))
    .sort(stableCardSort);
  const territories = canonical.territories
    .map((territory) => territoryFromCanonical(territory, release.canonicalDataSource))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-US'));

  const artworkIndex = await buildArtworkIndex();
  const cardsWithArtwork = playableCards.map((card) => ({
    ...card,
    artwork: chooseArtwork(card, artworkIndex),
  }));

  const ids = [...cardsWithArtwork, ...territories].map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate canonical component IDs detected.');

  const counts = Object.fromEntries(
    GROUP_ORDER.map((faction) => [
      faction,
      cardsWithArtwork.filter((card) => card.faction === faction).length,
    ]),
  );
  counts.territories = territories.length;
  counts.arenas = territories.filter((territory) => territory.arena).length;
  counts.playableCards = cardsWithArtwork.length;

  return {
    schemaVersion: 3,
    gameVersion: release.version,
    release: {
      lifecycleSource: release.lifecycleSource,
      githubReleaseContractSource: release.githubReleaseContractSource,
      canonicalDataSource: release.canonicalDataSource,
      canonicalDataVersion: canonical.version || null,
      starterDecksSource: release.starterDecksSource,
      releasePackageRoot: release.releasePackageRoot,
    },
    counts,
    playableCards: cardsWithArtwork,
    territories,
    missingArtwork: cardsWithArtwork.filter((card) => !card.artwork).map((card) => card.id),
  };
}

export async function writeCatalog(catalog) {
  const release = await resolveCurrentTtsRelease();
  await mkdir(release.outputRoot, { recursive: true });
  await mkdir(CURRENT_ALIAS_ROOT, { recursive: true });

  const catalogJson = jsonText(catalog);
  const catalogJs = `window.GAUNTLET_TTS_CATALOG = ${JSON.stringify(catalog)};\n`;
  await writeFile(join(release.outputRoot, 'catalog.json'), catalogJson);
  await writeFile(join(release.outputRoot, 'catalog.js'), catalogJs);
  await writeFile(join(CURRENT_ALIAS_ROOT, 'catalog.json'), catalogJson);
  await writeFile(join(CURRENT_ALIAS_ROOT, 'catalog.js'), catalogJs);
  await writeFile(join(CURRENT_ALIAS_ROOT, 'release.json'), jsonText({
    gameVersion: release.version,
    canonicalDataSource: release.canonicalDataSource,
    canonicalDataVersion: catalog.release.canonicalDataVersion,
    versionedOutput: relative(ROOT, release.outputRoot).split(sep).join('/'),
  }));

  return release;
}
