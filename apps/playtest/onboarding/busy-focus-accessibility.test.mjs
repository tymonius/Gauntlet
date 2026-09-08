import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const loader = readFileSync("playtest/onboarding/app.js", "utf8");
const source = readFileSync("playtest/onboarding/busy-focus-accessibility.js", "utf8");

describe("game-night onboarding busy focus", () => {
  it("loads the focus handoff after the onboarding core", () => {
    const coreIndex = loader.indexOf('"app-core.js?v=20260731-1"');
    const focusIndex = loader.indexOf('"busy-focus-accessibility.js?v=20260903-1"');
    expect(coreIndex).toBeGreaterThan(-1);
    expect(focusIndex).toBeGreaterThan(coreIndex);
  });

  it("moves focus away before a focused submit or roster refresh is disabled", () => {
    expect(source).toContain('form?.addEventListener("submit", (event) => {');
    expect(source).toContain('submitStatus?.focus({ preventScroll: true });');
    expect(source).toContain('refreshRoster?.addEventListener("click", () => {');
    expect(source).toContain('organizerStatus?.focus({ preventScroll: true });');
  });

  it("returns focus after failed save and completed roster refresh", () => {
    expect(source).toContain('if (!successPanel?.hidden) return;');
    expect(source).toContain('submitChoice.focus({ preventScroll: true });');
    expect(source).toContain('refreshRoster.focus({ preventScroll: true });');
  });
});
