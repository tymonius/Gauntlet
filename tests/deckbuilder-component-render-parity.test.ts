import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const catalog = readFileSync("card-design/index.html", "utf8");
const cardReview = readFileSync("card-design/card-review.js", "utf8");
const proposalDesign = readFileSync("card-design/proposal-card.js", "utf8");
const riteDesign = readFileSync("card-design/rite-card.js", "utf8");
const supplementalDesign = readFileSync("card-design/supplemental-card.js", "utf8");
const compositor = readFileSync("card-design/artwork-compositor.js", "utf8");
const componentRenderer = readFileSync("card-design/component-render.html", "utf8");
const componentRendererJs = readFileSync("card-design/component-render.js", "utf8");
const cardRenderer = readFileSync("card-design/card-review-render.html", "utf8");
const territoryRenderer = readFileSync("card-design/territory-review-render.html", "utf8");
const cardLegacyAlias = readFileSync("card-design/card-print-render.html", "utf8");
const componentLegacyAlias = readFileSync("card-design/component-print-render.html", "utf8");
const componentLegacyJs = readFileSync("card-design/component-print-render.js", "utf8");
const territoryLegacyAlias = readFileSync("card-design/territory-print-render.html", "utf8");
const productionPrint = readFileSync("deckbuilder/production-print.js", "utf8");
const ttsLeaders = readFileSync("scripts/generate-tts-leader-assets.mjs", "utf8");
const ttsSupplementals = readFileSync("scripts/generate-tts-supplemental-assets.mjs", "utf8");

describe("single Card Design render authority", () => {
  it("uses one canonical embedded face route for each physical face family", () => {
    expect(productionPrint).toContain("/card-design/card-review-render.html?card=");
    expect(productionPrint).toContain("/card-design/territory-review-render.html?territory=");
    expect(productionPrint).toContain("/card-design/component-render.html?kind=");
    expect(productionPrint).not.toContain("/card-design/card-print-render.html?card=");
    expect(productionPrint).not.toContain("/card-design/territory-print-render.html?territory=");
    expect(productionPrint).not.toContain("/card-design/component-print-render.html?kind=");

    expect(ttsLeaders).toContain("/card-design/component-render.html");
    expect(ttsSupplementals).toContain("/card-design/component-render.html");
  });

  it("makes the /card-design catalog consume the same canonical component frames", () => {
    expect(catalog).toContain('id="leaderReviewSections"');
    expect(catalog).toContain('id="proposalReviewSections"');
    expect(catalog).toContain('id="riteReviewSections"');
    expect(catalog).toContain('id="supplementalReviewSections"');

    expect(cardReview).toContain("/card-design/component-render.html?");
    expect(cardReview).toContain("componentReviewFrame('leader'");
    expect(proposalDesign).toContain("/card-design/component-render.html?");
    expect(proposalDesign).toContain("componentReviewFrame(proposal.id");
    expect(riteDesign).toContain("/card-design/component-render.html?");
    expect(riteDesign).toContain("componentReviewFrame('rite'");
    expect(riteDesign).toContain("componentReviewFrame('ritual'");
    expect(supplementalDesign).toContain("/card-design/component-render.html?");
    expect(supplementalDesign).toContain("canonicalComponentFrame(component");
  });

  it("keeps all component construction and fitting inside the canonical component renderer", () => {
    for (const dependency of [
      "leader-card.css",
      "proposal-card.css",
      "rite-card.css",
      "reference-card.css",
      "supplemental-card.css",
      "supplemental-refinements.css",
      "deed-card.css",
      "proposal-card.js",
      "rite-card.js",
      "supplemental-card.js",
      "leader-card-copy.js",
    ]) {
      expect(componentRenderer).toContain(dependency);
    }
    expect(componentRenderer).toContain("/card-design/component-render.js");
    expect(componentRendererJs).toContain("applyCanonicalArtworkDirection(card)");
    expect(componentRendererJs).toContain("target.replaceChildren(card)");
  });

  it("lets the artwork compositor edit canonical component frames rather than a parallel direct face", () => {
    expect(compositor).toContain("url.pathname.endsWith('/card-design/component-render.html')");
    expect(compositor).toContain("componentArtworkId(componentKind, componentId, componentSide)");
    expect(compositor).toContain("kind: territoryId ? 'territory' : componentId ? 'component' : 'card'");
  });

  it("retains legacy print URLs only as redirects to canonical face routes", () => {
    expect(cardLegacyAlias).toContain("/card-design/card-review-render.html");
    expect(componentLegacyAlias).toContain("/card-design/component-render.html");
    expect(territoryLegacyAlias).toContain("/card-design/territory-review-render.html");
    expect(cardLegacyAlias).toContain("window.location.replace(target)");
    expect(componentLegacyAlias).toContain("window.location.replace(target)");
    expect(territoryLegacyAlias).toContain("window.location.replace(target)");
    expect(componentLegacyJs).not.toContain("selectedCard");
    expect(componentLegacyJs).not.toContain("applyCanonicalArtworkDirection");
  });

  it("stops the final print package if any legacy card face survives direct production rendering", () => {
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
      expect(productionPrint).toContain(`"${selector}"`);
    }
    expect(productionPrint).toContain('deckbuilder.registerPrintTransform("production-face-guard", guardProductionFaces, 100)');
    expect(productionPrint).toContain("Outdated print faces survived production rendering");
  });

  it("keeps playable and Territory canonical render pages singular rather than maintaining print copies", () => {
    expect(cardRenderer).toContain("/card-design/card-review-render.js");
    expect(territoryRenderer).toContain("/card-design/territory-review-render.js");
    expect(cardLegacyAlias).not.toContain("/card-design/card-review-render.js");
    expect(territoryLegacyAlias).not.toContain("/card-design/territory-review-render.js");
  });
});
