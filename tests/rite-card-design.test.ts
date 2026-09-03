import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reviewPage = readFileSync("card-design/index.html", "utf8");
const riteRenderer = readFileSync("card-design/rite-card.js", "utf8");
const currentGame = JSON.parse(readFileSync("game-data/current-game.json", "utf8"));
const mysticsAuthority = currentGame.mystics;
const riteStyles = readFileSync("card-design/rite-card.css", "utf8");
const leaderStyles = readFileSync("card-design/leader-card.css", "utf8");
const ruleColumnStyles = readFileSync("card-design/card-rule-columns.css", "utf8");
const completedRiteArtwork = readFileSync("images/artwork/supplemental/mystics/rite-completed.webp");

const riteNames = ["Rite of Echoes", "Rite of Blood", "Rite of Crossing", "Rite of Shattering", "Rite of Consecration", "Rite of Equivalence"];
const riteArtworkPaths = [
  "images/artwork/cards/mystics/rites-and-rituals/rite-of-echoes.png",
  "images/artwork/cards/mystics/rites-and-rituals/rite-of-blood.png",
  "images/artwork/cards/mystics/rites-and-rituals/rite-of-crossing.png",
  "images/artwork/cards/mystics/rites-and-rituals/rite-of-shattering.png",
  "images/artwork/cards/mystics/rites-and-rituals/rite-of-consecration.png",
  "images/artwork/cards/mystics/rites-and-rituals/rite-of-equivalence.png",
];
const ritualArtworkPath = "images/artwork/cards/mystics/rites-and-rituals/ritual-of-ascension.png";
const ritualCardBackPath = "images/artwork/cardbacks/mystics/ritual-of-ascension.png";

describe("Mystics Rite card prototypes", () => {
  it("adds all six double-sided Rites and the Ritual to the unified card-review page", () => {
    expect(reviewPage).toContain('id="rite-cards"');
    expect(reviewPage).toContain('id="riteReviewSections"');
    expect(reviewPage).toContain('data-catalog-kind="rite"');
    expect(reviewPage).toContain('href="rite-card.css"');
    expect(reviewPage).toContain('type="module" src="rite-card.js"');
    expect(reviewPage).not.toContain('data-rite-count>3</span>');
    expect(reviewPage).toContain('<span data-rite-count>6</span> double-sided Rites');
    for (const shortName of ["Echoes", "Blood", "Crossing", "Shattering", "Consecration", "Equivalence"]) {
      expect(reviewPage).toContain(shortName);
    }
    expect(reviewPage).toContain('<strong data-ritual-count>1</strong> Ritual');
    expect(mysticsAuthority.rites.map((item: any) => item.name)).toEqual(riteNames);
    expect(riteRenderer).toContain("import { loadCurrentGame } from '../game-data/current-game.mjs'");
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
    expect(riteRenderer).toContain("RITES = Array.isArray(mystics.rites) ? mystics.rites : []");
    expect(riteRenderer).not.toContain("RITE_SOURCE");
  });

  it("uses approved artwork for every Rite face", () => {
    for (const path of riteArtworkPaths) expect(existsSync(path)).toBe(true);
    expect(existsSync(ritualArtworkPath)).toBe(true);
    expect(existsSync(ritualCardBackPath)).toBe(true);
    expect(mysticsAuthority.rites.map((item: any) => item.artwork)).toEqual([
      "/images/artwork/cards/mystics/rites-and-rituals/rite-of-echoes.png",
      "/images/artwork/cards/mystics/rites-and-rituals/rite-of-blood.png",
      "/images/artwork/cards/mystics/rites-and-rituals/rite-of-crossing.png",
      "/images/artwork/cards/mystics/rites-and-rituals/rite-of-shattering.png",
      "/images/artwork/cards/mystics/rites-and-rituals/rite-of-consecration.png",
      "/images/artwork/cards/mystics/rites-and-rituals/rite-of-equivalence.png",
    ]);
    expect(mysticsAuthority.ritual.artwork).toBe("/images/artwork/cards/mystics/rites-and-rituals/ritual-of-ascension.png");
    expect(mysticsAuthority.ritual.cardBack).toBe("/images/artwork/cardbacks/mystics/ritual-of-ascension.png");
    expect(riteRenderer).toContain('class="card-art has-image" aria-label="Artwork for ${esc(rite.name)}"');
    expect(riteRenderer).toContain('<img src="${esc(rite.artwork)}"');
    expect(riteRenderer).toContain('Artwork pending for ${esc(rite.name)}');
    expect(riteRenderer).toContain('rite.reminder?.text');
    expect(riteRenderer).toContain('currentDisplayVersion = currentGame.displayVersion');
    expect(riteRenderer).toContain('data-has-reminder="true"');
    expect(riteStyles).toContain('.rite-reminder');
    expect(riteStyles).not.toContain('border-top: 0.5px solid color-mix(in srgb, var(--component-accent-ink) 24%, transparent)');
    expect(ruleColumnStyles).toContain(".rite-card .card-rules > .rite-reminder");
    expect(ruleColumnStyles).toContain("grid-column: 2 / -1");
    expect(ruleColumnStyles).toContain("margin-left: 0");
    expect(riteRenderer).toContain("function ritualArtwork()");
    expect(riteRenderer).toContain('<img src="${esc(RITUAL.artwork)}"');
    expect(riteRenderer).not.toContain("Artwork pending for ${esc(RITUAL.name)}");
  });

  it("rotates, scales, and offsets the Ritual of Ascension card-back artwork around the ritual circle without rotating the physical card", () => {
    expect(riteStyles).toContain(".ritual-card-back__image-window > img");
    expect(riteStyles).toContain("width: 4.02in");
    expect(riteStyles).toContain("height: 2.82in");
    expect(riteStyles).toContain("top: calc(50% + 0.025in)");
    expect(riteStyles).toContain("left: calc(50% - 0.224in)");
    expect(riteStyles).toContain("translate: -50% -50%");
    expect(riteStyles).toContain("rotate: 90deg");
    expect(riteStyles).toContain(".ritual-face-grid");
    expect(riteStyles).toContain("grid-template-columns: repeat(2, 2.5in)");
  });

  it("turns every completed face into the same count-based progression reference", () => {
    expect(mysticsAuthority.unlocks.map((item: any) => item.count)).toEqual(["1 Rite", "2 Rites", "3 Rites", "Ritual"]);
    expect(mysticsAuthority.unlocks.map((item: any) => item.name)).toEqual(["Invocation", "Transmutation", "Convergence", "Ritual of Ascension"]);
    expect(mysticsAuthority.unlocks[0].text).toContain("after applying the Action, Gambit, or Tactic effect");
    expect(mysticsAuthority.unlocks[0].text).not.toContain("Gambit, Tactic, or Gambit or Tactic");
    expect(mysticsAuthority.unlocks[1].text).toContain("before dice are rolled in a battle,");
    expect(mysticsAuthority.unlocks[1].text).not.toContain("battle involving you");
    expect(mysticsAuthority.unlocks.at(-1).headerLines).toEqual(["Ritual of", "Ascension"]);
    expect(riteRenderer).toContain("UNLOCKS = Array.isArray(mystics.unlocks) ? mystics.unlocks : []");
    expect(riteRenderer).toContain("rite-unlock-section--ritual");
    expect(riteRenderer).toContain("rite-unlock-ritual-heading");
    expect(riteRenderer).toContain('<p>${esc(unlock.text)}</p>');
    expect(riteRenderer).toContain("UNLOCKS.map(unlockSection).join('')");
    expect(riteRenderer).toContain("completed-rite-card");
    expect(riteStyles).toContain(".rite-unlock-section");
    expect(riteStyles).toContain(".rite-unlock-ritual-heading span");
    expect(riteStyles).toContain("white-space: nowrap");
    expect(ruleColumnStyles).toContain("grid-template-columns: fit-content(var(--rule-label-max)) minmax(0, 1fr)");
    expect(ruleColumnStyles).toContain("grid-template-columns: subgrid !important");
    expect(ruleColumnStyles).toContain(".completed-rite-card");
    expect(ruleColumnStyles).toContain("--rule-label-max: 0.48in");
    expect(ruleColumnStyles).toContain("--rule-column-gap: 0.024in");
  });

  it("uses the approved shared Mystics completion artwork rather than the Diplomat wax-seal treatment", () => {
    expect(mysticsAuthority.completedArtwork).toBe("/images/artwork/supplemental/mystics/rite-completed.webp");
    expect(riteRenderer).toContain("COMPLETED_RITE_ART_SOURCE = mystics.completedArtwork || COMPLETED_RITE_ART_SOURCE");
    expect(riteRenderer).toContain('class="card-art rite-completed-panel has-image"');
    expect(riteRenderer).toContain('<img src="${esc(COMPLETED_RITE_ART_SOURCE)}"');
    expect(riteStyles).toContain(".rite-completed-panel > img");
    expect(riteStyles).toContain("object-fit: cover");
    expect(riteStyles).toContain("object-position: center");
    expect(createHash("sha256").update(completedRiteArtwork).digest("hex")).toBe("f1635b9f948ba91940be8bb15fad5192fbf75b90e9c8ff3d5f677755826edbef");
    expect(riteRenderer).not.toContain("rite-ritual-diagram");
    expect(riteRenderer).not.toContain("wax-seal");
    expect(riteRenderer).not.toContain("Ratified");
  });

  it("uses the normal playable-card artwork fitting range for every Rite face", () => {
    expect(riteRenderer).toContain('data-art-max="1.72"');
    expect(riteRenderer).toContain('data-art-min="0.62"');
    expect(riteRenderer).not.toContain("const artMax = completed");
    expect(riteRenderer).not.toContain("const artMin = completed");
    expect(riteStyles).toContain("--art-height: 1.72in");
    expect(riteStyles).toContain("font-size: calc(5.45pt * var(--rules-scale))");
    expect(riteStyles).toContain("--minimum-rules-scale: 0.82");
  });
});
