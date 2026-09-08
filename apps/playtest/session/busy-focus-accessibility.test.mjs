import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const helper = readFileSync("playtest/session/busy-focus-accessibility.js", "utf8");
const loader = readFileSync("playtest/session/app.js", "utf8");
const app = readFileSync("playtest/session/app-core.js", "utf8");
const styles = readFileSync("playtest/session/styles.css", "utf8");

describe("formal session busy focus", () => {
  it("loads the focus helper after the formal-session controller", () => {
    expect(loader.indexOf("app-core.js")).toBeLessThan(loader.indexOf("busy-focus-accessibility.js"));
  });

  it("covers both busy paths that disable the active join or close control", () => {
    expect(app).toContain("setFormBusy(el.joinForm, true);");
    expect(app).toContain("el.closeSession.disabled = true;");
    expect(helper).toContain('form.id !== "joinForm"');
    expect(helper).toContain('closest("#closeSession")');
    expect(helper).toContain('enhanceStatus("joinStatus")');
    expect(helper).toContain('enhanceStatus("closeStatus")');
  });

  it("returns focus only when the original panel remains visible", () => {
    expect(helper).toContain("document.activeElement === status");
    expect(helper).toContain("!panel.hidden");
    expect(helper).toContain("control.focus({ preventScroll: true });");
  });

  it("removes closed-session quick actions from keyboard focus and preserves a status target", () => {
    expect(app).toContain('document.body.classList.toggle("session-closed", closed);');
    expect(styles).toContain("body.session-closed .quick-actions button");
    expect(helper).toContain('document.querySelector(".quick-actions")');
    expect(helper).toContain('enhanceStatus("eventStatus")');
    expect(helper).toContain('document.body.classList.contains("session-closed")');
    expect(helper).toContain('if (quickActions.contains(document.activeElement)) eventStatus.focus({ preventScroll: true });');
    expect(helper).toContain('control.dataset.closedSessionDisabled = "true";');
    expect(helper).toContain("control.disabled = true;");
  });

  it("only re-enables controls that the closed-session helper disabled", () => {
    expect(helper).toContain('control.dataset.closedSessionDisabled !== "true"');
    expect(helper).toContain("control.disabled = false;");
    expect(helper).toContain("delete control.dataset.closedSessionDisabled;");
  });
});
