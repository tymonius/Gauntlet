import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

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
const supplementalRenderer = readFileSync('tts/supplemental-renderer/supplemental-renderer.js', 'utf8');
const backRenderer = readFileSync('tts/back-renderer/index.html', 'utf8');
const workflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');
const readme = readFileSync('tts/README.md', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

const supportedPipelineText = [
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
  supplementalRenderer,
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
    expect(componentValidator).toContain('resolveCurrentTtsRelease');
    expect(componentValidator).toContain('resolveCanonicalSource');
    expect(supplementalGenerator).toContain('resolveCurrentTtsRelease');
    expect(releaseStager).toContain('resolveCurrentTtsRelease');
    expect(savePublisher).toContain('resolveCurrentTtsRelease');
    expect(supplementalAssembler).toContain('resolveCurrentTtsRelease');
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
    expect(packageJson.scripts['tts:components:check']).toBe('node scripts/tts-component-contract.mjs');
    expect(packageJson.scripts['tts:supplementals:check']).toBe('node scripts/generate-tts-supplemental-assets.mjs --check');
    expect(packageJson.scripts['tts:check']).toBe('npm run tts:components:check && npm run tts:supplementals:check && node scripts/generate-tts-card-assets.mjs --check && node scripts/generate-tts-territory-assets.mjs --check && node scripts/generate-tts-leader-assets.mjs --check && node scripts/generate-tts-starter-decks.mjs --check && node scripts/generate-tts-save.mjs --check && node scripts/assemble-tts-supplemental-save.mjs --check');
    expect(packageJson.scripts['tts:catalog']).toBe('node scripts/generate-tts-card-assets.mjs --catalog-only');
    expect(packageJson.scripts['tts:cards']).toBe('node scripts/generate-tts-card-assets.mjs');
    expect(packageJson.scripts['tts:territories']).toBe('node scripts/generate-tts-territory-assets.mjs');
    expect(packageJson.scripts['tts:leaders']).toBe('node scripts/generate-tts-leader-assets.mjs');
    expect(packageJson.scripts['tts:starters']).toBe('node scripts/generate-tts-starter-decks.mjs');
    expect(packageJson.scripts['tts:supplementals']).toBe('node scripts/generate-tts-supplemental-assets.mjs');
    expect(packageJson.scripts['tts:release:stage']).toBe('node scripts/stage-tts-release-assets.mjs');
    expect(packageJson.scripts['tts:save']).toBe('node scripts/generate-tts-save.mjs');
    expect(packageJson.scripts['tts:save:assemble']).toBe('node scripts/assemble-tts-supplemental-save.mjs');
    expect(packageJson.scripts['tts:build']).toBe('npm run tts:components:check && npm run tts:cards && npm run tts:territories && npm run tts:leaders && npm run tts:starters');
    expect(packageJson.scripts['tts:package']).toBe('npm run tts:build && npm run tts:supplementals && npm run tts:release:stage && npm run tts:save && npm run tts:save:assemble');
  });

  it('does not duplicate release-specific card, Territory, Leader, starter-deck, or supplemental counts', () => {
    expect(catalogSource).not.toContain('EXPECTED_COUNTS');
    expect(catalogSource).not.toContain('neutral: 50');
    expect(cardGenerator).not.toContain('128');
    expect(territoryGenerator).not.toContain('Expected 25 canonical Territories');
    expect(territoryGenerator).not.toContain('Expected four canonical Arenas');
    expect(leaderGenerator).not.toMatch(/Expected 12|=== 12|!== 12/);
    expect(starterGenerator).not.toMatch(/Expected 12|=== 12|!== 12/);
    expect(supplementalGenerator).not.toMatch(/Expected 3|=== 3|!== 3/);
    expect(releaseStager).not.toMatch(/Expected 12|=== 12|!== 12/);
    expect(savePublisher).not.toMatch(/Expected 12|=== 12|!== 12/);
    expect(supplementalAssembler).not.toMatch(/Expected 3|=== 3|!== 3|Expected 12|=== 12|!== 12/);
    expect(catalogSource).toContain('counts.playableCards = cardsWithArtwork.length');
    expect(catalogSource).toContain('counts.territories = territories.length');
    expect(leaderGenerator).toContain('leaderCount: records.length');
    expect(starterGenerator).toContain('deckCount: decks.length');
    expect(supplementalGenerator).toContain("component.productionStatus === 'ready'");
    expect(savePublisher).toContain('starters.map((starter, index) => buildStarterKit');
    expect(supplementalAssembler).toContain('for (const starter of starters)');
    expect(supplementalAssembler).toContain('ready.filter((component) => component.faction === starter.factionId)');
  });

  it('uses a generated current alias so browser and manifest consumers do not need a release-path edit', () => {
    expect(catalogSource).toContain("join(ROOT, 'tts', 'generated', 'current')");
    expect(catalogSource).toContain("writeFile(join(CURRENT_ALIAS_ROOT, 'catalog.js'), catalogJs)");
    expect(cardRenderer).toContain('/tts/generated/current/catalog.js');
    expect(territoryRenderer).toContain('/tts/generated/current/catalog.js');
    expect(leaderGenerator).toContain("join(CURRENT_ALIAS_ROOT, 'leader-manifest.json')");
    expect(starterGenerator).toContain("join(CURRENT_ALIAS_ROOT, 'starter-deck-manifest.json')");
    expect(supplementalGenerator).toContain("join(CURRENT_ALIAS_ROOT, 'supplemental-catalog.json')");
    expect(supplementalGenerator).toContain("join(CURRENT_ALIAS_ROOT, 'supplemental-manifest.json')");
    expect(supplementalRenderer).toContain('/tts/generated/current/supplemental-catalog.json');
    expect(savePublisher).toContain("join(CURRENT_ALIAS_ROOT, 'Gauntlet_TTS_Review_Scaffold.json')");
    expect(supplementalAssembler).toContain("join(CURRENT_ALIAS_ROOT, 'Gauntlet_TTS_Review_Scaffold.json')");
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

  it('records the resolved standard-back policy without leaking Neutral-card identity', () => {
    expect(cardGenerator).toContain("policy: 'standardBack'");
    expect(cardGenerator).toContain('neutralCardsUseSameStandardBack: true');
    expect(cardGenerator).toContain('backIsHidden: true');
    expect(cardGenerator).toContain('uniqueBack: false');
    expect(starterGenerator).toContain('resolveStandardBackFile(componentContract, faction)');
    expect(starterGenerator).toContain("policy: 'standardBack'");
    expect(starterGenerator).toContain('neutralCardsUseSameStandardBack: true');
    expect(starterGenerator).toContain('territoriesUseSameStandardBack: true');
    expect(savePublisher).toContain('BackIsHidden: true');
    expect(savePublisher).toContain('UniqueBack: false');
    expect(readme).toContain('Neutral playable cards always use the same standard back as the rest of their player');
    expect(readme).toContain('universal-black');
  });

  it('allows canonical and contract-driven component counts to grow without a release-specific rewrite', () => {
    expect(cardGenerator).toContain('const sheets = chunk(catalog.playableCards, CARDS_PER_SHEET)');
    expect(territoryGenerator).toContain('const sheetGroups = chunk(catalog.territories, TERRITORIES_PER_SHEET)');
    expect(territoryGenerator).toContain('const deckId = FIRST_DECK_ID + sheetIndex');
    expect(catalogSource).toContain('for (const leader of faction.leaders)');
    expect(leaderGenerator).toContain('for (let index = 0; index < leaders.length; index += 1)');
    expect(starterGenerator).toContain('starterDecks.decks.map((deck) =>');
    expect(supplementalGenerator).toContain('for (const component of contract.components || [])');
    expect(releaseStager).toContain('for (const sheet of cardManifest.sheets || [])');
    expect(releaseStager).toContain('for (const leader of leaderManifest.leaders || [])');
    expect(releaseStager).toContain('for (const component of supplementalManifest.ready || [])');
    expect(savePublisher).toContain('const rows = Math.ceil(total / 2)');
    expect(supplementalAssembler).toContain('for (const component of factionComponents)');
    expect(supplementalAssembler).toContain('for (let copy = 0; copy < quantity; copy += 1)');
    expect(readme).toContain('additional sheets/deck IDs created automatically');
    expect(readme).toContain('does not hard-code starter, card, Leader, or Territory counts');
  });

  it('keeps CI release-agnostic and watches release authority changes', () => {
    expect(workflow).toContain("'config/release-lifecycle.json'");
    expect(workflow).toContain("'config/github-release-contract.json'");
    expect(workflow).toContain("'config/tts-component-contract.json'");
    expect(workflow).toContain("'releases/**'");
    expect(workflow).toContain("'artifacts/reconstruction/**/rulebook/**'");
    expect(workflow).toContain("'artifacts/reconstruction/**/faction-guides/**'");
    expect(workflow).toContain('scripts/tts-current-catalog.mjs');
    expect(workflow).toContain('scripts/tts-component-contract.mjs');
    expect(workflow).toContain('scripts/generate-tts-leader-assets.mjs');
    expect(workflow).toContain('scripts/generate-tts-starter-decks.mjs');
    expect(workflow).toContain('scripts/generate-tts-supplemental-assets.mjs');
    expect(workflow).toContain('scripts/stage-tts-release-assets.mjs');
    expect(workflow).toContain('scripts/generate-tts-save.mjs');
    expect(workflow).toContain('scripts/assemble-tts-supplemental-save.mjs');
    expect(workflow).toContain('Generate Leader cards');
    expect(workflow).toContain('Assemble current starter decks');
    expect(workflow).toContain('Generate ready supplemental components');
    expect(workflow).toContain('Stage hosted TTS release assets');
    expect(workflow).toContain('Generate TTS review scaffold');
    expect(workflow).toContain('Assemble ready supplemental components into review scaffold');
    expect(workflow).toContain('name: gauntlet-current-tts-card-assets');
    expect(workflow).toContain('path: tts/generated/');
    expect(workflow).not.toMatch(/gauntlet-v0?63|v0\.6\.3/);
  });
});
