import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import { augmentRetrievalForContext, contextualQuery } from "./worker-v071.js";

const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md", import.meta.url),
  "utf8"
);
const workerSource = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");

const corpus = buildRulesCorpus({
  canonicalData,
  rulebookMarkdown,
  siteOrigin: "https://gauntlet.run",
  rulebookBrowserUrl: "https://gauntlet.run/rulebook/",
  canonicalDataUrl: "https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json"
});

function sourcesFor(question, history = []) {
  const query = contextualQuery(question, history);
  const raw = retrieveRules(corpus, query, { limit: 10, excerptLength: 1500 });
  return augmentRetrievalForContext(corpus, question, history, raw);
}

const priorGoodFaithExchange = [
  { role: "user", content: "What does good faith do?" },
  {
    role: "assistant",
    content: "Good Faith is a Diplomat Asset. When you offer Terms, you may discard Good Faith for +1 Card, then reveal one card from your Hand and set that revealed card aside while the opponent decides whether to accept or refuse.",
    rulingStatus: "explicit"
  }
];

describe("v0.7.1 Good Faith reference resolution and conversational continuity", () => {
  test("direct Good Faith questions retrieve the card as primary authority", () => {
    const sources = sourcesFor("What does good faith do?");
    expect(sources[0]?.canonicalId).toBe("card:diplomats-good-faith");
  });

  test("the historical terse follow-up remains anchored to Good Faith", () => {
    const query = contextualQuery("What benefit does this give me?", priorGoodFaithExchange);
    expect(query.toLowerCase()).toContain("good faith");

    const sources = sourcesFor("What benefit does this give me?", priorGoodFaithExchange);
    expect(sources[0]?.canonicalId).toBe("card:diplomats-good-faith");
  });

  test("Good Faith authority preserves the object-changing instruction sequence", () => {
    const source = sourcesFor("What does good faith do?")
      .find((candidate) => candidate.canonicalId === "card:diplomats-good-faith");
    const body = String(source?.body || "");

    const discardSourceCard = body.indexOf("discard this card for +1 Card");
    const introduceSetAsideCard = body.indexOf("reveal one card from your Hand and set it aside");
    const acceptedClause = body.indexOf("Accepted — Put that card in your Graveyard");
    const refusedClause = body.indexOf("Refused — Return it to your Hand");

    expect(discardSourceCard).toBeGreaterThanOrEqual(0);
    expect(introduceSetAsideCard).toBeGreaterThan(discardSourceCard);
    expect(acceptedClause).toBeGreaterThan(introduceSetAsideCard);
    expect(refusedClause).toBeGreaterThan(acceptedClause);
  });

  test("the v0.7.1 prompt tracks pronoun referents through ordered card instructions", () => {
    expect(workerSource).toContain("Track referents through each instruction in written order");
    expect(workerSource).toContain("the most recent compatible game object introduced by the text");
    expect(workerSource).toContain("Do not switch the referent back to the source card merely because it is the card being read");
    expect(workerSource).toMatch(/export const BEHAVIOR_REVISION = "v071-qa-\d{8}-\d+"/);
  });
});