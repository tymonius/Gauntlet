import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const helper = readFileSync("playtest/tracked/busy-focus-accessibility.js", "utf8");
const controls = readFileSync("playtest/tracked/session-controls.js", "utf8");
const app = readFileSync("playtest/tracked/app.js", "utf8");
const live = readFileSync("playtest/tracked/live-state.js", "utf8");
const journal = readFileSync("playtest/tracked/journal.js", "utf8");

describe("tracked playtest busy focus", () => {
  it("loads the shared focus helper from the tracked session controller", () => {
    expect(controls).toContain('focusScript.src = "busy-focus-accessibility.js?v=20260903-1";');
    expect(helper).toContain('if (document.readyState === "loading")');
    expect(helper).toContain("installDynamicFocus();");
  });

  it("covers every tracked form that disables its controls during submission", () => {
    for (const [form, status, panel] of [
      ["createForm", "createStatus", "createPanel"],
      ["joinForm", "joinStatus", "joinPanel"],
      ["resultForm", "resultStatus", "resultSection"],
      ["responseForm", "responseStatus", "responseSection"]
    ]) {
      expect(helper).toContain(`${form}: ["${status}", "${panel}"]`);
    }
    expect(app).toContain("setBusy(el.createForm, true);");
    expect(app).toContain("setBusy(el.joinForm, true);");
    expect(app).toContain("setBusy(el.resultForm, true);");
    expect(app).toContain("setBusy(el.responseForm, true);");
  });

  it("moves Record start focus to live status while lifecycle polling owns the disabled button", () => {
    expect(live).toContain("el.recordStart.disabled = true;");
    expect(helper).toContain('closest("#recordStart")');
    expect(helper).toContain('enhanceStatus("liveSyncStatus")');
    expect(helper).toContain('watchFormReturn(start, status, "playPanel");');
  });

  it("moves journal focus to sync status if remote closure disables the active journal control", () => {
    expect(journal).toContain('setFormDisabled(session.status !== "open");');
    expect(helper).toContain('enhanceStatus("journalSyncState")');
    expect(helper).toContain('lastJournalControl.matches(":disabled")');
    expect(helper).toContain("journalStatus.focus({ preventScroll: true });");
  });
});
