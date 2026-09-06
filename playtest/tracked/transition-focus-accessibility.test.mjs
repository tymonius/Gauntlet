import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("playtest/tracked/session-controls.js", "utf8");

describe("tracked playtest transition focus", () => {
  it("makes replacement state panels programmatically focusable", () => {
    expect(source).toContain('const focusTargets = ["joinedPanel", "resultSection", "responseSection", "completionPanel"]');
    expect(source).toContain("focusTargets.forEach((element) => { element.tabIndex = -1; });");
    expect(source).toContain("closedPanel.tabIndex = -1;");
  });

  it("moves focus when tracked workflow state hides the active control", () => {
    expect(source).toContain('if (panel.id === "joinPanel")');
    expect(source).toContain('focusTransitionTarget(document.getElementById("joinedPanel"));');
    expect(source).toContain('} else if (panel.id === "resultSection") {');
    expect(source).toContain('focusTransitionTarget(document.getElementById("responseSection"));');
    expect(source).toContain('} else if (panel.id === "responseSection") {');
    expect(source).toContain('} else if (panel.id === "sessionEndControls") {');
    expect(source).toContain("focusTransitionTarget(closedPanel);");
  });

  it("moves focus into the shared result form when it is revealed", () => {
    expect(source).toContain('["showCompletedResult", "showStoppedResult"].includes(lastFocusedElement?.id || "")');
    expect(source).toContain("focusTransitionTarget(panel);");
  });
});
