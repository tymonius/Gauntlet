import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { dirname, extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCurrentGameAuthority } from './current-game-authority.mjs';

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
const CURRENT_GAME_SOURCE = 'game-data/current-game.json';
const TTS_RELEASE_TARGET_SOURCE = 'config/tts-release-target.json';
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
  return JSON.parse(await readFile(join(ROOT, String(relativePath).replace(/^\/+/, '')), 'utf8'));
}

export async function resolvePublishedTtsRelease() {
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
    displayVersion: version,
    canonicalDataSource,
    starterDecksSource,
    releasePackageRoot: dirname(canonicalDataSource),
    outputRoot: join(ROOT, 'tts', 'generated', version),
    lifecycleSource: LIFECYCLE_SOURCE,
    githubReleaseContractSource: GITHUB_RELEASE_CONTRACT_SOURCE,
  });
}

// "Current" TTS is the active development package, not necessarily the latest
// published release. Its release identity is explicit so current-game source
// provenance can remain pinned to the approved source bundle until cutover.
export async function resolveCurrentTtsRelease() {
  const [authority, published, target] = await Promise.all([
    loadCurrentGameAuthority(),
    resolvePublishedTtsRelease(),
    readJson(TTS_RELEASE_TARGET_SOURCE),
  ]);
  const sourceVersion = String(authority.version || '').trim();
  const version = String(target.releaseTag || '').trim();

  if (target.schemaVersion !== 1) throw new Error(`${TTS_RELEASE_TARGET_SOURCE} has an unsupported schemaVersion.`);
  if (!version) throw new Error(`${TTS_RELEASE_TARGET_SOURCE} does not declare releaseTag.`);
  if (!sourceVersion) throw new Error(`${CURRENT_GAME_SOURCE} does not declare a current version.`);
  if (String(target.currentGameAuthority || '').replace(/^\/+/, '') !== CURRENT_GAME_SOURCE) {
    throw new Error(`${TTS_RELEASE_TARGET_SOURCE} must target ${CURRENT_GAME_SOURCE}.`);
  }
  if (String(target.sourceVersion || '').trim() !== sourceVersion) {
    throw new Error(`TTS release target sourceVersion ${target.sourceVersion || 'missing'} does not match current-game source ${sourceVersion}.`);
  }

  return Object.freeze({
    version,
    displayVersion: String(target.displayVersion || version),
    sourceVersion,
    canonicalDataSource: CURRENT_GAME_SOURCE,
    starterDecksSource: CURRENT_GAME_SOURCE,
    releasePackageRoot: 'game-data',
    outputRoot: join(ROOT, 'tts', 'generated', version),
    currentGameSource: CURRENT_GAME_SOURCE,
    authorityProvenance: Object.freeze({ ...(authority.provenance || {}) }),
    ttsReleaseTargetSource: TTS_RELEASE_TARGET_SOURCE,
    targetStatus: String(target.status || ''),
    publishedVersion: published.version,
    lifecycleSource: LIFECYCLE_SOURCE,
    githubReleaseContractSource: GITHUB_RELEASE_CONTRACT_SOURCE,
  });
}

export async function loadCurrentStarterDecks() {
  const [release, authority] = await Promise.all([
    resolveCurrentTtsRelease(),
    loadCurrentGameAuthority(),
  ]);
  const starterDecks = authority.starterDecks;
  if (!Array.isArray(starterDecks?.decks) || !starterDecks.decks.length) {
    throw new Error(`${CURRENT_GAME_SOURCE} is missing starter Deck data.`);
  }
  return Object.freeze({ release, starterDecks });
}

export async function loadCurrentLeaders() {
  const release = await resolveCurrentTtsRelease();
  const authority = await loadCurrentGameAuthority();
  const sourceLeaders = Array.isArray(authority.leaders) ? authority.leaders : [];
  if (!sourceLeaders.length) throw new Error(`${CURRENT_GAME_SOURCE} does not declare current Leaders.`);

  const leaders = [];
  const keys = new Set();
  for (const leader of sourceLeaders) {
    const factionId = slugify(leader?.faction || leader?.factionLabel);
    const name = String(leader?.name || '').trim();
    const id = slugify(leader?.id || name);
    if (!PLAYABLE_BACK_FACTIONS.includes(factionId)) {
      throw new Error(`Unknown current-game faction for TTS Leader export: ${leader?.faction || 'missing'}.`);
    }
    if (!name || !id) throw new Error(`Current-game faction ${factionId} contains a Leader without a usable name/id.`);
    const key = `${factionId}:${id}`;
    if (keys.has(key)) throw new Error(`Duplicate current-game Leader key detected: ${key}.`);
    keys.add(key);
    leaders.push(Object.freeze({
      id,
      kind: 'leader',
      name,
      faction: factionId,
      factionLabel: leader.factionLabel || factionId,
      canonicalImage: leader.image || null,
      source: CURRENT_GAME_SOURCE,
    }));
  }

  return Object.freeze({
    release,
    canonicalDataVersion: release.sourceVersion,
    leaders: Object.freeze(leaders),
  });
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

function playableCardFromCanonical(card, source) {
  const faction = slugify(card.allegiance);
  if (!GROUP_ORDER.includes(faction)) {
    throw new Error(`Unknown current-game allegiance for ${card.id}: ${card.allegiance}.`);
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
    source,
  };
}

function territoryFromCanonical(territory, source) {
  return {
    id: territory.id,
    kind: 'territory',
    name: territory.name,
    arena: Boolean(territory.arena),
    complexity: territory.complexity || 'Unspecified',
    watchlist: territory.watchlist || 'None',
    status: territory.status || 'Approved',
    text: String(territory.text || territory.effects?.map((effect) => effect?.text).filter(Boolean).join('\n') || '').trim(),
    source,
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
  const [release, authority] = await Promise.all([
    resolveCurrentTtsRelease(),
    loadCurrentGameAuthority(),
  ]);
  const gameplay = authority.gameplay;
  if (!Array.isArray(gameplay?.cards) || !gameplay.cards.length) {
    throw new Error(`${CURRENT_GAME_SOURCE} is missing gameplay.cards.`);
  }
  if (!Array.isArray(gameplay.territories) || !gameplay.territories.length) {
    throw new Error(`${CURRENT_GAME_SOURCE} is missing gameplay.territories.`);
  }

  const playableCards = gameplay.cards
    .map((card) => playableCardFromCanonical(card, CURRENT_GAME_SOURCE))
    .sort(stableCardSort);
  const territories = gameplay.territories
    .map((territory) => territoryFromCanonical(territory, CURRENT_GAME_SOURCE))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-US'));

  const artworkIndex = await buildArtworkIndex();
  const cardsWithArtwork = playableCards.map((card) => ({
    ...card,
    artwork: chooseArtwork(card, artworkIndex),
  }));

  const ids = [...cardsWithArtwork, ...territories].map((item) => item.id);
  if (new Set(ids).size !== ids.length) throw new Error('Duplicate current-game component IDs detected.');

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
    schemaVersion: 4,
    gameVersion: release.version,
    displayVersion: release.displayVersion,
    authority: CURRENT_GAME_SOURCE,
    release: {
      currentGameAuthority: CURRENT_GAME_SOURCE,
      sourceVersion: release.sourceVersion,
      publishedVersion: release.publishedVersion,
      canonicalDataSource: CURRENT_GAME_SOURCE,
      canonicalDataVersion: release.sourceVersion,
      starterDecksSource: release.starterDecksSource,
      ttsReleaseTargetSource: release.ttsReleaseTargetSource,
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
    displayVersion: release.displayVersion,
    sourceVersion: release.sourceVersion,
    currentGameAuthority: CURRENT_GAME_SOURCE,
    ttsReleaseTargetSource: release.ttsReleaseTargetSource,
    publishedVersion: release.publishedVersion,
    canonicalDataSource: CURRENT_GAME_SOURCE,
    canonicalDataVersion: catalog.release.canonicalDataVersion,
    versionedOutput: relative(ROOT, release.outputRoot).split(sep).join('/'),
  }));

  return release;
}
