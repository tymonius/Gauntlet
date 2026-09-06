import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const surfaces = [
  ["onboarding", "playtest/onboarding/index.html", "playtest/onboarding/app-core.js"],
  ["formal session", "playtest/session/index.html", "playtest/session/app-core.js"],
  ["tracked playtest", "playtest/tracked/index.html", "playtest/tracked/app.js"],
] as const;

describe("fatal playtest error accessibility", () => {
  for (const [name, pagePath, scriptPath] of surfaces) {
    it(`${name} exposes and focuses a named alert region`, () => {
      const page = readFileSync(pagePath, "utf8");
      const script = readFileSync(scriptPath, "utf8");

      expect(page).toMatch(
        /<section\b[^>]*id="errorPanel"[^>]*role="alert"[^>]*tabindex="-1"[^>]*aria-labelledby="errorTitle"[^>]*aria-describedby="errorMessage"[^>]*>/,
      );
      expect(script).toContain("el.errorPanel.focus({ preventScroll: true });");
    });
  }
});
