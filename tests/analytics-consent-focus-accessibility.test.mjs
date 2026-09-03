import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("analytics-consent.js", "utf8");

describe("analytics preferences focus", () => {
  it("remembers the control that opened preferences", () => {
    expect(source).toContain("let preferencesReturnFocus = null;");
    expect(source).toContain("event?.currentTarget instanceof HTMLElement");
  });

  it("restores focus after a preference choice removes the banner", () => {
    expect(source).toContain("function restorePreferencesFocus()");
    expect(source).toContain("target instanceof HTMLElement && target.isConnected");
    expect(source).toContain("target.focus({ preventScroll: true });");
    expect(source).toContain("removeBanner();\n    restorePreferencesFocus();");
  });
});
