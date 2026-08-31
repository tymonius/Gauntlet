import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pagesWorkflow = readFileSync('.github/workflows/deploy-pages.yml', 'utf8');
const mediaReadme = readFileSync('media/README.md', 'utf8');

describe('GitHub Pages public media contract', () => {
  it('publishes the canonical promotional spread on gauntlet.run without committing the generated raster', () => {
    expect(pagesWorkflow).toContain('npm run media:build -- --profile=website --strict-art');
    expect(pagesWorkflow).toContain('media/generated/v0.6.2/compositions/website/png/all-factions-promotional-showcase.png');
    expect(pagesWorkflow).toContain('$SITE_DIR/images/media/all-factions-promotional-showcase.png');
    expect(mediaReadme).toContain('https://gauntlet.run/images/media/all-factions-promotional-showcase.png');
  });

  it('publishes through the official GitHub Pages artifact path instead of the retired Cloudflare Worker', () => {
    expect(pagesWorkflow).toContain('actions/upload-pages-artifact@v4');
    expect(pagesWorkflow).toContain('actions/deploy-pages@v4');
    expect(pagesWorkflow).toContain('pages: write');
    expect(pagesWorkflow).toContain('id-token: write');
    expect(pagesWorkflow).not.toContain('wrangler');
    expect(pagesWorkflow).not.toContain('workers.dev');
    expect(existsSync('.github/workflows/deploy-public-media.yml')).toBe(false);
    expect(existsSync('workers/public-media/src/index.js')).toBe(false);
    expect(existsSync('workers/public-media/wrangler.toml')).toBe(false);
  });

  it('keeps the approved v0.7.0 TTS paths on the gauntlet.run Pages artifact', () => {
    expect(pagesWorkflow).toContain('TTS_RELEASE_TAG: tts-v0.7.0-qa-pr-917-68247f095969');
    expect(pagesWorkflow).toContain('TTS_PUBLIC_PREFIX: https://gauntlet.run/tts/v0.7.0/assets/917/');
    expect(pagesWorkflow).toContain('Gauntlet_v0.7.0_TTS_Mod.json');
    expect(pagesWorkflow).toContain('test "$count" -eq 83');
  });

  it('keeps repository-internal source trees out of the Pages artifact', () => {
    for (const root of ['.github', 'governance', 'scripts', 'src', 'tests', 'workers', 'rulebook-design', 'rulebook-production', 'legacy']) {
      expect(pagesWorkflow).toContain(`"$site/${root}"`);
    }
    expect(pagesWorkflow).toContain('test ! -e "$SITE_DIR/$internal"');
  });

  it('preserves the custom domain and enforces the Pages size guard', () => {
    expect(pagesWorkflow).toContain('test "$(tr -d');
    expect(pagesWorkflow).toContain('" = "gauntlet.run"');
    expect(pagesWorkflow).toContain('test "$bytes" -lt 950000000');
  });
});
