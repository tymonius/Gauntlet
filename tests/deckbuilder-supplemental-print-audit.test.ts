import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const contract = JSON.parse(readFileSync("config/tts-component-contract.json", "utf8"));
const productionPrint = readFileSync("deckbuilder/print-duplex-sheet-pairing.js", "utf8");
const compatibilityPrint = readFileSync("deckbuilder/print-capital-ledger.js", "utf8");
const legacyPrint = readFileSync("deckbuilder/print.js", "utf8");
const legacyPackages = [
  readFileSync("deckbuilder/supplemental-data.js", "utf8"),
  readFileSync("deckbuilder/completed-supplementals.js", "utf8"),
  readFileSync("deckbuilder/v061-supplementals.js", "utf8"),
  readFileSync("deckbuilder/faction-components.js", "utf8"),
].join("\n");
const componentRenderer = readFileSync("card-design/component-print-render.js", "utf8");

const components = contract.components as Array<Record<string, any>>;
const sharedComponents = contract.sharedComponents as Array<Record<string, any>>;

function component(id: string) {
  return components.find(item => item.id === id);
}

describe("Deckbuilder supplemental print audit", () => {
  it("has exactly one intentional placeholder in the physical component contract", () => {
    const placeholders = [...sharedComponents, ...components]
      .filter(item => (item.designStatus || "final") === "placeholder");

    expect(placeholders).toHaveLength(1);
    expect(placeholders[0]).toMatchObject({
      id: "universal-reference",
      designStatus: "placeholder",
      productionStatus: "design-pending",
    });
  });

  it("does not emit the design-pending Universal Reference through the legacy print package", () => {
    expect(legacyPrint).not.toContain("universal-reference");
    expect(legacyPackages).toContain('component.deckInclusion === "every-deck"');
    expect(legacyPackages).toContain('"Placeholder · design pending"');
    expect(legacyPackages).not.toContain('type: "reference", id: "universal-reference"');
  });

  it("routes every legacy supplemental card class through production replacement", () => {
    for (const selector of [
      ".print-card.tracker-card",
      ".print-card.reference-card",
      ".print-card.purge-card",
      ".print-card.capital-tracker-card",
      ".print-card.deed-card",
      ".print-card.proposal-card",
      ".print-card.rite-card",
    ]) {
      expect(productionPrint).toContain(selector);
    }

    expect(productionPrint).toContain('if (component.family === "tracker" && componentId)');
    expect(productionPrint).toContain('if (component.family === "reference-card")');
    expect(productionPrint).toContain('if (component.family === "proposal-treaty-card")');
    expect(productionPrint).toContain('if (component.family === "rite-card")');
    expect(productionPrint).toContain('if (component.productionStatus === "ready") return true;');
  });

  it("covers every supplemental family the legacy package can emit", () => {
    expect(legacyPrint).toContain('if (component.type === "tracker")');
    expect(legacyPrint).toContain('if (component.type === "reference")');
    expect(legacyPrint).toContain('if (component.type === "purge")');
    expect(legacyPrint).toContain('if (component.type === "capital")');
    expect(legacyPrint).toContain('if (component.type === "deed-set")');
    expect(legacyPrint).toContain('proposalToPrintHtml');
    expect(legacyPrint).toContain('riteToPrintHtml');

    expect(compatibilityPrint).toContain('replaceCapitalLedger(documentNode)');
    expect(compatibilityPrint).toContain('replaceLegacyDeeds(documentNode)');
    expect(compatibilityPrint).toContain('removeLegacyDiplomatReverseReference(documentNode)');
    expect(productionPrint).toContain('const isRitual = legacyCard.classList.contains("reference-card")');
  });

  it("confirms every current faction reference, tracker, and Rite has a production-ready renderer", () => {
    const references = components.filter(item => item.family === "reference-card");
    const trackers = components.filter(item => item.family === "tracker");
    const rites = components.filter(item => item.family === "rite-card");

    expect(references).toHaveLength(7);
    expect(references.every(item => item.productionStatus === "ready")).toBe(true);
    expect(trackers).toHaveLength(6);
    expect(trackers.every(item => item.productionStatus === "ready")).toBe(true);
    expect(rites).toHaveLength(3);
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
    expect(compatibilityPrint).toContain('PRODUCTION_LEDGER_COMPONENT_ID = "financiers-capital-ledger"');
    expect(compatibilityPrint).toContain('PRODUCTION_DEED_COMPONENT_ID = "financiers-deed"');
  });

  it("keeps the production component renderer fail-closed on an actual placeholder face", () => {
    expect(componentRenderer).toContain('if (card.classList.contains("supplemental-placeholder-card"))');
    expect(componentRenderer).toContain('throw new Error(`Component ${id} still resolves to a production-layout placeholder.`)');
  });
});
