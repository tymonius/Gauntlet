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

describe("homepage faction label contrast", () => {
  it("keeps the Inquisition text label above WCAG AA normal-text contrast", () => {
    const css = readFileSync("site-polish.css", "utf8");
    expect(css).toContain(".faction-card.inquisition small");
    expect(css).toContain("color: #815c1c;");

    // The card's translucent #fffcf4 surface over the darkest homepage parchment
    // resolves to approximately #f6f0e4; test that conservative rendered surface.
    expect(contrastRatio("#815c1c", "#f6f0e4")).toBeGreaterThanOrEqual(4.5);
  });
});
