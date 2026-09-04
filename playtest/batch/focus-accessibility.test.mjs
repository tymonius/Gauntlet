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

  it("moves focus to status before disabling the active generation form", () => {
    expect(source).toContain("el.generationStatus.tabIndex = -1;");
    expect(source).toContain("const busyReturnTarget = document.activeElement instanceof HTMLElement && el.batchForm.contains(document.activeElement)");
    expect(source).toContain('el.generationStatus.focus({ preventScroll: true });');
    const focusIndex = source.indexOf('el.generationStatus.focus({ preventScroll: true });');
    const busyIndex = source.indexOf('setBusy(true);');
    expect(focusIndex).toBeGreaterThan(-1);
    expect(focusIndex).toBeLessThan(busyIndex);
  });

  it("restores the originating form control after a total generation failure", () => {
    expect(source).toContain('if (el.resultPanel.hidden && busyReturnTarget?.isConnected) busyReturnTarget.focus({ preventScroll: true });');
  });
});
