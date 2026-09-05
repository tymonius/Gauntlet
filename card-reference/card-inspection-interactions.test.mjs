import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const inspectorSource = readFileSync("card-reference/card-inspection.js", "utf8");
const rendererSource = readFileSync("card-design/face-render.mjs", "utf8");

describe("card inspection interaction hierarchy", () => {
  it("keeps artwork inside the card hit area until the enlarged card is open", () => {
    expect(rendererSource).toContain("if (!inspectionHost) return;");
    expect(rendererSource.indexOf("if (!inspectionHost) return;")).toBeLessThan(
      rendererSource.indexOf("frame.classList.add('art-inspectable');")
    );
  });

  it("accepts artwork inspection only from the enlarged card iframe", () => {
    expect(inspectorSource).toContain("if (!dialog?.open || event.source !== cardFrame?.contentWindow) return;");
  });

  it("replaces inspector iframe navigation instead of adding nested browser-history entries", () => {
    expect(inspectorSource).toContain("cardFrame.contentWindow.location.replace(href);");
    expect(inspectorSource).toContain("replaceCardFrameLocation(renderHref);");
    expect(inspectorSource).toContain("replaceCardFrameLocation('about:blank');");
  });
});
