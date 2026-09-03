import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const leaderRedirect = readFileSync("card-design/leaders.html", "utf8");
const leaderCatalog = readFileSync("card-design/card-review.js", "utf8");
const currentGame = JSON.parse(readFileSync("game-data/current-game.json", "utf8"));
const reviewPage = readFileSync("card-design/index.html", "utf8");
const leaderStyles = readFileSync("card-design/leader-card.css", "utf8");
const factionComponentStyles = readFileSync("card-design/faction-component.css", "utf8");
const refinementStyles = readFileSync("card-design/card-design-refinement.css", "utf8");
const factionSymbols = [
  "military",
  "diplomats",
  "financiers",
  "intelligence",
  "mystics",
  "inquisition",
].map(name => ({
  name,
  source: readFileSync(`images/faction-symbols/${name}.svg`, "utf8"),
}));
const leaderNames = [
  "General",
  "Commandant",
  "Ambassador",
  "Senator",
  "Banker",
  "Executive",
  "Ranger",
  "Spymaster",
  "Alchemist",
  "Spirit Walker",
  "Grand Inquisitor",
  "Witch Hunter",
];

describe("Leader card design", () => {
  it("uses the shared poker-card shell and mounted portrait frame for all twelve Leaders", () => {
    expect(currentGame.leaders.map((item: any) => item.name)).toEqual(leaderNames);
    expect(currentGame.leaders).toHaveLength(12);
    expect(leaderCatalog).toContain("const leaders = current.leaders.filter");
    expect(leaderCatalog).toContain('class="gauntlet-card faction-component-card leader-card');
    expect(leaderCatalog).toContain('class="card-art has-image"');
    expect(leaderStyles).toContain("grid-template-rows: var(--component-heading-height) var(--art-height) auto 0.18in");
    expect(leaderStyles).toContain("--art-height: 1.86in");
    expect(refinementStyles).toContain("0 0 0 0.007in rgba(231, 212, 176, 0.78)");
  });

  it("uses a shorter component header with a substantially more legible faction subheading", () => {
    expect(factionComponentStyles).toContain("--component-heading-height: 0.50in");
    expect(factionComponentStyles).toContain("--component-subheading-font-size: 6.25pt");
    expect(factionComponentStyles).toContain("--component-subheading-icon-size: 0.18in");
    expect(factionComponentStyles).toContain("--component-subheading-gap: 0.045in");
    expect(leaderStyles).toContain("gap: 0.012in");
    expect(leaderStyles).toContain("padding: 0.028in 0.09in 0.022in");
    expect(leaderStyles).toContain("font-size: var(--component-subheading-font-size)");
    expect(leaderStyles).toContain("width: var(--component-subheading-icon-size)");
    expect(leaderStyles).toContain("height: var(--component-subheading-icon-size)");
    expect(leaderStyles).toContain("letter-spacing: 0.085em");
  });

  it("removes playable-card value and generic Leader labels from the body", () => {
    expect(leaderCatalog).not.toContain("value-medallion");
    expect(leaderCatalog).not.toContain("Leader Ability");
    expect(leaderCatalog).not.toContain("Supplemental Leader");
  });

  it("identifies faction, component type, and version in the metadata footer", () => {
    expect(leaderCatalog).toContain('<span>${esc(leader.factionLabel)}</span><span>Leader</span><span>${esc(version)}</span>');
    expect(leaderCatalog).not.toContain("<span>Command</span>");
  });

  it("uses full-color production portraits from the main image directory", () => {
    expect(currentGame.leaders.every((item: any) => /^\/images\//.test(item.image))).toBe(true);
    expect(JSON.stringify(currentGame.leaders)).not.toContain("/images/sketches/");
    expect(leaderStyles).toContain("filter: none");
    expect(leaderStyles).toContain("mix-blend-mode: normal");
  });

  it("ships a dedicated free-standing symbol for every faction", () => {
    expect(factionSymbols).toHaveLength(6);
    for (const symbol of factionSymbols) {
      expect(symbol.source).toContain('<svg');
      expect(symbol.source).toMatch(/viewBox="[^"]+"/);
      expect(leaderStyles).toContain(`url("../images/faction-symbols/${symbol.name}.svg")`);
      expect(currentGame.leaders.some((item: any) => item.faction === symbol.name)).toBe(true);
    }
    expect(leaderCatalog).toContain('class="leader-faction-emblem"');
    expect(leaderStyles).toContain("-webkit-mask: var(--faction-symbol)");
    expect(leaderStyles).toContain("mask: var(--faction-symbol)");
  });

  it("tints Leader and reusable faction-component parchment without tinting art", () => {
    expect(leaderCatalog).toContain("faction-component-card leader-card");
    expect(factionComponentStyles).toContain(".faction-component-card .card-interior::after");
    expect(factionComponentStyles).toContain("mix-blend-mode: multiply");
    expect(factionComponentStyles).toContain("--component-parchment-tint: rgba(145, 28, 38, 0.15)");
    expect(leaderStyles).toContain(".leader-card .card-art img");
  });

  it("uses a darker faction-specific tint for the metadata footer", () => {
    expect(factionComponentStyles).toContain("--component-footer-tint: rgba(145, 28, 38, 0.22)");
    expect(factionComponentStyles).toContain("--component-footer-tint: rgba(38, 79, 145, 0.20)");
    expect(factionComponentStyles).toContain("--component-footer-tint: rgba(34, 112, 68, 0.20)");
    expect(factionComponentStyles).toContain("--component-footer-tint: rgba(40, 40, 39, 0.18)");
    expect(factionComponentStyles).toContain("--component-footer-tint: rgba(93, 52, 126, 0.20)");
    expect(factionComponentStyles).toContain("--component-footer-tint: rgba(166, 122, 39, 0.22)");
    expect(leaderStyles).toContain("background: var(--component-footer-tint)");
  });

  it("preserves the exact current Military Orders", () => {
    const military = currentGame.leaders.filter((item: any) => item.faction === "military");
    const generalOrders = military.find((item: any) => item.id === "general")?.sections
      .find((section: any) => section.name === "Orders")?.items || [];
    const commandantOrders = military.find((item: any) => item.id === "commandant")?.sections
      .find((section: any) => section.name === "Orders")?.items || [];
    expect(generalOrders.map((item: any) => item.name)).toEqual(["Onward", "Rally", "Rout"]);
    expect(commandantOrders.map((item: any) => item.name)).toEqual(["Entrench", "Repel", "Fortify"]);
    expect(JSON.stringify(military)).not.toMatch(/pending battle/i);
    expect(JSON.stringify(commandantOrders)).toContain("Advance your Front Line by one Territory, if able");
    expect(leaderStyles).toContain("grid-template-columns: 0.63in minmax(0, 1fr)");
  });

  it("keeps Leader artwork composition in canonical data rather than CSS", () => {
    for (const leader of currentGame.leaders) {
      const id = `${leader.faction}-${leader.id}`;
      expect(currentGame.artDirection[id]).toMatchObject({
        fit: "cover",
        focusX: expect.any(Number),
        focusY: expect.any(Number),
        smart: false,
        zoom: expect.any(Number),
      });
    }
    expect(currentGame.artDirection["military-general"].focusY).toBe(0.16);
    expect(currentGame.artDirection["intelligence-ranger"].focusY).toBe(0.16);
    expect(currentGame.artDirection["mystics-spirit-walker"].focusY).toBe(0.16);
    expect(currentGame.artDirection["inquisition-witch-hunter"].focusY).toBe(0.16);
    expect(leaderStyles).not.toContain("object-position:");
  });

  it("gives the metadata footer sufficient height and leading", () => {
    expect(leaderStyles).toContain("min-height: 0.18in");
    expect(leaderStyles).toContain("padding: 0.032in 0.055in 0.018in");
    expect(leaderStyles).toContain("line-height: 1.3");
  });

  it("moves the legacy Leader URL into the unified review catalog", () => {
    expect(reviewPage).toContain('id="leader-cards"');
    expect(reviewPage).toContain('id="leaderReviewSections"');
    expect(leaderRedirect).toContain("./#leader-cards");
  });
});
