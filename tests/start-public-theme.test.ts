import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync("start/index.html", "utf8");
const css = readFileSync("start/styles.css", "utf8");

function cssRule(selector: string) {
  const start = css.indexOf(`${selector}{`);
  expect(start, `${selector} should have an explicit CSS rule`).toBeGreaterThanOrEqual(0);
  const end = css.indexOf("}", start);
  return css.slice(start, end + 1);
}

describe("public Start page theme", () => {
  it("loads the public-theme stylesheet", () => {
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

  it("assigns typography by established project role", () => {
    expect(cssRule(".start-hero h1")).toContain("font-family:var(--font-display-web)");
    expect(cssRule(".section-heading h2")).toContain("font-family:var(--font-display-web)");
    expect(cssRule(".start-hero h1")).toContain("font-weight:500");

    expect(cssRule(".faction-choice strong")).toContain("font-family:var(--font-interface)");
    expect(cssRule(".leader-choice strong")).toContain("font-family:var(--font-interface)");

    expect(cssRule(".start-hero .hero-lede")).toContain("font-family:var(--font-reading)");
    expect(cssRule(".intro-card p,.intro-card li")).toContain("font-family:var(--font-reading)");

    expect(cssRule(".brand>span:last-child")).toContain("font-family:var(--font-display-historical)");
    expect(cssRule(".brand>span:last-child")).toContain("font-weight:400");
  });

  it("keeps black and gold reserved from the rendered public hero", () => {
    const publicTheme = css.slice(css.indexOf("/* Public Start page theme"));
    expect(publicTheme).not.toContain("#221f1b");
    expect(publicTheme).not.toContain("#d6b35f");
    expect(publicTheme).not.toContain("border-left:8px solid");
  });
});
