import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const helper = readFileSync("playtest/session/busy-focus-accessibility.js", "utf8");
const loader = readFileSync("playtest/session/app.js", "utf8");
const app = readFileSync("playtest/session/app-core.js", "utf8");

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
});
