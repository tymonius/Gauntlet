import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const generator = readFileSync("scripts/generate-tts-territory-assets.mjs", "utf8");
const renderer = readFileSync("tts/territory-renderer/territory-renderer.js", "utf8");
const styles = readFileSync("tts/territory-renderer/territory-renderer.css", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

describe("TTS Territory assets", () => {
  it("uses landscape component dimensions", () => {
    expect(generator).toContain("const TERRITORY_WIDTH = 560");
    expect(generator).toContain("const TERRITORY_HEIGHT = 400");
    expect(generator).toContain("const CSS_TERRITORY_WIDTH = 336");
    expect(generator).toContain("const CSS_TERRITORY_HEIGHT = 240");
    expect(styles).toContain("width: 3.5in");
    expect(styles).toContain("height: 2.5in");
  });

  it("reuses the normal Gauntlet card family", () => {
    expect(styles).toContain("padding: 0.075in");
    expect(styles).toContain("border-radius: 0.125in");
    expect(styles).toContain("background: var(--card-ivory)");
    expect(styles).toContain("border: 1px solid var(--card-keyline)");
    expect(styles).toContain("var(--parchment-image)");
    expect(styles).toContain("font-family: var(--font-display-historical)");
    expect(styles).not.toContain(".territory-complexity");
    expect(renderer).not.toContain("value-medallion");
  });

  it("packs the canonical pool into a seven by four sheet", () => {
    expect(generator).toContain("const SHEET_COLUMNS = 7");
    expect(generator).toContain("const SHEET_ROWS = 4");
    expect(generator).toContain("const HIDDEN_SLOT = SHEET_COLUMNS * SHEET_ROWS - 1");
    expect(generator).toContain("Expected 25 canonical Territories");
    expect(generator).toContain("Expected four canonical Arenas");
  });

  it("uses separate deterministic Territory IDs", () => {
    expect(generator).toContain("const DECK_ID = 50");
    expect(generator).toContain("ttsCardId: DECK_ID * 100 + index");
    expect(generator).toContain("territory-manifest.json");
    expect(generator).toContain("territory-back.png");
  });

  it("uses restrained Arena accents", () => {
    expect(renderer).toContain("territory.arena ? ' arena' : ''");
    expect(renderer).toContain("territory.name.replace(/^Arena:\\s*/i, '')");
    expect(styles).toContain(".territory-card.arena .territory-title");
  });

  it("fits long canonical text", () => {
    expect(renderer).toContain("while (cardOverflows(card) && effectScale > 0.78)");
    expect(renderer).toContain("card.classList.add('compact')");
    expect(renderer).toContain("while (cardOverflows(card) && effectScale > MINIMUM_EFFECT_SCALE)");
    expect(renderer).toContain("card.classList.toggle('fit-warning', !fits)");
    expect(generator).toContain("Territory text does not fit the approved landscape frame");
  });

  it("exposes separate and combined npm commands", () => {
    expect(packageJson.scripts["tts:cards"]).toBe("node scripts/generate-tts-card-assets.mjs");
    expect(packageJson.scripts["tts:territories"]).toBe("node scripts/generate-tts-territory-assets.mjs");
    expect(packageJson.scripts["tts:build"]).toBe("npm run tts:cards && npm run tts:territories");
  });
});
