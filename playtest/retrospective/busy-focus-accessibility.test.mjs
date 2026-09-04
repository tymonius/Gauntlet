import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("playtest/retrospective/app.js", "utf8");

describe("retrospective creation focus", () => {
  it("makes the creation status a programmatic live target", () => {
    expect(source).toContain('status?.setAttribute("role", "status");');
    expect(source).toContain("status.tabIndex = -1;");
  });

  it("moves focus to status before disabling the submit control", () => {
    expect(source).toContain("const returnFocusTo = document.activeElement instanceof HTMLElement && form.contains(document.activeElement)");
    expect(source).toContain('status.textContent = "Creating the retrospective record…";');
    expect(source).toContain("status.focus({ preventScroll: true });\n    submit.disabled = true;");
  });

  it("returns focus after creation failure while successful creation navigates away", () => {
    expect(source).toContain("submit.disabled = false;");
    expect(source).toContain("document.activeElement === status");
    expect(source).toContain("returnFocusTo.focus({ preventScroll: true });");
    expect(source).toContain("window.location.assign(payload.reviewUrl);");
  });
});
