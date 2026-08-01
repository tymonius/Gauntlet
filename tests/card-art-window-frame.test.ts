import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const refinementCss = readFileSync("card-design/card-design-refinement.css", "utf8");
const framePath = "images/artwork/card-frames/universal-mounted-art-frame.svg";
const frameSvg = readFileSync(framePath, "utf8");

describe("universal card art window", () => {
  it("uses one mounted-print plate surround for every playable card", () => {
    expect(existsSync(framePath)).toBe(true);
    expect(refinementCss).toContain("/* Universal mounted-print art window.");
    expect(refinementCss).toContain(`../${framePath}`);
    expect(refinementCss).toContain("isolation: isolate;");
    expect(refinementCss).toContain("border-radius: 0.025in;");
    expect(refinementCss).toContain(".card-art::after {");
  });

  it("provides a transparent double-rule frame with shaped corners", () => {
    expect(frameSvg).toContain('viewBox="0 0 1000 760"');
    expect(frameSvg).toContain('preserveAspectRatio="none"');
    expect(frameSvg).toContain('<g id="corner"');
    expect(frameSvg).toContain('<use href="#corner"');
    expect(frameSvg.match(/<path/g)?.length).toBeGreaterThanOrEqual(4);
    expect(frameSvg).not.toContain("<image");
    expect(frameSvg).not.toContain("<script");
  });

  it("preserves the established full-size cover crop", () => {
    expect(refinementCss).toContain(".card-art img {");
    expect(refinementCss).toContain("inset: 0;");
    expect(refinementCss).toContain("width: 100%;");
    expect(refinementCss).toContain("height: 100%;");
    expect(refinementCss).toContain("object-fit: cover;");
    expect(refinementCss).not.toContain(".card-art img {\n  position: absolute;\n  z-index: 0;\n  inset: 0.028in;");
  });

  it("does not use faction-specific frame selectors or assets", () => {
    expect(refinementCss).not.toContain('[data-faction=');
    expect(refinementCss).not.toContain("--art-frame-image");
    expect(refinementCss.match(/mounted-art-frame\.svg/g)?.length).toBe(1);
  });
});
