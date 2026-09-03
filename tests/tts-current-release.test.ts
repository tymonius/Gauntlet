import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const lifecycle = JSON.parse(readFileSync('config/release-lifecycle.json', 'utf8'));
const githubReleaseContract = JSON.parse(readFileSync('config/github-release-contract.json', 'utf8'));
const catalogSource = readFileSync('scripts/tts-current-catalog.mjs', 'utf8');
const componentValidator = readFileSync('scripts/tts-component-contract.mjs', 'utf8');
const cardGenerator = readFileSync('scripts/generate-tts-card-assets.mjs', 'utf8');
const territoryGenerator = readFileSync('scripts/generate-tts-territory-assets.mjs', 'utf8');
const leaderGenerator = readFileSync('scripts/generate-tts-leader-assets.mjs', 'utf8');
const starterGenerator = readFileSync('scripts/generate-tts-starter-decks.mjs', 'utf8');
const supplementalGenerator = readFileSync('scripts/generate-tts-supplemental-assets.mjs', 'utf8');
const releaseStager = readFileSync('scripts/stage-tts-release-assets.mjs', 'utf8');
const savePublisher = readFileSync('scripts/generate-tts-save.mjs', 'utf8');
const supplementalAssembler = readFileSync('scripts/assemble-tts-supplemental-save.mjs', 'utf8');
const cardRenderer = readFileSync('tts/renderer/index.html', 'utf8');
const territoryRenderer = readFileSync('tts/territory-renderer/index.html', 'utf8');
const supplementalRendererAlias = readFileSync('tts/supplemental-renderer/index.html', 'utf8');
const backRenderer = readFileSync('card-design/card-back-render.html', 'utf8');
const legacyBackRenderer = readFileSync('tts/back-renderer/index.html', 'utf8');
const workflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');
const readme = readFileSync('tts/README.md', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

const releaseAgnosticRuntimeText = [
  catalogSource,
  componentValidator,
  cardGenerator,
  territoryGenerator,
  leaderGenerator,
  starterGenerator,
  supplementalGenerator,
  releaseStager,
  savePublisher,
  supplementalAssembler,
  cardRenderer,
  territoryRenderer,
  supplementalRendererAlias,
].join('\n');

describe('durable current-game TTS pipeline', () => {
  it('uses the complete current-game authority as the active development selector and keeps publication separate', () => {
    expect(currentGame.authority).toBe('current-game');
    expect(currentGame.schemaVersion).toBe(2);
    expect(currentGame.version).toMatch(/^v\d+\.\d+\.\d+(?:-candidate)?$/);
    expect(currentGame.gameplay.cards).toHaveLength(142);
    expect(currentGame.gameplay.territories).toHaveLength(25);
    expect(currentGame.starterDecks.decks).toHaveLength(12);
    expect(currentGame).not.toHaveProperty('sources');
    expect(currentGame).not.toHaveProperty('resolution');
    expect(currentGame.provenance.note).toContain('not runtime inputs');

    expect(catalogSource).toContain("const CURRENT_GAME_SOURCE = 'game-data/current-game.json'");
    expect(catalogSource).toContain('loadCurrentGameAuthority');
    expect(catalogSource).toContain('const gameplay = authority.gameplay');
    expect(catalogSource).toContain('const starterDecks = authority.starterDecks');
    expect(catalogSource).not.toContain('readCurrentJsonSource');
    expect(catalogSource).not.toContain('resolveCards(');
    expect(catalogSource).toContain('export async function resolvePublishedTtsRelease()');
    expect(catalogSource).toContain('publishedVersion: published.version');
    expect(catalogSource).toContain('version: sourceVersion');
    expect(catalogSource).not.toContain('TTS_RELEASE_TARGET_SOURCE');
  });

  it('still resolves the immutable published release from release lifecycle metadata', () => {
    const published = lifecycle.current_release;
    expect(published).toBeTruthy();
    expect(lifecycle.releases[published]?.status).toBe('current');
    expect(lifecycle.releases[published]?.public_cutover).toBe(true);
    expect(githubReleaseContract.current_release?.tag).toBe(published);
    expect(githubReleaseContract.current_release?.status).toBe('current');

    const canonical = githubReleaseContract.current_release.assets.find((asset: string) => /_Canonical_Data\.json$/i.test(asset));
    const starters = githubReleaseContract.current_release.assets.find((asset: string) => /_Starter_Decks\.json$/i.test(asset));
    expect(canonical).toBeTruthy();
    expect(starters).toBeTruthy();
    expect(existsSync(canonical)).toBe(true);
    expect(existsSync(starters)).toBe(true);
    expect(catalogSource).toContain('Release metadata disagrees');
  });

  it('resolves Leaders and starter decks directly from the current-game authority', () => {
    expect(catalogSource).toContain('authority.leaders');
    expect(catalogSource).toContain('authority.starterDecks');
    expect(catalogSource).not.toContain('manifest.sources');
    expect(catalogSource).not.toContain('for (const leader of faction.leaders)');
    expect(leaderGenerator).toContain('release.displayVersion || release.version');
    expect(starterGenerator).toContain('loadCurrentStarterDecks');
  });

  it('contains no published release-number literals in current TTS runtime code', () => {
    expect(releaseAgnosticRuntimeText).not.toMatch(/v0\.6\.[0-9]+/);
    expect(packageJson.scripts['tts:components:check']).toBe('node scripts/tts-component-contract.mjs');
    expect(packageJson.scripts['tts:supplementals:check']).toBe('node scripts/generate-tts-supplemental-assets.mjs --check');
    expect(packageJson.scripts['tts:catalog']).toBe('node scripts/generate-tts-card-assets.mjs --catalog-only');
    expect(packageJson.scripts['tts:cards']).toBe('node scripts/generate-tts-card-assets.mjs');
    expect(packageJson.scripts['tts:territories']).toBe('node scripts/generate-tts-territory-assets.mjs');
    expect(packageJson.scripts['tts:leaders']).toBe('node scripts/generate-tts-leader-assets.mjs');
    expect(packageJson.scripts['tts:starters']).toBe('node scripts/generate-tts-starter-decks.mjs');
    expect(packageJson.scripts['tts:supplementals']).toBe('node scripts/generate-tts-supplemental-assets.mjs');
  });

  it('does not duplicate release-specific card, Territory, Leader, starter, or supplemental counts', () => {
    expect(catalogSource).not.toContain('EXPECTED_COUNTS');
    expect(cardGenerator).not.toContain('128');
    expect(territoryGenerator).not.toContain('Expected 25 canonical Territories');
    expect(leaderGenerator).not.toMatch(/Expected 12|=== 12|!== 12/);
    expect(starterGenerator).not.toMatch(/Expected 12|=== 12|!== 12/);
    expect(supplementalGenerator).not.toMatch(/Expected 3|=== 3|!== 3/);
    expect(catalogSource).toContain('counts.playableCards = cardsWithArtwork.length');
    expect(catalogSource).toContain('counts.territories = territories.length');
    expect(leaderGenerator).toContain('leaderCount: records.length');
    expect(starterGenerator).toContain('deckCount: decks.length');
  });

  it('uses generated current aliases for TTS package metadata, not as a parallel browser renderer', () => {
    expect(catalogSource).toContain("join(ROOT, 'tts', 'generated', 'current')");
    expect(catalogSource).toContain("writeFile(join(CURRENT_ALIAS_ROOT, 'catalog.js'), catalogJs)");
    expect(leaderGenerator).toContain("join(CURRENT_ALIAS_ROOT, 'leader-manifest.json')");
    expect(starterGenerator).toContain("join(CURRENT_ALIAS_ROOT, 'starter-deck-manifest.json')");
    expect(supplementalGenerator).toContain("join(CURRENT_ALIAS_ROOT, 'supplemental-catalog.json')");
    expect(cardRenderer).toContain('/card-design/card-review-render.html');
    expect(territoryRenderer).toContain('/card-design/territory-review-render.html');
    expect(supplementalRendererAlias).toContain('/card-design/component-render.html');
  });

  it('renders all six production backs from the shared reviewed component', () => {
    for (const faction of ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']) {
      expect(catalogSource).toContain(`'${faction}'`);
    }
    expect(cardGenerator).toContain('/card-design/card-back-render.html?faction=');
    expect(cardGenerator).toContain("const file = `backs/${faction}.png`");
    expect(backRenderer).toContain('/card-design/card-back.css');
    expect(backRenderer).toContain('/card-design/card-back.js');
    expect(legacyBackRenderer).toContain('/card-design/card-back-render.html');
  });

  it('records the standard-back policy without leaking Neutral-card identity', () => {
    expect(cardGenerator).toContain("policy: 'standardBack'");
    expect(cardGenerator).toContain('neutralCardsUseSameStandardBack: true');
    expect(starterGenerator).toContain('territoriesUseSameStandardBack: true');
    expect(savePublisher).toContain('BackIsHidden: true');
    expect(savePublisher).toContain('UniqueBack: false');
    expect(readme).toContain('Neutral playable cards always use the same standard back as the rest of their player');
  });

  it('keeps TTS CI watching every authority dependency needed by the sparse checkout', () => {
    expect(workflow).toContain("'game-data/**'");
    expect(workflow).not.toContain('deckbuilder/starter-decks.json');
    expect(workflow).toContain('scripts/current-game-authority.mjs');
    expect(workflow).toContain('scripts/tts-current-catalog.mjs');
    expect(workflow).toContain('game-data');
    expect(workflow).toContain('name: gauntlet-current-tts-card-assets');
  });
});
