import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reviewPage = readFileSync("card-design/index.html", "utf8");
const proposalRenderer = readFileSync("card-design/proposal-card.js", "utf8");
const proposalStyles = readFileSync("card-design/proposal-card.css", "utf8");
const cardRefinementStyles = readFileSync("card-design/card-design-refinement.css", "utf8");
const canonical = JSON.parse(readFileSync("releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json", "utf8"));
const ratifiedSealPath = "images/artwork/supplemental/diplomats/ratified-wax-seal.webp";

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
    expect(proposalStyles).toContain("grid-template-rows: 0.58in var(--art-height) auto 0.18in");
  });

  it("gives the title and component label the same breathing room as Leader cards", () => {
    expect(proposalStyles).toContain("gap: 0.025in");
    expect(proposalStyles).toContain("padding: 0.05in 0.46in 0.035in 0.09in");
    expect(proposalStyles).toContain("font-size: 13.4pt");
    expect(proposalStyles).toContain("font-size: 4.75pt");
    expect(proposalStyles).toContain("width: 0.15in");
    expect(proposalStyles).toContain("height: 0.15in");
  });

  it("makes Influence Stake more prominent than an ordinary playable-card value", () => {
    expect(proposalStyles).toContain(".proposal-card .value-medallion");
    expect(proposalStyles).toContain("top: 0.14in");
    expect(proposalStyles).toContain("width: 0.28in");
    expect(proposalStyles).toContain("height: 0.28in");
    expect(proposalStyles).toContain("font-size: 9.6pt");
  });

  it("keeps Requirement, Accepted, and Refused in the ordinary rule-label grammar without changing playable cards", () => {
    expect(proposalStyles).toContain(".proposal-card .rule-section");
    expect(proposalStyles).toContain("grid-template-columns: 0.61in minmax(0, 1fr)");
    expect(proposalStyles).not.toContain(".gauntlet-card .rule-section {");
  });

  it("uses the approved laurel-wreath wax seal as the central ratification cue", () => {
    expect(existsSync(ratifiedSealPath)).toBe(true);
    expect(proposalRenderer).toContain("proposal-ratified-word\">Ratified");
    expect(proposalRenderer).toContain("RATIFIED_SEAL_SOURCE");
    expect(proposalRenderer).toContain("/images/artwork/supplemental/diplomats/ratified-wax-seal.webp");
    expect(proposalRenderer).toContain('<img class="proposal-wax-seal"');
    expect(cardRefinementStyles).toContain(".card-art img");
    expect(proposalStyles).toContain(".proposal-ratified-panel > img.proposal-wax-seal");
    expect(proposalStyles).toContain("inset: auto");
    expect(proposalStyles).toContain("top: 60%");
    expect(proposalStyles).toContain("left: 50%");
    expect(proposalStyles).toContain("width: 0.96in");
    expect(proposalStyles).toContain("height: 0.96in");
    expect(proposalStyles).toContain("object-fit: contain");
    expect(proposalStyles).toContain("object-position: center");
    expect(proposalStyles).toContain("transform: translate(-50%, -50%) rotate(-1.5deg)");
    expect(proposalStyles).not.toContain("right: 0.13in");
    expect(proposalStyles).not.toContain("bottom: 0.10in");
  });

  it("keeps the Ratified heading in Declaration Blackletter with Declaration Pro fallback", () => {
    expect(proposalStyles).toContain("@import url(https://db.onlinewebfonts.com/c/15a5d188ed241eed33a9ec0360d0bd60?family=P22+Declaration+W01+Blackletter)");
    expect(proposalStyles).toContain('"P22 Declaration W01 Blackletter"');
    expect(proposalStyles).toContain("var(--font-flavor)");
    expect(proposalStyles).not.toContain('font-family: "Gauntlet Declaration Blackletter"');
  });
});
