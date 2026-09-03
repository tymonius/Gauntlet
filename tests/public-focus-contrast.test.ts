import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const focusStyles = [
  "site.css",
  "rulebook/styles.css",
  "deckbuilder/styles.css",
  "rules-arbiter/styles.css",
  "playtest/retrospective/styles.css",
];

describe("public keyboard focus contrast", () => {
  for (const path of focusStyles) {
    it(`${path} uses the solid bronze focus indicator`, () => {
      const css = readFileSync(path, "utf8");
      expect(css).toMatch(/outline\s*:\s*3px solid var\(--bronze\)/);
      expect(css).not.toMatch(/outline\s*:\s*3px solid rgba\(143\s*,\s*31\s*,\s*37\s*,\s*(?:\.18|0\.18|\.38|0\.38)\s*\)/);
    });
  }
});
