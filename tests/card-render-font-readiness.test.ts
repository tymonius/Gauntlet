import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const faceRuntime = readFileSync("card-design/face-render.mjs", "utf8");
const preparation = readFileSync("card-design/face-preparation.mjs", "utf8");

describe("production card font readiness", () => {
  it("loads the shared production font set before any FaceSpec template renders", () => {
    const fontLoad = faceRuntime.indexOf("await loadProductionFonts();");
    const templateRender = faceRuntime.indexOf("const result = await template.render(spec);");

    expect(preparation).toContain("document.fonts.load");
    expect(preparation).toContain("p22-1722-pro");
    expect(preparation).toContain("adobe-caslon-pro");
    expect(fontLoad).toBeGreaterThan(-1);
    expect(templateRender).toBeGreaterThan(fontLoad);
  });

  it("fails closed when the production font set is unavailable", () => {
    expect(preparation).toContain("CSS Font Loading API unavailable.");
    expect(preparation).toContain("Missing production fonts:");
    expect(preparation).toContain("await document.fonts.ready");
    expect(faceRuntime).toContain("main().catch(reportError)");
    expect(faceRuntime).toContain("document.body.dataset.renderReady = 'error'");
  });
});
