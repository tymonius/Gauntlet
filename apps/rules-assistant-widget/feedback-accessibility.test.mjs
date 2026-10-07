import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("rules-assistant/widget.js", "utf8");

describe("Rules Arbiter feedback accessibility", () => {
  it("groups repeated rating buttons under a descriptive accessible name", () => {
    expect(source).toContain('class="ga-rules-feedback-buttons" role="group" aria-label="Did this answer your question?"');
    expect(source).toContain('class="ga-rules-feedback-status" role="status" tabindex="-1"');
  });

  it("does not leave focus inside feedback controls that are hidden after an action", () => {
    expect(source).toContain("let selectedButton = null;");
    expect(source).toContain("selectedButton = button;");
    expect(source).toContain("status.focus();");
    expect(source).toContain("const focusTarget = selectedButton;");
    expect(source).toContain("focusTarget?.focus();");
  });
});
