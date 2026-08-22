import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lifecycle = JSON.parse(readFileSync('config/release-lifecycle.json', 'utf8'));
const githubRelease = JSON.parse(readFileSync('config/github-release-contract.json', 'utf8'));
const ttsTarget = JSON.parse(readFileSync('config/tts-release-target.json', 'utf8'));
const ttsQa = JSON.parse(readFileSync('tts/release-qa/v0.7.0.json', 'utf8'));
const notes = readFileSync('docs/releases/github/v0.7.0.md', 'utf8');

describe('v0.7.0 release candidate boundary', () => {
  it('registers v0.7.0 as a candidate without changing the current published release', () => {
    expect(lifecycle.current_release).toBe('v0.6.3');
    expect(lifecycle.releases['v0.6.3']).toEqual(expect.objectContaining({
      status: 'current',
      public_cutover: true,
    }));
    expect(lifecycle.releases['v0.7.0']).toEqual(expect.objectContaining({
      status: 'candidate',
      public_cutover: false,
      artifacts_preserved: false,
      candidate_notes_path: 'docs/releases/github/v0.7.0.md',
      tts_release_target: 'v0.7.0',
      release_gate_issue: 851,
    }));
  });

  it('does not prematurely move the published GitHub Release contract', () => {
    expect(githubRelease.current_release.tag).toBe('v0.6.3');
    expect(githubRelease.current_release.status).toBe('current');
    expect(githubRelease.current_release.notes_file).toBe('docs/releases/github/v0.6.3.md');
  });

  it('keeps the TTS package and manual-QA records aligned to v0.7.0', () => {
    expect(ttsTarget.version).toBe('v0.7.0');
    expect(ttsQa.gameVersion).toBe('v0.7.0');
    expect(ttsQa.status).toBe('pending');
    expect(ttsQa.approvedForWorkshop).toBe(false);
  });

  it('labels the release notes as candidate-only and preserves the publication boundary', () => {
    expect(notes).toContain('# Gauntlet v0.7.0 — Illustrated Cards & Tabletop Simulator');
    expect(notes).toContain('Release candidate — not yet published');
    expect(notes).toContain('v0.6.3 remains the current published playtest release');
    expect(notes).toContain('Final Workshop publication remains gated');
    expect(notes).not.toContain('Current canonical playtest edition');
  });
});
