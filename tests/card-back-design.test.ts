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
    expect(css).toContain("inset: 0.375in;");
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

  it("rotates one dense tiling field while keeping the faction symbols themselves untransformed and darker than the field", () => {
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
    expect(renderer).toContain("const PATTERN_ROWS = 19;");
    expect(renderer).toContain("const PATTERN_COLUMNS = 14;");
    expect(css).toContain("inset: -0.55in;");
    expect(css).toContain("grid-template-rows: repeat(19, 1fr);");
    expect(css).toContain("grid-template-columns: repeat(14, 1fr);");
    expect(css).toContain("transform: rotate(-12deg);");
    expect(css).toContain("width: 0.135in;");
    expect(css).toContain("--card-back-pattern: rgba(0, 0, 0, 0.24);");
    expect(css).not.toMatch(/\.gauntlet-card-back__symbol\s*\{[^}]*rotate\(/s);
  });
});
