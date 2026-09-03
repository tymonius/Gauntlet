import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("onboarding keyboard focus visibility", () => {
  it("does not suppress the shared focus-visible outline on text fields", () => {
    const css = readFileSync("playtest/onboarding/onboarding.css", "utf8");
    const fieldRule = css.match(/input\[type="text"\],\s*textarea\s*\{([\s\S]*?)\}/)?.[1] || "";

    expect(fieldRule).not.toMatch(/outline\s*:\s*(?:none|0)\b/);
  });
});
