import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const renderer = readFileSync("card-design/playable-card-renderer.js", "utf8");
const factionCss = readFileSync("card-design/faction-specimens.css", "utf8");
const markerUi = readFileSync("arcane-trait-markers.js", "utf8");
const markerUiCss = readFileSync("arcane-trait-markers.css", "utf8");
const cardReferenceIndex = readFileSync("card-reference/index.html", "utf8");
const deckbuilderIndex = readFileSync("deckbuilder/index.html", "utf8");

describe("Arcane playable-card symbol", () => {
  it("renders the Mystics sigil only for cards with the Arcane trait", () => {
    expect(renderer).toContain("const isArcane = hasTrait(card.trait, 'arcane');");
    expect(renderer).toContain('class="arcane-trait-marker"');
    expect(renderer).toContain('aria-label="Arcane trait"');
    expect(renderer).toContain("function hasTrait(value, expected)");
  });

  it("places the Arcane marker immediately before the production card title", () => {
    expect(renderer).toContain('<h1 class="card-title">${arcaneMarker}${escapeHtml(card.name)}</h1>');
    expect(renderer).toContain('<span>${escapeHtml(card.factionLabel)}</span>');
    expect(renderer).not.toContain('card-footer-allegiance');
    expect(factionCss).toMatch(/\.card-title \.arcane-trait-marker\s*\{/);
  });

  it("uses allegiance color, with Neutral matching its ivory border", () => {
    expect(factionCss).toMatch(/\.faction-specimen-page \.gauntlet-card\s*\{[\s\S]*?--arcane-trait-color:\s*var\(--faction-border\);/);
    expect(factionCss).toMatch(/\[data-faction="neutral"\]\s*\{[\s\S]*?--faction-border:\s*#eee7d5;[\s\S]*?--arcane-trait-color:\s*var\(--faction-border\);/);
    expect(factionCss).toMatch(/\.arcane-trait-marker\s*\{[\s\S]*?width:\s*0\.135in;[\s\S]*?height:\s*0\.135in;[\s\S]*?background:\s*var\(--arcane-trait-color\);/);
    expect(factionCss).toContain('mask: url("../images/faction-symbols/mystics.svg") center / contain no-repeat;');
    expect(markerUi).toContain("neutral: '#eee7d5'");
    expect(markerUi).toContain("width:.135in;height:.135in;flex:0 0 .135in");
    expect(markerUiCss).toContain("width: 1em;");
    expect(markerUiCss).toContain("height: 1em;");
  });

  it("propagates the same title marker to Card Reference, Deckbuilder, and Deckbuilder print", () => {
    expect(markerUi).toContain(".reference-row-title");
    expect(markerUi).toContain(".reference-preview h3");
    expect(markerUi).toContain(".compact-card-title");
    expect(markerUi).toContain(".deck-row .deck-title");
    expect(markerUi).toContain(".card-preview h3");
    expect(markerUi).toContain(".print-card.main-card .card-header");
    expect(markerUi).toContain("__gauntletArcaneMarkerOpenWrapped");
    expect(markerUi).toContain("/images/faction-symbols/mystics.svg");
    expect(markerUiCss).toContain(".gauntlet-arcane-title-marker");
    expect(markerUiCss).toContain('mask: url("/images/faction-symbols/mystics.svg") center / contain no-repeat;');
    expect(cardReferenceIndex).toContain('../arcane-trait-markers.css');
    expect(cardReferenceIndex).toContain('../arcane-trait-markers.js');
    expect(deckbuilderIndex).toContain('../arcane-trait-markers.css');
    expect(deckbuilderIndex).toContain('../arcane-trait-markers.js');
  });
});
