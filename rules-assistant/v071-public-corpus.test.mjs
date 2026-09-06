import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';
import { validateV071PublishedData } from './v071-public-corpus.js';

const releaseDir = new URL('../releases/v0.7.1/', import.meta.url);
const rulebookMarkdown = readFileSync(new URL('Gauntlet_v0.7.1_Rulebook.md', releaseDir), 'utf8');
const canonicalData = JSON.parse(readFileSync(new URL('Gauntlet_v0.7.1_Canonical_Data.json', releaseDir), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('Gauntlet_v0.7.1_Manifest.json', releaseDir), 'utf8'));
const provenance = JSON.parse(readFileSync(new URL('Gauntlet_v0.7.1_Source_Provenance.json', releaseDir), 'utf8'));

describe('v0.7.1 public Rules Arbiter corpus', () => {
  test('validates the published package when rule facts interrupt player-facing phrases', () => {
    expect(rulebookMarkdown).toContain(
      'Ratify six<!-- RULE-FACT:diplomats.peace_treaty_threshold:word --> different Proposals'
    );
    expect(rulebookMarkdown).toContain(
      'if six<!-- RULE-FACT:diplomats.peace_treaty_threshold:word --> different Proposals are ratified'
    );

    expect(() => validateV071PublishedData({
      canonicalData,
      manifest,
      provenance,
      rulebookMarkdown
    })).not.toThrow();
  });

  test('still rejects a stale five-Proposal threshold after ignoring rule-fact comments', () => {
    const staleRulebook = rulebookMarkdown.replaceAll(
      'six<!-- RULE-FACT:diplomats.peace_treaty_threshold:word --> different Proposals',
      'five<!-- RULE-FACT:diplomats.peace_treaty_threshold:word --> different Proposals'
    );

    expect(() => validateV071PublishedData({
      canonicalData,
      manifest,
      provenance,
      rulebookMarkdown: staleRulebook
    })).toThrow('Published v0.7.1 Rulebook Peace Treaty threshold is not synchronized to six.');
  });
});
