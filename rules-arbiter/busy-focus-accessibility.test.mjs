import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("rules-arbiter/app.js", "utf8");

describe("standalone Rules Arbiter busy focus", () => {
  it("makes the live request status programmatically focusable", () => {
    expect(source).toContain("status.tabIndex = -1;");
  });

  it("moves focus before disabling the active question form", () => {
    expect(source).toContain("const restoreInputFocus = form.contains(document.activeElement);");
    expect(source).toContain('status.textContent = "Checking the current v0.7.1 rules…";');
    expect(source).toContain("if (restoreInputFocus) status.focus({ preventScroll: true });");

    const focusIndex = source.indexOf("if (restoreInputFocus) status.focus");
    const busyIndex = source.indexOf("setBusy(true);");
    expect(focusIndex).toBeGreaterThan(-1);
    expect(focusIndex).toBeLessThan(busyIndex);
  });

  it("returns focus to the question after the request finishes", () => {
    expect(source).toContain("setBusy(false);\n    status.textContent = READY_STATUS;\n    if (restoreInputFocus) input.focus({ preventScroll: true });");
  });
});
