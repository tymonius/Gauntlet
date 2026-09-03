import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const renderSource = readFileSync("card-design/card-review-render.js", "utf8");

describe("production card font readiness", () => {
  it("loads the production display and reading faces before layout scripts run", () => {
    const fontLoad = renderSource.indexOf("await loadCardFonts(card);");
    const rendererLoad = renderSource.indexOf("await loadScript('/card-design/playable-card-renderer.js');");
    const cardDesignLoad = renderSource.indexOf("await loadScript('/card-design/card-design.js');");

    expect(renderSource).toContain('document.fonts.load');
    expect(renderSource).toContain('p22-1722-pro');
    expect(renderSource).toContain('adobe-caslon-pro');
    expect(fontLoad).toBeGreaterThan(-1);
    expect(fontLoad).toBeLessThan(rendererLoad);
    expect(fontLoad).toBeLessThan(cardDesignLoad);
  });

  it("fails production fitting closed instead of silently fitting against fallback typography", () => {
    expect(renderSource).toContain("params.get('fit') === 'production'");
    expect(renderSource).toContain("results.some(faces => !faces.length)");
    expect(renderSource).toContain("One or more production card fonts failed to load.");
    expect(renderSource).toContain("document.body.dataset.renderFontsReady = 'true'");
  });
});
