import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync("card-design/index.html", "utf8");
const css = readFileSync("card-design/card-back.css", "utf8");
const renderer = readFileSync("card-design/card-back.js", "utf8");

describe("universal playable-card back", () => {
  it("is present in the card review catalog through the reusable back component", () => {
    expect(html).toContain('href="#card-back"');
    expect(html).toContain('id="card-back"');
    expect(html).toContain('data-gauntlet-card-back');
    expect(html).toContain('href="card-back.css"');
    expect(html).toContain('src="card-back.js"');
  });

  it("uses the approved portrait geometry, Intelligence-style charcoal border, and rounded pale-gold frame", () => {
    expect(css).toContain("width: 2.5in;");
    expect(css).toContain("height: 3.5in;");
    expect(css).toContain("--card-back-charcoal: #202124;");
    expect(css).toContain("--card-back-border: #282827;");
    expect(css).toContain("--card-back-border-outline: #111111;");
    expect(css).toContain("--card-back-border-rule: rgba(255, 255, 250, 0.34);");
    expect(css).toContain("inset: 0.075in;");
    expect(css).toContain("inset: calc(0.25in - 1px);");
    expect(css).toContain("--card-back-gold: var(--developer-gold-soft, #d7b783);");
    expect(css).toContain("border-radius: 0.125in;");
  });

  it("uses the approved Gauntlet vector as a clockwise-rotated white wordmark with frame breathing room", () => {
    expect(css).toContain('mask: url("../images/Gauntlet.svg") center / contain no-repeat;');
    expect(css).toContain("background: #fff;");
    expect(css).toContain("width: 2.45in;");
    expect(css).toContain("transform: translate(-50%, -50%) rotate(90deg);");
    expect(css).toContain("aspect-ratio: 1871.79 / 493.58;");
  });

  it("clips one tightly packed, overscanned, interlocked tiling field inside the opaque border", () => {
    for (const faction of [
      "military",
      "diplomats",
      "financiers",
      "intelligence",
      "mystics",
      "inquisition",
    ]) {
      expect(renderer).toContain(`'${faction}'`);
      expect(css).toContain(`../images/faction-symbols/${faction}.svg`);
    }
    expect(renderer).toContain("const PATTERN_ROWS = 36;");
    expect(renderer).toContain("const PATTERN_COLUMNS = 36;");
    expect(renderer).toContain('class="gauntlet-card-back__pattern-window"');
    expect(css).toMatch(/\.gauntlet-card-back__pattern-window\s*\{[^}]*inset: 0\.075in;[^}]*overflow: hidden;/s);
    expect(css).toContain("width: 5.4in;");
    expect(css).toContain("height: 5.4in;");
    expect(css).toContain("grid-template-rows: repeat(36, 0.132in);");
    expect(css).toContain("grid-template-columns: repeat(36, 0.145in);");
    expect(css).toContain("transform: translate(-50%, -50%) rotate(78deg);");
    expect(css).toContain("translateX(0.0725in)");
    expect(css).toContain("translateX(0.03625in)");
    expect(css).toContain("translateX(0.10875in)");
    expect(css).toContain("width: 0.135in;");
    expect(css).toContain("--card-back-pattern: rgba(0, 0, 0, 0.42);");
    expect(css).not.toMatch(/\.gauntlet-card-back__symbol\s*\{[^}]*rotate\(/s);
  });
});
