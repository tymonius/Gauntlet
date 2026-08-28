import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const baseSource = read('artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md');
const chapter11 = read('rulebook/player-facing/chapter-11.md');
const currentRulebook = read('rulebook/player-facing/current-rulebook.md');
const index = read('rulebook/index.html');
const app = read('rulebook/app.js');
const rulesetStyles = read('rulebook/ruleset-toggle.css');
const universalReference = read('card-design/reference-copy/v0.6.3/universal-reference.md');
const diplomatReference = read('card-design/reference-copy/v0.6.3/diplomat-reference.md');

function publicReleasedSource() {
  const startMarker = '# 11. Detailed Card and Timing Rules';
  const endMarker = '# 12. Overlays and Other Shared Card Rules';
  const source = baseSource
    .replace('**Version 0.6.3 — Clean Reconstruction Candidate**', '**Version 0.6.3**')
    .replace(/^> \*\*Authority candidate, not current\/public rules\.\*\*[^\n]*\n\n/m, '');
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return `${source.slice(0, start)}${chapter11.trim()}\n\n${source.slice(end)}`;
}

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
    expect(index).toContain('../releases/v0.7.0/Gauntlet_v0.7.0_Rulebook_Booklet.pdf?rev=419138bb');
    expect(index).not.toContain('Gauntlet v0.6.3 Browser Rulebook');

    expect(app).toContain("const SOURCE_URL = '../releases/v0.7.0/Gauntlet_v0.7.0_Rulebook.md';");
    expect(app).toContain("const SOURCE_SHA256 = '7027ef7fe7dcfd59cf43ae9f68d2bd2760667a128839a8b4f141559328f2c653';");
    expect(app).toContain("const PDF_URL = '../releases/v0.7.0/Gauntlet_v0.7.0_Rulebook_Booklet.pdf?rev=419138bb';");
    expect(app).toContain('eyebrow.textContent = `Canonical rules · version ${PUBLISHED_VERSION}`');
    expect(app).not.toContain("eyebrow.textContent = 'Canonical rules · version 0.6.3'");
    expect(app).toContain("crypto.subtle.digest('SHA-256', bytes)");
  });

  it('keeps the maintained v0.7.1 candidate source separate from the published v0.7.0 Rulebook', () => {
    const released = publicReleasedSource();
    expect(released).toMatch(/\bpending(?:-|\s+)battle\b/i);

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
