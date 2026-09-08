import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("playtest/analysis/refresh-focus-accessibility.js", "utf8");
const analysisHtml = readFileSync("playtest/analysis/index.html", "utf8");
const integrityHtml = readFileSync("playtest/analysis/integrity/index.html", "utf8");

describe("protected dashboard request focus", () => {
  it("loads the shared focus handoff on both protected dashboards", () => {
    expect(analysisHtml).toContain('<script src="refresh-focus-accessibility.js?v=20260903-1" defer></script>');
    expect(integrityHtml).toContain('<script src="../refresh-focus-accessibility.js?v=20260903-1" defer></script>');
  });

  it("makes protected request statuses programmatic focus targets", () => {
    expect(source).toContain('enhanceStatus(document.getElementById("accessStatus"))');
    expect(source).toContain('enhanceStatus(document.getElementById("dialogStatus"))');
    expect(source).toContain("enhanceStatus(connectionStatus);");
    expect(source).toContain('node.setAttribute("role", "status");');
    expect(source).toContain("node.tabIndex = -1;");
  });

  it("preserves the existing Refresh busy-state handoff", () => {
    expect(source).toContain("connectionStatus.focus({ preventScroll: true });");
    expect(source).toContain('if (!returnRefreshFocus || refresh.matches(":disabled")) return;');
    expect(source).toContain("if (document.activeElement === connectionStatus) refresh.focus({ preventScroll: true });");
    expect(source).toContain('observer.observe(refresh, { attributes: true, attributeFilter: ["disabled"] });');
  });

  it("covers unlock and exclusion forms without overriding successful transitions", () => {
    expect(source).toContain("accessForm: {");
    expect(source).toContain("excludeForm: {");
    expect(source).toContain('document.getElementById("analysisApp") || document.getElementById("integrityApp")');
    expect(source).toContain('successTarget: () => document.getElementById("excludedRecords")');
    expect(source).toContain("watchReturn(origin, config.status, config);");
    expect(source).toContain("if (contextVisible(context)) {");
    expect(source).toContain("focusSuccessTarget(config.successTarget?.());");
  });

  it("hands restore-record focus to status and handles either failure or rerender", () => {
    expect(source).toContain('closest("[data-restore-id]")');
    expect(source).toContain("connectionStatus.focus({ preventScroll: true });");
    expect(source).toContain('successTarget: () => document.getElementById("activeRecords")');
    expect(source).toContain('document.getElementById("excludedRecords")');
    expect(source).toContain("if (!control.isConnected) {");
  });
});
