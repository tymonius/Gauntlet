import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const printSummaryTransform = readFileSync("deckbuilder/print-window-portrait-fixes.js", "utf8");

describe("Deckbuilder print intro summary", () => {
  it("locks the intro and first card rows to the physical first-page geometry", () => {
    expect(printSummaryTransform).toContain("grid-template-rows:3.5in 7in!important");
    expect(printSummaryTransform).toContain("height:3.5in!important");
    expect(printSummaryTransform).toContain("height:7in!important");
    expect(printSummaryTransform).toContain("overflow:hidden!important");
  });

  it("uses the approved Gauntlet typography roles", () => {
    expect(printSummaryTransform).toContain("https://use.typekit.net/vgm6nwi.css");
    expect(printSummaryTransform).toContain('font-family:"p22-1722-pro"');
    expect(printSummaryTransform).toContain('font-family:"adobe-caslon-pro"');
    expect(printSummaryTransform).toContain("font-family:Inter,ui-sans-serif");
    expect(printSummaryTransform).toContain('content:"GAUNTLET · DECK PACKAGE"');
  });

  it("tightens unusually dense summaries instead of allowing them to collide with cards", () => {
    expect(printSummaryTransform).toContain('summary.classList.add("summary-dense")');
    expect(printSummaryTransform).toContain('summary.classList.add("summary-very-dense")');
    expect(printSummaryTransform).toContain("summary.scrollHeight <= summary.clientHeight + 1");
    expect(printSummaryTransform).toContain("summary-auto-tight");
    expect(printSummaryTransform).toContain("summary-auto-tightest");
    expect(printSummaryTransform).toContain("document.fonts?.ready");
  });
});
