import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const currentGame = JSON.parse(readFileSync("game-data/current-game.json", "utf8"));
const compatibilityPrint = readFileSync("deckbuilder/print-capital-ledger.js", "utf8");
const productionPrint = readFileSync("deckbuilder/print-duplex-sheet-pairing.js", "utf8");
const deckPrint = readFileSync("deckbuilder/print.js", "utf8");
const componentPrintHtml = readFileSync("card-design/component-print-render.html", "utf8");
const componentPrintJs = readFileSync("card-design/component-print-render.js", "utf8");
const deedScript = readFileSync("card-design/deed-card.js", "utf8");

describe("Deckbuilder finalized supplemental printing", () => {
  it("routes the finalized Deed through the shared landscape production renderer", () => {
    const deed = currentGame.componentContract.components.find((component: any) => component.id === "financiers-deed");
    expect(deed).toMatchObject({
      family: "deed-card",
      productionStatus: "export-pending",
      backPolicy: "standardBack",
    });

    expect(deckPrint).toContain('if (component.type === "deed-set")');
    expect(productionPrint).toContain('if (component.family === "deed-card") return { kind: "supplemental", id: component.id, orientation: "landscape" };');
    expect(productionPrint).toContain("production-component-landscape-rotate");
    expect(productionPrint).toContain("&orientation=landscape");
    expect(compatibilityPrint).not.toContain("replaceLegacyDeeds");
  });

  it("makes the shared component renderer produce the finalized Deed directly", () => {
    expect(componentPrintHtml).toContain('href="/card-design/deed-card.css"');
    expect(componentPrintHtml).toContain('href="/card-design/capital-ledger.css"');
    expect(componentPrintJs).toContain('params.get("orientation") || "portrait"');
    expect(componentPrintJs).toContain('const landscape = orientation === "landscape"');
    expect(componentPrintJs).toContain('card.style.width = renderWidth');
    expect(componentPrintJs).toContain('card.style.height = renderHeight');
    expect(deedScript).toContain('class="gauntlet-card faction-component-card deed-card financiers-card"');
    expect(deedScript).not.toContain("supplemental-placeholder-card");
  });

  it("lets duplex production create intrinsic and standard reverses from component authority", () => {
    expect(productionPrint).toContain("ensureIntrinsicReversePages(documentNode, currentGame)");
    expect(productionPrint).toContain('side: "reverse"');
    expect(productionPrint).toContain("mirrorIndexForLongEdge(frontIndex)");
    expect(compatibilityPrint).not.toContain("removeLegacyDiplomatReverseReference");
  });

  it("fails closed if a future production component still resolves to a placeholder", () => {
    expect(componentPrintJs).toContain('if (card.classList.contains("supplemental-placeholder-card"))');
    expect(componentPrintJs).toContain('throw new Error(`Component ${id} still resolves to a production-layout placeholder.`)');
    expect(componentPrintJs).not.toContain('kind === "supplemental" && id === "financiers-deed"');
  });
});
