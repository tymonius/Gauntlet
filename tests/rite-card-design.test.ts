import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reviewPage = readFileSync("card-design/index.html", "utf8");
const riteRenderer = readFileSync("card-design/rite-card.js", "utf8");
const riteStyles = readFileSync("card-design/rite-card.css", "utf8");
const leaderStyles = readFileSync("card-design/leader-card.css", "utf8");

const riteNames = ["Rite of Echoes", "Rite of Blood", "Rite of Crossing"];

describe("Mystics Rite card prototypes", () => {
  it("adds all three double-sided Rites to the unified card-review page", () => {
    expect(reviewPage).toContain('id="rite-cards"');
    expect(reviewPage).toContain('id="riteReviewSections"');
    expect(reviewPage).toContain('href="#rite-cards"');
    expect(reviewPage).toContain('href="rite-card.css"');
    expect(reviewPage).toContain('type="module" src="rite-card.js"');
    expect(reviewPage).toContain("<strong data-rite-count>3</strong> Rite / completed-Rite pairs");
    for (const name of riteNames) expect(riteRenderer).toContain(`name: '${name}'`);
    expect(riteRenderer).toContain("RITES.map(reviewPair).join('')");
  });

  it("reuses the shared faction-component title-bar grammar without a decorative medallion", () => {
    expect(riteRenderer).toContain("gauntlet-card faction-component-card rite-card mystic-card");
    expect(riteRenderer).toContain('data-faction="mystics"');
    expect(riteRenderer).toContain("rite-faction-emblem");
    expect(riteRenderer).not.toContain("value-medallion");
    expect(leaderStyles).toContain("--component-heading-height: 0.50in");
    expect(leaderStyles).toContain("--component-subheading-font-size: 6.25pt");
    expect(leaderStyles).toContain("--component-subheading-icon-size: 0.18in");
    expect(riteStyles).toContain("grid-template-rows: var(--component-heading-height, 0.50in) var(--art-height) auto 0.18in");
    expect(riteStyles).toContain("font-size: var(--component-subheading-font-size, 6.25pt)");
    expect(riteStyles).toContain("width: var(--component-subheading-icon-size, 0.18in)");
  });

  it("keeps incomplete Rite instructions on the front face", () => {
    expect(riteRenderer).toContain("ruleSection('Begin', rite.begin)");
    expect(riteRenderer).toContain("ruleSection('Complete', rite.complete)");
    expect(riteRenderer).toContain("ruleSection('Interrupted', rite.interrupted)");
    expect(riteRenderer).toContain("RITE_SOURCE");
    expect(riteRenderer).toContain("clean-v0.6.3/faction-guides/mystics/Gauntlet_v0.6.3_Mystics_Faction_Guide.md");
  });

  it("turns every completed face into the same count-based progression reference", () => {
    for (const label of ["1 Rite", "2 Rites", "3 Rites", "Ritual"]) expect(riteRenderer).toContain(`count: '${label}'`);
    for (const ability of ["Invocation", "Transmutation", "Convergence", "Ritual of Ascendance"]) expect(riteRenderer).toContain(`name: '${ability}'`);
    expect(riteRenderer).toContain("UNLOCKS.map(unlockSection).join('')");
    expect(riteRenderer).toContain("completed-rite-card");
    expect(riteStyles).toContain(".rite-unlock-section");
    expect(riteStyles).toContain("grid-template-columns: 0.49in minmax(0, 1fr)");
  });

  it("uses an inked Mystic ritual diagram rather than the Diplomat wax-seal treatment", () => {
    expect(riteRenderer).toContain("rite-completed-word\">Completed");
    expect(riteRenderer).toContain("rite-ritual-diagram");
    expect(riteRenderer).toContain("rite-diagram-emblem");
    expect(riteStyles).toContain("border-radius: 50%");
    expect(riteStyles).toContain(".rite-diagram-axis-b");
    expect(riteStyles).toContain("transform: rotate(60deg)");
    expect(riteStyles).toContain("-webkit-mask: var(--faction-symbol)");
    expect(riteRenderer).not.toContain("wax-seal");
    expect(riteRenderer).not.toContain("Ratified");
  });

  it("allows the completed reference face to trade artwork height for readable ability text", () => {
    expect(riteRenderer).toContain("const artMax = completed ? '1.06' : '1.48'");
    expect(riteRenderer).toContain("const artMin = completed ? '0.78' : '0.92'");
    expect(riteStyles).toContain("font-size: calc(5.45pt * var(--rules-scale))");
    expect(riteStyles).toContain("--minimum-rules-scale: 0.82");
  });
});
