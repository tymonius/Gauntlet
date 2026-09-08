import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("playtest/session/event-game.js", "utf8");

describe("event game join focus", () => {
  it("keeps every event join status focusable while asynchronous joining disables the form", () => {
    expect(source.match(/id=\"eventJoinStatus\" class=\"form-status\" role=\"status\" aria-live=\"polite\" tabindex=\"-1\"/g)?.length).toBe(3);
    expect(source).toContain("busyStatus.focus({ preventScroll: true });\n    setJoinButtons(true);");
    expect(source).toContain("document.activeElement === busyStatus");
    expect(source).toContain("returnFocusTo.focus({ preventScroll: true });");
  });

  it("moves focus to the replacement control when join variants rebuild the panel", () => {
    expect(source).toContain('focusEventJoinControl("eventPlayerSelect");');
    expect(source).toContain('focusEventJoinControl("eventGuestName");');
    expect(source).toContain("function focusEventJoinControl(id)");
  });

  it("preserves focus when the event roster enhancement replaces an already active standard join form", () => {
    expect(source).toContain("const hadJoinFocus = joinPanel.contains(document.activeElement);");
    expect(source).toContain('if (hadJoinFocus) focusEventJoinControl("eventQuickJoin");');
    expect(source).toContain('if (hadJoinFocus) focusEventJoinControl("eventPlayerSelect");');
  });
});
