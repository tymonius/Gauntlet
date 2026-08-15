import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("factions/factions.css", "utf8");

describe("faction-page symbol accent", () => {
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

  it("uses a very large, strongly offset opening accent rather than a centered fixed watermark", () => {
    expect(css).toContain("body.faction-page::after");
    expect(css).toContain("position: absolute");
    expect(css).toContain("right: -420px");
    expect(css).toContain("top: 110px");
    expect(css).toContain("width: min(92vw, 1320px)");
    expect(css).toContain("background: var(--faction)");
    expect(css).toContain("-webkit-mask: var(--faction-symbol) center / contain no-repeat");
    expect(css).toContain("mask: var(--faction-symbol) center / contain no-repeat");
    expect(css).toContain("opacity: .085");
    expect(css).toContain("pointer-events: none");
    expect(css).toContain("body.faction-page { overflow-x: hidden; }");
    expect(css).toContain("right: -430px; width: 860px");
    expect(css).not.toContain("position: fixed");
    expect(css).not.toContain("width: min(50vw, 640px)");
  });
});
