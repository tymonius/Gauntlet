import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const stager = readFileSync('scripts/stage-tts-release-assets.mjs', 'utf8');
const environmentGenerator = readFileSync('scripts/generate-tts-environment-assets.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const readme = readFileSync('tts/README.md', 'utf8');

describe('TTS GitHub Release asset hosting', () => {
  it('uses the two TTS-owned PNG environment sources without re-encoding them', () => {
    expect(environmentGenerator).toContain("join(ENVIRONMENT_SOURCE_ROOT, 'command-map-table.png')");
    expect(environmentGenerator).toContain("join(ENVIRONMENT_SOURCE_ROOT, 'command-tent-panorama.png')");
    expect(environmentGenerator).toContain('copyFile(source, destination)');
    expect(environmentGenerator).not.toContain('sharp');
    expect(environmentGenerator).not.toContain('playwright');
    expect(environmentGenerator).not.toContain('images/artwork/site');
    expect(workflow).toContain('tts/assets/environment/*');
    expect(workflow).not.toContain('images/artwork/site/gauntlet-command-tent-gameplay-painting.webp');
  });

  it('stages generated network assets plus the two static TTS environment images', () => {
    expect(stager).toContain('resolveCurrentTtsRelease');
    expect(stager).toContain("readJson(join(outputRoot, 'manifest.json'))");
    expect(stager).toContain("readJson(join(outputRoot, 'territory-manifest.json'))");
    expect(stager).toContain("readJson(join(outputRoot, 'leader-manifest.json'))");
    expect(stager).toContain("readJson(join(outputRoot, 'starter-deck-manifest.json'))");
    expect(stager).toContain("'environment/campaign-map-table.png'");
    expect(stager).toContain("'environment/command-tent-panorama.png'");
    expect(stager).toContain('for (const sheet of cardManifest.sheets || [])');
    expect(stager).toContain('Object.entries(cardManifest.backVariants || {})');
    expect(stager).toContain('for (const sheet of territoryManifest.sheets || [])');
    expect(stager).toContain('for (const leader of leaderManifest.leaders || [])');
    expect(stager).not.toContain("join(outputRoot, 'cards')");
    expect(stager).not.toContain("join(outputRoot, 'territories')");
  });

  it('gives every staged file a deterministic current-release download URL and digest', () => {
    expect(stager).toContain('https://github.com/${repository}/releases/download/${tag}/');
    expect(stager).toContain("createHash('sha256')");
    expect(stager).toContain('bytes: info.size');
    expect(stager).toContain('sha256: await sha256(sourcePath)');
    expect(stager).toContain('bySourceFile: Object.fromEntries');
    expect(stager).toContain("host: 'github-release-assets'");
    expect(stager).not.toMatch(/v0\.6\.[0-9]+/);
  });

  it('uses deterministic release-safe names for every TTS network asset family without creating a Territory-specific back', () => {
    expect(stager).toContain('_Playable_Sheet_');
    expect(stager).toContain('_Back_');
    expect(stager).toContain('_Territory_Sheet_');
    expect(stager).toContain('Environment_Table.png');
    expect(stager).toContain('Environment_Panorama.png');
    expect(stager).not.toContain('_Territory_Back.png');
    expect(stager).toContain("if (territoryManifest.backPolicy !== 'standardBack')");
    expect(stager).toContain('_Leader_');
    expect(stager).toContain('_Card_Manifest.json');
    expect(stager).toContain('_Territory_Manifest.json');
    expect(stager).toContain('_Leader_Manifest.json');
    expect(stager).toContain('_Starter_Deck_Manifest.json');
    expect(stager).toContain('_Release_Assets.json');
  });

  it('keeps publication an explicit main-branch workflow action', () => {
    expect(packageJson.scripts['tts:release:stage']).not.toContain('ensure-current-mystics-assets.mjs');
    expect(packageJson.scripts['tts:release:stage']).toContain('npm run tts:environment');
    expect(packageJson.scripts['tts:release:stage']).toContain('node scripts/stage-tts-release-assets.mjs');
    expect(workflow).toContain('publish_release_assets:');
    expect(workflow).toContain("if: github.event_name == 'workflow_dispatch' && inputs.publish_release_assets && github.ref == 'refs/heads/main'");
    expect(workflow).toContain('name: Stage hosted TTS release assets');
    expect(workflow).toContain('run: npm run tts:release:stage');
    expect(workflow).toContain("gh release view \"$tag\" --repo \"$repo\"");
    expect(workflow).toContain("gh release upload \"$tag\" --repo \"$repo\" --clobber");
    const productionPublish = workflow.slice(workflow.indexOf('  publish:'));
    expect(productionPublish).not.toContain('gh release create');
    expect(workflow).toContain('name: Publish TTS PR preview assets');
    expect(workflow).toContain('Prepare immutable PR-preview asset URLs');
    expect(workflow).toContain('preview_tag="tts-${version}-qa-pr-${PR_NUMBER}-${HEAD_SHA:0:12}"');
    expect(workflow).toContain('gh release create "$PREVIEW_TAG"');
  });

  it('verifies hosted URLs after upload without moving the release tag', () => {
    expect(workflow).toContain('Verify published TTS asset URLs');
    expect(workflow).toContain("fetch(asset.url, { redirect: 'follow' })");
    expect(workflow).toContain('Verified ${manifest.assets.length} hosted TTS asset URLs');
    expect(stager).toContain('The release tag itself is not moved.');
    expect(readme).toContain('GitHub Release asset hosting');
    expect(readme).toContain('Publication remains explicit');
  });
});
