import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lifecycle = JSON.parse(readFileSync('config/release-lifecycle.json', 'utf8'));
const githubRelease = JSON.parse(readFileSync('config/github-release-contract.json', 'utf8'));
const ttsTarget = JSON.parse(readFileSync('config/tts-release-target.json', 'utf8'));
const ttsQa = JSON.parse(readFileSync('tts/release-qa/v0.7.0.json', 'utf8'));
const notes = readFileSync('docs/releases/github/v0.7.0.md', 'utf8');
const releaseBuilder = readFileSync('scripts/build-v070-release-source.mjs', 'utf8');
const bookletRenderer = readFileSync('scripts/render-v070-booklet.mjs', 'utf8');
const releasePublisher = readFileSync('scripts/publish-github-releases.mjs', 'utf8');
const materializer = readFileSync('.github/workflows/materialize-v070-release-package.yml', 'utf8');
const v070Corpus = readFileSync('rules-assistant/v070-public-corpus.js', 'utf8');
const v070Worker = readFileSync('rules-assistant/worker-v070.js', 'utf8');
const workerEntry = readFileSync('rules-assistant/worker-entry.js', 'utf8');
const arbiterApp = readFileSync('rules-arbiter/app.js', 'utf8');
const arbiterIndex = readFileSync('rules-arbiter/index.html', 'utf8');
const startPage = readFileSync('start/index.html', 'utf8');
const cardReferencePage = readFileSync('card-reference/index.html', 'utf8');
const deckbuilderPage = readFileSync('deckbuilder/index.html', 'utf8');
const homepage = readFileSync('index.html', 'utf8');
const finalizer = readFileSync('scripts/finalize-v070-publication.mjs', 'utf8');
const finalizerWorkflow = readFileSync('.github/workflows/finalize-v070-publication.yml', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

// Shadow validation keeps the real #894 cutover frozen while exercising the same publication machinery.
describe('v0.7.0 historical publication boundary', () => {
  it('preserves v0.7.0 as historical after the v0.7.1 cutover', () => {
    expect(lifecycle.current_release).toBe('v0.7.1');
    expect(lifecycle.releases['v0.7.0']).toEqual(expect.objectContaining({
      status: 'historical',
      public_cutover: false,
      historical_package_path: 'releases/v0.7.0/',
      publication_date: '2026-08-27',
    }));
    expect(lifecycle.releases['v0.6.3']).toEqual(expect.objectContaining({
      status: 'historical',
      public_cutover: false,
      historical_package_path: 'releases/v0.6.3/',
    }));
  });

  it('moves the published GitHub Release contract to v0.7.1 while freezing v0.7.0', () => {
    expect(githubRelease.current_release.tag).toBe('v0.7.1');
    expect(githubRelease.current_release.status).toBe('current');
    expect(githubRelease.current_release.notes_file).toBe('docs/releases/github/v0.7.1.md');
    expect(githubRelease.historical_releases.some((release: { tag?: string; status?: string; target?: string }) =>
      release.tag === 'v0.7.0'
      && release.status === 'historical'
      && release.target === '71020fbb478007538773fc766820197fe8fe1592'
    )).toBe(true);
  });

  it('keeps the TTS package and manual-QA records aligned to v0.7.0', () => {
    expect(ttsTarget.releaseTag).toBe('v0.7.0');
    expect(ttsTarget.displayVersion).toBe('v0.7.0');
    expect(ttsTarget.status).toBe('release-candidate');
    expect(ttsQa.gameVersion).toBe('v0.7.0');
    expect(ttsQa.status).toBe('passed');
    expect(ttsQa.approvedForWorkshop).toBe(true);
  });

  it('publishes final v0.7.0 release notes rather than candidate-boundary notes', () => {
    expect(notes).toContain('# Gauntlet v0.7.0 — Illustrated Cards & Tabletop Simulator');
    expect(notes).toContain('Current playtest release · August 27, 2026');
    expect(notes).toContain('Gauntlet v0.7.0 is the current public playtest edition');
    expect(notes).toContain('The Browser Rulebook now loads the maintained complete v0.7.0 Rulebook authority directly from the published v0.7.0 release package.');
    expect(notes).toContain('Gauntlet v0.7.0 is the **current published playtest release**');
    expect(notes).toContain('steamcommunity.com/sharedfiles/filedetails/?id=3790840635');
    expect(notes).not.toContain('Repository/web cutover in progress');
    expect(notes).not.toContain('v0.6.3 remains the current published playtest release');
    expect(notes).toContain('100-page half-letter booklet');
    expect(notes).toContain('50 Letter-landscape sides on 25 physical sheets');
  });
  it('materializes v0.7.0 directly from maintained current authorities', () => {
    expect(releaseBuilder).toContain("CURRENT_RULEBOOK_SOURCE = 'rulebook/player-facing/current-rulebook.md'");
    expect(releaseBuilder).toContain('loadCurrentGameAuthority()');
    expect(releaseBuilder).toContain('gameplay: clone(authority.gameplay)');
    expect(releaseBuilder).toContain('faction_feature_taxonomy: clone(authority.factionFeatureTaxonomy)');
    expect(releaseBuilder).toContain('faction_features: clone(authority.factionFeatures)');
    expect(releaseBuilder).toContain('leaders: clone(authority.leaders)');
    expect(releaseBuilder).toContain("source_version: authority.version");
    expect(releaseBuilder).toContain('![Card anatomy diagram]');
    expect(releaseBuilder).toContain('![Arcane trait mark example]');
    expect(releaseBuilder).not.toContain('readCurrentJsonSource');
    expect(releaseBuilder).not.toContain('baseGameplay');
    expect(releaseBuilder).not.toContain('cardChanges');
    expect(releaseBuilder).not.toContain('resolveFactionRules(');
    expect(releaseBuilder).not.toContain('resolveCards(');
    expect(releaseBuilder).not.toContain('card_text_overrides');
    expect(releaseBuilder).not.toContain('applyReleaseCandidateRulebook');
    expect(releaseBuilder).not.toContain('applyFactionFeatureTerminology');
    expect(releaseBuilder).not.toContain('spliceReviewedChapter11');
  });

  it('adapts the Browser Rulebook Card Anatomy visuals into separate print figures', () => {
    expect(bookletRenderer).toContain("import { chromium } from 'playwright'");
    expect(bookletRenderer).toContain("page.goto('http://127.0.0.1:8000/rulebook/'");
    expect(bookletRenderer).toContain(".card-anatomy-guide.markers-positioned .card-anatomy-figure");
    expect(bookletRenderer).toContain('arcaneCrop.screenshot({ path: ARCANE_TRAIT_PATH })');
    expect(bookletRenderer).toContain('figure.screenshot({ path: CARD_ANATOMY_PATH })');
    expect(bookletRenderer).not.toContain('browser-card-anatomy-frame');
    expect(bookletRenderer).toContain("source_card: 'military-unbroken-ranks'");
    expect(bookletRenderer).toContain("source_card: 'mystics-witchcraft'");
    expect(bookletRenderer).toContain('static_figures: 2');
    expect(bookletRenderer).toContain('function validateReleaseNotesBookletCounts');
    expect(bookletRenderer).toContain('validateReleaseNotesBookletCounts(logicalPages, bookletPages, physicalSheets);');
    expect(materializer).toContain('Gauntlet_v0.7.0_Card_Anatomy.png');
    expect(materializer).toContain('Gauntlet_v0.7.0_Arcane_Trait_Mark.png');
    expect(materializer).toContain('pull_request:');
    expect(materializer).toContain('peace_treaty_threshold, 6');
    expect(materializer).toContain('Ratify six different Proposals');
    expect(v070Corpus).toContain('peace_treaty_threshold !== 6');
    expect(v070Corpus).toContain('Ratify six different Proposals');
    expect(releaseBuilder).toContain('repairAndValidateFrozenReleaseSources');
    expect(releaseBuilder).toContain('applyV070RulebookCorrections');
    expect(releaseBuilder).toContain('synchronizeKnownRulebookClaims');
    expect(releaseBuilder).toContain('peace_treaty_threshold !== 6');
    expect(releaseBuilder).toContain('if (authority.version !== RELEASE_VERSION)');
  });

  it('keeps final publication explicit, dated, and TTS-gated', () => {
    expect(packageJson.scripts['release:v070:finalize']).toBe('node scripts/finalize-v070-publication.mjs');
    expect(finalizer).toContain("const SOURCE_VERSION = 'v0.7.0'");
    expect(finalizer).toContain('GAUNTLET_PUBLICATION_DATE');
    expect(finalizer).toContain('--publication-date=YYYY-MM-DD');
    expect(finalizer).toContain('loadAndValidateV070TtsManualQa()');
    expect(finalizer).not.toContain("SOURCE_VERSION = 'v0.6.4-candidate'");
    expect(finalizer).not.toContain('const publicationInstant = new Date();');

    expect(finalizerWorkflow).toContain('workflow_dispatch:');
    expect(finalizerWorkflow).toContain("inputs.confirmation == 'publish-v0.7.0'");
    expect(finalizerWorkflow).toContain('ref: release/v0.7.0-cutover');
    expect(finalizerWorkflow).toContain('node scripts/validate-v070-tts-manual-qa.mjs');
    expect(finalizerWorkflow).toContain('GAUNTLET_PUBLICATION_DATE:');
    expect(finalizerWorkflow).toContain('npm run release:v070:finalize');
    expect(finalizerWorkflow).toContain('git push origin HEAD:release/v0.7.0-cutover');
  });

  it('promotes the existing v0.7.0 hosting prerelease only after live verification', () => {
    expect(releasePublisher).toContain("current.tag === 'v0.7.0' && hadCurrentReleaseAtStart");
    expect(releasePublisher).toContain('verifyLive()');
    expect(releasePublisher).toContain("'release', 'edit', current.tag");
    expect(releasePublisher).toContain("'--notes-file', current.notes_file");
    expect(releasePublisher).toContain('the immutable tag target is unchanged');
  });


  it('pins the published v0.7.0 Rules Arbiter to immutable release artifacts', () => {
    expect(v070Corpus).toContain("V070_RULEBOOK_SOURCE_PATH = 'releases/v0.7.0/Gauntlet_v0.7.0_Rulebook.md'");
    expect(v070Corpus).toContain("V070_CANONICAL_SOURCE_PATH = 'releases/v0.7.0/Gauntlet_v0.7.0_Canonical_Data.json'");
    expect(v070Corpus).toContain("V070_MANIFEST_SOURCE_PATH = 'releases/v0.7.0/Gauntlet_v0.7.0_Manifest.json'");
    expect(v070Corpus).toContain("requireBinding(manifest, 'rulebook'");
    expect(v070Corpus).toContain("requireBinding(manifest, 'canonical_data'");
    expect(v070Corpus).not.toContain('loadV064CandidateRulesCorpus');
    expect(v070Corpus).not.toContain('game-data/current-game.json');
  });

  it('preserves the versioned v0.7.0 Rules Arbiter while the unversioned route advances to v0.7.1', () => {
    expect(v070Worker).toContain('export const RULES_VERSION = V070_RULES_VERSION');
    expect(v070Worker).toContain('current canonical v0.7.0 playtest edition');
    expect(workerEntry).toContain('import v070Worker from "./worker-v070.js";');
    expect(workerEntry).toContain('import worker from "./worker-v071.js";');
    expect(workerEntry).toContain('requestedVersion === "v0.7.0"');
    expect(workerEntry).toContain('url.pathname === "/api/v070/rules"');
    expect(workerEntry).toContain('url.pathname === "/api/v071/rules"');
    expect(arbiterApp).toContain('../rules-assistant/v071-public-corpus.js');
    expect(arbiterApp).toContain('const CURRENT_PUBLIC_RELEASE = "v0.7.1";');
  });

  it('advances the public player surfaces to v0.7.1 without rewriting the frozen v0.7.0 package', () => {
    expect(homepage).toContain('Current canonical playtest edition · v0.7.1');
    expect(homepage).toContain('<dt>142</dt><dd>Playable cards</dd>');
    expect(homepage).toContain('<h3>v0.7.1 Release</h3>');
    expect(startPage).toContain('canonical v0.7.1');
    expect(cardReferencePage).toContain('Current v0.7.1 production card reference.');
    expect(cardReferencePage).toContain('v0.7.1 Release');
    expect(deckbuilderPage).toContain('Gauntlet v0.7.1 Deckbuilder');
    expect(deckbuilderPage).toContain('canonical v0.7.1');
    expect(arbiterIndex).toContain('Gauntlet v0.7.1 Rules Arbiter');
    expect(arbiterIndex).toContain('Rules support · v0.7.1');
  });

});
