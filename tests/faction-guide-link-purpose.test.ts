import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pages = ["start/index.html", "playtest/onboarding/index.html"];
const factions = ["Military", "Diplomats", "Financiers", "Intelligence", "Mystics", "Inquisition"];

describe("faction guide link purpose", () => {
  for (const page of pages) {
    it(`${page} gives every repeated guide link a faction-specific accessible name`, () => {
      const html = readFileSync(page, "utf8");
      for (const faction of factions) {
        expect(html).toContain(`aria-label="Explore the ${faction} faction guide (opens in a new tab)"`);
      }
    });
  }
});
