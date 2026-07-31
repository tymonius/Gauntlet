import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const fittingScript = readFileSync("card-design/card-design.js", "utf8");
const refinementCss = readFileSync("card-design/card-design-refinement.css", "utf8");
const factionCss = readFileSync("card-design/faction-specimens.css", "utf8");

describe("adaptive card fitting", () => {
  it("checks the actual rules and footer boundaries", () => {
    expect(fittingScript).toContain("footerRect.bottom > interiorRect.bottom");
    expect(fittingScript).toContain("rules.scrollHeight > rules.clientHeight");
    expect(fittingScript).toContain("interior.scrollHeight > interior.clientHeight");
  });

  it("shrinks art first and rules typography only when still necessary", () => {
    const artLoop = fittingScript.indexOf("while (cardOverflows(card) && height > minimum)");
    const ruleLoop = fittingScript.indexOf("while (cardOverflows(card) && ruleScale > minimumScale)");
    expect(artLoop).toBeGreaterThan(-1);
    expect(ruleLoop).toBeGreaterThan(artLoop);
    expect(fittingScript).toContain("--rules-scale");
  });

  it("preserves a practical print-size floor", () => {
    expect(fittingScript).toContain("const DEFAULT_MINIMUM_RULE_SCALE = 0.93;");
    expect(fittingScript).toContain("Math.max(declared, DEFAULT_MINIMUM_RULE_SCALE)");
    expect(refinementCss).toContain("calc(7.05pt * var(--rules-scale))");
    expect(refinementCss).toContain("calc(5.45pt * var(--rules-scale))");
    expect(refinementCss).toContain("calc(5.65pt * var(--rules-scale))");
    expect(factionCss).not.toContain("--minimum-rules-scale: 0.7");
    expect(factionCss).not.toContain("4.35pt");
    expect(factionCss).not.toContain("ultra-dense-card");
  });
});
