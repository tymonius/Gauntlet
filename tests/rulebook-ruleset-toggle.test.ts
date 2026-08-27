import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const baseSource = read('artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md');
const chapter11 = read('rulebook/player-facing/chapter-11.md');
const currentRulebook = read('rulebook/player-facing/current-rulebook.md');
const index = read('rulebook/index.html');
const app = read('rulebook/app.js');
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

describe('Browser Rulebook ruleset selector', () => {
  it('keeps released v0.6.3 as the verified default and exposes a shareable candidate mode', () => {
    expect(index).toContain('data-ruleset="released" aria-pressed="true"');
    expect(index).toContain('data-ruleset="candidate" aria-pressed="false"');
    expect(index).toContain('Release candidate');
    expect(index).toContain('ruleset-toggle.css');
    expect(index).not.toContain('data-print-rulebook');
    expect(app).toContain("params.get('rules') === CANDIDATE_MODE");
    expect(app).toContain("url.searchParams.set('rules', CANDIDATE_MODE)");
    expect(app).toContain("url.searchParams.delete('rules')");
    expect(app).toContain("const SOURCE_SHA256 = '7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643';");
    expect(app).toContain("crypto.subtle.digest('SHA-256', bytes)");
  });

  it('loads the maintained current Rulebook directly instead of projecting it from v0.6.3 at runtime', () => {
    const released = publicReleasedSource();
    expect(released).toMatch(/\bpending(?:-|\s+)battle\b/i);

    expect(app).toContain("const CURRENT_SOURCE_URL = './player-facing/current-rulebook.md';");
    expect(app).toContain('loadCurrentRulebookSource()');
    expect(app).not.toContain("import { applyReleaseCandidateRulebook } from './release-candidate.js';");
    expect(app).not.toContain('applyReleaseCandidateRulebook(releasedMarkdown, currentGame)');

    expect(currentRulebook).toContain('**Version 0.7.0**');
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
