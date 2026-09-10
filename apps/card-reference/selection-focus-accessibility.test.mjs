import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("card-reference/app.js", "utf8");

describe("card reference selection accessibility", () => {
  it("restores focus to the replacement row after selection rerenders the list", () => {
    expect(source).toContain("const restoreResultFocus = document.activeElement instanceof HTMLElement");
    expect(source).toContain("document.activeElement.classList.contains('reference-row')");
    expect(source).toContain("el.resultList.querySelector('.reference-row.selected')?.focus({ preventScroll: true });");
  });

  it("clears stale preview naming when filters leave no selected entry", () => {
    expect(source).toContain("el.preview.removeAttribute('aria-label');");
  });
});
