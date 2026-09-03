import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PRODUCTION_SURFACES } from "../card-design/production-surface.mjs";

const generator = readFileSync("scripts/generate-tts-territory-assets.mjs", "utf8");
const territoryTemplate = readFileSync("card-design/face-templates/territory.mjs", "utf8");
const faceSpec = readFileSync("card-design/face-spec.mjs", "utf8");
const faceRuntime = readFileSync("card-design/face-render.mjs", "utf8");
const preparation = readFileSync("card-design/face-preparation.mjs", "utf8");
const rendererStyles = readFileSync("card-design/territory-card-renderer.css", "utf8");
const playableStyles = readFileSync("card-design/card-design.css", "utf8");
const refinedPlayableStyles = readFileSync("card-design/card-design-refinement.css", "utf8");
const sharedStyles = readFileSync("card-design/territory-card.css", "utf8");
const specimenPage = readFileSync("card-design/index.html", "utf8");
const reviewScript = readFileSync("card-design/card-review.js", "utf8");
const territoryReviewPage = readFileSync("card-design/territory-review-render.html", "utf8");
const dedicatedSpecimenPage = readFileSync("card-design/territories/index.html", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

describe("TTS Territory assets", () => {
  it("uses the shared landscape production-surface dimensions", () => {
    expect(PRODUCTION_SURFACES.landscape).toMatchObject({
      widthIn: 3.5,
      heightIn: 2.5,
      widthCssPx: 336,
      heightCssPx: 240,
      widthRasterPx: 560,
      heightRasterPx: 400,
    });
    expect(generator).toContain("surfaceRasterPixels('landscape')");
    expect(generator).toContain("surfaceCssPixels('landscape')");
    expect(generator).toContain("surfaceDeviceScale('landscape')");
    expect(generator).not.toContain("const TERRITORY_WIDTH = 560");
    expect(generator).not.toContain("const CSS_TERRITORY_WIDTH = 336");
    expect(sharedStyles).toContain("width: 3.5in");
    expect(sharedStyles).toContain("height: 2.5in");
  });

  it("reuses one shared Gauntlet-family frame in the renderer and specimen pages", () => {
    expect(rendererStyles).toContain("@import url('/card-design/territory-card.css')");
    expect(specimenPage).toContain('href="territory-card.css"');
    expect(faceSpec).toContain("'/card-design/territory-card-renderer.css'");
    expect(dedicatedSpecimenPage).toContain('href="../territory-card.css"');
    expect(sharedStyles).toContain("padding: 0.075in");
    expect(sharedStyles).toContain("border-radius: 0.125in");
    expect(sharedStyles).toContain("border: 1px solid var(--territory-border-outline)");
    expect(sharedStyles).toContain("background: var(--territory-border)");
    expect(sharedStyles).toContain("border: 1px solid var(--card-keyline");
    expect(sharedStyles).toContain("var(--parchment-image)");
    expect(sharedStyles).not.toContain(".territory-complexity");
    expect(territoryTemplate).not.toContain("value-medallion");
  });

  it("uses the approved Neutral parchment rotated for the landscape face", () => {
    expect(preparation).toContain("/images/artwork/card-backgrounds/neutral-parchment-v2.png");
    expect(dedicatedSpecimenPage).toContain("neutral-parchment-v2.png");
    expect(sharedStyles).toContain(".territory-interior::before");
    expect(sharedStyles).toContain("width: 70.15%");
    expect(sharedStyles).toContain("height: 142.55%");
    expect(sharedStyles).toContain("rotate(90deg)");
    expect(sharedStyles).toContain("background-image: var(--parchment-image)");
    expect(dedicatedSpecimenPage).toContain("approved Neutral parchment rotated into landscape orientation");
  });

  it("uses a substantially narrower Territory title panel", () => {
    expect(playableStyles).toContain("grid-template-rows: 0.46in 1.42in minmax(0, 1fr) 0.16in");
    expect(sharedStyles).toContain("grid-template-rows: 0.3in minmax(0, 1fr) 0.18in");
    expect(sharedStyles).toContain("padding: 0.022in 0.09in 0.012in");
    expect(sharedStyles).toContain("font-family: var(--font-display-historical)");
    expect(sharedStyles).toContain("font-size: 12.1pt");
    expect(sharedStyles).toContain("letter-spacing: 0.035em");
    expect(dedicatedSpecimenPage).toContain("0.30-inch title panel");
  });

  it("uses the normal playable-card artwork frame without a text divider", () => {
    expect(territoryTemplate).toContain('class="territory-art"');
    expect(territoryTemplate).toContain("Artwork pending");
    expect(faceSpec).toContain("territoryArtworkCandidates");
    expect(faceSpec).toContain("/images/artwork/cards/territories/");
    expect(existsSync("images/artwork/cards/territories/high-ground.jpg")).toBe(true);
    expect(existsSync("images/artwork/cards/territories/arena-grand-melee.png")).toBe(true);
    expect(sharedStyles).toContain(".territory-body {");
    expect(sharedStyles).toContain("display: flex");
    expect(sharedStyles).toContain("flex-direction: column");
    expect(sharedStyles).toContain("flex: 1 1 0");
    expect(sharedStyles).not.toContain("grid-template-columns: var(--art-width)");
    expect(sharedStyles).toContain(".territory-art {");
    expect(sharedStyles).toContain("width: 100%");
    expect(sharedStyles).toContain(".territory-art img");
    expect(sharedStyles).toContain("object-fit: cover");
    expect(sharedStyles).toContain("border: 1px solid rgba(54, 41, 29, 0.94)");
    expect(sharedStyles).toContain("0 0 0 0.007in rgba(231, 212, 176, 0.78)");
    expect(sharedStyles).toContain("inset 0 0 0 0.022in rgba(227, 207, 169, 0.52)");
    expect(refinedPlayableStyles).toContain("0 0 0 0.007in rgba(231, 212, 176, 0.78)");
    expect(refinedPlayableStyles).toContain("inset 0 0 0 0.022in rgba(227, 207, 169, 0.52)");
    expect(sharedStyles).toContain("border-top: 0");
    expect(dedicatedSpecimenPage).toContain("same mounted-print frame as a normal card");
    expect(dedicatedSpecimenPage).toContain("open parchment spacing rather than a divider");
    expect(faceRuntime).toContain("loadClassicScript('/card-design/artwork-crop.js'");
    expect(faceRuntime).toContain("window.GauntletArtworkCrop.apply");
    expect(dedicatedSpecimenPage).toContain('class="territory-art has-image"');
  });

  it("gives Territory effect text its natural height before clipping", () => {
    expect(sharedStyles).toContain("overflow: visible");
    expect(sharedStyles).toContain("padding: 0.045in 0.07in 0.018in");
    expect(sharedStyles).toContain("line-height: 1.1");
    expect(sharedStyles).not.toContain("line-height: 1.18");
  });

  it("keeps the current catalog index and review frames on current-game Territory authority", () => {
    expect(specimenPage).toContain('id="territory-title"');
    expect(specimenPage).toContain('class="card-section territory-specimen-section"');
    expect(specimenPage).toContain('id="territoryReviewSections"');
    expect(specimenPage).toContain('<span data-territory-count>25</span>');
    expect(specimenPage).toContain('<span data-arena-count>4</span>');
    expect(reviewScript).toContain("const current = await currentGame()");
    expect(reviewScript).toContain("current.territories || []");
    expect(reviewScript).toContain("territories.map(territory => territoryItem(territory, current.displayVersion))");
    expect(reviewScript).toContain("const arenas = territories.filter(territory => territory.arena)");
    expect(reviewScript).toContain('class="territory-review-frame"');
    expect(reviewScript).toContain("faceRenderSource(`territory:${territory.id}`)");
    expect(faceSpec).toContain("(game.territories || []).find(item => item.id === id)");
    expect(territoryTemplate).toContain("const territory = spec.content.territory;");
    expect(faceRuntime).toContain("document.body.dataset.gameplayAuthority = spec.provenance.gameplay");
    expect(faceSpec).not.toContain("Gauntlet_v0.6.3_Canonical_Data.json");
    expect(territoryReviewPage).toContain('data-legacy-face-route="territory"');
    expect(territoryReviewPage).toContain('/card-design/legacy-face-redirect.mjs');
    expect(dedicatedSpecimenPage).toContain("Gauntlet Territory Card Mockup");
    expect(dedicatedSpecimenPage).toContain('aria-label="High Ground Territory card-front prototype"');
  });

  it("orients Territory faces upright with the shared landscape packaging authority", () => {
    expect(generator).toContain("LANDSCAPE_TTS_CELL_ROTATION_DEGREES");
    expect(generator).toContain("rotate(${LANDSCAPE_TTS_CELL_ROTATION_DEGREES}deg)");
    expect(generator).toContain("sheetCellRotationDegrees: LANDSCAPE_TTS_CELL_ROTATION_DEGREES");
    expect(generator).not.toContain("rotate(-90deg)");
  });

  it("packs Territories into as many seven-by-four sheets as the current pool requires", () => {
    expect(generator).toContain("const SHEET_COLUMNS = 7");
    expect(generator).toContain("const SHEET_ROWS = 4");
    expect(generator).toContain("const HIDDEN_SLOT = SHEET_COLUMNS * SHEET_ROWS - 1");
    expect(generator).toContain("const TERRITORIES_PER_SHEET = HIDDEN_SLOT");
    expect(generator).toContain("const sheetGroups = chunk(catalog.territories, TERRITORIES_PER_SHEET)");
    expect(generator).not.toContain("Expected 25 canonical Territories");
    expect(generator).not.toContain("Expected four canonical Arenas");
  });

  it("uses separate deterministic Territory deck IDs with the shared standard-back policy", () => {
    expect(generator).toContain("const FIRST_DECK_ID = 50");
    expect(generator).toContain("const deckId = FIRST_DECK_ID + sheetIndex");
    expect(generator).toContain("ttsCardId: deckId * 100 + index");
    expect(generator).toContain("territory-manifest.json");
    expect(generator).toContain("backPolicy: 'standardBack'");
    expect(generator).toContain("resolveStandardBackFile(componentContract");
    expect(generator).not.toContain("territory-back.png");
  });

  it("uses restrained Arena accents", () => {
    expect(territoryTemplate).toContain("territory.arena ? ' arena' : ''");
    expect(territoryTemplate).toContain("replace(/^Arena:\\s*/i, '')");
    expect(sharedStyles).toContain(".territory-card.arena .territory-title");
  });

  it("maximizes art height before reducing text", () => {
    expect(sharedStyles).toContain("--art-height: 0.78in");
    expect(preparation).toContain("TERRITORY_MINIMUM_ART_HEIGHT");
    expect(preparation).toContain("art.style.minHeight = \`${TERRITORY_MINIMUM_ART_HEIGHT}px\`");
    expect(preparation).toContain("card.dataset.artHeight");
    expect(preparation).toContain("card.dataset.artSpansBody");
    expect(preparation).toContain("while (territoryBodyOverflows(body, art, effect) && effectScale > 0.78)");
    expect(preparation).toContain("card.classList.add('compact')");
    expect(preparation).toContain("while (territoryBodyOverflows(body, art, effect) && effectScale > TERRITORY_MINIMUM_EFFECT_SCALE)");
    expect(preparation).toContain("card.classList.toggle('fit-warning', !fits)");
    expect(generator).toContain("Territory text does not fit the approved landscape frame");
  });

  it("exposes stable release-agnostic npm commands", () => {
    expect(packageJson.scripts["tts:components:check"]).toBe("node scripts/tts-component-contract.mjs");
    expect(packageJson.scripts["tts:cards"]).toBe("node scripts/generate-tts-card-assets.mjs");
    expect(packageJson.scripts["tts:territories"]).toBe("node scripts/generate-tts-territory-assets.mjs");
    expect(packageJson.scripts["tts:leaders"]).toBe("node scripts/generate-tts-leader-assets.mjs");
    expect(packageJson.scripts["tts:starters"]).toBe("node scripts/generate-tts-starter-decks.mjs");
    expect(packageJson.scripts["tts:build"]).toBe("npm run tts:components:check && npm run tts:cards && npm run tts:territories && npm run tts:leaders && npm run tts:starters");
  });
});
