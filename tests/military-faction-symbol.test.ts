import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reviewPage = readFileSync("card-design/military-symbols.html", "utf8");
const current = readFileSync("images/faction-symbols/military.svg", "utf8");
const cavalrySabers = readFileSync(
  "images/faction-symbols/candidates/military-cavalry-sabers.svg",
  "utf8",
);
const alternatives = [
  "military-arming-swords",
  "military-heraldic-swords",
  "military-command-swords",
].map(name => ({
  name,
  source: readFileSync(`images/faction-symbols/candidates/${name}.svg`, "utf8"),
}));

describe("Military faction symbol", () => {
  it("uses crossed cavalry sabers as the production mark", () => {
    expect(current).toBe(cavalrySabers);
    expect(current).toContain('viewBox="0 0 64 64"');
    expect(current).toContain('fill="#000"');
    expect(current).toContain('rotate(-43 32 32)');
    expect(current).toContain('rotate(43 32 32)');
    expect(current).not.toContain('stroke="#000"');
  });

  it("retains the reviewed straight-sword alternatives at the shared geometry", () => {
    expect(alternatives).toHaveLength(3);
    for (const alternative of alternatives) {
      expect(alternative.source).toContain('viewBox="0 0 64 64"');
      expect(alternative.source).toContain('fill="#000"');
      expect(alternative.source).not.toContain('stroke="#000"');
      expect(reviewPage).toContain(`candidates/${alternative.name}.svg`);
    }
  });

  it("shows the production mark and alternatives at icon scale and on actual Leader cards", () => {
    expect(reviewPage.match(/class="scale-card/g)).toHaveLength(4);
    expect(reviewPage.match(/class="candidate candidate-/g)).toHaveLength(4);
    expect(reviewPage).toContain("Production · Cavalry sabers");
    expect(reviewPage).toContain("symbol-16");
    expect(reviewPage).toContain("symbol-24");
    expect(reviewPage).toContain("symbol-48");
    expect(reviewPage).toContain("Military</span><span>Leader</span><span>v0.6.2");
  });
});
