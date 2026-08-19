import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const supplementalRenderer = readFileSync("card-design/supplemental-card.js", "utf8");
const supplementalStyles = readFileSync("card-design/supplemental-card.css", "utf8");
const factionStyles = readFileSync("card-design/faction-specimens.css", "utf8");
const territoryStyles = readFileSync("card-design/territory-card.css", "utf8");
const proposalStyles = readFileSync("card-design/proposal-card.css", "utf8");

describe("Financier Deed card", () => {
  it("keeps eight shared Deeds in the supplemental component catalog", () => {
    expect(supplementalRenderer).toContain("id: 'deed'");
    expect(supplementalRenderer).toContain("name: 'Deed'");
    expect(supplementalRenderer).toContain("quantity: 8");
  });

  it("renders the Deed in the same 3.5 by 2.5 inch landscape format as Territories", () => {
    expect(territoryStyles).toContain("width: 3.5in");
    expect(territoryStyles).toContain("height: 2.5in");
    expect(supplementalStyles).toContain('#supplemental-financiers-deed .supplemental-placeholder-card[aria-label^="Deed "]');
    expect(supplementalStyles).toContain("width: 3.5in");
    expect(supplementalStyles).toContain("height: 2.5in");
  });

  it("reuses the approved Financiers border and faction parchment rather than adding a new art asset", () => {
    expect(factionStyles).toContain("--faction-border: #227044");
    expect(factionStyles).toContain("--faction-border-outline: #124429");
    expect(supplementalStyles).toContain("background-image: var(--parchment-image)");
    expect(supplementalStyles).not.toContain("deed.png");
    expect(supplementalStyles).not.toContain("deed.webp");
    expect(supplementalStyles).not.toContain("deed.svg");
  });

  it("centers only the Deed wordmark in Declaration Blackletter with no watermark or footer treatment", () => {
    expect(proposalStyles).toContain('"P22 Declaration W01 Blackletter"');
    expect(supplementalStyles).toContain('content: "Deed"');
    expect(supplementalStyles).not.toContain('content: "DEED"');
    expect(supplementalStyles).toContain('"P22 Declaration W01 Blackletter"');
    expect(supplementalStyles).toContain("font-size: 42pt");
    expect(supplementalStyles).toContain("top: 50%");
    expect(supplementalStyles).toContain("left: 50%");
    expect(supplementalStyles).toContain("transform: translate(-50%, -50%)");
    expect(supplementalStyles).toContain(".card-interior > *");
    expect(supplementalStyles).toContain("display: none");
    expect(supplementalStyles).not.toContain("deed-watermark");
    expect(supplementalStyles).not.toContain("deed-footer");
  });
});
