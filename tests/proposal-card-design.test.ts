import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const reviewPage = readFileSync("card-design/index.html", "utf8");
const proposalRenderer = readFileSync("card-design/proposal-card.js", "utf8");
const proposalStyles = readFileSync("card-design/proposal-card.css", "utf8");
const leaderStyles = readFileSync("card-design/leader-card.css", "utf8");
const cardRefinementStyles = readFileSync("card-design/card-design-refinement.css", "utf8");
const approved = JSON.parse(readFileSync("docs/v0.6.4-diplomat-proposals.json", "utf8"));
const currentAuthority = JSON.parse(readFileSync("game-data/current-game.json", "utf8"));
const ratifiedSealPath = "images/artwork/supplemental/diplomats/ratified-wax-seal.webp";

const proposalIds = [
  "de-escalation",
  "orderly-withdrawal",
  "capitulation",
  "open-channels",
  "mutual-disarmament",
  "prisoner-exchange",
  "rebuilding-pact",
  "ultimatum",
  "diplomatic-recognition",
];

describe("Diplomat Proposal / Treaty Article catalog", () => {
  it("adds the complete supplemental component section to the unified card review page", () => {
    expect(reviewPage).toContain('id="proposal-cards"');
    expect(reviewPage).toContain('id="proposalReviewSections"');
    expect(reviewPage).toContain('<option value="proposal">Proposals</option>');
    expect(reviewPage).toContain('data-catalog-kind="proposal"');
    expect(reviewPage).toContain('href="proposal-card.css"');
    expect(reviewPage).toContain('type="module" src="proposal-card.js"');
    expect(reviewPage).toContain('<span data-proposal-count>9</span> / <span data-rite-count>6</span>');
    expect(reviewPage).toContain("Proposal / Rite pairs");
    expect(reviewPage).toContain("All <span data-proposal-count>9</span> canonical Proposals in order");
  });

  it("renders all nine approved issue #617 Proposal rewrites through the current-game authority", () => {
    expect(approved.source_issue).toBe(617);
    expect(approved.mechanics_changed).toBe(false);
    expect(approved.proposals).toHaveLength(9);
    expect(approved.proposals.map((proposal: { id: string }) => proposal.id)).toEqual(proposalIds);
    expect(currentAuthority.proposals).toEqual(approved.proposals);
    expect(proposalRenderer).toContain("loadCurrentGame");
    expect(proposalRenderer).toContain("currentGame.proposals");
    expect(proposalRenderer).toContain("currentDisplayVersion = currentGame.displayVersion");
    expect(proposalRenderer).toContain("root.dataset.proposalAuthority = currentGame.authorityUrl");
    expect(proposalRenderer).toContain("proposals.map(reviewPair).join('')");
    expect(proposalRenderer).not.toContain("/docs/v0.6.4-diplomat-proposals.json");
    expect(proposalRenderer).not.toContain("/releases/v0.6.3/Gauntlet_v0.6.3_Canonical_Data.json");
  });

  it("pins the approved compact wording that changed the densest Proposal faces", () => {
    const byId = new Map(approved.proposals.map((proposal: { id: string }) => [proposal.id, proposal]));
    expect(byId.get("open-channels")).toMatchObject({
      accepted: "Both players reveal their Hands, then both withdraw. Accepting player: +1 Card.",
      refused: "Refusing player reveals their Hand. Diplomat: +1 Reserve.",
    });
    expect(byId.get("mutual-disarmament")).toMatchObject({
      accepted: "Each player discards 1 from Hand. Accepting player: +1 Card. Then both withdraw.",
      refused: "Diplomat may discard 1 from Hand. If they do: +1 Reserve.",
    });
    expect(byId.get("diplomatic-recognition")).toMatchObject({
      requirement: "The Diplomat must be defending a Counterattack.",
      accepted: "Diplomat: Advance Front Line 1, if able. Accepting player withdraws, then +2 Cards.",
      refused: "If the Diplomat wins: Advance Front Line 1 during the Aftermath, if able. No Influence for imposing this Proposal.",
    });
  });

  it("keeps both faces mechanically complete and identical apart from state presentation", () => {
    expect(proposalRenderer).toContain("ruleSection('Requirement', proposal.requirement)");
    expect(proposalRenderer).toContain("ruleSection('Accepted', proposal.accepted)");
    expect(proposalRenderer).toContain("ruleSection('Refused', proposal.refused)");
    expect(proposalRenderer).toContain("ratified ? 'Treaty Article' : 'Proposal'");
    expect(proposalRenderer).toContain("Influence Stake");
    expect(proposalRenderer).toContain("value-medallion");
  });

  it("keeps Proposal authority complete in current-game while preserving the historical rewrite as provenance", () => {
    expect(currentAuthority.displayVersion).toBeTruthy();
    expect(currentAuthority.proposals).toEqual(approved.proposals);
    expect(currentAuthority.provenance.historicalInputs.proposals).toBe("/docs/v0.6.4-diplomat-proposals.json");
    expect(proposalRenderer).toContain("if (!proposals.length) throw new Error('Current-game authority has no Proposals.')");
    expect(proposalRenderer).toContain("root.dataset.proposalCount = String(proposals.length)");
    expect(proposalRenderer).toContain("document.querySelectorAll('[data-proposal-count]')");
    expect(proposalRenderer).not.toContain("validateApprovedProposalSource");
    expect(proposalRenderer).not.toContain("EXPECTED_SOURCE_ISSUE");
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
