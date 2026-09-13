import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { buildRulesCorpus, retrieveRules } from "./local-search.js";
import { augmentRetrievalForContext, contextualQuery } from "./worker-v071.js";

const workerSource = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");
const canonicalData = JSON.parse(readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json", import.meta.url),
  "utf8"
));
const rulebookMarkdown = readFileSync(
  new URL("../releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md", import.meta.url),
  "utf8"
);

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

const priorFogExchange = [
  { role: "user", content: "Explain fog of war" },
  {
    role: "assistant",
    content: "Fog of War is a Territory Overlay. In the next battle there, the Territory's controller sets their Gambit and chooses their Tactics after the opponent. Discard the Overlay after that battle.",
    rulingStatus: "explicit"
  }
];

function expectFogOfWarFirst(question, history = []) {
  const sources = sourcesFor(question, history);
  expect(sources[0]?.canonicalId, question).toBe("card:intelligence-fog-of-war");
  return sources[0];
}

describe("v0.7.1 Fog of War conversational continuity", () => {
  test("the current adjudication guide binds ownership and control to the object named by authority", () => {
    expect(workerSource).toContain("Keep ownership and control attached to the game object the supplied authority names.");
    expect(workerSource).toContain("Do not transfer the owner or controller of a card, Overlay, Deed, Territory, or other object onto another object it affects unless supplied authority expressly equates those roles.");
  });

  test("direct Fog of War questions retrieve the card as primary authority", () => {
    expectFogOfWarFirst("Explain fog of war");
  });

  test("the reviewed ownership follow-up stays anchored to Fog of War", () => {
    const question = "Does it depend who owns the territory";
    const query = contextualQuery(question, priorFogExchange);
    expect(query.toLowerCase()).toContain("fog of war");

    expectFogOfWarFirst(question, priorFogExchange);
  });

  test("current authority makes Territory control, not Overlay ownership, the operative property", () => {
    const source = expectFogOfWarFirst("Does Fog of War depend on who controls the Territory?");
    const body = String(source?.body || "");
    expect(body).toContain("this Territory's controller sets their Gambit and chooses their Tactics after the opponent");
    expect(body).toContain("Discard this Overlay after that battle");
    expect(body).not.toContain("this Overlay's controller");
  });

  test("direct ownership and control paraphrases remain on the same card authority", () => {
    for (const question of [
      "Does Fog of War depend on who owns the Territory?",
      "Does Fog of War depend on who controls the Territory?"
    ]) {
      expectFogOfWarFirst(question);
    }
  });

  test("the reviewed opponent-control question preserves the current Territory-controller direction", () => {
    const question = "What if the opponent controls fog of war";
    const source = expectFogOfWarFirst(question);
    const body = String(source?.body || "");
    expect(body).toContain("this Territory's controller sets their Gambit and chooses their Tactics after the opponent");
    expect(body).toContain("Discard this Overlay after that battle");
    expect(body).not.toContain("this Overlay's controller");
  });
});
