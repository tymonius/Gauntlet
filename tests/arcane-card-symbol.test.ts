import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  V064_ARCANE_SYMBOL_SOURCE_PATH,
  applyV064ArcaneSymbolOverride,
  buildV064ArcaneSymbolDocuments,
  validateV064ArcaneSymbolSource,
} from "../rules-assistant/v064-candidate-corpus.js";

const renderer = readFileSync("card-design/playable-card-renderer.js", "utf8");
const factionCss = readFileSync("card-design/faction-specimens.css", "utf8");
const markerUi = readFileSync("arcane-trait-markers.js", "utf8");
const markerUiCss = readFileSync("arcane-trait-markers.css", "utf8");
const cardReferenceIndex = readFileSync("card-reference/index.html", "utf8");
const deckbuilderIndex = readFileSync("deckbuilder/index.html", "utf8");
const source = JSON.parse(readFileSync("docs/v0.6.4-arcane-symbol.json", "utf8"));

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

describe("v0.6.4 Arcane-symbol rules candidate", () => {
  it("is a non-mechanical clarification based on v0.6.3", () => {
    expect(validateV064ArcaneSymbolSource(source)).toBe(true);
    expect(source.base_version).toBe("v0.6.3");
    expect(source.mechanics_changed).toBe(false);
  });

  it("explains the shape/color grammar in both general and Mystics rules", () => {
    const documents = buildV064ArcaneSymbolDocuments(
      source,
      "https://example.invalid/docs/v0.6.4-arcane-symbol.json",
    );
    expect(documents).toHaveLength(2);
    expect(documents.every((document) => document.sourcePath === V064_ARCANE_SYMBOL_SOURCE_PATH)).toBe(true);
    for (const document of documents) {
      expect(document.body).toContain("Mystics sigil");
      expect(document.body).toContain("color");
      expect(document.body).toContain("allegiance");
    }
  });

  it("replaces the stale Arcane-trait rule and adds the general symbol rule", () => {
    const baseCorpus = {
      version: "v0.6.3",
      versionLabel: "Gauntlet v0.6.3",
      published: true,
      currentPublicRelease: "v0.6.3",
      documents: [
        {
          id: "rulebook:arcane-trait",
          kind: "rulebook",
          title: "Mystics › Arcane trait",
          heading: "Arcane trait",
          body: "Arcane is a trait, not faction allegiance.",
        },
        {
          id: "rulebook:battle",
          kind: "rulebook",
          title: "Battle",
          heading: "Battle",
          body: "Unrelated v0.6.3 authority remains unchanged.",
        },
      ],
    };

    const result = applyV064ArcaneSymbolOverride(
      baseCorpus,
      source,
      "https://example.invalid/docs/v0.6.4-arcane-symbol.json",
    );

    expect(result.published).toBe(false);
    expect(result.currentPublicRelease).toBe("v0.6.3");
    expect(result.documents.some((document) => document.id === "rulebook:arcane-trait")).toBe(false);
    expect(result.byId.get("rulebook:v064-arcane-symbol")?.body).toContain("shape identifies the Arcane trait");
    expect(result.byId.get("rulebook:v064-arcane-trait")?.body).toContain("cards from other pools may also have the trait");
    expect(result.byId.get("rulebook:battle")?.body).toBe("Unrelated v0.6.3 authority remains unchanged.");
  });
});
