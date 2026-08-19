import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reviewPage = readFileSync("card-design/index.html", "utf8");
const supplementalRenderer = readFileSync("card-design/supplemental-card.js", "utf8");
const supplementalStyles = readFileSync("card-design/supplemental-card.css", "utf8");
const deedStyles = readFileSync("card-design/deed-card.css", "utf8");
const factionStyles = readFileSync("card-design/faction-specimens.css", "utf8");
const territoryStyles = readFileSync("card-design/territory-card.css", "utf8");
const proposalStyles = readFileSync("card-design/proposal-card.css", "utf8");

describe("Financier Deed card", () => {
  it("keeps eight shared Deeds in the supplemental component catalog", () => {
    expect(supplementalRenderer).toContain("id: 'deed'");
    expect(supplementalRenderer).toContain("name: 'Deed'");
    expect(supplementalRenderer).toContain("quantity: 8");
  });

  it("loads dedicated Deed styles after the supplemental component stylesheet", () => {
    expect(reviewPage).toContain('href="deed-card.css"');
    expect(reviewPage.indexOf('href="deed-card.css"')).toBeGreaterThan(reviewPage.indexOf('href="supplemental-card.css"'));
  });

  it("renders the Deed in the same 3.5 by 2.5 inch landscape format as Territories", () => {
    expect(territoryStyles).toContain("width: 3.5in");
    expect(territoryStyles).toContain("height: 2.5in");
    expect(deedStyles).toContain('.supplemental-placeholder-card[aria-label^="Deed "]');
    expect(deedStyles).toContain("width: 3.5in");
    expect(deedStyles).toContain("height: 2.5in");
  });

  it("reuses the approved Financiers border and faction parchment rather than adding a new art asset", () => {
    expect(factionStyles).toContain("--faction-border: #227044");
    expect(factionStyles).toContain("--faction-border-outline: #124429");
    expect(deedStyles).toContain("var(--parchment-image)");
    expect(deedStyles).not.toContain("deed.png");
    expect(deedStyles).not.toContain("deed.webp");
    expect(deedStyles).not.toContain("deed.svg");
  });

  it("applies a visibly green Financiers wash without multiplying the warm parchment into ochre", () => {
    expect(deedStyles).toContain("--deed-parchment-tint: rgba(34, 112, 68, 0.18)");
    expect(deedStyles).toContain("linear-gradient(var(--deed-parchment-tint), var(--deed-parchment-tint))");
    expect(deedStyles).not.toContain("background-blend-mode: multiply");
    expect(deedStyles).toContain("print-color-adjust: exact");
  });

  it("centers only the Deed wordmark across the full card interior in Declaration Blackletter", () => {
    expect(proposalStyles).toContain('"P22 Declaration W01 Blackletter"');
    expect(deedStyles).toContain('content: "Deed"');
    expect(deedStyles).not.toContain('content: "DEED"');
    expect(deedStyles).toContain('"P22 Declaration W01 Blackletter"');
    expect(deedStyles).toContain("font-size: 42pt");
    expect(deedStyles).toContain("position: absolute");
    expect(deedStyles).toContain("inset: 0");
    expect(deedStyles).toContain("display: grid");
    expect(deedStyles).toContain("place-items: center");
    expect(deedStyles).toContain("mix-blend-mode: normal");
    expect(deedStyles).toContain(".card-interior > *");
    expect(deedStyles).toContain("display: none");
    expect(deedStyles).not.toContain("deed-watermark");
    expect(deedStyles).not.toContain("deed-footer");
  });

  it("styles the card itself so the inspection clone does not depend on the catalog wrapper", () => {
    expect(deedStyles).toContain('.supplemental-placeholder-card[aria-label^="Deed "] .card-interior');
    expect(deedStyles).toContain('.supplemental-placeholder-card[aria-label^="Deed "] .card-interior::before');
    expect(deedStyles).toContain('.supplemental-placeholder-card[aria-label^="Deed "] .card-interior::after');
    expect(supplementalStyles).toContain("#supplemental-financiers-deed");
  });
});
