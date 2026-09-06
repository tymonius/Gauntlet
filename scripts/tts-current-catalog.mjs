import { access, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCurrentGameAuthority } from './current-game-authority.mjs';
import { resolveFirstArtwork } from '../card-design/card-artwork-resolver.js';
import { resolveArtDirection } from '../game-data/art-direction.mjs';

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

const CURRENT_GAME_SOURCE = 'game-data/current-game.json';
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
  const [authority, published] = await Promise.all([
    loadCurrentGameAuthority(),
    resolvePublishedTtsRelease(),
  ]);
  const sourceVersion = String(authority.version || '').trim();
  const displayVersion = String(authority.displayVersion || sourceVersion).trim();

  if (!sourceVersion) throw new Error(`${CURRENT_GAME_SOURCE} does not declare a current version.`);

  return Object.freeze({
    version: sourceVersion,
    displayVersion,
    sourceVersion,
    canonicalDataSource: CURRENT_GAME_SOURCE,
    starterDecksSource: CURRENT_GAME_SOURCE,
    releasePackageRoot: 'game-data',
    outputRoot: join(ROOT, 'tts', 'generated', sourceVersion),
    currentGameSource: CURRENT_GAME_SOURCE,
    authorityProvenance: Object.freeze({ ...(authority.provenance || {}) }),
    targetStatus: String(authority.status || ''),
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
      artDirection: resolveArtDirection(
        authority.visualPolicy,
        authority.artDirection || {},
        authority.artDirection?.[`${factionId}-${id}`] ? `${factionId}-${id}` : id,
      ),
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

async function repositoryArtworkExists(source) {
  const relativeSource = String(source || '').replace(/^\/+/, '');
  if (!relativeSource) return false;
  try {
    await access(join(ROOT, relativeSource));
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
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

  const artDirection = authority.artDirection || {};
  const playableCards = gameplay.cards
    .map((card) => ({
      ...playableCardFromCanonical(card, CURRENT_GAME_SOURCE),
      artDirection: resolveArtDirection(authority.visualPolicy, artDirection, card.id),
    }))
    .sort(stableCardSort);
  const territories = gameplay.territories
    .map((territory) => ({
      ...territoryFromCanonical(territory, CURRENT_GAME_SOURCE),
      artDirection: resolveArtDirection(authority.visualPolicy, artDirection, territory.id),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-US'));

  const cardsWithArtwork = await Promise.all(playableCards.map(async (card) => ({
    ...card,
    artwork: await resolveFirstArtwork(card, card.faction, repositoryArtworkExists),
  })));

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
    publishedVersion: release.publishedVersion,
    canonicalDataSource: CURRENT_GAME_SOURCE,
    canonicalDataVersion: catalog.release.canonicalDataVersion,
    versionedOutput: relative(ROOT, release.outputRoot).split(sep).join('/'),
  }));

  return release;
}
