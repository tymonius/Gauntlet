import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const pages = ["start/index.html", "playtest/onboarding/index.html"];
const factions = ["Military", "Diplomats", "Financiers", "Intelligence", "Mystics", "Inquisition"];

describe("faction guide label in name", () => {
  for (const page of pages) {
    it(`${page} preserves the visible link text in each accessible name`, () => {
      const html = readFileSync(page, "utf8");
      for (const faction of factions) {
        expect(html).toContain(`aria-label="Explore the full guide — ${faction} faction (opens in a new tab)"`);
      }
    });
  }
});
