import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reviewPage = readFileSync("card-design/military-symbols.html", "utf8");
const current = readFileSync("images/faction-symbols/military.svg", "utf8");
const cavalrySabers = readFileSync(
  "images/faction-symbols/candidates/military-cavalry-sabers.svg",
  "utf8",
);
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
  it("uses crossed cavalry sabers as the production Military symbol", () => {
    expect(current).toBe(cavalrySabers);
    expect(current).toContain('viewBox="0 0 64 64"');
    expect(current).toContain('fill="#000"');
    expect(current).toContain('rotate(-43 32 32)');
    expect(current).toContain('rotate(43 32 32)');
    expect(current).not.toContain('stroke="#000"');
  });

  it("retains the reviewed solid-silhouette alternatives at the shared geometry", () => {
    expect(candidates).toHaveLength(4);
    for (const candidate of candidates) {
      expect(candidate.source).toContain('viewBox="0 0 64 64"');
      expect(candidate.source).toContain('fill="#000"');
      expect(candidate.source).not.toContain('stroke="#000"');
      expect(reviewPage).toContain(`candidates/${candidate.name}.svg`);
    }
  });

  it("compares the production mark and alternatives at icon scale and on actual Leader cards", () => {
    expect(reviewPage.match(/class="scale-card/g)).toHaveLength(5);
    expect(reviewPage.match(/class="candidate candidate-/g)).toHaveLength(5);
    expect(reviewPage).toContain("symbol-16");
    expect(reviewPage).toContain("symbol-24");
    expect(reviewPage).toContain("symbol-48");
    expect(reviewPage).toContain("D · Cavalry sabers");
    expect(reviewPage).toContain("Military</span><span>Leader</span><span>v0.6.2");
  });
});
