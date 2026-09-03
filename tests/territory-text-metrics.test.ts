import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const territoryStyles = readFileSync("card-design/territory-card.css", "utf8");
const territoryRendererStyles = readFileSync("card-design/territory-card-renderer.css", "utf8");

describe("Territory effect layout", () => {
  it("lets effect text claim its natural height before artwork", () => {
    expect(territoryStyles).toContain("--art-height: 0.78in");
    expect(territoryStyles).toContain(".territory-body {");
    expect(territoryStyles).toContain("display: flex");
    expect(territoryStyles).toContain("flex-direction: column");
    expect(territoryStyles).toContain("min-height: var(--art-height)");
    expect(territoryStyles).toContain("overflow: visible");
    expect(territoryStyles).toContain("padding: 0.045in 0.07in 0.018in");
    expect(territoryStyles).toContain("line-height: 1.1");
    expect(territoryStyles).not.toContain("line-height: 1.18");
  });

  it("prevents mobile text inflation from collapsing the fixed-size artwork window", () => {
    expect(territoryRendererStyles).toContain("-webkit-text-size-adjust: none");
    expect(territoryRendererStyles).toContain("text-size-adjust: none");
    expect(territoryRendererStyles).toContain("width: 3.5in");
    expect(territoryRendererStyles).toContain("height: 2.5in");
  });
});
