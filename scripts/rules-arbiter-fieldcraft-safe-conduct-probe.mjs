import { readFileSync } from "node:fs";
import { buildRulesCorpus, retrieveRules } from "../rules-assistant/local-search.js";
import { augmentRetrievalForContext, contextualQuery } from "../rules-assistant/worker-v071.js";

const canonicalData = JSON.parse(readFileSync("releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json", "utf8"));
const rulebookMarkdown = readFileSync("releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md", "utf8");
const corpus = buildRulesCorpus({
  canonicalData,
  rulebookMarkdown,
  siteOrigin: "https://gauntlet.run",
  rulebookBrowserUrl: "https://gauntlet.run/rulebook/",
  canonicalDataUrl: "https://gauntlet.run/releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json"
});

const questions = [
  "Different ability: can Fieldcraft ignore an effect that changes control of a Territory?",
  "Switching subjects: if Safe Conduct makes me withdraw, does Political Capital still trigger?",
  "What does shock and awe do?"
];

for (const question of questions) {
  const query = contextualQuery(question, []);
  const raw = retrieveRules(corpus, query, { limit: 10, excerptLength: 1500 });
  const sources = augmentRetrievalForContext(corpus, question, [], raw);
  console.log(`\n=== ${question} ===`);
  for (const [index, source] of sources.entries()) {
    console.log(`${index + 1}. ${source.canonicalId} | ${source.title}`);
    console.log(String(source.body || source.excerpt || "").replace(/\s+/g, " ").slice(0, 700));
  }
}

console.log("\n=== TERM MATCHES ===");
for (const term of ["fieldcraft", "political capital", "safe conduct", "shock and awe"]) {
  const matches = (corpus.documents || []).filter((doc) => `${doc.id} ${doc.title} ${doc.body}`.toLowerCase().includes(term));
  console.log(`\n${term}:`);
  for (const doc of matches.slice(0, 20)) console.log(`${doc.id} | ${doc.title} | ${String(doc.body || "").replace(/\s+/g, " ").slice(0, 900)}`);
}
