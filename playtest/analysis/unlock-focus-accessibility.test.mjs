import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("playtest/analysis/focus-accessibility.js", "utf8");
const html = readFileSync("playtest/analysis/index.html", "utf8");

describe("analysis unlock focus", () => {
  it("loads the focus handoff on the protected analysis page", () => {
    expect(html).toContain('<script src="focus-accessibility.js?v=20260903-1" defer></script>');
  });

  it("moves focus from the hidden credential panel into the revealed analysis app", () => {
    expect(source).toContain("analysisApp.tabIndex = -1;");
    expect(source).toContain("if (!accessPanel.hidden || analysisApp.hidden) return;");
    expect(source).toContain("if (accessPanel.contains(document.activeElement))");
    expect(source).toContain("analysisApp.focus({ preventScroll: true });");
  });
});
