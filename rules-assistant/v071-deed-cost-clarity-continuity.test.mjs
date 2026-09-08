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

const immediateCostExchange = [
  { role: "user", content: "how much do deeds cost?" },
  {
    role: "assistant",
    content: "A Deed costs: min(the number of Deeds you own + 1, 6) + position modifier + buyout premium, with a minimum of 1 Capital. Position modifier: control it −1; occupy it 0; neither control nor occupy it +1. Buyout premium is 0 if unowned; otherwise min(the opposing owner’s Deeds, 6).",
    rulingStatus: "explicit"
  }
];

function sourcesFor(question, history = immediateCostExchange) {
  const query = contextualQuery(question, history);
  const raw = retrieveRules(corpus, query, { limit: 10, excerptLength: 1700 });
  return { query, sources: augmentRetrievalForContext(corpus, question, history, raw) };
}

describe("v0.7.1 Deed-cost clarification continuity", () => {
  test("the exact reviewed clarification remains anchored to the immediately preceding Deed-cost exchange", () => {
    const question = "can you explain that more clearly";
    const { query, sources } = sourcesFor(question);

    expect(query.toLowerCase()).toContain("how much do deeds cost");
    expect(query.toLowerCase()).toContain("position modifier");
    expect(sources[0]?.canonicalId).toBe("rulebook:buying-and-buying-out-deeds");
  });

  test("the retrieved authority contains the actual cost formula rather than only Deed ownership rules", () => {
    const { sources } = sourcesFor("can you explain that more clearly");
    const body = String(sources[0]?.body || "");

    expect(body).toContain("Deed cost = min(Deeds you own + 1, 6) + position modifier + buyout premium");
    expect(body).toContain("Minimum cost is 1 Capital");
    expect(body).toContain("You control it | -1");
    expect(body).toContain("You are the occupier | 0");
    expect(body).toContain("You neither control it nor are its occupier | +1");
  });

  test("the user's explicit correction also retrieves the Deed-cost rule first", () => {
    const { sources } = sourcesFor("i mean the deed cost", []);
    expect(sources[0]?.canonicalId).toBe("rulebook:buying-and-buying-out-deeds");
  });

  test("current prompt gives the immediately preceding exchange priority for ambiguous follow-ups", () => {
    expect(workerSource).toContain("Resolve follow-up referents against the immediately preceding exchange first");
    expect(workerSource).toContain("Preserve the most recently contrasted property or noun phrase as the active referent");
    expect(workerSource).toContain("IMMEDIATELY PRECEDING EXCHANGE — resolve ambiguous follow-ups here first");
    expect(workerSource).toMatch(/export const BEHAVIOR_REVISION = "v071-qa-\d{8}-\d+"/);
  });
});
