import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("tracked transport panel label", () => {
  it("references the existing transport heading id", () => {
    const html = readFileSync("playtest/tracked/index.html", "utf8");
    expect(html).toContain('aria-labelledby="transportTitle"');
    expect(html).toContain('<h2 id="transportTitle">');
    expect(html).not.toContain('aria-labelledby="transport-title"');
  });
});
