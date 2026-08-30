import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const releaseManifest = JSON.parse(read('releases/v0.7.0/Gauntlet_v0.7.0_Manifest.json'));
const publishedRulebookPath = releaseManifest.binding_sources.rulebook.path;
const publishedRulebook = read(publishedRulebookPath);
const currentRulebook = read('rulebook/player-facing/current-rulebook.md');
const visibleCurrentRulebook = currentRulebook.replace(/<!--\s*RULE-FACT:[\s\S]*?-->/g, '');
const index = read('rulebook/index.html');
const app = read('rulebook/app.js');
const rulesetStyles = read('rulebook/ruleset-toggle.css');
const universalReference = read('card-design/reference-copy/v0.6.3/universal-reference.md');
const diplomatReference = read('card-design/reference-copy/v0.6.3/diplomat-reference.md');

describe('Published Browser Rulebook', () => {
  it('publishes v0.7.0 by default while exposing the distinct v0.7.1 candidate', () => {
    expect(index).toContain('data-ruleset-switch hidden');
    expect(index).toContain('data-ruleset="released" aria-pressed="true"');
    expect(index).toContain('data-ruleset="candidate" aria-pressed="false"');
    expect(index).not.toContain('data-ruleset="candidate" aria-pressed="false" hidden disabled');
    expect(index).toContain('data-candidate-version>v0.7.1 candidate</strong>');
    expect(app).toContain('candidateVersion !== PUBLISHED_VERSION');
    expect(app).toContain('rulesetSwitch.hidden = !distinctCandidate');
    expect(app).toContain("url.searchParams.get('rules') === CANDIDATE_MODE");
    expect(rulesetStyles).toContain('.ruleset-switch[hidden]');
    expect(rulesetStyles).toContain('display: none !important;');
    expect(index).toContain('../releases/v0.7.0/Gauntlet_v0.7.0_Rulebook_Booklet.pdf');
    expect(index).not.toContain('?rev=419138bb');
    expect(index).not.toContain('Gauntlet v0.6.3 Browser Rulebook');

    expect(app).toContain("const RELEASE_MANIFEST_URL = '../releases/v0.7.0/Gauntlet_v0.7.0_Manifest.json';");
    expect(app).toContain('manifest?.binding_sources?.rulebook');
    expect(app).toContain("crypto.subtle.digest('SHA-256', bytes)");
    expect(app).toContain('actualHash !== rulebook.sha256');
    expect(app).toContain('booklet.sha256.slice(0, 8)');
    expect(app).toContain('eyebrow.textContent = `Canonical rules · version ${PUBLISHED_VERSION}`');
    expect(app).not.toContain('SOURCE_SHA256');
    expect(app).not.toContain('CHAPTER_11_URL');
    expect(app).not.toContain('applyV070RulebookCorrections');
    expect(app).not.toContain('normalizeV063LastStandText');
  });

  it('binds the released browser view to the published v0.7.0 manifest', () => {
    expect(releaseManifest.release_version).toBe('v0.7.0');
    expect(hash(publishedRulebookPath)).toBe(releaseManifest.binding_sources.rulebook.sha256);
    expect(publishedRulebook).toContain('# 11. Detailed Card and Timing Rules');
    expect(publishedRulebook).toContain('# 12. Overlays and Other Shared Card Rules');

    expect(app).toContain('loadReleaseManifest()');
    expect(app).toContain('releasePackagePath(manifest, rulebook.path)');
    expect(app).toContain("fetch(sourceUrl, { cache: 'no-store' })");
    expect(app).toContain('return new TextDecoder().decode(bytes);');
    expect(app).not.toContain('replacePlayerFacingChapter11');
    expect(app).not.toContain('publicRulebookSource');
  });

  it('keeps the maintained v0.7.1 candidate source separate from the published v0.7.0 Rulebook', () => {
    expect(app).toContain("const CURRENT_SOURCE_URL = './player-facing/current-rulebook.md';");
    expect(app).toContain('loadCurrentRulebookSource(currentGame)');
    expect(app).not.toContain("import { applyReleaseCandidateRulebook } from './release-candidate.js';");
    expect(app).not.toContain('applyReleaseCandidateRulebook(releasedMarkdown, currentGame)');

    expect(currentRulebook).toContain('**Version 0.7.1 Candidate**');
    expect(app).toContain("match(/^v(\\d+\\.\\d+\\.\\d+)-candidate$/i)");
    expect(app).toContain('Current Rulebook source does not match current-game authority');
    expect(currentRulebook).toContain('# 5. Actions, Faction Features, Leader Abilities, and Assets');
    expect(currentRulebook).toContain('## Card anatomy');
    expect(currentRulebook).toContain('Onset is the first phase of the battle sequence.');
    expect(currentRulebook).toContain('Terms occur during Onset');
    expect(currentRulebook).toContain('Withdrawal during Onset ends the battle sequence');
    expect(visibleCurrentRulebook).toContain('Ratify six different Proposals');
    expect(visibleCurrentRulebook).toContain('if six different Proposals are ratified');
    expect(visibleCurrentRulebook).not.toContain('five different Proposals');
    expect(currentRulebook).not.toMatch(/\bpending(?:-|\s+)battle\b/i);
    expect(currentRulebook).not.toMatch(/\bFaction Actions?\b|\bFaction Abilit(?:y|ies)\b|\bfaction procedure\b/i);
  });

  it('keeps the current Universal and Diplomat reference cards on the same Onset model', () => {
    for (const copy of [universalReference, diplomatReference]) {
      expect(copy).toContain('Gauntlet v0.6.4 Candidate');
      expect(copy).not.toMatch(/\bpending(?:-|\s+)battle\b/i);
      expect(copy).not.toMatch(/\bbefore Onset\b/i);
    }
    expect(universalReference).toContain("it initiates a battle and immediately enters **Onset**");
    expect(diplomatReference).toContain('During **Onset**');
    expect(diplomatReference).toContain('Continue **Onset**; if the battle proceeds, continue to **Gambits**.');
  });
});
