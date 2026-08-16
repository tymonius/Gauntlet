import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lifecycle = JSON.parse(readFileSync('config/release-lifecycle.json', 'utf8'));
const githubReleaseContract = JSON.parse(readFileSync('config/github-release-contract.json', 'utf8'));
const catalogSource = readFileSync('scripts/tts-current-catalog.mjs', 'utf8');
const cardGenerator = readFileSync('scripts/generate-tts-card-assets.mjs', 'utf8');
const territoryGenerator = readFileSync('scripts/generate-tts-territory-assets.mjs', 'utf8');
const leaderGenerator = readFileSync('scripts/generate-tts-leader-assets.mjs', 'utf8');
const starterGenerator = readFileSync('scripts/generate-tts-starter-decks.mjs', 'utf8');
const cardRenderer = readFileSync('tts/renderer/index.html', 'utf8');
const territoryRenderer = readFileSync('tts/territory-renderer/index.html', 'utf8');
const backRenderer = readFileSync('tts/back-renderer/index.html', 'utf8');
const workflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');
const readme = readFileSync('tts/README.md', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

const supportedPipelineText = [
  catalogSource,
  cardGenerator,
  territoryGenerator,
  leaderGenerator,
  starterGenerator,
  cardRenderer,
  territoryRenderer,
  workflow,
].join('\n');

describe('durable current-release TTS pipeline', () => {
  it('resolves current authority from the normal release lifecycle and GitHub release contract', () => {
    const current = lifecycle.current_release;
    expect(current).toBeTruthy();
    expect(lifecycle.releases[current]?.status).toBe('current');
    expect(lifecycle.releases[current]?.public_cutover).toBe(true);
    expect(githubReleaseContract.current_release?.tag).toBe(current);
    expect(githubReleaseContract.current_release?.status).toBe('current');

    const canonical = githubReleaseContract.current_release.assets.find((asset: string) => /_Canonical_Data\.json$/i.test(asset));
    const starters = githubReleaseContract.current_release.assets.find((asset: string) => /_Starter_Decks\.json$/i.test(asset));
    expect(canonical).toBeTruthy();
    expect(starters).toBeTruthy();
    expect(existsSync(canonical)).toBe(true);
    expect(existsSync(starters)).toBe(true);

    expect(catalogSource).toContain("const LIFECYCLE_SOURCE = 'config/release-lifecycle.json'");
    expect(catalogSource).toContain("const GITHUB_RELEASE_CONTRACT_SOURCE = 'config/github-release-contract.json'");
    expect(catalogSource).toContain("assets.find((asset) => /_Canonical_Data\\.json$/i.test(asset))");
    expect(catalogSource).toContain("assets.find((asset) => /_Starter_Decks\\.json$/i.test(asset))");
    expect(catalogSource).toContain('Release metadata disagrees');
  });

  it('treats artifact internal build labels as provenance rather than the public release selector', () => {
    expect(catalogSource).toContain('canonicalDataVersion: canonical.version || null');
    expect(catalogSource).not.toContain('canonical.version !== release.version');
    expect(catalogSource).not.toContain('Canonical data version is');
    expect(starterGenerator).toContain('starterDeckDataVersion: starterDecks.version || null');
    expect(starterGenerator).not.toContain('starterDecks.version !==');
  });

  it('contains no release-number literals in the supported TTS pipeline', () => {
    expect(supportedPipelineText).not.toMatch(/v0\.6\.[0-9]+/);
    expect(packageJson.scripts['tts:check']).toBe('node scripts/generate-tts-card-assets.mjs --check && node scripts/generate-tts-territory-assets.mjs --check && node scripts/generate-tts-leader-assets.mjs --check && node scripts/generate-tts-starter-decks.mjs --check');
    expect(packageJson.scripts['tts:catalog']).toBe('node scripts/generate-tts-card-assets.mjs --catalog-only');
    expect(packageJson.scripts['tts:cards']).toBe('node scripts/generate-tts-card-assets.mjs');
    expect(packageJson.scripts['tts:territories']).toBe('node scripts/generate-tts-territory-assets.mjs');
    expect(packageJson.scripts['tts:leaders']).toBe('node scripts/generate-tts-leader-assets.mjs');
    expect(packageJson.scripts['tts:starters']).toBe('node scripts/generate-tts-starter-decks.mjs');
  });

  it('does not duplicate release-specific card, Territory, Leader, or starter-deck counts', () => {
    expect(catalogSource).not.toContain('EXPECTED_COUNTS');
    expect(catalogSource).not.toContain('neutral: 50');
    expect(cardGenerator).not.toContain('128');
    expect(territoryGenerator).not.toContain('Expected 25 canonical Territories');
    expect(territoryGenerator).not.toContain('Expected four canonical Arenas');
    expect(leaderGenerator).not.toMatch(/Expected 12|=== 12|!== 12/);
    expect(starterGenerator).not.toMatch(/Expected 12|=== 12|!== 12/);
    expect(catalogSource).toContain('counts.playableCards = cardsWithArtwork.length');
    expect(catalogSource).toContain('counts.territories = territories.length');
    expect(leaderGenerator).toContain('leaderCount: records.length');
    expect(starterGenerator).toContain('deckCount: decks.length');
  });

  it('uses a generated current alias so browser and manifest consumers do not need a release-path edit', () => {
    expect(catalogSource).toContain("join(ROOT, 'tts', 'generated', 'current')");
    expect(catalogSource).toContain("writeFile(join(CURRENT_ALIAS_ROOT, 'catalog.js'), catalogJs)");
    expect(cardRenderer).toContain('/tts/generated/current/catalog.js');
    expect(territoryRenderer).toContain('/tts/generated/current/catalog.js');
    expect(leaderGenerator).toContain("join(CURRENT_ALIAS_ROOT, 'leader-manifest.json')");
    expect(starterGenerator).toContain("join(CURRENT_ALIAS_ROOT, 'starter-deck-manifest.json')");
  });

  it('renders all six production backs from the shared reviewed component', () => {
    for (const faction of ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']) {
      expect(catalogSource).toContain(`'${faction}'`);
    }
    expect(cardGenerator).toContain('/tts/back-renderer/?faction=');
    expect(cardGenerator).toContain("const file = `backs/${faction}.png`");
    expect(cardGenerator).toContain('prototypeBack: false');
    expect(cardGenerator).not.toContain('prototypeBackHtml');
    expect(backRenderer).toContain('/card-design/card-back.css');
    expect(backRenderer).toContain('/card-design/card-back.js');
  });

  it('records the player-faction back policy without leaking Neutral-card identity', () => {
    expect(cardGenerator).toContain("assignment: 'player-faction'");
    expect(cardGenerator).toContain('neutralCardsUsePlayerFactionBack: true');
    expect(cardGenerator).toContain('backIsHidden: true');
    expect(cardGenerator).toContain('uniqueBack: false');
    expect(starterGenerator).toContain("const backFile = `backs/${faction}.png`");
    expect(starterGenerator).toContain("assignment: 'player-faction'");
    expect(starterGenerator).toContain('neutralCardsUsePlayerFactionBack: true');
    expect(readme).toContain("including Neutral cards");
    expect(readme).toContain("must use that player's faction back");
  });

  it('allows playable, Territory, Leader, and starter-deck counts to grow without a release-specific rewrite', () => {
    expect(cardGenerator).toContain('const sheets = chunk(catalog.playableCards, CARDS_PER_SHEET)');
    expect(territoryGenerator).toContain('const sheetGroups = chunk(catalog.territories, TERRITORIES_PER_SHEET)');
    expect(territoryGenerator).toContain('const deckId = FIRST_DECK_ID + sheetIndex');
    expect(catalogSource).toContain('for (const leader of faction.leaders)');
    expect(leaderGenerator).toContain('for (let index = 0; index < leaders.length; index += 1)');
    expect(starterGenerator).toContain('starterDecks.decks.map((deck) =>');
    expect(readme).toContain('additional sheets/deck IDs created automatically');
    expect(readme).toContain('does not hard-code the number of starter decks or Leaders');
  });

  it('keeps CI release-agnostic and watches release authority changes', () => {
    expect(workflow).toContain("'config/release-lifecycle.json'");
    expect(workflow).toContain("'config/github-release-contract.json'");
    expect(workflow).toContain("'releases/**'");
    expect(workflow).toContain('scripts/tts-current-catalog.mjs');
    expect(workflow).toContain('scripts/generate-tts-leader-assets.mjs');
    expect(workflow).toContain('scripts/generate-tts-starter-decks.mjs');
    expect(workflow).toContain('Generate Leader cards');
    expect(workflow).toContain('Assemble current starter decks');
    expect(workflow).toContain('name: gauntlet-current-tts-card-assets');
    expect(workflow).toContain('path: tts/generated/');
    expect(workflow).not.toMatch(/gauntlet-v0?63|v0\.6\.3/);
  });
});
