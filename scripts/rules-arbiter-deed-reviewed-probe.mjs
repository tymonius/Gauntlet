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
  "Do purchased deeds have to be contiguous like your Front Line?",
  "Can I purchase the deed to a territory I don't own and am not on?",
  "Do I have to control or occupy a Territory to buy its Deed?",
  "Can Deeds be purchased out of order?"
];

for (const question of questions) {
  const query = contextualQuery(question, []);
  const raw = retrieveRules(corpus, query, { limit: 10, excerptLength: 1700 });
  const sources = augmentRetrievalForContext(corpus, question, [], raw);
  console.log(`\n=== ${question} ===`);
  for (const [index, source] of sources.entries()) {
    console.log(`${index + 1}. ${source.canonicalId} | ${source.title}`);
    console.log(String(source.body || source.excerpt || "").replace(/\s+/g, " ").slice(0, 900));
  }
}

console.log("\n=== DEED AUTHORITY CANDIDATES ===");
for (const doc of corpus.documents || []) {
  const text = `${doc.id} ${doc.title} ${doc.body}`.toLowerCase();
  if (!text.includes("deed")) continue;
  if (/contigu|occup|control|any territory|purchase|buy/.test(text)) {
    console.log(`${doc.id} | ${doc.title} | ${String(doc.body || "").replace(/\s+/g, " ").slice(0, 1400)}`);
  }
}
