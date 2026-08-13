import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reviewPage = readFileSync("card-design/index.html", "utf8");
const proposalRenderer = readFileSync("card-design/proposal-card.js", "utf8");
const proposalStyles = readFileSync("card-design/proposal-card.css", "utf8");
const leaderStyles = readFileSync("card-design/leader-card.css", "utf8");
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
    expect(proposalStyles).toContain("grid-template-rows: var(--component-heading-height, 0.50in) var(--art-height) auto 0.18in");
  });

  it("shares the shorter, more legible two-line component header with Leader cards", () => {
    expect(leaderStyles).toContain("--component-heading-height: 0.50in");
    expect(leaderStyles).toContain("--component-subheading-font-size: 6.25pt");
    expect(leaderStyles).toContain("--component-subheading-icon-size: 0.18in");
    expect(leaderStyles).toContain("--component-subheading-gap: 0.045in");
    expect(proposalStyles).toContain("gap: 0.012in");
    expect(proposalStyles).toContain("padding: 0.028in 0.46in 0.022in 0.09in");
    expect(proposalStyles).toContain("font-size: 13.4pt");
    expect(proposalStyles).toContain("font-size: var(--component-subheading-font-size, 6.25pt)");
    expect(proposalStyles).toContain("width: var(--component-subheading-icon-size, 0.18in)");
    expect(proposalStyles).toContain("height: var(--component-subheading-icon-size, 0.18in)");
    expect(proposalStyles).toContain("letter-spacing: 0.085em");
  });

  it("makes Influence Stake more prominent than an ordinary playable-card value and recenters it in the shorter header", () => {
    expect(proposalStyles).toContain(".proposal-card .value-medallion");
    expect(proposalStyles).toContain("top: 0.11in");
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
    expect(proposalStyles).toContain("left: 50%");
    expect(proposalStyles).toContain("object-fit: contain");
    expect(proposalStyles).toContain("object-position: center");
    expect(proposalStyles).toContain("transform: translate(-50%, -50%) rotate(-1.5deg)");
    expect(proposalStyles).not.toContain("right: 0.13in");
    expect(proposalStyles).not.toContain("bottom: 0.10in");
  });

  it("scales the Ratified word and wax seal with the fitted artwork height so they cannot crowd each other on dense Proposals", () => {
    expect(proposalStyles).toContain("top: 7%");
    expect(proposalStyles).toContain("font-size: min(27pt, calc(var(--art-height) * 0.23))");
    expect(proposalStyles).toContain("top: 66%");
    expect(proposalStyles).toContain("width: min(0.96in, calc(var(--art-height) * 0.62))");
    expect(proposalStyles).toContain("height: min(0.96in, calc(var(--art-height) * 0.62))");
    expect(proposalStyles).not.toContain("top: 60%");

    const pxPerInch = 96;
    const pxPerPoint = pxPerInch / 72;
    for (const artHeight of [1.52 * pxPerInch, 1.28 * pxPerInch, 1.04 * pxPerInch]) {
      const wordTop = artHeight * 0.07;
      const wordSize = Math.min(27 * pxPerPoint, artHeight * 0.23);
      const wordBottom = wordTop + wordSize;
      const sealSize = Math.min(0.96 * pxPerInch, artHeight * 0.62);
      const sealCenter = artHeight * 0.66;
      const sealTop = sealCenter - sealSize / 2;
      const sealBottom = sealCenter + sealSize / 2;

      expect(sealTop - wordBottom).toBeGreaterThan(3);
      expect(sealBottom).toBeLessThanOrEqual(artHeight);
    }
  });

  it("keeps the Ratified heading in Declaration Blackletter with Declaration Pro fallback", () => {
    expect(proposalStyles).toContain("@import url(https://db.onlinewebfonts.com/c/15a5d188ed241eed33a9ec0360d0bd60?family=P22+Declaration+W01+Blackletter)");
    expect(proposalStyles).toContain('"P22 Declaration W01 Blackletter"');
    expect(proposalStyles).toContain("var(--font-flavor)");
    expect(proposalStyles).not.toContain('font-family: "Gauntlet Declaration Blackletter"');
  });
});
