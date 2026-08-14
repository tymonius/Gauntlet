import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync("start/index.html", "utf8");
const css = readFileSync("start/styles.css", "utf8");

describe("public Start page theme", () => {
  it("loads a cache-busted public-theme stylesheet", () => {
    expect(html).toContain('styles.css?v=20260731-2');
  });

  it("uses the main-site parchment and crimson visual language", () => {
    expect(css).toContain("Public Start page theme");
    expect(css).toContain("--start-red:var(--crimson)");
    expect(css).toContain("--start-gold:var(--bronze)");
    expect(css).toContain("background:transparent;color:var(--ink)");
    expect(css).toContain(".start-hero h1 span{color:var(--crimson)}");
    expect(css).toContain(".journey span{background:var(--crimson-dark)");
  });

  it("keeps the intended regular Georgia web-display role", () => {
    const displaySelectors = [
      ".start-hero h1",
      ".section-heading h2",
      ".overview-feature h3,.intro-overview h3",
      ".faction-choice strong",
      ".leader-choice strong",
      ".selected-choice h3",
      ".intro-card h3",
      ".print-action-card h3",
    ];

    for (const selector of displaySelectors) {
      const start = css.indexOf(`${selector}{`);
      expect(start, `${selector} should have an explicit CSS rule`).toBeGreaterThanOrEqual(0);
      const end = css.indexOf("}", start);
      const rule = css.slice(start, end + 1);
      expect(rule).toContain("font-family:var(--font-display-web)");
      expect(rule).toContain("font-weight:400");
    }

    expect(css).not.toContain("font-family:var(--font-display-historical)");
  });

  it("keeps black and gold reserved from the rendered public hero", () => {
    const publicTheme = css.slice(css.indexOf("/* Public Start page theme"));
    expect(publicTheme).not.toContain("#221f1b");
    expect(publicTheme).not.toContain("#d6b35f");
    expect(publicTheme).not.toContain("border-left:8px solid");
  });
});
