import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

function rgb(hex) {
  return hex.match(/[0-9a-f]{2}/gi).map((value) => Number.parseInt(value, 16));
}

function mix(foreground, background, weight) {
  return rgb(foreground).map((value, index) => Math.round(value * weight + rgb(background)[index] * (1 - weight)));
}

function luminance(channels) {
  const [r, g, b] = channels.map((value) => {
    const channel = value / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(foreground, background) {
  const light = Math.max(luminance(foreground), luminance(rgb(background)));
  const dark = Math.min(luminance(foreground), luminance(rgb(background)));
  return (light + 0.05) / (dark + 0.05);
}

describe("tracked faction status text contrast", () => {
  it("keeps the canonical Inquisition ochre while deriving an accessible status-text tone", () => {
    const app = readFileSync("playtest/tracked/app.js", "utf8");
    const trackedCss = readFileSync("playtest/tracked/styles.css", "utf8");
    const polishCss = readFileSync("site-polish.css", "utf8");

    expect(app).toContain('inquisition: { name: "Inquisition", color: "#a67a27"');
    expect(trackedCss).toContain('color:var(--faction,#555)');
    expect(polishCss).toContain(".tracked-main .player-card .response-state");
    expect(polishCss).toContain("color-mix(in srgb, var(--faction, #555) 85%, var(--ink, #181614) 15%)");

    const inquisitionText = mix("#a67a27", "#181614", 0.85);
    // Conservative rendered player-card surface: translucent parchment over the darkest page parchment.
    expect(contrastRatio(inquisitionText, "#fcf8ee")).toBeGreaterThanOrEqual(4.5);
  });
});
