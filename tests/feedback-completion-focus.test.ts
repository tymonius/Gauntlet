import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("standalone feedback completion focus", () => {
  it("focuses the revealed success state and restores focus when starting another response", () => {
    const html = readFileSync("playtest/feedback/index.html", "utf8");
    const app = readFileSync("playtest/feedback/app.js", "utf8");

    expect(html).toContain('id="successPanel" class="tracked-panel success-panel" hidden aria-live="polite" tabindex="-1" aria-labelledby="feedback-success-title"');
    expect(html).toContain('id="feedback-success-title"');
    expect(app).toContain('el.successPanel.focus({ preventScroll: true });');
    expect(app).toContain('el.displayName.focus({ preventScroll: true });');
  });
});
