import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = JSON.parse(readFileSync("docs/v0.6.4-diplomat-proposals.json", "utf8"));
const componentRuntime = readFileSync("deckbuilder/faction-components.js", "utf8");
const currentGame = JSON.parse(readFileSync("game-data/current-game.json", "utf8"));
const proposalRenderer = readFileSync("card-design/proposal-card.js", "utf8");

describe("Diplomat Proposal language synchronization", () => {
  it("pins the approved issue #617 source as wording-only", () => {
    expect(source.source_issue).toBe(617);
    expect(source.mechanics_changed).toBe(false);
    expect(source.proposals).toHaveLength(9);
  });

  it("keeps the promoted current-game Proposal authority synchronized with the approved source", () => {
    expect(currentGame.proposals).toHaveLength(source.proposals.length);
    for (const proposal of source.proposals) {
      const promoted = currentGame.proposals.find((item: any) => item.id === proposal.id);
      expect(promoted).toMatchObject({
        id: proposal.id,
        name: proposal.name,
        stake: proposal.stake,
        requirement: proposal.requirement,
        accepted: proposal.accepted,
        refused: proposal.refused,
      });
    }
    expect(componentRuntime).toContain("diplomats.proposals = (currentGame.proposals || []).map");
  });

  it("keeps the card compositor bound to the promoted current-game authority", () => {
    expect(proposalRenderer).toContain("import { loadCurrentGame } from '../game-data/current-game.mjs'");
    expect(proposalRenderer).toContain("const proposals = Array.isArray(currentGame.proposals)");
    expect(proposalRenderer).toContain("root.dataset.proposalAuthority = currentGame.authorityUrl");
    expect(proposalRenderer).not.toContain("/docs/v0.6.4-diplomat-proposals.json");
  });

  it("does not reintroduce verbose clauses removed by the compression pass", () => {
    const synchronizedText = JSON.stringify(currentGame.proposals);
    expect(synchronizedText).not.toContain("remains at the contested Position and becomes the occupier when applicable");
    expect(synchronizedText).not.toContain("When the Diplomat forms their Reserve, the Diplomat draws one additional card");
    expect(synchronizedText).not.toContain("while occupying a Territory the opposing player controlled immediately before the Diplomat became its occupier");
    expect(synchronizedText).not.toContain("without taking an Action");
  });
});
