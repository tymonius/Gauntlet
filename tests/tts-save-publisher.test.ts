import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { makeSharedRulebook, starterBagTransform } from '../scripts/generate-tts-save.mjs';

const publisher = readFileSync('scripts/generate-tts-save.mjs', 'utf8');
const validator = readFileSync('tts/validate-current-authoritative-save.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

describe('TTS save publisher', () => {
  it('builds a normal TTS base save from the current starter and hosted-asset manifests', () => {
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

  it('packages each current starter with one three-card Territory stack and a deterministic setup backbone', () => {
    expect(publisher).toContain("objectBase('Bag', `${starter.name} — ${starter.leader.name}`");
    expect(publisher).toContain("objectBase(\n      'DeckCustom'");
    expect(publisher).toContain("objectBase('CardCustom'");
    expect(publisher).toContain("const STARTER_DECK_NOTE_PREFIX = 'gauntlet:starter-deck:'");
    expect(publisher).toContain("const STARTER_TERRITORY_STACK_NOTE_PREFIX = 'gauntlet:starter-territories:'");
    expect(publisher).toContain('const containedObjects = [leader, deck, territoryStack, playerToken, battleDie]');
    expect(publisher).toContain('starter.territories.length !== 3');
    expect(publisher).toContain('ContainedObjects: territories');
    expect(publisher).toContain('starters.map(starter => buildStarterKit');
    expect(publisher).not.toMatch(/Expected 12|=== 12|!== 12/);
  });

  it('parks each faction pair together outside the active board at the recovered positions', () => {
    const starters = [
      { id: 'military-a', factionId: 'military' }, { id: 'military-b', factionId: 'military' },
      { id: 'diplomats-a', factionId: 'diplomats' }, { id: 'diplomats-b', factionId: 'diplomats' },
      { id: 'financiers-a', factionId: 'financiers' }, { id: 'financiers-b', factionId: 'financiers' },
      { id: 'intelligence-a', factionId: 'intelligence' }, { id: 'intelligence-b', factionId: 'intelligence' },
      { id: 'mystics-a', factionId: 'mystics' }, { id: 'mystics-b', factionId: 'mystics' },
      { id: 'inquisition-a', factionId: 'inquisition' }, { id: 'inquisition-b', factionId: 'inquisition' },
    ];

    const expectations = [
      [0, -20.5, -12, 180],
      [1, 20.5, -12, 180],
      [4, -20.5, -2.4, 180],
      [5, 20.5, -2.4, 180],
      [10, -20.5, 12, 180],
      [11, 20.5, 12, 180],
    ] as const;
    for (const [index, x, z, rotY] of expectations) {
      const position = starterBagTransform(starters[index], starters);
      expect(position.posX).toBe(x);
      expect(position.posZ).toBeCloseTo(z, 6);
      expect(position.rotY).toBe(rotY);
    }
  });

  it('adds one shared reader-order Custom PDF Rulebook in the neutral east-center table space', () => {
    const releaseAssets = {
      bySourceFile: {
        'rulebook-reader.pdf': 'https://github.com/tymonius/Gauntlet/releases/download/v0.7.1/Gauntlet_v0.7.1_TTS_Rulebook.pdf?v=123456789abc',
      },
    };

    const rulebook = makeSharedRulebook('v0.7.1', releaseAssets, 'abc123');
    expect(rulebook).toMatchObject({
      Name: 'Custom_PDF',
      Nickname: 'Gauntlet v0.7.1 Rulebook',
      GMNotes: 'gauntlet:shared-rulebook',
      Transform: { posX: 11.4, posZ: 0, rotY: 90, scaleX: 2.55, scaleY: 1, scaleZ: 2.55 },
      CustomPDF: {
        PDFUrl: 'https://github.com/tymonius/Gauntlet/releases/download/v0.7.1/Gauntlet_v0.7.1_TTS_Rulebook.pdf?v=123456789abc',
        PDFPage: 0,
        PDFPageOffset: 0,
      },
    });
    expect(publisher).toContain("const RULEBOOK_READER_SOURCE = 'rulebook-reader.pdf'");
    expect(publisher).toContain('ObjectStates: [rulebook, ...starterKits]');
    expect(validator).toContain("isContentVersionedReleaseAsset(String(rulebook.CustomPDF.PDFUrl || ''), '_TTS_Rulebook.pdf')");
    expect(validator).toContain("approved physical-table scale of 2.55×");
  });

  it('creates the base two-player scaffold before authoritative table layout is applied', () => {
    expect(publisher).toContain("Table: 'Table_Custom'");
    expect(publisher).toContain('TableURL: tableUrl');
    expect(publisher).toContain("Sky: 'Sky_Museum'");
    expect(publisher).toContain('SkyURL: panoramaUrl');
    expect(publisher).toContain("Color: 'White'");
    expect(publisher).toContain("Color: 'Green'");
    expect(publisher).toContain("objectBase('Die_6'");
    expect(publisher).toContain("objectBase('PlayerPawn'");
    expect(publisher).toContain('const territoryZ = [-7.5, -4.5, -1.5, 1.5, 4.5, 7.5]');
    expect(publisher).toContain('Rules remain manual.');
    expect(packageJson.scripts['tts:save']).toContain('tts:save:base');
    expect(packageJson.scripts['tts:save']).toContain('tts:save:layout');
  });

  it('requires content-versioned GitHub Release URLs in the authoritative environment', () => {
    expect(validator).toContain('isContentVersionedReleaseAsset');
    expect(validator).toContain("url.searchParams.get('v')");
    expect(validator).toContain("/^[a-f0-9]{12}$/iu");
    expect(validator).toContain("'_TTS_Environment_Table.png'");
    expect(validator).toContain("'_TTS_Environment_Panorama.png'");
  });

  it('runs staged assets -> save/layout -> supplemental assembly -> validation in that order', () => {
    expect(packageJson.scripts['tts:check']).toContain('generate-tts-save.mjs --check');
    expect(packageJson.scripts['tts:package']).toContain('tts:save:assemble');
    expect(packageJson.scripts['tts:package']).toContain('validate-current-authoritative-save.mjs');
    expect(packageJson.scripts['tts:save:finalize']).toBeUndefined();

    const stage = workflow.indexOf('Stage hosted TTS release assets');
    const save = workflow.indexOf('Generate authoritative TTS review scaffold');
    const assemble = workflow.indexOf('Assemble supplemental starter-kit contents');
    const validate = workflow.indexOf('Validate authoritative current TTS save contract');
    expect(stage).toBeGreaterThan(-1);
    expect(stage).toBeLessThan(save);
    expect(save).toBeLessThan(assemble);
    expect(assemble).toBeLessThan(validate);
    expect(workflow).toContain('run: npm run tts:save');
    expect(workflow).toContain('tts/validate-current-authoritative-save.mjs');
    expect(workflow).not.toContain('tts/validate-v070-authoritative-save.mjs');
    expect(packageJson.scripts['tts:package']).not.toContain('validate-v070-authoritative-save.mjs');
  });

  it('passes its current-release source check', () => {
    const output = execFileSync(process.execPath, ['scripts/generate-tts-save.mjs', '--check'], {
      encoding: 'utf8',
    });
    expect(output).toContain('Current TTS save publisher source check passed');
  });
});
