import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const leaderRedirect = readFileSync("card-design/leaders.html", "utf8");
const leaderCatalog = readFileSync("card-design/card-review.js", "utf8");
const leaderFace = readFileSync("card-design/face-families/leader.mjs", "utf8");
const faceSpec = readFileSync("card-design/face-spec.mjs", "utf8");
const currentGame = JSON.parse(readFileSync("game-data/current-game.json", "utf8"));
const reviewPage = readFileSync("card-design/index.html", "utf8");
const leaderStyles = readFileSync("card-design/leader-card.css", "utf8");
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
    expect(leaderCatalog).toContain("current.leaders.filter(leader => leader.faction === faction)");
    expect(leaderCatalog).toContain("kind === 'leader' ? 'face-render.html' : 'component-render.html'");
    expect(leaderFace).toContain('class="gauntlet-card faction-component-card leader-card leader-card--standardized');
    expect(leaderFace).toContain('class="card-art has-image"');
    expect(leaderStyles).toContain("grid-template-rows: var(--component-heading-height) var(--art-height) auto 0.18in");
    expect(leaderStyles).toContain("--art-height: 1.86in");
    expect(refinementStyles).toContain("0 0 0 0.007in rgba(231, 212, 176, 0.78)");
  });

  it("uses a shorter component header with a substantially more legible faction subheading", () => {
    expect(leaderStyles).toContain("--component-heading-height: 0.50in");
    expect(leaderStyles).toContain("--component-subheading-font-size: 6.25pt");
    expect(leaderStyles).toContain("--component-subheading-icon-size: 0.18in");
    expect(leaderStyles).toContain("--component-subheading-gap: 0.045in");
    expect(leaderStyles).toContain("gap: 0.012in");
    expect(leaderStyles).toContain("padding: 0.028in 0.09in 0.022in");
    expect(leaderStyles).toContain("font-size: var(--component-subheading-font-size)");
    expect(leaderStyles).toContain("width: var(--component-subheading-icon-size)");
    expect(leaderStyles).toContain("height: var(--component-subheading-icon-size)");
    expect(leaderStyles).toContain("letter-spacing: 0.085em");
  });

  it("removes playable-card value and generic Leader labels from the body", () => {
    expect(leaderFace).not.toContain("value-medallion");
    expect(leaderFace).not.toContain("Leader Ability");
    expect(leaderFace).not.toContain("Supplemental Leader");
  });

  it("identifies faction, component type, and version in the metadata footer", () => {
    expect(leaderFace).toContain('<span>Leader</span>');
    expect(leaderFace).toContain('<span>${esc(spec.displayVersion)}</span>');
    expect(leaderFace).not.toContain("<span>Command</span>");
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
    expect(leaderFace).toContain('class="leader-faction-emblem"');
    expect(leaderStyles).toContain("-webkit-mask: var(--faction-symbol)");
    expect(leaderStyles).toContain("mask: var(--faction-symbol)");
  });

  it("tints Leader and reusable faction-component parchment without tinting art", () => {
    expect(leaderFace).toContain("faction-component-card leader-card");
    expect(leaderStyles).toContain(".faction-component-card .card-interior::after");
    expect(leaderStyles).toContain("mix-blend-mode: multiply");
    expect(leaderStyles).toContain("--component-parchment-tint: rgba(145, 28, 38, 0.15)");
    expect(leaderStyles).toContain(".leader-card .card-art img");
  });

  it("uses a darker faction-specific tint for the metadata footer", () => {
    expect(leaderStyles).toContain("--component-footer-tint: rgba(145, 28, 38, 0.22)");
    expect(leaderStyles).toContain("--component-footer-tint: rgba(38, 79, 145, 0.20)");
    expect(leaderStyles).toContain("--component-footer-tint: rgba(34, 112, 68, 0.20)");
    expect(leaderStyles).toContain("--component-footer-tint: rgba(40, 40, 39, 0.18)");
    expect(leaderStyles).toContain("--component-footer-tint: rgba(93, 52, 126, 0.20)");
    expect(leaderStyles).toContain("--component-footer-tint: rgba(166, 122, 39, 0.22)");
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

  it("keeps every Leader crop fully authored in canonical visual authority", () => {
    for (const leader of currentGame.leaders) {
      const id = `${leader.faction}-${leader.id}`;
      const direction = currentGame.artDirection[id];
      expect(direction).toMatchObject({
        fit: "cover",
        focusX: expect.any(Number),
        focusY: expect.any(Number),
        smart: false,
        zoom: expect.any(Number),
      });
    }
    expect(currentGame.artDirection["military-general"].focusY).toBe(0.16);
    expect(leaderStyles).not.toContain("object-position:");
    expect(faceSpec).toContain("requireExplicitArtworkDirection");
    expect(faceSpec).toContain("resolved.smart !== false");
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
