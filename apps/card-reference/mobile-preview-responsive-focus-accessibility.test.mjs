import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("card-reference/mobile-card-preview.js", "utf8");

describe("Card Reference responsive preview focus", () => {
  it("restores result focus for explicit modal closes", () => {
    expect(source).toContain("function closePreview(restoreFocus = true)");
    expect(source).toContain("if (!restoreFocus) return;");
    expect(source).toContain("selectedRow.focus({ preventScroll: true });");
  });

  it("does not steal focus when the responsive breakpoint changes to desktop", () => {
    expect(source).toContain("closePreview(false);");
  });
});
