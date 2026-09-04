import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("rules-assistant/widget.js", "utf8");

describe("Rules Assistant close-during-request focus", () => {
  it("returns focus when the panel closes", () => {
    expect(source).toContain("const target = focusTarget || (this.returnFocusTo?.isConnected ? this.returnFocusTo : this.elements.launcher);");
    expect(source).toContain("target.focus();");
  });

  it("does not steal focus back into the hidden panel when a pending request finishes", () => {
    expect(source).toContain("if (this.isOpen) this.elements.input.focus();");
    expect(source).not.toContain("this.elements.input.disabled = false;\n      this.elements.input.focus();");
  });
});
