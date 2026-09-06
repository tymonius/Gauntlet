import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Integrity exclusion dialog accessibility", () => {
  it("gives the native dialog a programmatic name and target description", () => {
    const html = readFileSync("playtest/analysis/integrity/index.html", "utf8");
    expect(html).toContain(
      '<dialog id="excludeDialog" class="exclude-dialog" aria-labelledby="exclude-dialog-title" aria-describedby="excludeTarget">'
    );
    expect(html).toContain('<h2 id="exclude-dialog-title">Exclude this record?</h2>');
    expect(html).toContain('<p id="excludeTarget"></p>');
  });
});
