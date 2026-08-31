import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const pagesWorkflow = readFileSync('.github/workflows/deploy-pages.yml', 'utf8');
const mediaReadme = readFileSync('media/README.md', 'utf8');
const pagesBoundary = JSON.parse(readFileSync('config/pages-publication-boundary.json', 'utf8'));

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

  it('publishes only the runtime media composition payload from the media authoring tree', () => {
    expect(pagesWorkflow).toContain('"$site/media"');
    expect(pagesWorkflow).toContain('cp media/compositions.json "$site/media/compositions.json"');
    expect(pagesWorkflow).toContain('test -s "$site/media/compositions.json"');
  });

  it('keeps repository-internal source trees out of the Pages artifact', () => {
    for (const root of ['.github', 'config', 'governance', 'scripts', 'src', 'tests', 'workers', 'rulebook-design', 'rulebook-production', 'legacy']) {
      expect(pagesWorkflow).toContain(`"$site/${root}"`);
    }
    expect(pagesWorkflow).toContain('test ! -e "$SITE_DIR/$internal"');
  });

  it('keeps repository metadata and build configuration out of the Pages artifact', () => {
    for (const file of ['.gitignore', 'CONTRIBUTING.md', 'README.md', 'package.json', 'package-lock.json', 'tsconfig.json', 'vitest.config.ts', 'sync-gauntlet.cmd', 'sync-gauntlet.ps1']) {
      expect(pagesWorkflow).toContain(`"$site/${file}"`);
    }
    expect(pagesWorkflow).toContain('test ! -e "$SITE_DIR/$internal_file"');
  });

  it('enforces an explicit top-level Pages publication allowlist', () => {
    expect(pagesWorkflow).toContain("'config/pages-publication-boundary.json'");
    expect(pagesWorkflow).toContain("Unexpected top-level Pages artifact entries");
    expect(pagesWorkflow).toContain("Missing required top-level Pages artifact entries");

    for (const root of ['.github', 'config', 'governance', 'scripts', 'src', 'tests', 'workers', 'rulebook-design', 'rulebook-production', 'legacy']) {
      expect(pagesBoundary.allowedTopLevelEntries).not.toContain(root);
    }

    for (const root of ['index.html', 'game-data', 'media', 'releases', 'start', 'rulebook', 'card-reference', 'factions', 'deckbuilder', 'rules-arbiter', 'playtest']) {
      expect(pagesBoundary.requiredTopLevelEntries).toContain(root);
      expect(pagesBoundary.allowedTopLevelEntries).toContain(root);
    }
  });

  it('preserves the custom domain and enforces the Pages size guard', () => {
    expect(pagesWorkflow).toContain('test "$(tr -d');
    expect(pagesWorkflow).toContain('" = "gauntlet.run"');
    expect(pagesWorkflow).toContain('test "$bytes" -lt 950000000');
  });
});
