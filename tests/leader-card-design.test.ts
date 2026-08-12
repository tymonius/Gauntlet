import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const leaderRedirect = readFileSync("card-design/leaders.html", "utf8");
const leaderCatalog = readFileSync("card-design/card-review.js", "utf8");
const reviewPage = readFileSync("card-design/index.html", "utf8");
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
const leaderNames = [
  "General",
  "Commandant",
  "Ambassador",
  "Senator",
  "Banker",
  "Executive",
  "Ranger",
  "Spymaster",
  "Alchemist",
  "Spirit Walker",
  "Grand Inquisitor",
  "Witch Hunter",
];

describe("Leader card design", () => {
  it("uses the shared poker-card shell and mounted portrait frame for all twelve Leaders", () => {
    for (const name of leaderNames) expect(leaderCatalog).toContain(`name:'${name}'`);
    expect([...leaderCatalog.matchAll(/name:'(?:General|Commandant|Ambassador|Senator|Banker|Executive|Ranger|Spymaster|Alchemist|Spirit Walker|Grand Inquisitor|Witch Hunter)'/g)]).toHaveLength(12);
    expect(leaderCatalog).toContain('class="gauntlet-card faction-component-card leader-card');
    expect(leaderCatalog).toContain('class="card-art has-image"');
    expect(leaderStyles).toContain("grid-template-rows: 0.58in var(--art-height) auto 0.18in");
    expect(leaderStyles).toContain("--art-height: 1.86in");
    expect(refinementStyles).toContain("0 0 0 0.007in rgba(231, 212, 176, 0.78)");
  });

  it("removes playable-card value and generic Leader labels from the body", () => {
    expect(leaderCatalog).not.toContain("value-medallion");
    expect(leaderCatalog).not.toContain("Leader Ability");
    expect(leaderCatalog).not.toContain("Supplemental Leader");
  });

  it("identifies faction, component type, and version in the metadata footer", () => {
    expect(leaderCatalog).toContain("<span>${esc(l.factionLabel)}</span><span>Leader</span><span>v0.6.3</span>");
    expect(leaderCatalog).not.toContain("<span>Command</span>");
  });

  it("uses full-color production portraits from the main image directory", () => {
    const portraits = [
      "general", "commandant", "ambassador", "senator", "banker", "executive",
      "ranger", "spymaster", "alchemist", "spirit walker", "grand inquisitor", "witch hunter",
    ];
    for (const portrait of portraits) {
      expect(leaderCatalog).toContain(`../images/${portrait}.png`);
      expect(leaderCatalog).not.toContain(`../images/sketches/${portrait}.png`);
    }
    expect(leaderStyles).toContain("filter: none");
    expect(leaderStyles).toContain("mix-blend-mode: normal");
  });

  it("ships a dedicated free-standing symbol for every faction", () => {
    expect(factionSymbols).toHaveLength(6);
    for (const symbol of factionSymbols) {
      expect(symbol.source).toContain('<svg');
      expect(symbol.source).toMatch(/viewBox="[^"]+"/);
      expect(leaderStyles).toContain(`url("../images/faction-symbols/${symbol.name}.svg")`);
      expect(leaderCatalog).toContain(`faction:'${symbol.name}'`);
    }
    expect(leaderCatalog).toContain('class="leader-faction-emblem"');
    expect(leaderStyles).toContain("-webkit-mask: var(--faction-symbol)");
    expect(leaderStyles).toContain("mask: var(--faction-symbol)");
  });

  it("tints Leader and reusable faction-component parchment without tinting art", () => {
    expect(leaderCatalog).toContain("faction-component-card leader-card");
    expect(leaderStyles).toContain(".faction-component-card .card-interior::after");
    expect(leaderStyles).toContain("mix-blend-mode: multiply");
    expect(leaderStyles).toContain("--component-parchment-tint: rgba(145, 28, 38, 0.15)");
    expect(leaderStyles).toContain(".leader-card .card-art img");
  });

  it("uses a darker faction-specific tint for the metadata footer", () => {
    expect(leaderStyles).toContain("--component-footer-tint: rgba(145, 28, 38, 0.22)");
    expect(leaderStyles).toContain("--component-footer-tint: rgba(38, 79, 145, 0.20)");
    expect(leaderStyles).toContain("--component-footer-tint: rgba(34, 112, 68, 0.20)");
    expect(leaderStyles).toContain("--component-footer-tint: rgba(40, 40, 39, 0.18)");
    expect(leaderStyles).toContain("--component-footer-tint: rgba(93, 52, 126, 0.20)");
    expect(leaderStyles).toContain("--component-footer-tint: rgba(166, 122, 39, 0.22)");
    expect(leaderStyles).toContain("background: var(--component-footer-tint)");
  });

  it("preserves the exact current Military Orders", () => {
    expect(leaderCatalog).toContain("Onward");
    expect(leaderCatalog).toContain("before a pending battle is created");
    expect(leaderCatalog).toContain("Rally");
    expect(leaderCatalog).toContain("Rout");
    expect(leaderCatalog).toContain("Entrench");
    expect(leaderCatalog).toContain("Repel");
    expect(leaderCatalog).toContain("Fortify");
    expect(leaderCatalog).toContain("advance your Front Line by one Territory, if able");
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

  it("moves the legacy Leader URL into the unified review catalog", () => {
    expect(reviewPage).toContain('id="leader-cards"');
    expect(reviewPage).toContain('id="leaderReviewSections"');
    expect(leaderRedirect).toContain("./#leader-cards");
  });
});
