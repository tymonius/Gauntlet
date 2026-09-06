import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pages = ["start/index.html", "playtest/onboarding/index.html"];
const factions = ["Military", "Diplomats", "Financiers", "Intelligence", "Mystics", "Inquisition"];
const guides = [
  ["military", "Military", "13-military"],
  ["diplomats", "Diplomats", "14-diplomats"],
  ["financiers", "Financiers", "15-financiers"],
  ["intelligence", "Intelligence", "16-intelligence"],
  ["mystics", "Mystics", "17-mystics"],
  ["inquisition", "Inquisition", "18-inquisition"]
] as const;

describe("faction guide link purpose", () => {
  for (const page of pages) {
    it(`${page} gives every repeated guide link a faction-specific accessible name`, () => {
      const html = readFileSync(page, "utf8");
      for (const faction of factions) {
        expect(html).toContain(`aria-label="Explore the ${faction} faction guide (opens in a new tab)"`);
      }
    });
  }

  for (const [id, name, anchor] of guides) {
    it(`${name} stays a playstyle guide and hands exact rules to its rulebook chapter`, () => {
      const html = readFileSync(`factions/${id}/index.html`, "utf8");
      expect(html).toContain("What makes the faction different.");
      expect(html.match(/<strong>Why it matters<\/strong>/g)).toHaveLength(2);
      expect(html).not.toContain("<strong>Leader ability</strong>");
      expect(html).toContain(`href="../../rulebook/#${anchor}">Read the ${name} rulebook chapter →</a>`);
    });
  }

  it("keeps the Diplomats Peace Treaty threshold at six ratified Proposals", () => {
    const html = readFileSync("factions/diplomats/index.html", "utf8");
    expect(html).toContain("Six different ratified Proposals complete the Peace Treaty.");
    expect(html).not.toContain("Five different Articles");
  });
});
