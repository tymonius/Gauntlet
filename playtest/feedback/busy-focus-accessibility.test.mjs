import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("playtest/feedback/app.js", "utf8");

describe("standalone feedback busy focus", () => {
  it("makes the submission status a programmatic live target", () => {
    expect(source).toContain('el.formStatus?.setAttribute("role", "status");');
    expect(source).toContain("el.formStatus.tabIndex = -1;");
  });

  it("moves focus to status before disabling the feedback form", () => {
    expect(source).toContain("const returnFocusTo = document.activeElement instanceof HTMLElement && el.feedbackForm.contains(document.activeElement)");
    expect(source).toContain('setStatus("Submitting feedback…");');
    expect(source).toContain("el.formStatus.focus({ preventScroll: true });\n    setBusy(true);");
  });

  it("returns focus on failure while preserving the successful confirmation focus", () => {
    expect(source).toContain("el.successPanel.focus({ preventScroll: true });");
    expect(source).toContain("document.activeElement === el.formStatus");
    expect(source).toContain("!el.feedbackForm.hidden");
    expect(source).toContain("returnFocusTo.focus({ preventScroll: true });");
  });
});
