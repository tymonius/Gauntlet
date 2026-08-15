import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const catalog = readFileSync('scripts/tts-v063-catalog.mjs', 'utf8');
const cards = readFileSync('scripts/generate-v063-tts-card-assets.mjs', 'utf8');
const territories = readFileSync('scripts/generate-v063-tts-territory-assets.mjs', 'utf8');
const cardRenderer = readFileSync('tts/renderer/index.html', 'utf8');
const territoryRenderer = readFileSync('tts/territory-renderer/index.html', 'utf8');
const backRenderer = readFileSync('tts/back-renderer/index.html', 'utf8');
const readme = readFileSync('tts/README.md', 'utf8');
const workflow = readFileSync('.github/workflows/generate-tts-card-assets.yml', 'utf8');
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'));

describe('current v0.6.3 TTS asset pipeline', () => {
  it('reads the published v0.6.3 canonical dataset and writes a current output tree', () => {
    expect(catalog).toContain("export const VERSION = 'v0.6.3';");
    expect(catalog).toContain("releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json");
    expect(catalog).toContain("join(ROOT, 'tts', 'generated', VERSION)");
    expect(catalog).toContain('neutral: 50');
    for (const faction of ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']) {
      expect(catalog).toContain(`${faction}: 13`);
    }
    expect(catalog).toContain('territories: 25');
  });

  it('renders six production backs from the shared card-back component instead of a prototype', () => {
    for (const faction of ['military', 'diplomats', 'financiers', 'intelligence', 'mystics', 'inquisition']) {
      expect(catalog).toContain(`'${faction}'`);
    }
    expect(cards).toContain("`${baseUrl}/tts/back-renderer/?faction=${encodeURIComponent(faction)}`");
    expect(cards).toContain("const file = `backs/${faction}.png`");
    expect(cards).toContain('prototypeBack: false');
    expect(cards).not.toContain('prototypeBackHtml');
    expect(backRenderer).toContain('/card-design/card-back.css');
    expect(backRenderer).toContain('/card-design/card-back.js');
    expect(backRenderer).toContain('data-gauntlet-card-back');
  });

  it('assigns backs by player faction so Neutral cards do not reveal allegiance', () => {
    expect(cards).toContain("assignment: 'player-faction'");
    expect(cards).toContain('neutralCardsUsePlayerFactionBack: true');
    expect(cards).toContain('backIsHidden: true');
    expect(cards).toContain('uniqueBack: false');
    expect(cards).toContain("defaultFaction: DEFAULT_BACK_FACTION");
    expect(readme).toContain("including Neutral cards");
    expect(readme).toContain("must use that player's faction back");
  });

  it('keeps the shared ten-by-seven face-sheet contract with a deterministic fallback hidden slot', () => {
    expect(cards).toContain('const SHEET_COLUMNS = 10;');
    expect(cards).toContain('const SHEET_ROWS = 7;');
    expect(cards).toContain('const HIDDEN_SLOT = SHEET_COLUMNS * SHEET_ROWS - 1;');
    expect(cards).toContain("const DEFAULT_BACK_FACTION = 'intelligence';");
    expect(cards).toContain('fallbackHiddenFile: DEFAULT_BACK_FILE');
  });

  it('moves the supported card and Territory renderers to the current catalog', () => {
    expect(cardRenderer).toContain('/tts/generated/v0.6.3/catalog.js');
    expect(territoryRenderer).toContain('/tts/generated/v0.6.3/catalog.js');
    expect(cardRenderer).not.toContain('/tts/generated/v0.6.2/catalog.js');
    expect(territoryRenderer).not.toContain('/tts/generated/v0.6.2/catalog.js');
  });

  it('moves the supported npm commands to the v0.6.3 exporters while retaining the old files as historical tooling', () => {
    expect(packageJson.scripts['tts:check']).toBe('node scripts/generate-v063-tts-card-assets.mjs --check && node scripts/generate-v063-tts-territory-assets.mjs --check');
    expect(packageJson.scripts['tts:catalog']).toBe('node scripts/generate-v063-tts-card-assets.mjs --catalog-only');
    expect(packageJson.scripts['tts:cards']).toBe('node scripts/generate-v063-tts-card-assets.mjs');
    expect(packageJson.scripts['tts:territories']).toBe('node scripts/generate-v063-tts-territory-assets.mjs');
    expect(readme).toContain('older v0.6.2 generator files remain');
  });

  it('keeps Territory faces current while explicitly retaining a temporary landscape back', () => {
    expect(territories).toContain("temporaryBack: true");
    expect(territories).toContain('v0.6.3 temporary Territory back');
    expect(territories).toContain('const DECK_ID = 50;');
    expect(readme).toContain('Territory back is still explicitly temporary');
  });

  it('restores TTS asset generation as a current pull-request artifact workflow', () => {
    expect(workflow).toContain('pull_request:');
    expect(workflow).toContain('releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json');
    expect(workflow).toContain('images/faction-symbols');
    expect(workflow).toContain('images/Gauntlet.svg');
    expect(workflow).toContain('gauntlet-v063-tts-card-assets');
    expect(workflow).toContain('tts/generated/v0.6.3/');
  });
});
