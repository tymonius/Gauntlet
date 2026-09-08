import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("playtest/tracked/session-controls.js", "utf8");

describe("tracked session end busy focus", () => {
  it("makes the session-end live status a programmatic focus target", () => {
    expect(source).toContain('id="sessionEndStatus" class="form-status" role="status" aria-live="polite" tabindex="-1"');
  });

  it("moves focus before disabling the active session-end control", () => {
    expect(source).toContain("const returnFocusTo = document.activeElement instanceof HTMLElement && controls.contains(document.activeElement)");
    expect(source).toContain('const busyStatus = controls.querySelector("#sessionEndStatus");');
    expect(source).toContain("busyStatus.focus({ preventScroll: true });\n    setBusy(true);");
  });

  it("returns focus on failure without overriding the successful closure transition", () => {
    expect(source).toContain("document.activeElement === busyStatus");
    expect(source).toContain("!controls.hidden");
    expect(source).toContain("returnFocusTo.focus({ preventScroll: true });");
  });
});
