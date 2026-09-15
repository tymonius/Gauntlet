import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("keyboard access to horizontally scrollable tables", () => {
  it("makes the onboarding roster table wrapper focusable", () => {
    const html = readFileSync("apps/playtest/onboarding/index.html", "utf8");
    expect(html).toContain('<div class="table-wrap" tabindex="0">');
  });
});
