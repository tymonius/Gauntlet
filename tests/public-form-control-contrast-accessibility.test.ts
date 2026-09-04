import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const polish = readFileSync("site-polish.css", "utf8");

function luminance(hex: string): number {
  const rgb = hex.match(/[a-f\d]{2}/gi)?.map((part) => Number.parseInt(part, 16) / 255) || [];
  const linear = rgb.map((channel) => channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrast(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

describe("public form control boundary contrast", () => {
  it("uses a boundary tone with at least 3:1 contrast on the darkest common parchment", () => {
    expect(contrast("#8a7b68", "#f3eddf")).toBeGreaterThanOrEqual(3);
  });

  it("covers the light-field public forms that otherwise rely on low-contrast borders", () => {
    for (const selector of [
      ".contact-form",
      ".filter-panel",
      ".arbiter-form textarea",
      ".app-shell",
      ".tracked-main",
      ".session-main",
    ]) {
      expect(polish).toContain(selector);
    }
    expect(polish).toContain("border-color: #8a7b68;");
  });
});
