import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("rules-assistant/widget.js", "utf8");

describe("Rules Arbiter widget accessibility", () => {
  it("connects the launcher to the dialog and exposes the conversation as a live log", () => {
    expect(source).toContain('aria-controls="ga-rules-panel" aria-haspopup="dialog"');
    expect(source).toContain('<section id="ga-rules-panel" class="ga-rules-panel" role="dialog"');
    expect(source).toContain('role="log" aria-live="polite" aria-relevant="additions text" aria-label="Rules conversation"');
    expect(source).toContain('<span class="ga-rules-status" role="status">Ready</span>');
  });

  it("restores focus to the control that opened the widget", () => {
    expect(source).toContain("this.returnFocusTo = null;");
    expect(source).toContain("const activeElement = document.activeElement;");
    expect(source).toContain("this.returnFocusTo = activeElement instanceof HTMLElement && activeElement !== document.body");
    expect(source).toContain("const target = focusTarget || (this.returnFocusTo?.isConnected ? this.returnFocusTo : this.elements.launcher);");
    expect(source).toContain("this.isOpen ? this.close(this.elements.launcher) : this.open();");
  });
});
