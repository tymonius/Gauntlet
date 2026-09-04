import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function luminance(hex) {
  const channels = hex.match(/[0-9a-f]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
  const [r, g, b] = channels.map((value) => value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground, background) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

describe("Start starter-preview empty-state contrast", () => {
  it("uses the shared muted ink at normal-text contrast", () => {
    const startStyles = readFileSync("start/styles.css", "utf8");
    const polish = readFileSync("site-polish.css", "utf8");

    expect(startStyles).toContain(".starter-preview.empty-state{color:#69716f}");
    expect(polish).toContain(".starter-preview.empty-state");
    expect(polish).toContain("color: var(--muted, #655f56);");
    expect(contrastRatio("#655f56", "#f0eadf")).toBeGreaterThanOrEqual(4.5);
  });
});
