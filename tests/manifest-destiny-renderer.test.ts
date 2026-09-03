import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const renderer = readFileSync("card-design/playable-card-renderer.js", "utf8");
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

    expect(renderer).toContain(
      "const usesOverlayTemplate = isOverlayCard || card.id === 'neutral-manifest-destiny';",
    );
    expect(renderer).toContain('data-overlay-card="${usesOverlayTemplate}"');
    expect(renderer).toContain("${usesOverlayTemplate ? `");
  });

  it("does not redefine Manifest Destiny itself as an Overlay", () => {
    expect(renderer).toContain("const isOverlayCard = /\\boverlay\\b/i.test(card.form || '')");
    expect(renderer).toContain("|| sectionEntries.some(([label]) => label.toLowerCase() === 'overlay');");
    expect(renderer).not.toContain("const isOverlayCard = card.id === 'neutral-manifest-destiny'");
  });
});
