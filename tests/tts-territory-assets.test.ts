import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const generator = readFileSync("scripts/generate-tts-territory-assets.mjs", "utf8");
const renderer = readFileSync("tts/territory-renderer/territory-renderer.js", "utf8");
const rendererStyles = readFileSync("tts/territory-renderer/territory-renderer.css", "utf8");
const playableStyles = readFileSync("card-design/card-design.css", "utf8");
const sharedStyles = readFileSync("card-design/territory-card.css", "utf8");
const specimenPage = readFileSync("card-design/index.html", "utf8");
const dedicatedSpecimenPage = readFileSync("card-design/territories/index.html", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

describe("TTS Territory assets", () => {
  it("uses landscape component dimensions", () => {
    expect(generator).toContain("const TERRITORY_WIDTH = 560");
    expect(generator).toContain("const TERRITORY_HEIGHT = 400");
    expect(generator).toContain("const CSS_TERRITORY_WIDTH = 336");
    expect(generator).toContain("const CSS_TERRITORY_HEIGHT = 240");
    expect(sharedStyles).toContain("width: 3.5in");
    expect(sharedStyles).toContain("height: 2.5in");
  });

  it("reuses one shared Gauntlet-family frame in the renderer and specimen pages", () => {
    expect(rendererStyles).toContain("@import url('/card-design/territory-card.css')");
    expect(specimenPage).toContain('href="territory-card.css"');
    expect(dedicatedSpecimenPage).toContain('href="../territory-card.css"');
    expect(sharedStyles).toContain("padding: 0.075in");
    expect(sharedStyles).toContain("border-radius: 0.125in");
    expect(sharedStyles).toContain("background: var(--card-ivory");
    expect(sharedStyles).toContain("border: 1px solid var(--card-keyline");
    expect(sharedStyles).toContain("var(--parchment-image)");
    expect(sharedStyles).toContain("font-family: var(--font-display-historical)");
    expect(sharedStyles).not.toContain(".territory-complexity");
    expect(renderer).not.toContain("value-medallion");
  });

  it("matches the standard playable-card title-panel height", () => {
    expect(playableStyles).toContain("grid-template-rows: 0.46in 1.42in minmax(0, 1fr) 0.16in");
    expect(sharedStyles).toContain("grid-template-rows: 0.46in minmax(0, 1fr) 0.18in");
    expect(sharedStyles).toContain("padding: 0.075in 0.09in 0.035in");
    expect(dedicatedSpecimenPage).toContain("same 0.46-inch title panel as a standard playable card");
  });

  it("uses a full-width artwork window above a bottom rules panel", () => {
    expect(renderer).toContain('class="territory-art"');
    expect(renderer).toContain("Artwork pending");
    expect(renderer).toContain("territoryArtworkCandidates");
    expect(renderer).toContain("/images/artwork/territories/");
    expect(sharedStyles).toContain("grid-template-rows: var(--art-height) minmax(0, 1fr)");
    expect(sharedStyles).not.toContain("grid-template-columns: var(--art-width)");
    expect(sharedStyles).toContain(".territory-art {");
    expect(sharedStyles).toContain("width: 100%");
    expect(sharedStyles).toContain(".territory-art img");
    expect(sharedStyles).toContain("object-fit: cover");
    expect(specimenPage).toContain('class="territory-art"');
    expect(dedicatedSpecimenPage).toContain('class="territory-art"');
    expect(specimenPage).toContain("a framed illustration spans the card beneath it");
    expect(specimenPage).toContain("a full-width panel across the bottom");
  });

  it("implements Territory mockups on the card-design webpages", () => {
    expect(specimenPage).toContain('id="territory-title"');
    expect(specimenPage).toContain("Territory card mockup");
    expect(specimenPage).toContain('aria-label="High Ground Territory card-front prototype"');
    expect(dedicatedSpecimenPage).toContain("Gauntlet Territory Card Mockup");
    expect(dedicatedSpecimenPage).toContain('aria-label="High Ground Territory card-front prototype"');
    expect(dedicatedSpecimenPage).toContain('<h2 class="territory-title">High Ground</h2>');
    expect(dedicatedSpecimenPage).toContain("The defending player in a battle on High Ground gains advantage.");
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
    expect(sharedStyles).toContain(".territory-card.arena .territory-title");
  });

  it("maximizes art height before reducing text", () => {
    expect(sharedStyles).toContain("--art-height: 1.33in");
    expect(renderer).toContain("const MINIMUM_ART_HEIGHT = 0.55 * CSS_PIXELS_PER_INCH");
    expect(renderer).toContain("while (cardOverflows(card) && artHeight > MINIMUM_ART_HEIGHT)");
    expect(renderer).toContain("card.dataset.artHeight");
    expect(renderer).toContain("card.dataset.artSpansBody");
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
