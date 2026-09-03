import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("start/app.js", "utf8");

describe("Start leader selection focus", () => {
  it("captures a focused Leader before any render rebuilds the radio group", () => {
    expect(source).toContain("const focusedLeaderId = document.activeElement instanceof HTMLInputElement");
    expect(source).toContain('document.activeElement.name === "leader"');
    expect(source).toContain("el.leaderChoices.contains(document.activeElement)");
  });

  it("restores focus to the selected replacement Leader after the rebuild", () => {
    expect(source).toContain("if (focusedLeaderId && focusedLeaderId === state.leaderId) focusSelectedLeader(focusedLeaderId);");
    expect(source).toContain("function focusSelectedLeader(leaderId)");
    expect(source).toContain(".find(input => input.value === leaderId);");
    expect(source).toContain("target?.focus({ preventScroll: true });");
  });

  it("uses the same focus-preserving renderer after starter Deck data loads", () => {
    expect(source).toContain("await loadStarterDecks();\n    renderChoice();");
  });
});
