import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = JSON.parse(readFileSync("docs/v0.6.4-diplomat-proposals.json", "utf8"));
const componentRuntime = readFileSync("deckbuilder/faction-components.js", "utf8");
const proposalRenderer = readFileSync("card-design/proposal-card.js", "utf8");

describe("Diplomat Proposal language synchronization", () => {
  it("pins the approved issue #617 source as wording-only", () => {
    expect(source.source_issue).toBe(617);
    expect(source.mechanics_changed).toBe(false);
    expect(source.proposals).toHaveLength(9);
  });

  it("keeps Deckbuilder supplemental print wording synchronized with the approved source", () => {
    for (const proposal of source.proposals) {
      for (const field of ["id", "name", "requirement", "accepted", "refused"] as const) {
        expect(componentRuntime).toContain(JSON.stringify(proposal[field]));
      }
      expect(componentRuntime).toContain(`stake: ${proposal.stake}`);
    }
  });

  it("keeps the card compositor bound to the same approved source", () => {
    expect(proposalRenderer).toContain("/docs/v0.6.4-diplomat-proposals.json");
    expect(proposalRenderer).toContain("source.mechanics_changed !== false");
    expect(proposalRenderer).toContain("source.source_issue !== EXPECTED_SOURCE_ISSUE");
  });

  it("does not reintroduce verbose clauses removed by the compression pass", () => {
    expect(componentRuntime).not.toContain("remains at the contested Position and becomes the occupier when applicable");
    expect(componentRuntime).not.toContain("When the Diplomat forms their Reserve, the Diplomat draws one additional card");
    expect(componentRuntime).not.toContain("while occupying a Territory the opposing player controlled immediately before the Diplomat became its occupier");
    expect(componentRuntime).not.toContain("without taking an Action");
  });
});
