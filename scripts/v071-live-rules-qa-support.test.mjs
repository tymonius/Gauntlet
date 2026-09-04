import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import {
  applyBenchmarkCorrections,
  buildContinuityText,
  significantTopicTerms,
  validateClassificationExpectations
} from "./v071-live-rules-qa-support.mjs";

const benchmark = JSON.parse(readFileSync(
  new URL("../rules-assistant/evals/rules-arbiter-evals.v071.json", import.meta.url),
  "utf8"
));
const corrections = JSON.parse(readFileSync(
  new URL("../rules-assistant/evals/rules-arbiter-evals.v071-corrections.json", import.meta.url),
  "utf8"
));
const corrected = applyBenchmarkCorrections(benchmark, corrections);
const byId = new Map(corrected.cases.map((item) => [item.id, item]));

test("v0.7.1 live QA corrections align the smoke classification boundary with published authority", () => {
  expect(byId.get("core-setup-starting-territory")).toMatchObject({
    expectedClassification: "explicit",
    classificationBasis: "direct-authority"
  });
  expect(byId.get("mystics-transmutation")).toMatchObject({
    expectedClassification: "explicit",
    classificationBasis: "direct-authority",
    expectedAnswerPatterns: ["battle total"]
  });
  expect(byId.get("financiers-capacity-opening")).toMatchObject({
    expectedClassification: "explicit",
    classificationBasis: "direct-authority",
    expectedSourcePatterns: ["Financial Capacity", "Buying and buying out Deeds"],
    expectedAnswerPatterns: ["Denouement"],
    forbiddenAnswerPatterns: ["Yes"]
  });
  expect(byId.get("financiers-capacity-opening").expectedSourcePatterns).not.toContain("Faction Features");
  expect(byId.get("live-deed-contiguity")).toMatchObject({
    expectedClassification: "inferred",
    classificationBasis: "combined-authority",
    expectedSourcePatterns: ["Deeds", "Buying and buying out Deeds"]
  });
  expect(byId.get("live-deed-contiguity").expectedSourcePatterns).not.toContain("Front Line");
});

test("corrected benchmark classification expectations are internally consistent", () => {
  expect(validateClassificationExpectations(corrected)).toEqual([]);
});

test("combined-authority classification metadata cannot silently collapse to one source", () => {
  const broken = {
    ...corrected,
    cases: corrected.cases.map((item) => item.id === "live-deed-contiguity"
      ? { ...item, expectedSourcePatterns: ["Deeds"] }
      : item)
  };
  expect(validateClassificationExpectations(broken)).toContain(
    "benchmark: live-deed-contiguity marks combined authority without multiple governing source patterns"
  );
});

test("conversation continuity checks source excerpts, not only source titles", () => {
  const text = buildContinuityText(
    "It goes to its owner's Graveyard during the Aftermath.",
    [{
      title: "Gauntlet v0.7.1 Rulebook",
      excerpt: "After a battle, each Gambit is put in its owner's Graveyard during clearing battle cards."
    }]
  );
  const terms = significantTopicTerms("Gambit destination");
  expect(terms.some((term) => text.includes(term))).toBe(true);
  expect(text).toContain("gambit");
});
