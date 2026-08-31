import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const printSummaryTransform = readFileSync("deckbuilder/print-summary.js", "utf8");

describe("Deckbuilder print intro summary", () => {
  it("locks the intro and first card rows to the physical first-page geometry", () => {
    expect(printSummaryTransform).toContain("grid-template-rows:3.5in 7in!important");
    expect(printSummaryTransform).toContain("height:3.5in!important");
    expect(printSummaryTransform).toContain("height:7in!important");
    expect(printSummaryTransform).toContain("overflow:hidden!important");
  });

  it("uses the approved Gauntlet typography roles with comfortable non-clipping leading", () => {
    expect(printSummaryTransform).toContain("https://use.typekit.net/vgm6nwi.css");
    expect(printSummaryTransform).toContain('font-family:"p22-1722-pro"');
    expect(printSummaryTransform).toContain('font-family:"adobe-caslon-pro"');
    expect(printSummaryTransform).toContain("font-family:Inter,ui-sans-serif");
    expect(printSummaryTransform).toContain('content:"GAUNTLET · DECK PACKAGE"');
    expect(printSummaryTransform).toContain("line-height:1.28!important");
    expect(printSummaryTransform).toContain("line-height:1.3!important");
    expect(printSummaryTransform).not.toContain("line-height:1!important\n}");
  });

  it("uses the available summary height for starter guidance and the deck list", () => {
    expect(printSummaryTransform).toContain(".first-page-summary.has-starter-strategy");
    expect(printSummaryTransform).toContain("grid-template-rows:auto auto auto minmax(0,1fr)!important");
    expect(printSummaryTransform).toContain(".first-page-summary.has-starter-strategy .starter-print-strategy");
    expect(printSummaryTransform).toContain("max-height:.86in!important");
    expect(printSummaryTransform).toContain("font-size:6.2pt!important");
    expect(printSummaryTransform).toContain("line-height:1.28!important");
    expect(printSummaryTransform).toContain(".first-page-summary.has-starter-strategy .deck-list");
    expect(printSummaryTransform).toContain("height:1.72in!important");
    expect(printSummaryTransform).not.toContain("max-height:.66in!important");
    expect(printSummaryTransform).not.toContain("height:1.36in!important");
  });

  it("keeps the recommended Territory row top-aligned with a safe heading line box", () => {
    expect(printSummaryTransform).toContain(".first-page-summary.has-starter-strategy .starter-print-territories{");
    expect(printSummaryTransform).toContain("align-items:start!important");
    expect(printSummaryTransform).toContain("padding-top:.04in!important");
    expect(printSummaryTransform).toContain(".first-page-summary.has-starter-strategy .starter-print-territories h2{");
    expect(printSummaryTransform).toContain("min-height:.11in!important");
    expect(printSummaryTransform).toContain("padding:.006in 0 0!important");
    expect(printSummaryTransform).toContain("line-height:1.3!important");
  });

  it("starts at readable spacing and tightens only when measured overflow requires it", () => {
    expect(printSummaryTransform).not.toContain('summary.classList.add("summary-dense")');
    expect(printSummaryTransform).not.toContain('summary.classList.add("summary-very-dense")');
    expect(printSummaryTransform).toContain(".deck-list, .summary-side, .starter-print-strategy");
    expect(printSummaryTransform).toContain("node.scrollHeight > node.clientHeight + 1");
    expect(printSummaryTransform).toContain("summary-auto-tight");
    expect(printSummaryTransform).toContain("summary-auto-tightest");
    expect(printSummaryTransform).toContain("document.fonts?.ready");
    expect(printSummaryTransform).toContain("font-size:5.65pt!important");
    expect(printSummaryTransform).toContain("line-height:1.2!important");
    expect(printSummaryTransform).not.toContain("line-height:1.13!important");
    expect(printSummaryTransform).not.toContain("font-size:5.45pt!important");
  });
});
