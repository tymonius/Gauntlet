import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reviewPage = readFileSync("card-design/military-symbols.html", "utf8");
const current = readFileSync("images/faction-symbols/military.svg", "utf8");
const candidates = [
  "military-arming-swords",
  "military-heraldic-swords",
  "military-command-swords",
  "military-cavalry-sabers",
].map(name => ({
  name,
  source: readFileSync(`images/faction-symbols/candidates/${name}.svg`, "utf8"),
}));

describe("Military faction-symbol review", () => {
  it("uses the approved cavalry-saber production symbol", () => {
    expect(current).toContain('viewBox="0 0 1269 1167"');
    expect(current).toContain("<path");
    expect(current).not.toContain('stroke="#000"');
  });

  it("provides four solid-silhouette candidates at the shared symbol geometry", () => {
    expect(candidates).toHaveLength(4);
    for (const candidate of candidates) {
      expect(candidate.source).toContain('viewBox="0 0 64 64"');
      expect(candidate.source).toContain('fill="#000"');
      expect(candidate.source).not.toContain('stroke="#000"');
      expect(reviewPage).toContain(`candidates/${candidate.name}.svg`);
    }
  });

  it("compares the baseline and candidates at icon scale and on actual Leader cards", () => {
    expect(reviewPage.match(/class="scale-card/g)).toHaveLength(5);
    expect(reviewPage.match(/class="candidate candidate-/g)).toHaveLength(5);
    expect(reviewPage).toContain("symbol-16");
    expect(reviewPage).toContain("symbol-24");
    expect(reviewPage).toContain("symbol-48");
    expect(reviewPage).toContain("D · Cavalry sabers");
    expect(reviewPage).toContain("Military</span><span>Leader</span><span>v0.6.2");
  });
});
