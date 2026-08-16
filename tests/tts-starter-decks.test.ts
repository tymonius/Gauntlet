import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const assembler = readFileSync('scripts/generate-tts-starter-decks.mjs', 'utf8');
const catalogSource = readFileSync('scripts/tts-current-catalog.mjs', 'utf8');
const workflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));
const readme = readFileSync('tts/README.md', 'utf8');

describe('TTS starter-deck assembly', () => {
  it('loads starter decks and Leaders through current release authority instead of a versioned path', () => {
    expect(catalogSource).toContain('export async function loadCurrentStarterDecks()');
    expect(catalogSource).toContain('export async function loadCurrentLeaders()');
    expect(catalogSource).toContain('/_Starter_Decks\\.json$/i');
    expect(assembler).toContain('loadCurrentStarterDecks');
    expect(assembler).toContain('loadCurrentLeaders');
    expect(assembler).not.toMatch(/v0\.6\.[0-9]+/);
  });

  it('validates the published construction contract against canonical cards, Territories, and Leaders', () => {
    expect(assembler).toContain('construction.minimumCards');
    expect(assembler).toContain('construction.maximumDeckbuildingValue');
    expect(assembler).toContain('construction.uniqueCopyLimit');
    expect(assembler).toContain('construction.territoryCount');
    expect(assembler).toContain('construction.maximumArenas');
    expect(assembler).toContain("card.faction !== 'neutral' && card.faction !== faction");
    expect(assembler).toContain('references unknown ${faction} Leader');
    expect(assembler).toContain('recommended Territory order does not contain exactly its selected Territories');
  });

  it('joins starter contents to the exact generated card, Territory, and Leader manifests', () => {
    expect(assembler).toContain("readFile(join(outputRoot, 'manifest.json')");
    expect(assembler).toContain("readFile(join(outputRoot, 'territory-manifest.json')");
    expect(assembler).toContain("readFile(join(outputRoot, 'leader-manifest.json')");
    expect(assembler).toContain('flattenCardManifest(cardManifest)');
    expect(assembler).toContain('flattenTerritoryManifest(territoryManifest)');
    expect(assembler).toContain("indexLeaders(leaderManifest.leaders, 'Rendered Leader manifest')");
    expect(assembler).not.toContain('const SHEET_COLUMNS');
    expect(assembler).not.toContain('const FIRST_DECK_ID');
  });

  it('emits publisher-ready Leader, card, Territory, sheet, and faction-back references', () => {
    expect(assembler).toContain('leader,');
    expect(assembler).toContain('makeLeaderReference');
    expect(assembler).toContain('deckCardIds');
    expect(assembler).toContain('faceSheets: [...faceSheetMap.values()]');
    expect(assembler).toContain('territories,');
    expect(assembler).toContain("const backFile = `backs/${faction}.png`");
    expect(assembler).toContain("assignment: 'player-faction'");
    expect(assembler).toContain('neutralCardsUsePlayerFactionBack: true');
    expect(assembler).toContain('schemaVersion: 2');
    expect(assembler).toContain("'starter-deck-manifest.json'");
  });

  it('does not hard-code how many starter decks or Leaders the current release must contain', () => {
    expect(assembler).toContain('starterDecks.decks.map((deck) =>');
    expect(assembler).toContain('deckCount: decks.length');
    expect(assembler).not.toMatch(/Expected 12|=== 12|!== 12/);
    expect(readme).toContain('does not hard-code the number of starter decks or Leaders');
  });

  it('is part of source checking and the complete TTS build after Leader generation', () => {
    expect(packageJson.scripts['tts:leaders']).toBe('node scripts/generate-tts-leader-assets.mjs');
    expect(packageJson.scripts['tts:starters']).toBe('node scripts/generate-tts-starter-decks.mjs');
    expect(packageJson.scripts['tts:check']).toContain('generate-tts-leader-assets.mjs --check');
    expect(packageJson.scripts['tts:check']).toContain('generate-tts-starter-decks.mjs --check');
    expect(packageJson.scripts['tts:build']).toBe('npm run tts:cards && npm run tts:territories && npm run tts:leaders && npm run tts:starters');
    expect(workflow.indexOf('Generate Leader cards')).toBeLessThan(workflow.indexOf('Assemble current starter decks'));
    expect(workflow).toContain('run: npm run tts:leaders');
    expect(workflow).toContain('run: npm run tts:starters');
  });

  it('accepts the current published starter-deck and Leader sources end to end', () => {
    const output = execFileSync(process.execPath, ['scripts/generate-tts-starter-decks.mjs', '--check'], {
      encoding: 'utf8',
    });
    expect(output).toContain('Current TTS starter-deck source check passed');
  });
});
