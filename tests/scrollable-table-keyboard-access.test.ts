import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("keyboard access to horizontally scrollable tables", () => {
  it("makes generated Rulebook table wrappers focusable", () => {
    const markdown = readFileSync("rulebook/markdown.js", "utf8");
    expect(markdown).toContain('<div class="table-scroll" tabindex="0"><table>');
  });

  it("makes the onboarding roster table wrapper focusable", () => {
    const html = readFileSync("playtest/onboarding/index.html", "utf8");
    expect(html).toContain('<div class="table-wrap" tabindex="0">');
  });
});
