import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reviewPage = readFileSync("card-design/index.html", "utf8");
const ornamentStudy = readFileSync("card-design/deed-ornament-study.html", "utf8");
const supplementalRenderer = readFileSync("card-design/supplemental-card.js", "utf8");
const supplementalStyles = readFileSync("card-design/supplemental-card.css", "utf8");
const deedStyles = readFileSync("card-design/deed-card.css", "utf8");
const refinementStyles = readFileSync("card-design/card-design-refinement.css", "utf8");
const factionStyles = readFileSync("card-design/faction-specimens.css", "utf8");
const territoryStyles = readFileSync("card-design/territory-card.css", "utf8");
const proposalStyles = readFileSync("card-design/proposal-card.css", "utf8");
const componentContract = JSON.parse(readFileSync("config/tts-component-contract.json", "utf8"));
const deedComponent = componentContract.components.find((component: { id?: string }) => component.id === "financiers-deed");

describe("Financier Deed card", () => {
  it("keeps eight shared Deeds in the current component contract", () => {
    expect(deedComponent).toMatchObject({
      id: "financiers-deed",
      name: "Deed Card",
      faction: "financiers",
      family: "deed-card",
      quantity: 8,
    });
    expect(supplementalRenderer).toContain("'deed-card'");
    expect(supplementalRenderer).toContain("data-contract-component-id=\"${esc(component.contractId)}\"");
  });

  it("loads dedicated Deed styles after the supplemental component stylesheet", () => {
    expect(reviewPage).toContain('href="deed-card.css"');
    expect(reviewPage.indexOf('href="deed-card.css"')).toBeGreaterThan(reviewPage.indexOf('href="supplemental-card.css"'));
  });

  it("renders the Deed in the same 3.5 by 2.5 inch landscape format as Territories", () => {
    expect(territoryStyles).toContain("width: 3.5in");
    expect(territoryStyles).toContain("height: 2.5in");
    expect(deedStyles).toContain('data-contract-component-id="financiers-deed"');
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

  it("overscans the rotated parchment beneath the keyline so no subpixel seam can appear", () => {
    expect(deedStyles).toContain("width: 72%");
    expect(deedStyles).toContain("height: 145%");
    expect(deedStyles).toContain("linear-gradient(var(--deed-parchment-tint), var(--deed-parchment-tint)),\n    var(--parchment-image)");
  });

  it("centers the approved Deed wordmark and flourish together as one title block", () => {
    expect(proposalStyles).toContain('"P22 Declaration W01 Blackletter"');
    expect(deedStyles).toContain('content: "Deed"');
    expect(deedStyles).not.toContain('content: "DEED"');
    expect(deedStyles).toContain('"P22 Declaration W01 Blackletter"');
    expect(deedStyles).toContain("font-size: 72pt");
    expect(deedStyles).toContain(".card-heading");
    expect(deedStyles).toContain("top: 50%");
    expect(deedStyles).toContain("left: 50%");
    expect(deedStyles).toContain("justify-items: center");
    expect(deedStyles).toContain("row-gap: 0.055in");
    expect(deedStyles).toContain("transform: translate(-50%, -50%)");
    expect(deedStyles).toContain(".card-interior > *");
    expect(deedStyles).not.toContain("deed-watermark");
    expect(deedStyles).not.toContain("deed-footer");
  });

  it("uses the selected Poetica mirror-11, 44, 11 ornament composition", () => {
    expect(deedStyles).toContain('font-family: "poetica-std", "Poetica Std", serif');
    expect(deedStyles).toContain('font-feature-settings: "ornm" 11');
    expect(deedStyles).toContain('font-feature-settings: "ornm" 44');
    expect(deedStyles).toContain("font-size: 28pt");
    expect(deedStyles).toContain("font-size: 18pt");
    expect(deedStyles).toContain("transform: scaleX(-1)");
    expect(deedStyles).toContain(".supplemental-type-line::before");
    expect(deedStyles).toContain(".supplemental-type-line::after");
    expect(deedStyles).toContain(".supplemental-type-line > span:last-child::after");
  });

  it("suppresses the irrelevant fit-warning dot without restoring the rejected CSS-built flourish", () => {
    expect(refinementStyles).toContain(".gauntlet-card.fit-warning::after");
    expect(deedStyles).toContain('.supplemental-placeholder-card[data-contract-component-id="financiers-deed"].fit-warning::after');
    expect(deedStyles).not.toContain("radial-gradient(ellipse at 100% 100%");
    expect(deedStyles).not.toContain("linear-gradient(135deg, transparent 42%");
  });

  it("retains the Poetica ornament index study that established the selected glyphs", () => {
    expect(ornamentStudy).toContain('https://use.typekit.net/vgm6nwi.css');
    expect(ornamentStudy).toContain('font-family: "poetica-std", "Poetica Std", serif');
    expect(ornamentStudy).toContain("const maxIndex = 64");
    expect(ornamentStudy).toContain('ornament.style.fontFeatureSettings = `"ornm" ${index}`');
    expect(ornamentStudy).toContain("candidate-wordmark");
    expect(ornamentStudy).toContain("candidate-ornament");
  });

  it("tracks the current data-driven specimen wrapper and keeps clone-safe card selectors", () => {
    expect(deedStyles).toContain("#supplemental-financiers-financiers-deed");
    expect(deedStyles).toContain('.supplemental-placeholder-card[data-contract-component-id="financiers-deed"] .card-interior');
    expect(deedStyles).toContain('.supplemental-placeholder-card[data-contract-component-id="financiers-deed"] .card-interior::before');
    expect(deedStyles).toContain('.supplemental-placeholder-card[data-contract-component-id="financiers-deed"] .card-heading');
    expect(supplementalStyles).toContain("#supplemental-financiers-deed");
  });
});
