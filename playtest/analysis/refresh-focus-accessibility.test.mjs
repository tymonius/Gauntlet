import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("playtest/analysis/refresh-focus-accessibility.js", "utf8");
const analysisHtml = readFileSync("playtest/analysis/index.html", "utf8");
const integrityHtml = readFileSync("playtest/analysis/integrity/index.html", "utf8");

describe("protected dashboard refresh focus", () => {
  it("loads the focus handoff on both protected dashboards", () => {
    expect(analysisHtml).toContain('<script src="refresh-focus-accessibility.js?v=20260903-1" defer></script>');
    expect(integrityHtml).toContain('<script src="../refresh-focus-accessibility.js?v=20260903-1" defer></script>');
  });

  it("moves focus to refresh status before the button is disabled", () => {
    expect(source).toContain('document.addEventListener("click", (event) => {');
    expect(source).toContain('status.focus({ preventScroll: true });');
    expect(source).toContain('}, true);');
  });

  it("returns focus to Refresh after the async operation re-enables it", () => {
    expect(source).toContain('function restoreRefreshFocus()');
    expect(source).toContain('if (!returnFocus || refresh.disabled) return;');
    expect(source).toContain('refresh.focus({ preventScroll: true });');
    expect(source).toContain('observer.observe(refresh, { attributes: true, attributeFilter: ["disabled"] });');
  });
});
