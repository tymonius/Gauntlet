import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const refinementCss = readFileSync("card-design/card-design-refinement.css", "utf8");

describe("universal card art window", () => {
  it("uses one restrained mounted-print treatment for every playable card", () => {
    expect(refinementCss).toContain("/* Universal mounted-print art window.");
    expect(refinementCss).toContain("border-radius: 0.035in;");
    expect(refinementCss).toContain("inset 0 0 0 0.01in");
    expect(refinementCss).toContain("inset 0 0 0 0.019in");
    expect(refinementCss).toContain("0 0.012in 0.026in");
  });

  it("preserves the established full-size cover crop", () => {
    expect(refinementCss).toContain(".card-art img {");
    expect(refinementCss).toContain("inset: 0;");
    expect(refinementCss).toContain("width: 100%;");
    expect(refinementCss).toContain("height: 100%;");
    expect(refinementCss).toContain("object-fit: cover;");
    expect(refinementCss).not.toContain("width: auto;\n  height: auto;\n  border-radius");
  });

  it("does not reintroduce faction-specific art frames", () => {
    expect(refinementCss).not.toContain("card-art-frames.css");
    expect(refinementCss).not.toContain("art-frame.svg");
    expect(refinementCss).not.toContain('[data-faction=');
    expect(refinementCss).not.toContain("--art-frame-image");
  });
});
