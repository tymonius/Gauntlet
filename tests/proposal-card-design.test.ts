import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reviewPage = readFileSync("card-design/index.html", "utf8");
const proposalRenderer = readFileSync("card-design/proposal-card.js", "utf8");
const proposalStyles = readFileSync("card-design/proposal-card.css", "utf8");
const canonical = JSON.parse(readFileSync("releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json", "utf8"));

const prototypeIds = ["de-escalation", "open-channels", "diplomatic-recognition"];

describe("Diplomat Proposal / Treaty Article prototypes", () => {
  it("adds the supplemental prototype section to the unified card review page", () => {
    expect(reviewPage).toContain('id="proposal-cards"');
    expect(reviewPage).toContain('id="proposalReviewSections"');
    expect(reviewPage).toContain('href="#proposal-cards"');
    expect(reviewPage).toContain('href="proposal-card.css"');
    expect(reviewPage).toContain('type="module" src="proposal-card.js"');
  });

  it("reads the approved prototypes from published v0.6.3 canonical data rather than duplicating their rules text", () => {
    expect(proposalRenderer).toContain("/releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json");
    for (const id of prototypeIds) {
      expect(canonical.proposals.some((proposal: { id: string }) => proposal.id === id)).toBe(true);
      expect(proposalRenderer).toContain(`'${id}'`);
    }
    expect(proposalRenderer).not.toContain("Both players withdraw. The accepting player draws one card.");
  });

  it("keeps both faces mechanically complete and identical apart from state presentation", () => {
    expect(proposalRenderer).toContain("ruleSection('Requirement', proposal.requirement)");
    expect(proposalRenderer).toContain("ruleSection('Accepted', proposal.accepted)");
    expect(proposalRenderer).toContain("ruleSection('Refused', proposal.refused)");
    expect(proposalRenderer).toContain("ratified ? 'Treaty Article' : 'Proposal'");
    expect(proposalRenderer).toContain("Influence Stake");
    expect(proposalRenderer).toContain("value-medallion");
  });

  it("uses the ordinary card shell with Diplomat border, Leader-style faction tint, and faction symbol classification", () => {
    expect(proposalRenderer).toContain("gauntlet-card faction-component-card proposal-card diplomat-card");
    expect(proposalRenderer).toContain('data-faction="diplomats"');
    expect(proposalRenderer).toContain("proposal-faction-emblem");
    expect(proposalStyles).toContain("-webkit-mask: var(--faction-symbol)");
    expect(proposalStyles).toContain("background: var(--component-footer-tint)");
    expect(proposalStyles).toContain("grid-template-rows: 0.3in var(--art-height) auto 0.18in");
  });

  it("keeps Requirement, Accepted, and Refused in the ordinary rule-label grammar without changing playable cards", () => {
    expect(proposalStyles).toContain(".proposal-card .rule-section");
    expect(proposalStyles).toContain("grid-template-columns: 0.61in minmax(0, 1fr)");
    expect(proposalStyles).not.toContain(".gauntlet-card .rule-section {");
  });

  it("turns the artwork field into an explicit ratification treatment on the reverse", () => {
    expect(proposalRenderer).toContain("proposal-ratified-word\">Ratified");
    expect(proposalRenderer).toContain("proposal-wax-seal");
    expect(proposalStyles).toContain("font-family: var(--font-flavor)");
    expect(proposalStyles).toContain("#a3232d");
    expect(proposalStyles).toContain("mask: var(--faction-symbol)");
  });
});
