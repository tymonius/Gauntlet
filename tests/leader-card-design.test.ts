import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const leaderPage = readFileSync("card-design/leaders.html", "utf8");
const leaderStyles = readFileSync("card-design/leader-card.css", "utf8");
const refinementStyles = readFileSync("card-design/card-design-refinement.css", "utf8");

const leaderFaces = [...leaderPage.matchAll(/<article class="gauntlet-card[^>]*leader-card[\s\S]*?<\/article>/g)]
  .map(match => match[0]);

describe("Leader card design", () => {
  it("uses the shared poker-card shell and mounted portrait frame", () => {
    expect(leaderFaces).toHaveLength(2);
    expect(leaderStyles).toContain("grid-template-rows: 0.58in var(--art-height) auto 0.16in");
    expect(leaderStyles).toContain("--art-height: 1.86in");
    expect(refinementStyles).toContain("0 0 0 0.007in rgba(231, 212, 176, 0.78)");
    expect(leaderFaces.every(face => face.includes('class="card-art has-image"'))).toBe(true);
  });

  it("removes playable-card value and generic Leader labels", () => {
    for (const face of leaderFaces) {
      expect(face).not.toContain("value-medallion");
      expect(face).not.toContain("Leader Ability");
      expect(face).not.toContain("Supplemental Leader");
      expect(face).not.toContain(">Leader<");
    }
  });

  it("puts faction identity and its emblem position directly beneath the name", () => {
    expect(leaderFaces.every(face => face.includes('class="leader-faction-line"'))).toBe(true);
    expect(leaderFaces.every(face => face.includes('class="leader-faction-emblem"'))).toBe(true);
    expect(leaderStyles).toContain("grid-template-rows: auto auto");
    expect(leaderStyles).toContain("width: 0.14in");
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
    expect(leaderPage).toContain("../images/sketches/general.png");
    expect(leaderPage).toContain("../images/sketches/commandant.png");
    expect(leaderStyles).toContain("object-position: center 16%");
    expect(leaderStyles).toContain("object-position: center 14%");
  });
});
