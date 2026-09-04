import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function luminance(hex: string): number {
  const channels = hex.match(/[0-9a-f]{2}/gi)?.map((value) => Number.parseInt(value, 16) / 255) || [];
  const [r, g, b] = channels.map((value) => value <= 0.04045
    ? value / 12.92
    : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground: string, background: string): number {
  const light = Math.max(luminance(foreground), luminance(background));
  const dark = Math.min(luminance(foreground), luminance(background));
  return (light + 0.05) / (dark + 0.05);
}

describe("Inquisition faction text contrast", () => {
  it("uses a readable ochre for text while leaving decorative faction color available", () => {
    const css = readFileSync("site-polish.css", "utf8");
    for (const selector of [
      ".faction-card.inquisition small",
      ".faction-page.faction-inquisition .faction-facts dt",
      ".faction-page.faction-inquisition .section-heading .eyebrow",
      ".faction-page.faction-inquisition .leader-kicker",
      ".faction-hub-card.faction-inquisition .hub-kicker",
      ".faction-hub-card.faction-inquisition strong"
    ]) {
      expect(css).toContain(selector);
    }
    expect(css).toContain("color: #815c1c;");

    // #ede4d4 is the darkest endpoint of the public site's parchment body gradient.
    // Translucent faction-card surfaces render lighter than this conservative case.
    expect(contrastRatio("#815c1c", "#ede4d4")).toBeGreaterThanOrEqual(4.5);
  });
});
