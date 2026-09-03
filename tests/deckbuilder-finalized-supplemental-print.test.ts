import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const currentGame = JSON.parse(readFileSync("game-data/current-game.json", "utf8"));
const compatibilityPrint = readFileSync("deckbuilder/print-capital-ledger.js", "utf8");
const productionPrint = readFileSync("deckbuilder/production-print.js", "utf8");
const deckPrint = readFileSync("deckbuilder/print.js", "utf8");
const faceAuthority = readFileSync("card-design/face-authority.mjs", "utf8");
const faceSpec = readFileSync("card-design/face-spec.mjs", "utf8");
const faceRuntime = readFileSync("card-design/face-render.mjs", "utf8");
const deedTemplate = readFileSync("card-design/face-templates/deed.mjs", "utf8");
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
    expect(productionPrint).not.toContain("&orientation=landscape");
    expect(productionPrint).toContain('return `component:${componentId}:${options.side || "front"}`');
    expect(compatibilityPrint).not.toContain("replaceLegacyDeeds");
  });

  it("makes the unified Deed template own the finalized physical face", () => {
    expect(faceAuthority).toContain("deed: Object.freeze({ orientation: 'landscape' })");
    expect(faceSpec).toContain("'/card-design/deed-card.css'");
    expect(faceSpec).toContain("if (face.template === 'deed')");
    expect(deedTemplate).toContain('class="gauntlet-card faction-component-card deed-card financiers-card"');
    expect(deedTemplate).toContain("preparation: { parchment: true, fit: 'none' }");
    expect(deedScript).toContain('class="gauntlet-card faction-component-card deed-card financiers-card"');
    expect(deedScript).not.toContain("supplemental-placeholder-card");
  });

  it("lets duplex production create intrinsic and standard reverses from component authority", () => {
    expect(productionPrint).toContain("ensureIntrinsicReversePages(documentNode, currentGame)");
    expect(productionPrint).toContain('side: "reverse"');
    expect(productionPrint).toContain("mirrorIndexForLongEdge(frontIndex)");
    expect(compatibilityPrint).not.toContain("removeLegacyDiplomatReverseReference");
  });

  it("fails closed before rendering a FaceSpec whose canonical authority is incomplete", () => {
    expect(faceRuntime).toContain("if (!spec.readiness.productionReady)");
    expect(faceRuntime).toContain("spec.readiness.issues.join");
    expect(faceRuntime).toContain("main().catch(reportError)");
    expect(deedTemplate).not.toContain("supplemental-placeholder-card");
  });
});
