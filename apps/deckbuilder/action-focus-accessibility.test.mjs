import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("deckbuilder/app.js", "utf8");

describe("Deckbuilder card action focus", () => {
  it("marks rebuilt card rows so their replacement controls can be found", () => {
    expect(source).toContain("row.dataset.cardId = card.id;");
    expect(source).toContain("function findCardAction(container, cardId, action)");
    expect(source).toContain("function focusCardAction(container, cardId, action, fallback = null)");
  });

  it("restores focus after add and deck quantity actions rerender their controls", () => {
    expect(source).toContain('focusCardAction(el.availableCards, card.id, "add");');
    expect(source).toContain('document.getElementById("previewAddButton")?.focus({ preventScroll: true });');
    expect(source).toContain('focusCardAction(el.deckCards, card.id, "minus", () => findCardAction(el.availableCards, card.id, "add"));');
    expect(source).toContain('focusCardAction(el.deckCards, card.id, "plus", () => findCardAction(el.availableCards, card.id, "add"));');
    expect(source).toContain('focusCardAction(el.availableCards, card.id, "add", el.clearDeckButton);');
  });
});
