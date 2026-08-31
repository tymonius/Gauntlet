import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const catalog = readFileSync("card-design/index.html", "utf8");
const catalogOverlay = readFileSync("card-design/current-card-catalog.js", "utf8");
const componentPrintRenderer = readFileSync("card-design/component-print-render.html", "utf8");
const cardReviewRenderer = readFileSync("card-design/card-review-render.html", "utf8");
const cardPrintRenderer = readFileSync("card-design/card-print-render.html", "utf8");
const territoryReviewRenderer = readFileSync("card-design/territory-review-render.html", "utf8");
const territoryPrintRenderer = readFileSync("card-design/territory-print-render.html", "utf8");
const finalPrintGuard = readFileSync("deckbuilder/print-card-back-orientation.js", "utf8");

describe("Deckbuilder production render shell parity", () => {
  it("loads every current component-specific style and refinement layer used by Card Design", () => {
    for (const dependency of [
      "leader-card.css",
      "proposal-card.css",
      "rite-card.css",
      "reference-card.css",
      "supplemental-card.css",
      "supplemental-refinements.css",
      "deed-card.css",
    ]) {
      expect(catalog).toContain(dependency);
      expect(componentPrintRenderer).toContain(`/card-design/${dependency}`);
    }
  });

  it("loads every current component rendering layer needed by the Card Design catalog", () => {
    for (const dependency of [
      "proposal-card.js",
      "rite-card.js",
      "supplemental-card.js",
    ]) {
      expect(catalog).toContain(dependency);
      expect(componentPrintRenderer).toContain(`/card-design/${dependency}`);
    }

    expect(catalogOverlay).toContain("./leader-card-copy.js");
    expect(componentPrintRenderer).toContain("/card-design/leader-card-copy.js");
  });

  it("keeps the supplemental refinement layer after the supplemental base styles", () => {
    const refinementIndex = componentPrintRenderer.indexOf("/card-design/supplemental-refinements.css");
    const supplementalBaseIndex = componentPrintRenderer.indexOf("/card-design/supplemental-card.css");

    expect(refinementIndex).toBeGreaterThan(supplementalBaseIndex);
  });

  it("keeps playable-card print styling and renderer dependencies aligned with the Card Design review shell", () => {
    for (const dependency of [
      "/design-tokens.css",
      "/card-design/card-design.css",
      "/card-design/card-design-refinement.css",
      "/card-design/faction-specimens.css",
      "/tts/renderer/renderer.css",
      "/card-design/card-review-render.js",
    ]) {
      expect(cardReviewRenderer).toContain(dependency);
      expect(cardPrintRenderer).toContain(dependency);
    }
  });

  it("keeps Territory print styling and renderer dependencies aligned with the Card Design review shell", () => {
    for (const dependency of [
      "/design-tokens.css",
      "/card-design/card-design-refinement.css",
      "/tts/territory-renderer/territory-renderer.css",
      "/card-design/territory-review-render.js",
    ]) {
      expect(territoryReviewRenderer).toContain(dependency);
      expect(territoryPrintRenderer).toContain(dependency);
    }
  });

  it("stops the final print package if any legacy card face survives production replacement", () => {
    for (const selector of [
      ".print-card.leader-card",
      ".print-card.main-card:not(.production-render-card)",
      ".print-card.territory:not(.production-render-territory)",
      ".print-card.tracker-card",
      ".print-card.reference-card",
      ".print-card.purge-card",
      ".print-card.capital-tracker-card",
      ".print-card.deed-card",
      ".print-card.proposal-card",
      ".print-card.rite-card",
      ".supplemental-placeholder-card",
    ]) {
      expect(finalPrintGuard).toContain(`"${selector}"`);
    }
    expect(finalPrintGuard).toContain("installFinalProductionFaceGuard(printWindow)");
    expect(finalPrintGuard).toContain("assertNoStalePrintFaces(printWindow.document)");
    expect(finalPrintGuard).toContain("Printing was stopped because an outdated card face survived the production replacement pass");
  });
});
