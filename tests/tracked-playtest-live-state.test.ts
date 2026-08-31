import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const page = read("playtest/tracked/index.html");
const live = read("playtest/tracked/live-state.js");
const styles = read("playtest/tracked/live-state.css");

describe("tracked playtest live state and creator controls", () => {
  it("polls public game state without reloading the page", () => {
    expect(page).toContain('live-state.js?v=20260802-1');
    expect(live).toContain("ACTIVE_POLL_MS = 2500");
    expect(live).toContain('document.addEventListener("visibilitychange"');
    expect(live).toContain('window.addEventListener("focus"');
    expect(live).toContain('cache: "no-store"');
    expect(live).not.toContain("location.reload");
  });

  it("updates seats, lifecycle metrics, and response progress in place", () => {
    expect(live).toContain("renderPlayers(nextSession)");
    expect(live).toContain("fillPlayerOptions(nextSession)");
    expect(live).toContain('setText(el.playerCount, `${nextSession.playerCount} / 2`)');
    expect(live).toContain('setText(el.responseCount, `${nextSession.responseCount || 0} / 2`)');
    expect(live).toContain("el.completionPanel.hidden = !submitted");
  });

  it("shows shared lifecycle controls only to the creator", () => {
    expect(live).toContain("const creator = Boolean(readHostKey())");
    expect(live).toContain("const showCreatorControls = creator && Boolean(joinedPlayer) && full");
    expect(live).toContain("el.playPanel.hidden = !showCreatorControls");
    expect(live).toContain("el.resultSection.hidden = !creator");
    expect(styles).toContain('body[data-tracked-role="participant"] #playPanel');
    expect(page).toContain("Only the game creator records the start");
  });

  it("locks milestone controls to the valid lifecycle state", () => {
    expect(live).toContain("!open || !ready");
    expect(live).toContain("!open || !playing || nextSession.resultSubmitted");
    expect(live).toContain("setFormDisabled(el.noteForm, !open || !playing)");
    expect(live).toContain('control.setAttribute("aria-disabled"');
    expect(styles).toContain("button:disabled");
    expect(styles).toContain("cursor:not-allowed");
  });

  it("keeps individual response controls available to each joined player", () => {
    expect(live).toContain("!open || !joinedPlayer || !nextSession.resultSubmitted || ownResponse");
    expect(page).toContain("both players submit separate individual responses");
  });
});
