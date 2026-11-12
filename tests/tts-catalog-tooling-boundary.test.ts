import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import * as canonical from '../tools/tts/tts-current-catalog.mjs';
import * as compatibility from '../scripts/tts-current-catalog.mjs';

describe('TTS catalog tooling source boundary', () => {
  it('forwards the entire API as identical exports for TTS and card-media callers', () => {
    expect(Object.keys(compatibility).sort()).toEqual(Object.keys(canonical).sort());
    for (const [name, value] of Object.entries(canonical)) {
      expect((compatibility as Record<string, unknown>)[name]).toBe(value);
    }
  });

  it('preserves the repository root and the same current/versioned TTS output paths', async () => {
    expect(canonical.ROOT).toBe(resolve('.'));
    expect(canonical.CURRENT_ALIAS_ROOT).toBe(resolve('tts/generated/current'));
    const published = await canonical.resolvePublishedTtsRelease();
    const current = await canonical.resolveCurrentTtsRelease();
    expect(current.outputRoot).toBe(resolve('tts/generated', current.version));
    expect(published.outputRoot).toBe(resolve('tts/generated', published.version));
    expect(current.currentGameSource).toBe('packages/game-data/current-game.json');
  });

  it('produces identical catalogs for the maintained module and the existing public import', async () => {
    expect(await compatibility.buildCatalog()).toEqual(await canonical.buildCatalog());
  });

  it('keeps one implementation and triggers both TTS and Pages from either source location', () => {
    const shim = readFileSync('scripts/tts-current-catalog.mjs', 'utf8');
    const canonicalSource = readFileSync('tools/tts/tts-current-catalog.mjs', 'utf8');
    const ttsWorkflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');
    const pagesWorkflow = readFileSync('.github/workflows/deploy-pages.yml', 'utf8');
    const cardAuthorityWorkflow = readFileSync('.github/workflows/card-authority.yml', 'utf8');
    expect(shim).toContain("export * from '../tools/tts/tts-current-catalog.mjs'");
    expect(shim).not.toContain('function buildCatalog');
    expect(canonicalSource).toContain("new URL('../..', import.meta.url)");
    expect(canonicalSource).toContain("from '../../packages/game-data/art-direction.mjs'");
    for (const workflow of [ttsWorkflow, pagesWorkflow]) {
      expect(workflow).toContain("'scripts/tts-current-catalog.mjs'");
      expect(workflow).toContain("'tools/tts/tts-current-catalog.mjs'");
    }
    expect(ttsWorkflow).toContain('scripts/tts-current-catalog.mjs|tools/tts/tts-current-catalog.mjs');
    expect(cardAuthorityWorkflow).toContain("'tools/tts/tts-current-catalog.mjs'");
    for (const mediaGenerator of [
      'scripts/generate-card-media-assets.mjs',
      'scripts/generate-card-media-compositions.mjs',
    ]) {
      expect(readFileSync(mediaGenerator, 'utf8')).toContain("from './tts-current-catalog.mjs'");
    }
  });
});
