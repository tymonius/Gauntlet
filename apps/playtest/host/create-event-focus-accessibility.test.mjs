import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const helper = readFileSync("playtest/host/create-event-focus-accessibility.js", "utf8");
const html = readFileSync("playtest/host/index.html", "utf8");
const creator = readFileSync("playtest/host/create-event.js", "utf8");

describe("Host Home event creation focus", () => {
  it("loads the focus handoff beside event creation", () => {
    expect(html).toContain('<script src="create-event-focus-accessibility.js?v=20260903-1"></script>');
    expect(creator).toContain("setBusy(true);");
    expect(creator).toContain("setBusy(false);");
  });

  it("focuses a live status before event-creation controls are disabled", () => {
    expect(helper).toContain('status.setAttribute("role", "status");');
    expect(helper).toContain("status.tabIndex = -1;");
    expect(helper).toContain('form.id !== "createEventForm"');
    expect(helper).toContain("getStatus()?.focus({ preventScroll: true });");
  });

  it("returns focus after cancel or failure but leaves successful navigation alone", () => {
    expect(helper).toContain("if (!busy) {");
    expect(helper).toContain('status.classList.contains("success")');
    expect(helper).toContain("origin.focus({ preventScroll: true });");
  });
});
