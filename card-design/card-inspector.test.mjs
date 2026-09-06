import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const inspectorSource = readFileSync("card-design/card-inspector.js", "utf8");
const rendererSource = readFileSync("card-design/face-render.mjs", "utf8");
const reviewSource = readFileSync("card-design/card-review.js", "utf8");
const cardDesignIndex = readFileSync("card-design/index.html", "utf8");
const cardReferenceIndex = readFileSync("card-reference/index.html", "utf8");
const deckbuilderPreview = readFileSync("deckbuilder/mobile-card-preview.js", "utf8");

describe("shared card inspector", () => {
  it("keeps artwork inside the normal card hit area until the enlarged card is open", () => {
    expect(rendererSource).toContain("if (!inspectionHost) return;");
    expect(rendererSource.indexOf("if (!inspectionHost) return;")).toBeLessThan(
      rendererSource.indexOf("frame.classList.add('art-inspectable');"),
    );
  });

  it("shows the zoom cursor over artwork that can be inspected from the enlarged card", () => {
    expect(rendererSource).toContain("frame.style.cursor = 'zoom-in';");
    expect(rendererSource).toContain("image.style.cursor = 'zoom-in';");
  });

  it("accepts artwork inspection only from the enlarged card iframe", () => {
    expect(inspectorSource).toContain("if (!dialog?.open || event.source !== cardFrame?.contentWindow) return;");
    expect(inspectorSource).toContain("if (event.source === cardFrame?.contentWindow) return;");
  });

  it("uses replacement iframe navigation so one Back closes the inspector", () => {
    expect(inspectorSource).toContain("cardFrame.contentWindow.location.replace(href);");
    expect(inspectorSource).toContain("replaceCardFrameLocation(renderHref);");
    expect(inspectorSource).toContain("replaceCardFrameLocation('about:blank');");
  });

  it("owns portrait and landscape inspection in one runtime", () => {
    expect(inspectorSource).toContain("PRODUCTION_SURFACES.portrait.widthCssPx");
    expect(inspectorSource).toContain("PRODUCTION_SURFACES.landscape.widthCssPx");
    expect(inspectorSource).toContain("gauntlet-territory-inspect");
    expect(inspectorSource).toContain("data-face-inspection-host=\"true\"");
  });

  it("routes Card Design, Card Reference, and Deckbuilder to the same inspector assets", () => {
    expect(cardDesignIndex).toContain('href="card-inspector.css?v=20260905-2"');
    expect(cardDesignIndex).toContain('src="card-inspector.js?v=20260905-2"');
    expect(cardReferenceIndex).toContain('href="../card-design/card-inspector.css?v=20260905-2"');
    expect(cardReferenceIndex).toContain('src="../card-design/card-inspector.js?v=20260905-2"');
    expect(deckbuilderPreview).toContain('../card-design/card-inspector.css?v=20260905-2');
    expect(deckbuilderPreview).toContain('../card-design/card-inspector.js?v=20260905-2');
  });

  it("keeps Card Design catalog rendering separate from inspector state", () => {
    expect(reviewSource).not.toContain("ensureTerritoryInspectionDialog");
    expect(reviewSource).not.toContain("handleTerritoryInspectionMessage");
    expect(reviewSource).not.toContain("territoryInspectionFrame");
    expect(reviewSource).not.toContain("card-inspection-dialog");
    expect(reviewSource).not.toContain("window.addEventListener('message'");
  });
});
