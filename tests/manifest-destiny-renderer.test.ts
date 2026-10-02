import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const renderer = readFileSync("card-design/face-templates/playable.mjs", "utf8");
const canonical = JSON.parse(
  readFileSync("releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Canonical_Data.json", "utf8"),
);
const manifestDestiny = canonical.cards.find(
  (card: { id: string }) => card.id === "neutral-manifest-destiny",
);

describe("Manifest Destiny renderer treatment", () => {
  it("keeps Manifest Destiny semantically non-Overlay while using the Overlay visual template", () => {
    expect(manifestDestiny).toBeTruthy();
    expect(manifestDestiny.card_form).toBeNull();
    expect(manifestDestiny.effects.some((effect: { text: string }) =>
      effect.text.includes("It becomes a blank Territory under your control."),
    )).toBe(true);

    expect(renderer).toContain("|| card.id === 'neutral-manifest-destiny';");
    expect(renderer).toContain('data-overlay-card="${usesOverlayTemplate}"');
    expect(renderer).toContain('overlay-title-bar');
  });

  it("derives normal Overlay status from canonical form/effects rather than redefining Manifest Destiny", () => {
    expect(renderer).toContain("/\\boverlay\\b/i.test(card.card_form || '')");
    expect(renderer).toContain("(card.effects || []).some(effect => String(effect?.label || '').trim().toLowerCase() === 'overlay')");
    expect(renderer).not.toContain("card.card_form = 'Overlay'");
  });
});
