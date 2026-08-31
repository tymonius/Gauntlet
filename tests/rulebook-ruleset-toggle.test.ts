import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFileSync(path, 'utf8');
const hash = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex');
const releaseManifest = JSON.parse(read('releases/v0.7.1/Gauntlet_v0.7.1_Manifest.json'));
const publishedRulebookPath = releaseManifest.binding_sources.rulebook.path;
const publishedRulebook = read(publishedRulebookPath);
const currentRulebook = read('rulebook/player-facing/current-rulebook.md');
const index = read('rulebook/index.html');
const app = read('rulebook/app.js');
const rulesetStyles = read('rulebook/ruleset-toggle.css');

describe('Published v0.7.1 Browser Rulebook', () => {
  it('publishes v0.7.1 by default and hides the candidate switch when no distinct candidate exists', () => {
    expect(index).toContain('data-ruleset-switch hidden');
    expect(index).toContain('data-ruleset="released" aria-pressed="true"');
    expect(index).toContain('data-ruleset="candidate" aria-pressed="false"');
    expect(app).toContain("const PUBLISHED_VERSION = 'v0.7.1';");
    expect(app).toContain('candidateVersion !== PUBLISHED_VERSION');
    expect(app).toContain('rulesetSwitch.hidden = !distinctCandidate');
    expect(rulesetStyles).toContain('.ruleset-switch[hidden]');
    expect(index).toContain('../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook_Booklet.pdf');
  });

  it('binds the released browser view to the immutable v0.7.1 manifest', () => {
    expect(releaseManifest.release_version).toBe('v0.7.1');
    expect(hash(publishedRulebookPath)).toBe(releaseManifest.binding_sources.rulebook.sha256);
    expect(app).toContain("const RELEASE_MANIFEST_URL = '../releases/v0.7.1/Gauntlet_v0.7.1_Manifest.json';");
    expect(app).toContain('manifest?.binding_sources?.rulebook');
    expect(app).toContain("crypto.subtle.digest('SHA-256', bytes)");
    expect(app).toContain('actualHash !== rulebook.sha256');
    expect(app).toContain('booklet.sha256.slice(0, 8)');
  });

  it('keeps maintained current authority identical to the published v0.7.1 rules identity', () => {
    expect(currentRulebook).toContain('**Version 0.7.1**');
    expect(currentRulebook).not.toContain('**Version 0.7.1 Candidate**');
    expect(currentRulebook).toContain('# 5. Actions, Faction Features, Leader Abilities, and Assets');
    expect(currentRulebook).toContain('## Card anatomy');
    expect(currentRulebook).toContain('Terms occur during Onset');
    expect(currentRulebook.replace(/<!--.*?-->/g, '')).toContain('Ratify six different Proposals');
    expect(currentRulebook).not.toMatch(/\bpending(?:-|\s+)battle\b/i);
    expect(currentRulebook).not.toMatch(/\bFaction Actions?\b|\bFaction Abilit(?:y|ies)\b|\bfaction procedure\b/i);
    expect(publishedRulebook).toContain('Rite of Equivalence');
  });
});
