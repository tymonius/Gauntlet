import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("playtest/batch/app.js", "utf8");
const html = readFileSync("playtest/batch/index.html", "utf8");

describe("coded playtest batch focus", () => {
  it("moves focus to newly revealed results", () => {
    expect(html).toContain('id="resultPanel" class="generator-panel result-panel" hidden tabindex="-1" aria-labelledby="resultTitle"');
    expect(html).toContain('<h2 id="resultTitle"><span id="resultCount">0</span> coded sheets generated</h2>');
    expect(source).toContain('el.resultPanel.focus({ preventScroll: true });');
  });

  it("returns focus to the generation control after clearing the focused result panel", () => {
    expect(source).toContain('el.resultPanel.hidden = true;');
    expect(source).toContain('el.generateButton.focus({ preventScroll: true });');
  });
});
