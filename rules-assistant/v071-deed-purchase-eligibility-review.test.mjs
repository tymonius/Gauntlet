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
  const raw = retrieveRules(corpus, query, { limit: 10, excerptLength: 1700 });
  return augmentRetrievalForContext(corpus, question, history, raw);
}

function sourceById(sources, canonicalId) {
  return sources.find((source) => source.canonicalId === canonicalId);
}

describe("v0.7.1 reviewed Deed purchase eligibility", () => {
  test("the reviewed contiguity question receives the complete governing rule set", () => {
    const sources = sourcesFor("Do purchased deeds have to be contiguous like your Front Line?");
    const ids = sources.map((source) => source.canonicalId);

    expect(ids).toContain("rulebook:front-line");
    expect(ids).toContain("rulebook:deeds");
    expect(ids).toContain("rulebook:buying-and-buying-out-deeds");

    expect(sourceById(sources, "rulebook:front-line")?.body).toContain("complete unbroken sequence of Territories they control beginning at their own end of the Gauntlet");
    expect(sourceById(sources, "rulebook:deeds")?.body).toContain("Deed ownership is independent of token position and Territory control");
    expect(sourceById(sources, "rulebook:buying-and-buying-out-deeds")?.body).toContain("You neither control it nor are its occupier | +1");

    expect(workerSource).toContain("absence of a restriction, exception, adjacency, contiguity, or other requirement");
    expect(workerSource).toContain("Silence is not explicit authority");
  });

  test("the reviewed remote-purchase question retrieves the specific purchase authority first", () => {
    const sources = sourcesFor("Can I purchase the deed to a territory I don't own and am not on?");

    expect(sources[0]?.canonicalId).toBe("rulebook:buying-and-buying-out-deeds");
    expect(sources.slice(0, 3).map((source) => source.canonicalId)).toContain("rulebook:deeds");
    expect(sources[0]?.body).toContain("You neither control it nor are its occupier | +1");
    expect(sourceById(sources, "rulebook:deeds")?.body).toContain("Deed ownership is independent of token position and Territory control");
  });

  test("the specific purchase rule still leads after the reviewed contiguity ruling", () => {
    const history = [
      { role: "user", content: "Do purchased deeds have to be contiguous like your Front Line?" },
      {
        role: "assistant",
        content: "No. Deed ownership and purchasing are separate from Front Line contiguity, so no Deed-purchase contiguity requirement is stated.",
        rulingStatus: "inferred"
      }
    ];
    const sources = sourcesFor("Can I purchase the deed to a territory I don't own and am not on?", history);

    expect(sources[0]?.canonicalId).toBe("rulebook:buying-and-buying-out-deeds");
    expect(sources[0]?.body).toContain("You neither control it nor are its occupier | +1");
  });
});
