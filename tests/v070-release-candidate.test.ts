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

describe('v0.7.0 release candidate boundary', () => {
  it('keeps v0.7.0 out of immutable publication history before cutover', () => {
    expect(lifecycle.current_release).toBe('v0.6.3');
    expect(lifecycle.releases['v0.6.3']).toEqual(expect.objectContaining({
      status: 'current',
      public_cutover: true,
    }));
    expect(lifecycle.releases['v0.7.0']).toBeUndefined();
    expect(githubRelease.historical_releases.some((release: { tag?: string }) => release.tag === 'v0.7.0')).toBe(false);
  });

  it('does not prematurely move the published GitHub Release contract', () => {
    expect(githubRelease.current_release.tag).toBe('v0.6.3');
    expect(githubRelease.current_release.status).toBe('current');
    expect(githubRelease.current_release.notes_file).toBe('docs/releases/github/v0.6.3.md');
  });

  it('keeps the TTS package and manual-QA records aligned to v0.7.0', () => {
    expect(ttsTarget.releaseTag).toBe('v0.7.0');
    expect(ttsTarget.displayVersion).toBe('v0.7.0');
    expect(ttsTarget.status).toBe('release-candidate');
    expect(ttsQa.gameVersion).toBe('v0.7.0');
    expect(ttsQa.status).toBe('pending');
    expect(ttsQa.approvedForWorkshop).toBe(false);
  });

  it('uses draft notes as the pre-publication v0.7.0 release surface', () => {
    expect(notes).toContain('# Gauntlet v0.7.0 — Illustrated Cards & Tabletop Simulator');
    expect(notes).toContain('Release candidate — not yet published');
    expect(notes).toContain('v0.6.3 remains the current published playtest release');
    expect(notes).toContain('Final Workshop publication remains gated');
    expect(notes).toContain('does not change the repository\'s current published release');
    expect(notes).not.toContain('Current canonical playtest edition');
  });
  it('materializes v0.7.0 directly from maintained current authorities', () => {
    expect(releaseBuilder).toContain("readText('rulebook/player-facing/current-rulebook.md')");
    expect(releaseBuilder).not.toContain('applyReleaseCandidateRulebook');
    expect(releaseBuilder).not.toContain('applyFactionFeatureTerminology');
    expect(releaseBuilder).not.toContain('spliceReviewedChapter11');
    expect(releaseBuilder).toContain('faction_feature_taxonomy: structuredClone(manifest.factionFeatureTaxonomy)');
    expect(releaseBuilder).toContain('faction_features: structuredClone(manifest.factionFeatures)');
    expect(releaseBuilder).toContain('leaders: structuredClone(manifest.leaders)');
    expect(releaseBuilder).toContain('![Card anatomy diagram]');
  });

  it('renders the printable Card Anatomy fallback from the live production-card guide', () => {
    expect(bookletRenderer).toContain("import { chromium } from 'playwright'");
    expect(bookletRenderer).toContain("page.goto('http://127.0.0.1:8000/rulebook/?rules=candidate'");
    expect(bookletRenderer).toContain(".card-anatomy-guide.markers-positioned .card-anatomy-figure");
    expect(bookletRenderer).toContain('figure.screenshot({ path: CARD_ANATOMY_PATH })');
    expect(bookletRenderer).toContain("source_card: 'military-unbroken-ranks'");
    expect(materializer).toContain('Gauntlet_v0.7.0_Card_Anatomy.png');
  });

  it('promotes the existing v0.7.0 hosting prerelease only after live verification', () => {
    expect(releasePublisher).toContain("current.tag === 'v0.7.0' && hadCurrentReleaseAtStart");
    expect(releasePublisher).toContain('verifyLive()');
    expect(releasePublisher).toContain("'release', 'edit', current.tag");
    expect(releasePublisher).toContain("'--notes-file', current.notes_file");
    expect(releasePublisher).toContain('the immutable tag target is unchanged');
  });

});
