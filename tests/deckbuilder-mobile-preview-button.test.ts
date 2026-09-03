import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Deckbuilder mobile preview button", () => {
  it("opens the mobile dialog from the keyboard-focusable preview control", () => {
    const source = readFileSync("deckbuilder/mobile-card-preview.js", "utf8");
    expect(source).toContain('event.target.closest(".compact-row-preview-button")');
    expect(source).toContain('window.requestAnimationFrame(() => openPreview())');
  });

  it("returns focus to the selected preview control when the modal closes", () => {
    const source = readFileSync("deckbuilder/mobile-card-preview.js", "utf8");
    expect(source).toContain(
      'document.querySelector(".compact-card-row.selected .compact-row-preview-button")'
    );
    expect(source).not.toContain("selectedRow.tabIndex = -1");
  });
});
