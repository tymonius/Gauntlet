import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cardDesign = readFileSync("card-design/card-design.js", "utf8");
const lightboxStyles = readFileSync("card-design/card-art-lightbox.css", "utf8");

describe("expanded card artwork inspection", () => {
  it("makes only rendered artwork inside the enlarged card independently inspectable", () => {
    expect(cardDesign).toContain(".card-art img, .territory-art img");
    expect(cardDesign).toContain("makeArtworkInspectable(clone, openArtworkInspection)");
    expect(cardDesign).toContain("image.currentSrc || image.src");
    expect(cardDesign).toContain("View full uncropped artwork");
  });

  it("bridges artwork clicks from embedded production-card inspections", () => {
    expect(cardDesign).toContain("type: 'gauntlet-art-inspect'");
    expect(cardDesign).toContain("event.data?.type === 'gauntlet-art-inspect'");
    expect(cardDesign).toContain("installEmbeddedArtworkBridge()");
  });

  it("returns Escape and backdrop clicks to the enlarged card before closing it", () => {
    expect(cardDesign).toContain("inspectionDialog.addEventListener('cancel'");
    expect(cardDesign).toContain("event.preventDefault();\n      closeArtworkInspection();");
    expect(cardDesign).toContain("if (artworkInspectionOpen) closeArtworkInspection();");
    expect(cardDesign).toContain("← Back to card");
  });

  it("shows the original image without cover cropping", () => {
    expect(lightboxStyles).toContain("object-fit: contain");
    expect(lightboxStyles).toContain("max-width: 100%");
    expect(lightboxStyles).toContain("max-height: calc(100vh - 6.5rem)");
    expect(lightboxStyles).toContain(".card-inspection-clone .art-inspectable");
    expect(lightboxStyles).toContain("pointer-events: auto");
  });
});
