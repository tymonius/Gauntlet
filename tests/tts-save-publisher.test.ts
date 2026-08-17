import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const publisher = readFileSync('scripts/generate-tts-save.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

describe('TTS save publisher', () => {
  it('builds a normal TTS save from the current starter and hosted-asset manifests', () => {
    expect(publisher).toContain('resolveCurrentTtsRelease');
    expect(publisher).toContain("join(release.outputRoot, 'starter-deck-manifest.json')");
    expect(publisher).toContain('STAGING_ROOT');
    expect(publisher).toContain('releaseAssets?.bySourceFile?.[sourceFile]');
    expect(publisher).not.toMatch(/v0\.6\.[0-9]+/);
  });

  it('translates hosted sheets into TTS CustomDeck state without leaking faction identity', () => {
    expect(publisher).toContain('FaceURL: faceUrl');
    expect(publisher).toContain('BackURL: backUrl');
    expect(publisher).toContain('NumWidth: Number(numWidth)');
    expect(publisher).toContain('NumHeight: Number(numHeight)');
    expect(publisher).toContain('BackIsHidden: true');
    expect(publisher).toContain('UniqueBack: false');
    expect(publisher).toContain('const backUrl = requireHostedUrl(releaseAssets, starter.back.file)');
  });

  it('packages each current starter as a selectable kit with Deck, Leader, and Territories', () => {
    expect(publisher).toContain("objectBase('Bag', `${starter.name} — ${starter.leader.name}`");
    expect(publisher).toContain("objectBase(\n      'DeckCustom'");
    expect(publisher).toContain("objectBase('CardCustom'");
    expect(publisher).toContain('ContainedObjects: [leader, ...territories, deck]');
    expect(publisher).toContain('starters.map((starter, index) => buildStarterKit');
    expect(publisher).not.toMatch(/Expected 12|=== 12|!== 12/);
  });

  it('provides a two-player manual-play table scaffold using only supported built-in objects', () => {
    expect(publisher).toContain("Table: 'Table_RPG'");
    expect(publisher).toContain("Sky: 'Sky_Field'");
    expect(publisher).toContain("Color: 'Red'");
    expect(publisher).toContain("Color: 'Blue'");
    expect(publisher).toContain("objectBase('Die_6'");
    expect(publisher).toContain("objectBase('PlayerPawn'");
    expect(publisher).toContain('const territoryZ = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]');
    expect(publisher).toContain('Rules remain manual.');
  });

  it('is wired after release-asset staging so the save resolves public hosted URLs', () => {
    expect(packageJson.scripts['tts:save']).toBe('node scripts/generate-tts-save.mjs');
    expect(packageJson.scripts['tts:check']).toContain('generate-tts-save.mjs --check');
    expect(workflow.indexOf('Stage hosted TTS release assets')).toBeLessThan(workflow.indexOf('Generate TTS review scaffold'));
    expect(workflow).toContain('run: npm run tts:save');
  });

  it('passes its current-release source check', () => {
    const output = execFileSync(process.execPath, ['scripts/generate-tts-save.mjs', '--check'], {
      encoding: 'utf8',
    });
    expect(output).toContain('Current TTS save publisher source check passed');
  });
});
