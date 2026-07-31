import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const rulebook = readFileSync(new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md", import.meta.url), "utf8");
const reference = readFileSync(new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Reference_Guide.md", import.meta.url), "utf8");

test("defines Defender's Advantage as a tie rule rather than ordinary advantage", () => {
  expect(rulebook).toContain("This is a tie rule, not an instance of the ordinary advantage mechanic.");
  expect(rulebook).toContain("Defender's Advantage does not grant an additional die.");
  expect(rulebook).toContain("If battle totals are tied and the defender controls the contested Territory, the defender wins.");
});

test("keeps the Last Stand tie rule and +1 separate", () => {
  expect(rulebook).toContain("Defender's Advantage means they win tied battle totals, and they separately add +1 to their battle total.");
  expect(rulebook).toContain("Defender's Advantage applies, so the defender wins tied battle totals;");
  expect(rulebook).toContain("the defender separately adds +1 to their battle total.");
  expect(reference).toContain("Defender's Advantage means the defender wins ties; separately, the defender adds +1 to their battle total.");
});
