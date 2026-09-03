import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("playtest/analysis/integrity/app.js", "utf8");

describe("integrity transition focus", () => {
  it("makes rebuilt integrity regions programmatically focusable", () => {
    expect(source).toContain("for (const target of [el.integrityApp, el.activeRecords, el.excludedRecords])");
    expect(source).toContain("if (target) target.tabIndex = -1;");
  });

  it("moves focus into the protected app after unlock", () => {
    expect(source).toContain("focusRegion(el.integrityApp);");
  });

  it("moves focus to the destination dataset after exclusion and restore", () => {
    expect(source).toContain("focusRegion(el.excludedRecords);");
    expect(source).toContain("focusRegion(el.activeRecords);");
  });

  it("uses a stable region focus helper", () => {
    expect(source).toContain("function focusRegion(target)");
    expect(source).toContain("target.focus({ preventScroll: true });");
    expect(source).toContain('target.scrollIntoView({ behavior: "smooth", block: "start" });');
  });
});
