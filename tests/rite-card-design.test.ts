import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reviewPage = readFileSync("card-design/index.html", "utf8");
const riteRenderer = readFileSync("card-design/rite-card.js", "utf8");
const riteStyles = readFileSync("card-design/rite-card.css", "utf8");
const leaderStyles = readFileSync("card-design/leader-card.css", "utf8");
const ruleColumnStyles = readFileSync("card-design/card-rule-columns.css", "utf8");
const completedRiteArtwork = readFileSync("images/artwork/supplemental/mystics/rite-completed.webp");

const riteNames = ["Rite of Echoes", "Rite of Blood", "Rite of Crossing"];
const riteArtworkPaths = [
  "images/artwork/cards/mystics/rites-and-rituals/rite-of-echoes.png",
  "images/artwork/cards/mystics/rites-and-rituals/rite-of-blood.png",
  "images/artwork/cards/mystics/rites-and-rituals/rite-of-crossing.png",
];

describe("Mystics Rite card prototypes", () => {
  it("adds all three double-sided Rites and the Ritual to the unified card-review page", () => {
    expect(reviewPage).toContain('id="rite-cards"');
    expect(reviewPage).toContain('id="riteReviewSections"');
    expect(reviewPage).toContain('href="#rite-cards"');
    expect(reviewPage).toContain('href="rite-card.css"');
    expect(reviewPage).toContain('type="module" src="rite-card.js"');
    expect(reviewPage).toContain('<span data-rite-count>3</span> double-sided Rites');
    expect(reviewPage).toContain('<strong data-ritual-count>1</strong> Ritual');
    for (const name of riteNames) expect(riteRenderer).toContain(`name: '${name}'`);
    expect(riteRenderer).toContain("RITES.map(reviewPair).join('')");
    expect(riteRenderer).toContain("ritualReview()");
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

  it("uses the uploaded artwork on all three incomplete Rite faces while leaving Ritual artwork explicitly pending", () => {
    for (const path of riteArtworkPaths) expect(existsSync(path)).toBe(true);
    expect(riteRenderer).toContain("const RITE_ART_ROOT = '../images/artwork/cards/mystics/rites-and-rituals'");
    expect(riteRenderer).toContain("artwork: `${RITE_ART_ROOT}/rite-of-echoes.png`");
    expect(riteRenderer).toContain("artwork: `${RITE_ART_ROOT}/rite-of-blood.png`");
    expect(riteRenderer).toContain("artwork: `${RITE_ART_ROOT}/rite-of-crossing.png`");
    expect(riteRenderer).toContain('class="card-art has-image" aria-label="Artwork for ${esc(rite.name)}"');
    expect(riteRenderer).toContain('<img src="${esc(rite.artwork)}"');
    expect(riteRenderer).toContain("function ritualArtwork()");
    expect(riteRenderer).toContain("Artwork pending for ${esc(RITUAL.name)}");
  });

  it("turns every completed face into the same count-based progression reference", () => {
    for (const label of ["1 Rite", "2 Rites", "3 Rites", "Ritual"]) expect(riteRenderer).toContain(`count: '${label}'`);
    for (const ability of ["Invocation", "Transmutation", "Convergence", "Ritual of Ascendance"]) expect(riteRenderer).toContain(`name: '${ability}'`);
    expect(riteRenderer).toContain("UNLOCKS.map(unlockSection).join('')");
    expect(riteRenderer).toContain("completed-rite-card");
    expect(riteStyles).toContain(".rite-unlock-section");
    expect(ruleColumnStyles).toContain("grid-template-columns: fit-content(var(--rule-label-max)) minmax(0, 1fr)");
    expect(ruleColumnStyles).toContain("grid-template-columns: subgrid !important");
    expect(ruleColumnStyles).toContain(".completed-rite-card");
    expect(ruleColumnStyles).toContain("--rule-label-max: 0.48in");
    expect(ruleColumnStyles).toContain("--rule-column-gap: 0.024in");
  });

  it("uses the approved shared Mystics completion artwork rather than the Diplomat wax-seal treatment", () => {
    expect(riteRenderer).toContain("../images/artwork/supplemental/mystics/rite-completed.webp");
    expect(riteRenderer).not.toContain("const COMPLETED_RITE_ART_SOURCE = '/images/");
    expect(riteRenderer).toContain('class="card-art rite-completed-panel has-image"');
    expect(riteRenderer).toContain('<img src="${COMPLETED_RITE_ART_SOURCE}"');
    expect(riteStyles).toContain(".rite-completed-panel > img");
    expect(riteStyles).toContain("object-fit: cover");
    expect(riteStyles).toContain("object-position: center");
    expect(createHash("sha256").update(completedRiteArtwork).digest("hex")).toBe("f1635b9f948ba91940be8bb15fad5192fbf75b90e9c8ff3d5f677755826edbef");
    expect(riteRenderer).not.toContain("rite-ritual-diagram");
    expect(riteRenderer).not.toContain("wax-seal");
    expect(riteRenderer).not.toContain("Ratified");
  });

  it("uses reclaimed completed-Rite space for artwork while retaining a finite cap", () => {
    expect(riteRenderer).toContain("const artMax = completed ? '1.24' : '1.48'");
    expect(riteRenderer).toContain("const artMin = completed ? '0.78' : '0.92'");
    expect(riteStyles).toContain("font-size: calc(5.45pt * var(--rules-scale))");
    expect(riteStyles).toContain("--minimum-rules-scale: 0.82");
  });
});
