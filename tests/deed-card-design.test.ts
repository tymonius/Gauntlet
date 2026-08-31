import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reviewPage = readFileSync("card-design/index.html", "utf8");
const componentPrintPage = readFileSync("card-design/component-print-render.html", "utf8");
const componentPrintScript = readFileSync("card-design/component-print-render.js", "utf8");
const ornamentStudy = readFileSync("card-design/deed-ornament-study.html", "utf8");
const deedDivider = readFileSync("card-design/deed-ornamental-divider.svg", "utf8");
const deedScript = readFileSync("card-design/deed-card.js", "utf8");
const supplementalRenderer = readFileSync("card-design/supplemental-card.js", "utf8");
const supplementalStyles = readFileSync("card-design/supplemental-card.css", "utf8");
const deedStyles = readFileSync("card-design/deed-card.css", "utf8");
const refinementStyles = readFileSync("card-design/card-design-refinement.css", "utf8");
const factionStyles = readFileSync("card-design/faction-specimens.css", "utf8");
const territoryStyles = readFileSync("card-design/territory-card.css", "utf8");
const proposalStyles = readFileSync("card-design/proposal-card.css", "utf8");
const currentGame = JSON.parse(readFileSync('game-data/current-game.json', 'utf8'));
const componentContract = currentGame.componentContract;
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

  it("authors the finalized Deed face directly without a placeholder normalization layer", () => {
    expect(deedScript).toContain('class="gauntlet-card faction-component-card deed-card financiers-card"');
    expect(supplementalRenderer).toContain("import { deedCardMarkup } from './deed-card.js';");
    expect(supplementalRenderer).toContain("if (component.family === 'deed-card') return deedCardMarkup();");
    expect(deedScript).not.toContain("supplemental-placeholder-card");
    expect(componentPrintScript).not.toContain("historical supplemental shell");
  });

  it("loads dedicated Deed styles in both the review and shared production renderer", () => {
    expect(reviewPage).toContain('href="deed-card.css"');
    expect(reviewPage.indexOf('href="deed-card.css"')).toBeGreaterThan(reviewPage.indexOf('href="supplemental-card.css"'));
    expect(componentPrintPage).toContain('href="/card-design/deed-card.css"');
    expect(componentPrintPage.indexOf('/card-design/deed-card.css')).toBeGreaterThan(componentPrintPage.indexOf('/card-design/supplemental-card.css'));
  });

  it("renders the Deed in the same 3.5 by 2.5 inch landscape format as Territories", () => {
    expect(territoryStyles).toContain("width: 3.5in");
    expect(territoryStyles).toContain("height: 2.5in");
    expect(deedStyles).toContain('data-contract-component-id="financiers-deed"');
    expect(deedStyles).toContain("width: 3.5in");
    expect(deedStyles).toContain("height: 2.5in");
    expect(componentPrintScript).toContain('params.get("orientation") || "portrait"');
    expect(componentPrintScript).toContain('const renderWidth = landscape ? "3.5in" : "2.5in"');
    expect(componentPrintScript).toContain('const renderHeight = landscape ? "2.5in" : "3.5in"');
  });

  it("reuses the approved Financiers border and faction parchment", () => {
    expect(factionStyles).toContain("--faction-border: #227044");
    expect(factionStyles).toContain("--faction-border-outline: #124429");
    expect(deedStyles).toContain("var(--parchment-image)");
    expect(deedStyles).not.toContain("deed.png");
    expect(deedStyles).not.toContain("deed.webp");
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

  it("centers the approved Deed wordmark and divider together as one title block", () => {
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

  it("uses the approved traced SVG as a single continuous ornamental divider", () => {
    expect(supplementalRenderer).toContain("import { deedCardMarkup } from './deed-card.js';");
    expect(deedScript).toContain('<span class="deed-divider"></span>');
    expect(deedStyles).toContain(".deed-divider");
    expect(deedStyles).toContain("width: 1.22in");
    expect(deedStyles).toContain("aspect-ratio: 327 / 16");
    expect(deedStyles).toContain('url("./deed-ornamental-divider.svg")');
    expect(deedStyles).toContain("background-color: var(--card-ink)");
    expect(deedStyles).not.toContain("deed-ornament-left");
    expect(deedStyles).not.toContain("deed-ornament-center");
    expect(deedStyles).not.toContain("deed-ornament-right");
    expect(deedScript).not.toContain("fontFeatureSettings");
    expect(deedDivider).toContain('viewBox="0 0 327 16"');
    expect(deedDivider).toContain('fill="currentColor"');
    expect(deedDivider).toContain("L327 8");
  });

  it("keeps Declaration's overhanging D from being clipped", () => {
    expect(deedStyles).toContain("max-width: none");
    expect(deedStyles).toContain("overflow: visible");
    expect(deedScript).not.toContain("title.style.overflow");
    expect(deedScript).not.toContain("title.style.maxWidth");
  });

  it("suppresses the irrelevant fit-warning dot without restoring the rejected CSS-built flourish", () => {
    expect(refinementStyles).toContain(".gauntlet-card.fit-warning::after");
    expect(deedStyles).toContain('.deed-card[data-contract-component-id="financiers-deed"].fit-warning::after');
    expect(deedStyles).not.toContain("supplemental-placeholder-card");
    expect(deedStyles).not.toContain("radial-gradient(ellipse at 100% 100%");
    expect(deedStyles).not.toContain("linear-gradient(135deg, transparent 42%");
  });

  it("retains the Poetica ornament index study as historical design exploration", () => {
    expect(ornamentStudy).toContain('https://use.typekit.net/vgm6nwi.css');
    expect(ornamentStudy).toContain('font-family: "poetica-std", "Poetica Std", serif');
    expect(ornamentStudy).toContain("const maxIndex = 64");
    expect(ornamentStudy).toContain('ornament.style.fontFeatureSettings = `"ornm" ${index}`');
    expect(ornamentStudy).toContain("candidate-wordmark");
    expect(ornamentStudy).toContain("candidate-ornament");
  });

  it("tracks the current data-driven specimen wrapper and keeps clone-safe compatibility selectors", () => {
    expect(deedStyles).toContain("#supplemental-financiers-financiers-deed");
    expect(deedStyles).toContain('.deed-card[data-contract-component-id="financiers-deed"] .card-interior');
    expect(deedStyles).toContain('.deed-card[data-contract-component-id="financiers-deed"] .card-interior::before');
    expect(deedStyles).toContain('.deed-card[data-contract-component-id="financiers-deed"] .card-heading');
    expect(supplementalStyles).not.toContain("#supplemental-financiers-deed");
  });
});
