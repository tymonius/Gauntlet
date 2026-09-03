import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("standalone feedback rating accessibility", () => {
  it("gives every generated rating radio an individual accessible name", () => {
    const app = readFileSync("playtest/feedback/app.js", "utf8");
    expect(app).toContain('aria-label="${value} — ${RATING_LABELS[value]}"');
    expect(app).toContain('1: "Very poor"');
    expect(app).toContain('5: "Excellent"');
  });
});
