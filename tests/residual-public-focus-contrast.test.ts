import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const files = [
  "card-reference/site.css",
  "site-polish.css",
  "card-reference/styles.css",
  "playtest/session/styles.css",
  "playtest/batch/styles.css",
];

describe("residual public focus contrast", () => {
  for (const path of files) {
    it(`${path} uses a solid bronze focus outline`, () => {
      const css = readFileSync(path, "utf8");
      expect(css).toMatch(/outline\s*:\s*3px solid var\(--bronze\)/);
    });
  }

  it("removes the audited low-opacity focus outlines", () => {
    const css = files.map(path => readFileSync(path, "utf8")).join("\n");
    expect(css).not.toMatch(/outline\s*:\s*(?:2|3)px solid rgba\((?:143\s*,\s*31\s*,\s*37|124\s*,\s*46\s*,\s*46|163\s*,\s*115\s*,\s*56)\s*,\s*(?:\.12|0\.14|\.22|\.38)\s*\)/);
  });
});
