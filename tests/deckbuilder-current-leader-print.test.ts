import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const currentGame = JSON.parse(readFileSync("game-data/current-game.json", "utf8"));
const faceAuthority = readFileSync("card-design/face-authority.mjs", "utf8");
const leaderTemplate = readFileSync("card-design/face-templates/leader.mjs", "utf8");
const leaderStyles = readFileSync("card-design/leader-card.css", "utf8");
const printTransform = readFileSync("deckbuilder/production-print.js", "utf8");

describe("Deckbuilder current Leader printing", () => {
  it("derives all twelve Leader faces from current-game authority", () => {
    expect(currentGame.version).toBe("v0.7.1");
    expect(currentGame.leaders).toHaveLength(12);
    expect(faceAuthority).toContain("addLeaderFaces");
    expect(faceAuthority).toContain("source: { collection: 'leaders', id: renderId }");
    expect(leaderTemplate).toContain("spec.content.leader");
  });

  it("constructs each Leader directly from its FaceSpec instead of extracting a catalog specimen", () => {
    expect(leaderTemplate).toContain('class="gauntlet-card faction-component-card leader-card');
    expect(leaderTemplate).toContain("leader.sections.map(renderSection)");
    expect(leaderTemplate).toContain("spec.provenance.displayVersion");
    expect(leaderTemplate).not.toContain("waitForLeaderSpecimen");
    expect(leaderTemplate).not.toContain("querySelector('#leader");
  });

  it("keeps all Leader crop composition in canonical art-direction data", () => {
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
    expect(leaderStyles).not.toContain("object-position:");
  });

  it("prints the selected Leader through the canonical face route", () => {
    expect(printTransform).toContain("function renderProductionLeaderHtml(faction, leader)");
    expect(printTransform).toContain('currentGame.findLeader?.(factionId, leaderId)');
    expect(printTransform).toContain('faceId: `leader:${factionId}-${canonicalLeader.id}`');
    expect(printTransform).toContain("/card-design/face-render.html?id=");
    expect(printTransform).not.toContain("/card-design/component-render.html?kind=");
  });

  it("locks a representative Leader to the finalized current wording", () => {
    const general = currentGame.leaders.find((leader: any) => leader.id === 'general');
    const orders = general.sections.find((section: any) => section.name === "Orders");
    const onward = orders.items.find((item: any) => item.name === "Onward");
    const rout = orders.items.find((item: any) => item.name === "Rout");

    expect(onward.text).toBe("During your Movement, move one additional Position. This may start a Battle.");
    expect(rout.text).toBe("Advance one Position. This movement may initiate a battle.");
    expect(general.sections[0].name).toBe("Run the Gauntlet");
  });
});
