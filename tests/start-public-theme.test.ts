import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync("start/index.html", "utf8");
const css = readFileSync("start/styles.css", "utf8");
const siteCss = readFileSync("site.css", "utf8");
const app = readFileSync("start/app.js", "utf8");

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

  it("uses the sitewide v0.6.2-derived typography hierarchy", () => {
    expect(siteCss).toContain("--reading: var(--font-reading)");
    expect(siteCss).toContain("font-family: var(--reading)");
    expect(siteCss).toContain("font-family: var(--historical)");
    expect(siteCss).toContain("font-family: var(--sans)");

    expect(cssRule(".start-hero h1")).toContain("font-family:var(--font-display-web)");
    expect(cssRule(".section-heading h2")).toContain("font-family:var(--font-display-web)");
    expect(cssRule(".faction-choice strong")).toContain("font-family:var(--font-display-web)");
    expect(cssRule(".start-hero .hero-lede")).toContain("font-family:var(--font-reading)");
    expect(cssRule(".leader-choice strong")).toContain("font-family:var(--font-display-historical)");
    expect(cssRule("fieldset legend")).toContain("font-family:var(--font-interface)");
    expect(cssRule(".starter-preview .starter-meta span")).toContain("font-family:var(--font-interface)");
  });

  it("renders faction symbols in faction color and all twelve approved leader portraits", () => {
    expect(cssRule(".choice-mark.faction-symbol-asset")).toContain("color:var(--faction)");

    const portraitUrls = [...app.matchAll(/portrait:\s*"(\/images\/[^"]+)"/g)].map(match => match[1]);
    expect(portraitUrls).toHaveLength(12);
    for (const url of portraitUrls) {
      expect(existsSync(decodeURIComponent(url.replace(/^\//, ""))), `${url} should resolve to a checked-in portrait`).toBe(true);
    }
    expect(app).toContain('portrait.className = "leader-portrait"');
  });

  it("keeps black and gold reserved from the rendered public hero", () => {
    const publicTheme = css.slice(css.indexOf("/* Public Start page theme"));
    expect(publicTheme).not.toContain("#221f1b");
    expect(publicTheme).not.toContain("#d6b35f");
    expect(publicTheme).not.toContain("border-left:8px solid");
  });
});
