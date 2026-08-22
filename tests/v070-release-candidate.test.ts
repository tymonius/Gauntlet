import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lifecycle = JSON.parse(readFileSync('config/release-lifecycle.json', 'utf8'));
const githubRelease = JSON.parse(readFileSync('config/github-release-contract.json', 'utf8'));
const ttsTarget = JSON.parse(readFileSync('config/tts-release-target.json', 'utf8'));
const ttsQa = JSON.parse(readFileSync('tts/release-qa/v0.7.0.json', 'utf8'));
const notes = readFileSync('docs/releases/github/v0.7.0.md', 'utf8');

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
    expect(ttsTarget.version).toBe('v0.7.0');
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
});
