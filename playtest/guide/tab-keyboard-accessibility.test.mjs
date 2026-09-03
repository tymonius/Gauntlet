import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("playtest/guide/app.js", "utf8");

describe("game-night guide tab keyboard navigation", () => {
  it("binds keyboard navigation to the ARIA tabs", () => {
    expect(source).toContain('button.addEventListener("keydown", handleRoleTabKeydown);');
    expect(source).toContain("function handleRoleTabKeydown(event)");
  });

  it("supports the horizontal tablist arrow and boundary keys", () => {
    expect(source).toContain('event.key === "ArrowRight"');
    expect(source).toContain('event.key === "ArrowLeft"');
    expect(source).toContain('event.key === "Home"');
    expect(source).toContain('event.key === "End"');
  });

  it("activates and focuses the selected tab", () => {
    expect(source).toContain("setRole(target.dataset.roleChoice, true);");
    expect(source).toContain("target.focus();");
  });
});
