import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const lifecycle = JSON.parse(readFileSync('config/release-lifecycle.json', 'utf8'));
const homepage = readFileSync('index.html', 'utf8');
const ttsSection = readFileSync('homepage-tts.js', 'utf8');
const faq = readFileSync('apps/faq/index.html', 'utf8');
const playtest = readFileSync('apps/playtest/index.html', 'utf8');

describe('public TTS Workshop release copy', () => {
  it('announces the current published release consistently on the homepage', () => {
    const version = lifecycle.current_release;
    expect(version).toBe('v0.7.2');
    expect(ttsSection).toContain(`<span>${version}</span> · Live on Steam Workshop`);
    expect(ttsSection).toContain(`Gauntlet ${version} is available on the Steam Workshop`);
    expect(ttsSection).not.toContain('v0.7.0');
    expect(ttsSection).not.toContain('v0.7.1');
    expect(homepage).toContain('src="homepage-tts.js?v=20260923-1"');
  });

  it('keeps the FAQ and Playtest page aligned with the published Workshop mod', () => {
    const version = lifecycle.current_release;
    expect(faq).toContain(`Workshop mod</a> supports ${version}`);
    expect(playtest).toContain(`The public Tabletop Simulator Workshop mod is updated to ${version}.`);
    expect(playtest).toContain('the updated Tabletop Simulator Workshop mod');
    for (const page of [faq, playtest]) {
      expect(page).not.toContain('v0.7.0');
      expect(page).not.toContain('v0.7.1');
    }
    expect(playtest).not.toContain('follows its separate publication gate');
  });
});
