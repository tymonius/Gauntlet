import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const parchmentStyles = readFileSync("card-design/card-parchment.css", "utf8");
const adaptiveHeightStyles = readFileSync("card-design/card-adaptive-height.css", "utf8");
const ruleColumnStyles = readFileSync("card-design/card-rule-columns.css", "utf8");

describe("adaptive vertical card layout", () => {
  it("loads the shared vertical-space policy", () => {
    expect(parchmentStyles).toContain('@import url("card-adaptive-height.css")');
  });

  it("converts recovered text height into artwork only up to the fitter cap", () => {
    expect(adaptiveHeightStyles).toContain("var(--art-height)");
    expect(adaptiveHeightStyles).not.toContain("minmax(var(--art-height), 1fr)");
    expect(adaptiveHeightStyles).toContain("max-content");
    expect(adaptiveHeightStyles).toContain("minmax(0, 1fr)");
    expect(adaptiveHeightStyles).toContain("grid-row: 5");
    expect(adaptiveHeightStyles).toContain(":is(.leader-card, .proposal-card, .rite-card) .card-interior");
    expect(adaptiveHeightStyles).toContain("var(--component-heading-height, 0.50in)");
  });

  it("keeps the TTS text-only emergency fallback truly text-only", () => {
    expect(adaptiveHeightStyles).toContain(".tts-text-only .card-interior");
    expect(adaptiveHeightStyles).toMatch(/0\s*\n\s*max-content/);
  });

  it("does not let Leader headings reserve the old oversized label track", () => {
    expect(ruleColumnStyles).toContain(".leader-card");
    expect(ruleColumnStyles).toContain("--rule-label-max: 0.68in");
    expect(ruleColumnStyles).toContain("--rule-column-gap: 0.026in");
    expect(ruleColumnStyles).not.toContain("--rule-label-max: 0.78in");
  });
});
