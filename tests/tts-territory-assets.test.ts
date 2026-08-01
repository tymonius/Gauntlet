import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const generator = readFileSync("scripts/generate-tts-territory-assets.mjs", "utf8");
const renderer = readFileSync("tts/territory-renderer/territory-renderer.js", "utf8");
const styles = readFileSync("tts/territory-renderer/territory-renderer.css", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

describe("TTS Territory assets", () => {
  it("uses the established landscape poker-card dimensions", () => {
    expect(generator).toContain("const TERRITORY_WIDTH = 560");
    expect(generator).toContain("const TERRITORY_HEIGHT = 400");
    expect(generator).toContain("const CSS_TERRITORY_WIDTH = 336");
    expect(generator).toContain("const CSS_TERRITORY_HEIGHT = 240");
    expect(styles).toContain("width: 3.5in");
    expect(styles).toContain("height: 2.5in");
  });

  it("packs all 25 Territories into a TTS-safe 7 by 4 sheet", () => {
    expect(generator).toContain("const SHEET_COLUMNS = 7");
    expect(generator).toContain("const SHEET_ROWS = 4");
    expect(generator).toContain("const HIDDEN_SLOT = SHEET_COLUMNS * SHEET_ROWS - 1");
    expect(generator).toContain("Expected 25 canonical Territories");
    expect(generator).toContain("Expected four canonical Arenas");
    expect(generator).toContain("width: TERRITORY_WIDTH * SHEET_COLUMNS");
    expect(generator).toContain("height: TERRITORY_HEIGHT * SHEET_ROWS");
  });

  it("keeps Territory IDs separate from playable-card deck IDs", () => {
    expect(generator).toContain("const DECK_ID = 50");
    expect(generator).toContain("ttsCardId: DECK_ID * 100 + index");
    expect(generator).toContain("territory-manifest.json");
    expect(generator).toContain("territory-back.png");
  });

  it("distinguishes Arenas without changing their canonical status as Territories", () => {
    expect(renderer).toContain("territory.arena ? ' arena' : ''");
    expect(renderer).toContain("Arena Territory");
    expect(renderer).toContain("territory.name.replace(/^Arena:\\s*/i, '')");
    expect(styles).toContain(".territory-card.arena");
  });

  it("fits long canonical Territory text instead of clipping it silently", () => {
    expect(renderer).toContain("while (overflows(card) && scale > 0.72)");
    expect(renderer).toContain("card.classList.add('compact')");
    expect(renderer).toContain("while (overflows(card) && scale > 0.56)");
    expect(renderer).toContain("card.classList.add('fit-warning')");
    expect(generator).toContain("Territory text does not fit the landscape frame");
  });

  it("exposes separate and combined npm commands", () => {
    expect(packageJson.scripts["tts:cards"]).toBe("node scripts/generate-tts-card-assets.mjs");
    expect(packageJson.scripts["tts:territories"]).toBe("node scripts/generate-tts-territory-assets.mjs");
    expect(packageJson.scripts["tts:build"]).toBe("npm run tts:cards && npm run tts:territories");
  });
});
