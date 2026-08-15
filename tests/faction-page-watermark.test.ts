import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("factions/factions.css", "utf8");

describe("faction-page background watermark", () => {
  it("binds every faction to its canonical symbol asset", () => {
    for (const faction of [
      "military",
      "diplomats",
      "financiers",
      "intelligence",
      "mystics",
      "inquisition",
    ]) {
      expect(css).toContain(`--faction-symbol: url("/images/faction-symbols/${faction}.svg")`);
    }
  });

  it("renders one very large, low-opacity faction-colored symbol behind each faction guide", () => {
    expect(css).toContain("body.faction-page::after");
    expect(css).toContain("width: min(115vmin, 1250px)");
    expect(css).toContain("background: var(--faction)");
    expect(css).toContain("-webkit-mask: var(--faction-symbol) center / contain no-repeat");
    expect(css).toContain("mask: var(--faction-symbol) center / contain no-repeat");
    expect(css).toContain("opacity: .045");
    expect(css).toContain("pointer-events: none");
    expect(css).toContain("z-index: 0");
  });
});
