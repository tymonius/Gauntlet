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

  it("uses the imported faction color for the panel border, including ready state", () => {
    expect(css).toContain("border-top:6px solid var(--starter-faction-color,#8f1f25)");
    expect(css).toContain(".starter-handoff-panel.is-ready{border-top-color:var(--starter-faction-color,#8f1f25)}");
    expect(css).not.toContain(".starter-handoff-panel.is-ready{border-top-color:#2b7551}");
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
