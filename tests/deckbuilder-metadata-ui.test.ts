import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const loader = readFileSync("deckbuilder/mobile-card-preview.js", "utf8");
const ui = readFileSync("deckbuilder/metadata-ui.js", "utf8");
const css = readFileSync("deckbuilder/metadata-ui.css", "utf8");

describe("Deckbuilder metadata hierarchy", () => {
  it("loads the shared metadata cleanup alongside the rendered card preview", () => {
    expect(loader).toContain('metadata-ui.css?v=20260819-2');
    expect(loader).toContain('metadata-ui.js?v=20260902-1');
  });

  it("keeps card value circular while converting other compact metadata to boxes", () => {
    expect(ui).toContain('value.classList.add("value-badge")');
    expect(ui).toContain('tag.classList.add("meta-tag")');
    expect(ui).toContain('if (!text)');
    expect(ui).toContain('tag.remove()');
    expect(css).toContain('.value-badge');
    expect(css).toContain('border-radius: 50%');
    expect(css).toContain('.mini-pill');
    expect(css).toContain('border-radius: 2px');
  });

  it("uses the established Value medallion between boxed Qty and Total fields", () => {
    expect(ui).toContain('<span class="deck-stat-label">Qty</span>');
    expect(ui).toContain('<span class="deck-stat-label">Value</span>');
    expect(ui).toContain('<span class="deck-stat-label">Total</span>');
    expect(ui).toContain('class="deck-stat deck-stat-box"');
    expect(ui).toContain('class="deck-stat deck-stat-value"');
    expect(ui).toContain('class="mini-pill value-badge deck-value-medallion"');
    expect(ui).toContain('class="deck-stat deck-stat-box deck-stat-total"');
    expect(ui).not.toContain('${quantity}×');
    expect(ui).not.toContain('${value} each');
    expect(css).toContain('.deck-stat-box');
    expect(css).toContain('.deck-stat-value');
    expect(css).toContain('.deck-value-medallion');
  });
});
