import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("rules-assistant/widget.js", "utf8");

describe("Chief Justice busy-state focus", () => {
  it("provides a programmatic focus target for request status", () => {
    expect(source).toContain('<span class="ga-rules-status" role="status" tabindex="-1">Ready</span>');
  });

  it("moves focus before hiding or disabling the active question control", () => {
    expect(source).toContain("const moveFocusForBusyState = this.elements.form.contains(activeElement)");
    expect(source).toContain("|| this.elements.suggestions.contains(activeElement);");
    expect(source).toContain('this.setStatus("Checking canonical sources…");');
    expect(source).toContain("if (moveFocusForBusyState) this.elements.status.focus({ preventScroll: true });");

    const focusIndex = source.indexOf("if (moveFocusForBusyState) this.elements.status.focus");
    const disableIndex = source.indexOf("this.elements.send.disabled = true;");
    const hideIndex = source.indexOf("this.elements.suggestions.hidden = true;");
    expect(focusIndex).toBeGreaterThan(-1);
    expect(focusIndex).toBeLessThan(disableIndex);
    expect(focusIndex).toBeLessThan(hideIndex);
  });

  it("returns focus to the question field when the ruling completes", () => {
    expect(source).toContain("this.elements.input.disabled = false;\n      this.elements.input.focus();");
  });
});
