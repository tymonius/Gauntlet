import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentRuntime = readFileSync("deckbuilder/faction-components.js", "utf8");
const currentGame = JSON.parse(readFileSync("game-data/current-game.json", "utf8"));
const proposalRenderer = readFileSync("card-design/proposal-card.js", "utf8");

describe("Diplomat Proposal language synchronization", () => {
  it("uses the promoted current-game Proposal authority", () => {
    expect(currentGame.proposals).toHaveLength(9);
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
