import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import {
  V071_CANONICAL_SOURCE_PATH,
  V071_RULEBOOK_SOURCE_PATH
} from "./v071-public-corpus.js";

const canonicalData = JSON.parse(readFileSync(V071_CANONICAL_SOURCE_PATH, "utf8"));
const rulebookMarkdown = readFileSync(V071_RULEBOOK_SOURCE_PATH, "utf8");
const corpus = buildRulesCorpus({
  canonicalData,
  rulebookMarkdown,
  siteOrigin: "https://gauntlet.run"
});

const reviewedQuestion = "I use Margin Loan's Battle effect, place a card beneath it as collateral, and then withdraw from the battle. What happens to Margin Loan and the collateral?";

describe("v0.7.1 reviewed Margin Loan withdrawal ruling", () => {
  test("the exact reviewed scenario retrieves the direct Margin Loan authority first", () => {
    const results = retrieveRules(corpus, reviewedQuestion, { limit: 6, excerptLength: 1400 });
    expect(results[0]?.canonicalId).toBe("card:financiers-margin-loan");
    expect(results.slice(0, 3).map((item) => item.canonicalId)).toContain("rulebook:collateral");
  });

  test("the governing card expressly resolves both battle outcomes without a discretionary gap", () => {
    const results = retrieveRules(corpus, reviewedQuestion, { limit: 6, excerptLength: 1400 });
    const marginLoan = results.find((item) => item.canonicalId === "card:financiers-margin-loan");
    const collateral = results.find((item) => item.canonicalId === "rulebook:collateral");

    expect(marginLoan?.body).toMatch(/Gambit\/Tactic:[\s\S]*Before dice are rolled/i);
    expect(marginLoan?.body).toMatch(/In the Aftermath:\s*Win\s*[—-]\s*return collateral to your Hand/i);
    expect(marginLoan?.body).toMatch(/Otherwise\s*[—-]\s*Default/i);
    expect(marginLoan?.body).toMatch(/Default\s*[—-]\s*Put both cards in your Graveyard/i);
    expect(collateral?.body).toMatch(/qualifying battle victory/i);
    expect(collateral?.body).toMatch(/default puts both cards in the Graveyard/i);
  });

  test("current classification guidance treats directly stated card text as explicit authority", () => {
    const worker = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");
    expect(worker).toContain("could the cited text itself be quoted or paraphrased to state that claim without adding a deductive bridge");
    expect(worker).toContain('Do not label an explicit or inferred answer "Table ruling"');
    expect(worker).toContain("Silence is not explicit authority");
  });
});
