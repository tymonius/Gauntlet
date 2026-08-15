import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("deckbuilder/starter-handoff.css", "utf8");
const script = readFileSync("deckbuilder/starter-handoff.js", "utf8");

describe("starter handoff faction accent", () => {
  it("renders the imported faction symbol as a Start-style panel accent", () => {
    expect(css).toContain(".starter-handoff-panel::after");
    expect(css).toContain("background:var(--starter-faction-color");
    expect(css).toContain("-webkit-mask:var(--starter-faction-symbol)");
    expect(css).toContain("mask:var(--starter-faction-symbol)");
    expect(css).toContain("opacity:.085");
    expect(css).toContain("overflow:hidden");
  });

  it("binds the panel accent to the imported faction", () => {
    for (const faction of ["military", "diplomats", "financiers", "intelligence", "mystics", "inquisition"]) {
      expect(script).toContain(`${faction}:`);
    }
    expect(script).toContain('panel.style.setProperty("--starter-faction-color"');
    expect(script).toContain('panel.style.setProperty("--starter-faction-symbol"');
    expect(script).toContain('`url("../images/faction-symbols/${faction.id}.svg")`');
  });
});
