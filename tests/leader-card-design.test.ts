import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const leaderPage = readFileSync("card-design/leaders.html", "utf8");
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

const leaderFaces = [...leaderPage.matchAll(/<article class="gauntlet-card[^>]*leader-card[\s\S]*?<\/article>/g)]
  .map(match => match[0]);

describe("Leader card design", () => {
  it("uses the shared poker-card shell and mounted portrait frame", () => {
    expect(leaderFaces).toHaveLength(2);
    expect(leaderStyles).toContain("grid-template-rows: 0.58in var(--art-height) auto 0.18in");
    expect(leaderStyles).toContain("--art-height: 1.86in");
    expect(refinementStyles).toContain("0 0 0 0.007in rgba(231, 212, 176, 0.78)");
    expect(leaderFaces.every(face => face.includes('class="card-art has-image"'))).toBe(true);
  });

  it("removes playable-card value and generic Leader labels from the body", () => {
    for (const face of leaderFaces) {
      expect(face).not.toContain("value-medallion");
      expect(face).not.toContain("Leader Ability");
      expect(face).not.toContain("Supplemental Leader");
    }
  });

  it("identifies the component type in the metadata footer", () => {
    for (const face of leaderFaces) {
      expect(face).toContain("<span>Military</span>");
      expect(face).toContain("<span>Leader</span>");
      expect(face).toContain("<span>v0.6.2</span>");
      expect(face).not.toContain("<span>Command</span>");
    }
  });

  it("uses full-color production portraits from the main image directory", () => {
    expect(leaderPage).toContain('../images/general.png');
    expect(leaderPage).toContain('../images/commandant.png');
    expect(leaderPage).not.toContain('../images/sketches/general.png');
    expect(leaderPage).not.toContain('../images/sketches/commandant.png');
    expect(leaderStyles).toContain("filter: none");
    expect(leaderStyles).toContain("mix-blend-mode: normal");
  });

  it("ships a dedicated free-standing symbol for every faction", () => {
    expect(factionSymbols).toHaveLength(6);
    for (const symbol of factionSymbols) {
      expect(symbol.source).toContain('<svg');
      expect(symbol.source).toContain('viewBox="0 0 64 64"');
      expect(leaderStyles).toContain(`url("../images/faction-symbols/${symbol.name}.svg")`);
      expect(leaderPage).toContain(`data-faction="${symbol.name}"`);
    }
    expect(leaderFaces.every(face => face.includes('class="leader-faction-emblem"'))).toBe(true);
    expect(leaderStyles).toContain("-webkit-mask: var(--faction-symbol)");
    expect(leaderStyles).toContain("mask: var(--faction-symbol)");
  });

  it("tints Leader and reusable faction-component parchment without tinting art", () => {
    expect(leaderFaces.every(face => face.includes("faction-component-card"))).toBe(true);
    expect(leaderStyles).toContain(".faction-component-card .card-interior::after");
    expect(leaderStyles).toContain("mix-blend-mode: multiply");
    expect(leaderStyles).toContain("--component-parchment-tint: rgba(145, 28, 38, 0.15)");
    expect(leaderStyles).toContain(".leader-card .card-art img");
  });

  it("supports named abilities and exact current Military Orders", () => {
    expect(leaderPage).toContain("Onward");
    expect(leaderPage).toContain("before a pending battle is created");
    expect(leaderPage).toContain("Rally");
    expect(leaderPage).toContain("Rout");
    expect(leaderPage).toContain("Entrench");
    expect(leaderPage).toContain("Repel");
    expect(leaderPage).toContain("Fortify");
    expect(leaderPage).toContain("advance your Front Line by one Territory, if able");
    expect(leaderStyles).toContain("grid-template-columns: 0.63in minmax(0, 1fr)");
  });

  it("preserves the full head through top-biased portrait crops", () => {
    expect(leaderStyles).toContain("object-position: center 16%");
    expect(leaderStyles).toContain("object-position: center 14%");
  });

  it("gives the metadata footer sufficient height and leading", () => {
    expect(leaderStyles).toContain("min-height: 0.18in");
    expect(leaderStyles).toContain("padding: 0.032in 0.055in 0.018in");
    expect(leaderStyles).toContain("line-height: 1.3");
  });
});
