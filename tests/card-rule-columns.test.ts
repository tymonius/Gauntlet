import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const parchmentStyles = readFileSync("card-design/card-parchment.css", "utf8");
const ruleColumnStyles = readFileSync("card-design/card-rule-columns.css", "utf8");

describe("shared portrait-card rule columns", () => {
  it("loads the content-aware column policy on every production portrait card", () => {
    expect(parchmentStyles).toContain('@import url("card-rule-columns.css")');
    expect(ruleColumnStyles).toContain(".gauntlet-card .card-rules:has(> :is(.rule-section, .leader-rule-section, .rite-unlock-section))");
    expect(ruleColumnStyles).toContain("grid-template-columns: fit-content(var(--rule-label-max)) minmax(0, 1fr)");
    expect(ruleColumnStyles).toContain("grid-template-columns: subgrid !important");
    expect(ruleColumnStyles).toContain(".card-rules > :is(.card-reminder, .rite-reminder)");
  });

  it("keeps one aligned dynamic heading track per card with type-specific safety caps", () => {
    for (const selector of [".proposal-card", ".rite-card", ".leader-card", ".completed-rite-card", ".overlay-card"]) {
      expect(ruleColumnStyles).toContain(selector);
    }
    expect(ruleColumnStyles).toContain("--rule-label-max: 0.68in");
    expect(ruleColumnStyles).toContain("--rule-label-max: 0.72in");
    expect(ruleColumnStyles).toContain("--rule-label-max: 0.54in");
    expect(ruleColumnStyles).toContain("--rule-column-gap: 0.018in");
    expect(ruleColumnStyles).toContain("--rule-label-max: 0.48in");
    expect(ruleColumnStyles).toContain("--rule-label-max: 0.60in");
    expect(ruleColumnStyles).not.toContain("--rule-label-max: 0.63in");
    expect(ruleColumnStyles).toContain("grid-column: 1 / -1");
  });
});
