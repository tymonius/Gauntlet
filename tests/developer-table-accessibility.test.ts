import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("developer and research accessibility", () => {
  it("uses a solid developer-gold focus indicator", () => {
    const css = readFileSync("developer-tools.css", "utf8");
    expect(css).toContain("outline: 3px solid var(--developer-gold);");
    expect(css).not.toContain("outline: 2px solid rgba(163,115,56,.22);");
  });

  it("labels keyboard-scrollable data-table regions", () => {
    const onboarding = readFileSync("playtest/onboarding/index.html", "utf8");
    const analysis = readFileSync("playtest/analysis/index.html", "utf8");
    const integrity = readFileSync("playtest/analysis/integrity/index.html", "utf8");
    expect(onboarding).toContain('tabindex="0" role="region" aria-label="Onboarding roster table"');
    expect(analysis).toContain('tabindex="0" role="region" aria-label="Faction and Leader comparison table"');
    expect(integrity).toContain('tabindex="0" role="region" aria-label="Exclusion audit history table"');
  });

  it("declares simple data-table headers as column headers", () => {
    for (const path of [
      "playtest/onboarding/index.html",
      "playtest/analysis/index.html",
      "playtest/analysis/integrity/index.html",
    ]) {
      const html = readFileSync(path, "utf8");
      expect(html).toMatch(/<th scope="col">/);
    }
  });
});
