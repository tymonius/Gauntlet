import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const currentGame = JSON.parse(readFileSync("game-data/current-game.json", "utf8"));
const contract = currentGame.componentContract;
const productionPrint = readFileSync("deckbuilder/production-print.js", "utf8");
const compatibilityPrint = readFileSync("deckbuilder/print-capital-ledger.js", "utf8");
const deckPrint = readFileSync("deckbuilder/print.js", "utf8");
const packageProjection = readFileSync("deckbuilder/faction-components.js", "utf8");
const deckbuilderHtml = readFileSync("deckbuilder/index.html", "utf8");
const componentRenderer = readFileSync("card-design/component-render.js", "utf8");

const components = contract.components as Array<Record<string, any>>;
const sharedComponents = contract.sharedComponents as Array<Record<string, any>>;

function component(id: string) {
  return components.find(item => item.id === id);
}

describe("Deckbuilder supplemental print audit", () => {
  it("has no remaining intentional card-design placeholders in the physical component contract", () => {
    const placeholders = [...sharedComponents, ...components]
      .filter(item => (item.designStatus || "final") === "placeholder");

    expect(placeholders).toHaveLength(0);
  });

  it("projects the Universal Reference directly from current component authority", () => {
    const universal = sharedComponents.find(item => item.id === "universal-reference");
    expect(universal).toMatchObject({
      designStatus: "final",
      productionStatus: "ready",
      deckInclusion: "every-deck",
      family: "reference-card",
    });

    expect(packageProjection).toContain('component.deckInclusion === "every-deck"');
    expect(packageProjection).toContain('deckbuilder.registerFeature("supplementalPackages", packages)');
    expect(packageProjection).not.toContain('GAUNTLET_V06_SUPPLEMENTALS');
    expect(packageProjection).not.toContain('bridgeSharedReferencesIntoPrintAuthority');
    expect(productionPrint).toContain('...(currentGame.sharedComponents || [])');
  });

  it("does not load stale static supplemental rule bundles", () => {
    expect(deckbuilderHtml).not.toContain("supplemental-data.js");
    expect(deckbuilderHtml).not.toContain("completed-supplementals.js");
    expect(deckbuilderHtml).not.toContain("v061-supplementals.js");
    expect(deckPrint).toContain('deckbuilder.feature("supplementalPackages")');
    expect(deckPrint).not.toContain("GAUNTLET_V06_SUPPLEMENTALS");
  });

  it("builds production print faces directly instead of emitting placeholder shells for replacement", () => {
    expect(productionPrint).toContain('deckbuilder.registerFeature("productionPrintRenderer"');
    expect(productionPrint).toContain("card: renderProductionCardHtml");
    expect(productionPrint).toContain("territory: renderProductionTerritoryHtml");
    expect(productionPrint).toContain("leader: renderProductionLeaderHtml");
    expect(productionPrint).toContain("component: renderProductionComponentHtml");
    expect(deckPrint).toContain('deckbuilder.feature("productionPrintRenderer")');
    expect(deckPrint).toContain('productionPrint().component(component.contractId, "front")');
    expect(deckPrint).toContain("productionPrint().card(card)");
    expect(deckPrint).toContain("productionPrint().territory(territory)");
    expect(productionPrint).not.toContain("replaceProductionFronts");
    expect(productionPrint).not.toContain("replaceSupplementalFronts");
    expect(productionPrint).not.toContain("replacePlayableAndTerritoryFronts");
    expect(productionPrint).toContain('if (component.productionStatus === "ready") return true;');
  });

  it("covers every current supplemental family through the shared production renderer", () => {
    expect(packageProjection).not.toContain('type: "purge"');
    expect(deckPrint).toContain('if (component.type === "deed-set")');
    expect(deckPrint).toContain("proposalToPrintHtml");
    expect(deckPrint).toContain("riteToPrintHtml");

    expect(compatibilityPrint).not.toContain('replaceCapitalLedger(documentNode)');
    expect(compatibilityPrint).not.toContain('replaceLegacyDeeds(documentNode)');
    expect(compatibilityPrint).not.toContain('removeLegacyDiplomatReverseReference(documentNode)');
    expect(productionPrint).toContain('if (component.family === "tracker" && componentId)');
    expect(productionPrint).toContain('if (component.family === "reference-card")');
    expect(productionPrint).toContain('if (component.family === "proposal-treaty-card")');
    expect(productionPrint).toContain('if (component.family === "rite-card")');
    expect(productionPrint).toContain('if (component.family === "ledger")');
    expect(productionPrint).toContain('if (component.family === "deed-card")');
    expect(productionPrint).toContain('if (component.family === "ritual-card")');
    expect(productionPrint).toContain('const explicitKind = String(explicit.kind || "").trim();');
  });

  it("confirms every current shared/faction reference, tracker, and Rite has a production-ready renderer", () => {
    const sharedReferences = sharedComponents.filter(item => item.family === "reference-card");
    const references = components.filter(item => item.family === "reference-card");
    const trackers = components.filter(item => item.family === "tracker");
    const rites = components.filter(item => item.family === "rite-card");

    expect(sharedReferences).toHaveLength(1);
    expect(sharedReferences.every(item => item.productionStatus === "ready")).toBe(true);
    expect(references).toHaveLength(7);
    expect(references.every(item => item.productionStatus === "ready")).toBe(true);
    expect(trackers).toHaveLength(6);
    expect(trackers.every(item => item.productionStatus === "ready")).toBe(true);
    expect(rites).toHaveLength(currentGame.mystics.rites.length);
    expect(rites.every(item => item.productionStatus === "ready")).toBe(true);
  });

  it("confirms every final export-pending card family has an explicit Deckbuilder production path", () => {
    const proposals = components.filter(item => item.family === "proposal-treaty-card");
    expect(proposals).toHaveLength(9);
    expect(proposals.every(item => item.designStatus === "final" && item.productionStatus === "export-pending")).toBe(true);
    expect(productionPrint).toContain('component.family === "proposal-treaty-card"');
    expect(productionPrint).toContain('component.productionStatus === "export-pending"');

    expect(component("financiers-capital-ledger")).toMatchObject({
      designStatus: "final",
      productionStatus: "export-pending",
    });
    expect(component("financiers-deed")).toMatchObject({
      designStatus: "final",
      productionStatus: "export-pending",
    });
    expect(component("financiers-capital-ledger")?.backPolicy).toBe("twoSided");
    expect(component("financiers-deed")?.backPolicy).toBe("standardBack");
    expect(productionPrint).toContain('["proposal-treaty-card", "ledger", "deed-card"].includes(component.family)');
  });

  it("keeps the production component renderer fail-closed on any future placeholder face", () => {
    expect(componentRenderer).toContain('if (card.classList.contains("supplemental-placeholder-card"))');
    expect(componentRenderer).toContain('throw new Error(`Component ${id} still resolves to a production-layout placeholder.`)');
  });
});
