import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const compatibilityPrint = readFileSync("deckbuilder/print-capital-ledger.js", "utf8");
const productionPrint = readFileSync("deckbuilder/print-duplex-sheet-pairing.js", "utf8");
const legacyPrint = readFileSync("deckbuilder/print.js", "utf8");
const legacySupplementals = [
  readFileSync("deckbuilder/supplemental-data.js", "utf8"),
  readFileSync("deckbuilder/v061-supplementals.js", "utf8"),
].join("\n");
const componentPrintHtml = readFileSync("card-design/component-print-render.html", "utf8");
const componentPrintJs = readFileSync("card-design/component-print-render.js", "utf8");
const deedScript = readFileSync("card-design/deed-card.js", "utf8");

describe("Deckbuilder finalized supplemental printing", () => {
  it("replaces all legacy Deed placeholders with the finalized landscape production component", () => {
    expect(legacyPrint).toContain('function deedToPrintHtml()');
    expect(legacyPrint).toContain('Territory Ownership');

    expect(compatibilityPrint).toContain('PRODUCTION_DEED_COMPONENT_ID = "financiers-deed"');
    expect(compatibilityPrint).toContain('documentNode.querySelectorAll(".print-card.deed-card")');
    expect(compatibilityPrint).toContain('deed.replaceWith(productionDeedFrame(documentNode))');
    expect(compatibilityPrint).toContain('production-render-landscape production-standard-back');
    expect(compatibilityPrint).toContain('"front", "landscape"');
    expect(compatibilityPrint).toContain('&orientation=landscape');
    expect(compatibilityPrint).toContain('width: 3.5in');
    expect(compatibilityPrint).toContain('height: 2.5in');
    expect(compatibilityPrint).toContain('transform: rotate(90deg)');
  });

  it("makes the shared component renderer capable of producing the complete finalized Deed", () => {
    expect(componentPrintHtml).toContain('href="/card-design/deed-card.css"');
    expect(componentPrintHtml).toContain('href="/card-design/capital-ledger.css"');
    expect(componentPrintJs).toContain('params.get("orientation") || "portrait"');
    expect(componentPrintJs).toContain('const landscape = orientation === "landscape"');
    expect(componentPrintJs).toContain('card.style.width = renderWidth');
    expect(componentPrintJs).toContain('card.style.height = renderHeight');
    expect(deedScript).toContain("card.classList.remove('supplemental-placeholder-card')");
    expect(deedScript).toContain("card.classList.add('deed-card')");
  });

  it("removes the obsolete Diplomat Side B front card and lets duplex production create the finalized reverse", () => {
    expect(legacySupplementals).toContain('Side B — Resource and Victory');
    expect(legacySupplementals).toContain('Influence & Treaty');

    expect(compatibilityPrint).toContain('removeLegacyDiplomatReverseReference(documentNode)');
    expect(compatibilityPrint).toContain('/\\bside\\s*b\\b|\\breverse\\b/i');
    expect(compatibilityPrint).toContain('/influence\\s*(?:&|and)\\s*treaty/i');
    expect(compatibilityPrint).toContain('cell.replaceChildren()');
    expect(productionPrint).toContain('ensureIntrinsicReversePages(documentNode, currentGame)');
    expect(productionPrint).toContain('side: "reverse"');
    expect(productionPrint).toContain('mirrorIndexForLongEdge(frontIndex)');
  });

  it("does not relax placeholder rejection for unfinished supplemental components", () => {
    expect(componentPrintJs).toContain('if (card.classList.contains("supplemental-placeholder-card"))');
    expect(componentPrintJs).toContain('kind === "supplemental" && id === "financiers-deed"');
    expect(componentPrintJs).toContain('throw new Error(`Component ${id} still resolves to a production-layout placeholder.`)');
  });
});
