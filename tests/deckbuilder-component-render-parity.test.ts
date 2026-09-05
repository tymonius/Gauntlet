import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const catalog = readFileSync("card-design/index.html", "utf8");
const cardReview = readFileSync("card-design/card-review.js", "utf8");
const proposalDesign = readFileSync("card-design/proposal-card.js", "utf8");
const riteDesign = readFileSync("card-design/rite-card.js", "utf8");
const supplementalDesign = readFileSync("card-design/supplemental-card.js", "utf8");
const compositor = readFileSync("card-design/artwork-compositor.js", "utf8");
const faceRuntime = readFileSync("card-design/face-render.mjs", "utf8");
const faceSpec = readFileSync("card-design/face-spec.mjs", "utf8");
const cardLegacyAlias = readFileSync("card-design/card-print-render.html", "utf8");
const componentLegacyAlias = readFileSync("card-design/component-print-render.html", "utf8");
const territoryLegacyAlias = readFileSync("card-design/territory-print-render.html", "utf8");
const productionPrint = readFileSync("deckbuilder/production-print.js", "utf8");
const cardReference = readFileSync("card-reference/app.js", "utf8");
const legacyTtsPlayable = readFileSync("tts/renderer/index.html", "utf8");
const legacyTtsTerritory = readFileSync("tts/territory-renderer/index.html", "utf8");
const legacyTtsSupplemental = readFileSync("tts/supplemental-renderer/index.html", "utf8");
const legacyTtsFinalized = readFileSync("tts/finalized-supplemental-renderer/index.html", "utf8");
const ttsLeaders = readFileSync("scripts/generate-tts-leader-assets.mjs", "utf8");
const ttsSupplementals = readFileSync("scripts/generate-tts-supplemental-assets.mjs", "utf8");

describe("single canonical physical-face render authority", () => {
  it("uses one public face route across production print and TTS", () => {
    expect(productionPrint).toContain("/card-design/face-render.html?id=");
    expect(productionPrint).not.toContain("/card-design/card-review-render.html?card=");
    expect(productionPrint).not.toContain("/card-design/territory-review-render.html?territory=");
    expect(productionPrint).not.toContain("/card-design/component-render.html?kind=");
    expect(productionPrint).not.toContain("/card-design/card-back-render.html?faction=");

    expect(ttsLeaders).toContain("/card-design/face-render.html");
    expect(ttsSupplementals).toContain("/card-design/face-render.html");
  });

  it("makes the Card Design catalog consume canonical face frames", () => {
    expect(catalog).toContain('id="leaderReviewSections"');
    expect(catalog).toContain('id="proposalReviewSections"');
    expect(catalog).toContain('id="riteReviewSections"');
    expect(catalog).toContain('id="supplementalReviewSections"');

    for (const source of [cardReview, proposalDesign, riteDesign, supplementalDesign]) {
      expect(source).toContain("/card-design/face-render.html?id=");
      expect(source).not.toContain("/card-design/component-render.html?");
    }
  });

  it("keeps construction, template selection, and fitting inside FaceSpec and the clean runtime", () => {
    expect(faceRuntime).toContain("resolveFaceSpec(game, faceIdFromLocation())");
    expect(faceRuntime).toContain("rendererForTemplate(spec.template)");
    expect(faceRuntime).toContain("await prepareFace(spec, result)");
    expect(faceSpec).toContain("FACE_TEMPLATE_CONTRACTS");
    expect(faceSpec).toContain("dependencies:");
  });

  it("lets the artwork compositor discover canonical artwork identity from the rendered face", () => {
    expect(faceRuntime).toContain("document.body.dataset.artDirectionId");
    expect(compositor).toContain("url.pathname.endsWith('/card-design/face-render.html')");
    expect(compositor).toContain("doc?.body?.dataset.artDirectionId");
    expect(compositor).toContain("doc?.body?.dataset.faceId");
    expect(compositor).not.toContain("componentArtworkId(");
    expect(compositor).not.toContain("url.pathname.endsWith('/card-design/component-render.html')");
  });

  it("retains print compatibility edges without making them production authorities", () => {
    expect(cardLegacyAlias).toContain('data-legacy-face-route="card"');
    expect(territoryLegacyAlias).toContain('data-legacy-face-route="territory"');
    expect(componentLegacyAlias).toContain('data-legacy-face-route="component"');
    for (const alias of [cardLegacyAlias, componentLegacyAlias, territoryLegacyAlias]) {
      expect(alias).toContain("/card-design/legacy-face-redirect.mjs");
    }
    expect(existsSync(["card-design", "component-print-render.js"].join("/"))).toBe(false);
  });

  it("routes Card Reference and TTS compatibility entrypoints through the face renderer", () => {
    expect(cardReference).toContain("../card-design/face-render.html?id=");
    expect(cardReference).not.toContain("../card-design/component-render.html?");

    for (const shell of [
      legacyTtsPlayable,
      legacyTtsTerritory,
      legacyTtsSupplemental,
      legacyTtsFinalized,
    ]) {
      expect(shell).toContain("/card-design/legacy-face-redirect.mjs");
      expect(shell).not.toContain("/card-design/component-render.html");
      expect(shell).not.toContain("/card-design/card-review-render.html");
      expect(shell).not.toContain("/card-design/territory-review-render.html");
    }

    for (const obsolete of [
      ["tts", "renderer", "renderer.js"].join("/"),
      ["tts", "renderer", "renderer.css"].join("/"),
      ["tts", "territory-renderer", "territory-renderer.js"].join("/"),
      ["tts", "territory-renderer", "territory-renderer.css"].join("/"),
      ["tts", "supplemental-renderer", "supplemental-renderer.js"].join("/"),
      ["tts", "supplemental-renderer", "supplemental-renderer.css"].join("/"),
      ["tts", "finalized-supplemental-renderer", "renderer.js"].join("/"),
      ["tts", "finalized-supplemental-renderer", "renderer.css"].join("/"),
    ]) {
      expect(existsSync(obsolete)).toBe(false);
    }
  });

  it("stops final print output if preflighted canonical faces are incomplete", () => {
    expect(productionPrint).toContain('deckbuilder.registerPrintTransform("production-face-guard", guardProductionFaces, 100)');
    expect(productionPrint).toContain("await Promise.all(frames.map(waitForFrame))");
    expect(productionPrint).toContain("Printing was stopped so the Deck is not printed with incomplete cards.");
  });
});
