import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync("card-design/index.html", "utf8");
const css = readFileSync("card-design/card-back.css", "utf8");
const renderer = readFileSync("card-design/card-back.js", "utf8");
const frontCss = readFileSync("card-design/card-design.css", "utf8");
const factionCss = readFileSync("card-design/faction-specimens.css", "utf8");

describe("universal playable-card back", () => {
  it("is present in the card review catalog through the reusable back component", () => {
    expect(html).toContain('href="#card-back"');
    expect(html).toContain('id="card-back"');
    expect(html).toContain('data-gauntlet-card-back');
    expect(html).toContain('href="card-back.css"');
    expect(html).toContain('src="card-back.js"');
    expect(html).toContain("0.75pt pale-gold line inset one-quarter inch");
  });

  it("uses the approved portrait geometry and exactly mirrors the Intelligence front frame system", () => {
    expect(css).toContain("width: 2.5in;");
    expect(css).toContain("height: 3.5in;");
    expect(css).toContain("--card-back-charcoal: #202124;");

    for (const token of [
      "--card-back-border: #282827;",
      "--card-back-border-outline: #111111;",
      "--card-back-border-rule: rgba(255, 255, 250, 0.34);",
    ]) expect(css).toContain(token);

    for (const token of [
      "--faction-border: #282827;",
      "--faction-border-outline: #111111;",
      "--faction-border-rule: rgba(255, 255, 250, 0.34);",
    ]) expect(factionCss).toContain(token);

    expect(frontCss).toContain("padding: 0.075in;");
    expect(frontCss).toContain("border: 1px solid rgba(47, 37, 28, 0.48);");
    expect(frontCss).toContain("border-radius: 0.125in;");
    expect(frontCss).toContain("inset: 0.03in;");
    expect(frontCss).toContain("border: 0.5px solid rgba(74, 57, 42, 0.22);");
    expect(frontCss).toContain("border-radius: 0.09in;");
    expect(frontCss).toContain("border: 1px solid var(--card-keyline);");
    expect(frontCss).toContain("border-radius: 0.055in;");

    expect(css).toContain("border: 1px solid var(--card-back-border-outline);");
    expect(css).toContain("inset: 0.03in;");
    expect(css).toContain("border: 0.5px solid var(--card-back-border-rule);");
    expect(css).toContain("inset: 0.075in;");
    expect(css).toContain("border-radius: 0.055in;");
  });

  it("uses a physical pale-gold rule and the approved Gauntlet vector as a warm-ivory wordmark", () => {
    expect(css).toContain("--card-back-gold: var(--developer-gold-soft, #d7b783);");
    expect(css).toContain("--card-back-frame-weight: 0.75pt;");
    expect(css).toContain("border: var(--card-back-frame-weight) solid var(--card-back-gold);");
    expect(css).toContain("inset: calc(0.25in - 1px);");
    expect(css).toContain("border-radius: 0.125in;");
    expect(css).toContain("--card-back-wordmark: #fff9f1;");
    expect(css).toContain('mask: url("../images/Gauntlet.svg") center / contain no-repeat;');
    expect(css).toContain("background: var(--card-back-wordmark);");
    expect(css).toContain("width: 2.45in;");
    expect(css).toContain("transform: translate(-50%, -50%) rotate(90deg);");
    expect(css).toContain("aspect-ratio: 1871.79 / 493.58;");
  });

  it("adds only subtle deterministic surface grain to the charcoal field", () => {
    expect(css).toContain("--card-back-surface-opacity: 0.055;");
    expect(css).toContain("feTurbulence");
    expect(css).toContain("seed='17'");
    expect(css).toContain("mix-blend-mode: soft-light;");
    expect(css).toMatch(/\.gauntlet-card-back__pattern-window::after\s*\{[^}]*opacity: var\(--card-back-surface-opacity\);/s);
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

  it("defines a 1/8-inch full-bleed production proof around the 2.5 by 3.5-inch trim", () => {
    expect(css).toContain("--card-back-bleed: 0.125in;");
    expect(css).toContain(".gauntlet-card-back-bleed-proof");
    expect(css).toContain("width: calc(2.5in + var(--card-back-bleed) + var(--card-back-bleed));");
    expect(css).toContain("height: calc(3.5in + var(--card-back-bleed) + var(--card-back-bleed));");
    expect(css).toContain("padding: var(--card-back-bleed);");
    expect(css).toContain("background: var(--card-back-border);");
  });
});
