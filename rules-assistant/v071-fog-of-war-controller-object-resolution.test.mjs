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
const reviewedQuestion = "What if the opponent controls fog of war";

describe("v0.7.1 Fog of War controller-object resolution", () => {
  test("the exact reviewed wording retrieves Fog of War first", () => {
    const results = retrieveRules(corpus, reviewedQuestion, { limit: 6, excerptLength: 1200 });
    expect(results[0]?.canonicalId).toBe("card:intelligence-fog-of-war");
  });

  test("current authority attaches delayed choices to the Territory controller", () => {
    const results = retrieveRules(corpus, reviewedQuestion, { limit: 6, excerptLength: 1200 });
    const fog = results.find((item) => item.canonicalId === "card:intelligence-fog-of-war");
    expect(fog?.body).toMatch(/this Territory's controller sets their Gambit and chooses their Tactics after the opponent/i);
    expect(fog?.body).toMatch(/Discard this Overlay after that battle/i);
  });

  test("the Arbiter may not transfer control between the Overlay and Territory", () => {
    const worker = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");
    expect(worker).toContain("When authority assigns ownership or control to a named object, keep that status attached to that object");
    expect(worker).toContain("a card or Overlay versus a Territory");
    expect(worker).toContain('export const BEHAVIOR_REVISION = "v071-qa-20260909-1";');
  });
});
