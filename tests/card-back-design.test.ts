import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const html = readFileSync("card-design/index.html", "utf8");
const css = readFileSync("card-design/card-back.css", "utf8");
const renderer = readFileSync("card-design/card-back.js", "utf8");
const frontCss = readFileSync("card-design/card-design.css", "utf8");
const factionCss = readFileSync("card-design/faction-specimens.css", "utf8");

const factionTokens = {
  military: ["#9e262c", "#5f1418", "rgba(255, 244, 226, 0.38)", "#7b1e22"],
  diplomats: ["#264f91", "#17345f", "rgba(244, 248, 255, 0.38)", "#1e3e71"],
  financiers: ["#227044", "#124429", "rgba(242, 255, 246, 0.38)", "#1b5735"],
  intelligence: ["#282827", "#111111", "rgba(255, 255, 250, 0.34)", "#202124"],
  mystics: ["#5d347e", "#38204e", "rgba(251, 244, 255, 0.38)", "#492962"],
  inquisition: ["#a67a27", "#66470e", "rgba(255, 249, 225, 0.42)", "#815f1e"],
} as const;

describe("playable-card back color studies", () => {
  it("shows all six faction colorways in the card review catalog", () => {
    expect(html).toContain('<option value="back">Card backs</option>');
    expect(html).toContain('id="card-back"');
    expect(html).toContain('data-catalog-kind="back"');
    expect(html).toContain('data-card-back-colorways');
    expect(html.match(/data-gauntlet-card-back/g)?.length).toBe(6);
    for (const faction of Object.keys(factionTokens)) {
      expect(html).toContain(`data-card-back-faction="${faction}"`);
    }
    expect(html).toContain("These are colorway studies for selecting one universal back");
  });

  it("uses the approved portrait geometry and mirrors every faction front border palette", () => {
    expect(css).toContain("width: 2.5in;");
    expect(css).toContain("height: 3.5in;");

    for (const [faction, [border, outline, rule, field]] of Object.entries(factionTokens)) {
      expect(renderer).toContain(`'${faction}'`);
      expect(css).toContain(`data-card-back-faction="${faction}"`);
      expect(css).toContain(`--card-back-border: ${border};`);
      expect(css).toContain(`--card-back-border-outline: ${outline};`);
      expect(css).toContain(`--card-back-border-rule: ${rule};`);
      expect(css).toContain(`--card-back-field: ${field};`);

      expect(factionCss).toContain(`--faction-border: ${border};`);
      expect(factionCss).toContain(`--faction-border-outline: ${outline};`);
      expect(factionCss).toContain(`--faction-border-rule: ${rule};`);
    }

    expect(frontCss).toContain("padding: 0.075in;");
    expect(frontCss).toContain("border-radius: 0.125in;");
    expect(frontCss).toContain("inset: 0.03in;");
    expect(frontCss).toContain("border-radius: 0.09in;");
    expect(frontCss).toContain("border-radius: 0.055in;");

    expect(css).toContain("border: 1px solid var(--card-back-border-outline);");
    expect(css).toContain("inset: 0.03in;");
    expect(css).toContain("border: 0.5px solid var(--card-back-border-rule);");
    expect(css).toContain("inset: 0.075in;");
    expect(css).toContain("background: var(--card-back-field);");
  });

  it("keeps the physical gold rule, warm-ivory wordmark, texture, and tiling identical across colorways", () => {
    expect(css).toContain("--card-back-gold: var(--developer-gold-soft, #d7b783);");
    expect(css).toContain("--card-back-frame-weight: 0.75pt;");
    expect(css).toContain("border: var(--card-back-frame-weight) solid var(--card-back-gold);");
    expect(css).toContain("inset: calc(0.25in - 1px);");
    expect(css).toContain("--card-back-wordmark: #fff9f1;");
    expect(css).toContain('mask: url("../images/Gauntlet.svg") center / contain no-repeat;');
    expect(css).toContain("transform: translate(-50%, -50%) rotate(90deg);");

    expect(css).toContain("--card-back-surface-opacity: 0.055;");
    expect(css).toContain("feTurbulence");
    expect(css).toContain("seed='17'");
    expect(css).toContain("mix-blend-mode: soft-light;");

    expect(renderer).toContain("const PATTERN_ROWS = 36;");
    expect(renderer).toContain("const PATTERN_COLUMNS = 36;");
    expect(css).toContain("width: 5.4in;");
    expect(css).toContain("height: 5.4in;");
    expect(css).toContain("transform: translate(-50%, -50%) rotate(78deg);");
    expect(css).toContain("width: 0.135in;");
    expect(css).toContain("--card-back-pattern: rgba(0, 0, 0, 0.42);");
    expect(css).not.toMatch(/\.gauntlet-card-back__symbol\s*\{[^}]*rotate\(/s);
  });

  it("carries each selected faction border color through the 1/8-inch bleed proof", () => {
    expect(css).toContain("--card-back-bleed: 0.125in;");
    expect(css).toContain(".gauntlet-card-back-bleed-proof");
    expect(css).toContain("width: calc(2.5in + var(--card-back-bleed) + var(--card-back-bleed));");
    expect(css).toContain("height: calc(3.5in + var(--card-back-bleed) + var(--card-back-bleed));");
    expect(css).toContain("padding: var(--card-back-bleed);");
    expect(css).toContain("background: var(--card-back-border);");
  });
});
