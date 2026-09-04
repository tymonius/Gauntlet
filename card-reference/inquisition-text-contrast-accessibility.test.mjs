import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function luminance(hex) {
  const values = hex.match(/[0-9a-f]{2}/gi).map((value) => Number.parseInt(value, 16) / 255);
  const [r, g, b] = values.map((value) => value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground, background) {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

describe("Card Reference Inquisition text contrast", () => {
  it("keeps canonical ochre for accents while using an accessible preview-kicker text tone", () => {
    const styles = readFileSync("card-reference/styles.css", "utf8");
    const factionColors = readFileSync("card-reference/faction-colors.css", "utf8");

    expect(styles).toContain('--preview-accent: #a67a27;');
    expect(factionColors).toContain('.reference-preview[data-faction="inquisition"] .preview-kicker');
    expect(factionColors).toContain('color: #815c1c;');
    expect(contrastRatio("#815c1c", "#f3eddf")).toBeGreaterThanOrEqual(4.5);
  });
});
