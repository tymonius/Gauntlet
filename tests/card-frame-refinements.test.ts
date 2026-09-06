import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const refinementCss = readFileSync("card-design/card-design-refinement.css", "utf8");
const renderer = readFileSync("card-design/playable-card-renderer.js", "utf8");

describe("card frame refinements", () => {
  it("widens only Placement section label columns", () => {
    expect(renderer).toContain("const placement = normalizedLabel === 'placement';");
    expect(renderer).toContain("${placement ? ' placement-section' : ''}");
    expect(refinementCss).toMatch(/\.rule-section\.placement-section\s*\{[\s\S]*?grid-template-columns:\s*0\.57in minmax\(0, 1fr\);/);
    expect(refinementCss).toMatch(/\.overlay-card \.rule-section\s*\{[\s\S]*?grid-template-columns:\s*0\.38in minmax\(0, 1fr\);/);
    expect(refinementCss).toMatch(/\.rule-section\s*\{[\s\S]*?grid-template-columns:\s*0\.43in minmax\(0, 1fr\);/);
  });

  it("uses the darker approved standard metadata tint", () => {
    expect(refinementCss).toMatch(/\.card-footer\s*\{[\s\S]*?background:\s*rgba\(177, 139, 83, 0\.30\);/);
  });
});
