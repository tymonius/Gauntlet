import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cardDesign = readFileSync("card-design/card-design.js", "utf8");
const inspector = readFileSync("tools/card-design/review/card-inspector.js", "utf8");
const inspectorStyles = readFileSync("tools/card-design/review/card-inspector.css", "utf8");

describe("expanded card artwork inspection", () => {
  it("keeps direct-card inspection out of the fitting runtime", () => {
    expect(cardDesign).not.toContain("openCloneInspection");
    expect(cardDesign).not.toContain("gauntlet-card-inspect");
    expect(cardDesign).not.toContain("card-art-lightbox.css");
  });

  it("makes artwork inside an enlarged direct card independently inspectable", () => {
    expect(inspector).toContain("function prepareDirectArtwork(clone)");
    expect(inspector).toContain(".card-art img, .territory-art img");
    expect(inspector).toContain("image.currentSrc || image.src");
    expect(inspector).toContain("directArtworkTrigger = frame");
  });

  it("returns Escape/backdrop to the direct card before closing the inspector", () => {
    expect(inspector).toContain("if (!artStage.hidden && directClone)");
    expect(inspector).toContain("showCard(false);");
    expect(inspector).toContain("directArtworkTrigger?.focus?.({ preventScroll: true });");
  });

  it("keeps cloned card interaction limited to the artwork hit area", () => {
    expect(inspectorStyles).toContain(".card-inspection-clone");
    expect(inspectorStyles).toContain("pointer-events: none");
    expect(inspectorStyles).toContain(".card-inspection-clone .art-inspectable");
    expect(inspectorStyles).toContain("pointer-events: auto");
  });
});
