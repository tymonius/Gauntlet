import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("standalone feedback rating validation", () => {
  it("marks generated rating radios as required", () => {
    const app = readFileSync("playtest/feedback/app.js", "utf8");
    expect(app).toContain('aria-label="${value} — ${RATING_LABELS[value]}" required');
  });

  it("keeps the explicit missing-rating fallback", () => {
    const app = readFileSync("playtest/feedback/app.js", "utf8");
    expect(app).toContain('throw new Error(`Please rate "${label}" before submitting.`)');
  });
});
