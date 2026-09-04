import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("rules-assistant/widget.js", "utf8");

describe("Rules Assistant close focus", () => {
  it("returns focus when the panel closes", () => {
    expect(source).toContain("const target = focusTarget || (this.returnFocusTo?.isConnected ? this.returnFocusTo : this.elements.launcher);");
    expect(source).toContain("target.focus();");
  });

  it("does not let the delayed open focus steal focus back after an immediate close", () => {
    expect(source).toContain("window.setTimeout(() => {\n      if (this.isOpen) this.elements.input.focus();\n    }, 120);");
    expect(source).not.toContain("window.setTimeout(() => this.elements.input.focus(), 120);");
  });

  it("does not steal focus back into the hidden panel when a pending request finishes", () => {
    expect(source).toContain("if (this.isOpen) this.elements.input.focus();");
    expect(source).not.toContain("this.elements.input.disabled = false;\n      this.elements.input.focus();");
  });

  it("does not focus completed feedback inside a Rules Assistant that was closed while feedback was saving", () => {
    expect(source).toContain("if (this.isOpen) status.focus();");
    expect(source).not.toContain("section.classList.add(\"is-complete\");\n      status.focus();");
  });
});
