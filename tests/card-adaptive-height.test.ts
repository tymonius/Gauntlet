import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const parchmentStyles = readFileSync("card-design/card-parchment.css", "utf8");
const adaptiveHeightStyles = readFileSync("card-design/card-adaptive-height.css", "utf8");

describe("adaptive vertical card layout", () => {
  it("loads the shared vertical-space policy", () => {
    expect(parchmentStyles).toContain('@import url("card-adaptive-height.css")');
  });

  it("gives unused vertical space to artwork instead of stretching the rules field", () => {
    expect(adaptiveHeightStyles).toContain("minmax(var(--art-height), 1fr)");
    expect(adaptiveHeightStyles).toContain(":is(.leader-card, .proposal-card, .rite-card) .card-interior");
    expect(adaptiveHeightStyles).toContain("var(--component-heading-height, 0.50in)");
  });

  it("keeps the TTS text-only emergency fallback truly text-only", () => {
    expect(adaptiveHeightStyles).toContain(".tts-text-only .card-interior");
    expect(adaptiveHeightStyles).toContain("grid-template-rows: 0.3in 0 auto 0.16in !important");
  });
});
