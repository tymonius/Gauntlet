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

  it("uses the approved portrait card geometry and inset pale-gold frame", () => {
    expect(css).toContain("width: 2.5in;");
    expect(css).toContain("height: 3.5in;");
    expect(css).toContain("inset: 0.375in;");
    expect(css).toContain("--card-back-charcoal: #202124;");
    expect(css).toContain("--card-back-gold: var(--developer-gold-soft, #d7b783);");
  });

  it("uses the approved Gauntlet vector as a white landscape wordmark", () => {
    expect(css).toContain('mask: url("../images/Gauntlet.svg") center / contain no-repeat;');
    expect(css).toContain("background: #fff;");
    expect(css).toContain("aspect-ratio: 1871.79 / 493.58;");
  });

  it("builds the background repeat from all six production faction symbols", () => {
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
    expect(css).toContain("--card-back-pattern: rgba(255, 255, 255, 0.065);");
  });
});
