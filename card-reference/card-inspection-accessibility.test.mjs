import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("card-reference/card-inspection.js", "utf8");

describe("card inspection accessibility", () => {
  it("names the modal inspection dialog from its contextual card label", () => {
    expect(source).toContain("dialog.setAttribute('aria-labelledby', 'card-reference-inspection-label');");
    expect(source).toContain('id="card-reference-inspection-label" class="card-reference-inspection-label"');
  });

  it("keeps the embedded enlarged card title contextual", () => {
    expect(source).toContain('cardFrame.title = `Enlarged ${currentLabel}`;');
  });

  it("moves focus to visible UI when switching between the card and artwork views", () => {
    expect(source).toContain("const restoreCardFocus = dialog?.open && document.activeElement === backButton;");
    expect(source).toContain("cardFrame.focus({ preventScroll: true });");
    expect(source).toContain("(backButton.hidden ? closeButton : backButton).focus({ preventScroll: true });");
  });
});
