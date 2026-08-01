import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const refinementCss = readFileSync("card-design/card-design-refinement.css", "utf8");
const obsoleteFramePath = "images/artwork/card-frames/universal-mounted-art-frame.svg";

describe("universal card art window", () => {
  it("uses one clean mounted-print treatment for every playable card", () => {
    expect(refinementCss).toContain("/* Universal mounted-print art window.");
    expect(refinementCss).toContain("border: 1px solid rgba(54, 41, 29, 0.94);");
    expect(refinementCss).toContain("0 0 0 0.007in rgba(231, 212, 176, 0.78)");
    expect(refinementCss).toContain("0 0 0 0.012in rgba(65, 48, 32, 0.72)");
    expect(refinementCss).toContain("inset 0 0 0 0.008in");
    expect(refinementCss).toContain("inset 0 0 0 0.015in");
    expect(refinementCss).toContain("inset 0 0 0 0.022in");
  });

  it("preserves the established full-size cover crop", () => {
    expect(refinementCss).toContain(".card-art img {");
    expect(refinementCss).toContain("inset: 0;");
    expect(refinementCss).toContain("width: 100%;");
    expect(refinementCss).toContain("height: 100%;");
    expect(refinementCss).toContain("object-fit: cover;");
    expect(refinementCss).not.toContain(".card-art img {\n  position: absolute;\n  z-index: 0;\n  inset: 0.028in;");
  });

  it("contains no ornamental or faction-specific frame assets", () => {
    expect(existsSync(obsoleteFramePath)).toBe(false);
    expect(refinementCss).not.toContain(".svg");
    expect(refinementCss).not.toContain('[data-faction=');
    expect(refinementCss).not.toContain("--art-frame-image");
    expect(refinementCss).not.toContain("shaped corner");
  });
});
