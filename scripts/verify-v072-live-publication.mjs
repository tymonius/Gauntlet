import crypto from "node:crypto";

const RELEASE_VERSION = "v0.7.2";
const EXPECTED_AUTHORITY_SET = "ab0125ae280accfb03d53bdadf5b6ae006f98aeab897e20a4b2269d89ed9eb84";
const EXPECTED_BEHAVIOR_REVISION = "v072-qa-20260922-02";
const PUBLIC_BASE = "https://gauntlet.run";
const ARBITER_BASE = "https://gauntlet-rules-assistant.tymon-scott.workers.dev";
const PLAYTEST_BASE = "https://gauntlet-playtest-sessions.tymon-scott.workers.dev";

const publishedSha = process.env.PUBLISHED_SHA;
if (!publishedSha) throw new Error("PUBLISHED_SHA is required.");

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const sha256 = bytes => crypto.createHash("sha256").update(bytes).digest("hex");

async function fetchRetry(url, options = {}, attempts = 12, delayMs = 3000) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, { ...options, cache: "no-store" });
      if (response.ok) return response;
      lastError = new Error(`${options.method || "GET"} ${url} -> ${response.status} ${await response.text()}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < attempts) await sleep(delayMs);
  }
  throw lastError;
}

const publicUrl = path => {
  const url = new URL(path, `${PUBLIC_BASE}/`);
  url.searchParams.set("publication", publishedSha);
  return url.href;
};
const fetchPublic = path => fetchRetry(publicUrl(path));
const readPublicText = async path => (await fetchPublic(path)).text();

async function waitForLiveCutover() {
  let lastState = "no response";
  for (let attempt = 1; attempt <= 120; attempt += 1) {
    try {
      const [lifecycleResponse, homeResponse] = await Promise.all([
        fetchPublic("/config/release-lifecycle.json"),
        fetchPublic("/"),
      ]);
      const lifecycle = await lifecycleResponse.json();
      const home = await homeResponse.text();
      lastState = `current_release=${lifecycle?.current_release || "missing"} home_v072=${home.includes("Current canonical playtest edition · v0.7.2")}`;
      if (
        lifecycle?.current_release === RELEASE_VERSION
        && lifecycle?.releases?.[RELEASE_VERSION]?.status === "current"
        && lifecycle?.releases?.[RELEASE_VERSION]?.public_cutover === true
        && home.includes("Current canonical playtest edition · v0.7.2")
      ) {
        console.log(`Live ${RELEASE_VERSION} cutover observed on attempt ${attempt}.`);
        return;
      }
    } catch (error) {
      lastState = String(error);
    }
    if (attempt < 120) await sleep(5000);
  }
  throw new Error(`gauntlet.run did not converge to ${RELEASE_VERSION}: ${lastState}`);
}

await waitForLiveCutover();

const paths = {
  home: "/",
  release: "/v0.7.2/",
  start: "/start/",
  cardReference: "/card-reference/",
  deckbuilder: "/deckbuilder/",
  arbiter: "/rules-arbiter/",
  rulebook: "/rulebook/",
  widget: "/rules-assistant/widget.js",
  manifest: "/releases/v0.7.2/Gauntlet_v0.7.2_Manifest.json",
  completeRules: "/releases/v0.7.2/Gauntlet_v0.7.2_Complete_Rules.md",
  canonical: "/releases/v0.7.2/Gauntlet_v0.7.2_Canonical_Data.json",
  starters: "/releases/v0.7.2/Gauntlet_v0.7.2_Starter_Decks.json",
  provenance: "/releases/v0.7.2/Gauntlet_v0.7.2_Source_Provenance.json",
  playerGuide: "/rulebook/sources/player-guide.md",
  military: "/rulebook/sources/factions/military.md",
  diplomats: "/rulebook/sources/factions/diplomats.md",
  financiers: "/rulebook/sources/factions/financiers.md",
  intelligence: "/rulebook/sources/factions/intelligence.md",
  mystics: "/rulebook/sources/factions/mystics.md",
  inquisition: "/rulebook/sources/factions/inquisition.md",
  completeRulesSource: "/rulebook/sources/complete-rules.md",
  chiefJusticePortrait: "/images/rules-arbiter/chief-justice-rules-arbiter.webp",
  chiefJusticePopupPortrait: "/images/rules-arbiter/chief-justice-rules-arbiter-popup.webp",
};

const [
  home,
  releaseLanding,
  startPage,
  cardReferencePage,
  deckbuilderPage,
  arbiterPage,
  rulebookPage,
  widgetJs,
  manifestText,
  completeRules,
  canonicalText,
  startersText,
  provenanceText,
  playerGuide,
  militaryGuide,
  diplomatsGuide,
  financiersGuide,
  intelligenceGuide,
  mysticsGuide,
  inquisitionGuide,
  completeRulesSource,
] = await Promise.all([
  readPublicText(paths.home),
  readPublicText(paths.release),
  readPublicText(paths.start),
  readPublicText(paths.cardReference),
  readPublicText(paths.deckbuilder),
  readPublicText(paths.arbiter),
  readPublicText(paths.rulebook),
  readPublicText(paths.widget),
  readPublicText(paths.manifest),
  readPublicText(paths.completeRules),
  readPublicText(paths.canonical),
  readPublicText(paths.starters),
  readPublicText(paths.provenance),
  readPublicText(paths.playerGuide),
  readPublicText(paths.military),
  readPublicText(paths.diplomats),
  readPublicText(paths.financiers),
  readPublicText(paths.intelligence),
  readPublicText(paths.mystics),
  readPublicText(paths.inquisition),
  readPublicText(paths.completeRulesSource),
]);

const manifest = JSON.parse(manifestText);
const canonical = JSON.parse(canonicalText);
const starters = JSON.parse(startersText);
const provenance = JSON.parse(provenanceText);

if (!home.includes("Current canonical playtest edition · v0.7.2")) {
  throw new Error("Homepage is not presenting v0.7.2 as current.");
}
if (!home.includes("Ask the Chief Justice") || !home.includes("chief-justice-homepage.webp")) {
  throw new Error("Homepage Chief Justice presentation is incomplete.");
}
if (!releaseLanding.includes("Gauntlet v0.7.2") || !releaseLanding.includes("The Chief Justice")) {
  throw new Error("v0.7.2 release landing page is not deployed.");
}
for (const [label, source] of [
  ["Start Playing", startPage],
  ["Card Reference", cardReferencePage],
  ["Deckbuilder", deckbuilderPage],
]) {
  if (!source.includes("v0.7.2")) throw new Error(`${label} is missing v0.7.2 public identity.`);
}
if (
  !arbiterPage.includes("Chief Justice")
  || !arbiterPage.includes("Gauntlet Rules Arbiter · v0.7.2")
  || !arbiterPage.includes("chief-justice-rules-arbiter.webp")
) {
  throw new Error("Rules Arbiter page is not the v0.7.2 Chief Justice surface.");
}
if (
  !widgetJs.includes('assistantName: "Chief Justice"')
  || !widgetJs.includes('version: "v0.7.2"')
  || !widgetJs.includes("chief-justice-rules-arbiter-popup.webp")
) {
  throw new Error("Floating Chief Justice widget is not bound to v0.7.2.");
}
if (
  !/Gauntlet v0\.7\.2 Browser Rulebook/.test(rulebookPage)
  || !rulebookPage.includes("Player's Guide")
  || !rulebookPage.includes("Complete Rules")
) {
  throw new Error("Browser Rulebook is not presenting the modular v0.7.2 rules publication.");
}

const modularSources = [
  ["player-guide", playerGuide, "RULES-SURFACE:player-guide"],
  ["military", militaryGuide, "RULES-FACTION:military"],
  ["diplomats", diplomatsGuide, "RULES-FACTION:diplomats"],
  ["financiers", financiersGuide, "RULES-FACTION:financiers"],
  ["intelligence", intelligenceGuide, "RULES-FACTION:intelligence"],
  ["mystics", mysticsGuide, "RULES-FACTION:mystics"],
  ["inquisition", inquisitionGuide, "RULES-FACTION:inquisition"],
  ["complete-rules", completeRulesSource, "RULES-PART:"],
];
for (const [id, source, marker] of modularSources) {
  if (!source.includes(marker)) throw new Error(`Published modular rules source ${id} is missing ${marker}.`);
}

if (
  manifest.release_version !== RELEASE_VERSION
  || manifest.status !== "current"
  || manifest.authority_set_id !== EXPECTED_AUTHORITY_SET
  || manifest.current_package_path !== "releases/v0.7.2/"
  || !/^\d{4}-\d{2}-\d{2}$/.test(manifest.publication_date || "")
) {
  throw new Error(`Unexpected public v0.7.2 manifest: ${JSON.stringify(manifest)}`);
}
for (const key of ["website", "rulebook", "browser_tools", "rules_arbiter", "digital_rules"]) {
  if (manifest.public_defaults?.[key] !== RELEASE_VERSION) {
    throw new Error(`Public manifest default ${key} is not ${RELEASE_VERSION}.`);
  }
}

if (
  canonical.release_version !== RELEASE_VERSION
  || canonical.source_version !== RELEASE_VERSION
  || canonical.status !== "release-candidate"
  || canonical.frozen_authority_set_id !== EXPECTED_AUTHORITY_SET
  || canonical.gameplay?.cards?.length !== 142
  || canonical.gameplay?.territories?.length !== 25
  || canonical.gameplay?.factions?.length !== 6
  || canonical.leaders?.length !== 12
  || canonical.proposals?.length !== 9
) {
  throw new Error("Public v0.7.2 canonical data does not match the frozen release authority.");
}

const newRecruits = canonical.gameplay.cards.find(card => card.id === "neutral-new-recruits");
if (
  newRecruits?.cost !== 2
  || !String(newRecruits?.action || "").includes("Discard one other card from your Hand if able")
  || !String(newRecruits?.action || "").includes("+3 Cards")
) {
  throw new Error("Public v0.7.2 canonical data is missing the final New Recruits revision.");
}
const inquisition = canonical.gameplay.factions.find(faction => faction.id === "inquisition");
if (!JSON.stringify(inquisition).includes("2 Conviction if two or more entered")) {
  throw new Error("Public v0.7.2 canonical data is missing the final Inquisition Conviction revision.");
}
const intelligence = canonical.gameplay.factions.find(faction => faction.id === "intelligence");
if (!JSON.stringify(intelligence).includes("gain Intel equal to your Operation Progress")) {
  throw new Error("Public v0.7.2 canonical data is missing recurring Intelligence Intel generation.");
}

if (
  starters.release_version !== RELEASE_VERSION
  || starters.source_version !== RELEASE_VERSION
  || starters.frozen_authority_set_id !== EXPECTED_AUTHORITY_SET
  || starters.decks?.length !== 12
) {
  throw new Error("Public v0.7.2 starter Deck data is incomplete or not bound to the frozen authority.");
}
for (const deck of starters.decks) {
  const count = Array.isArray(deck.cards)
    ? deck.cards.reduce((sum, entry) => sum + Number(entry?.quantity || 0), 0)
    : 0;
  if (count !== 30) throw new Error(`Starter ${deck.id || deck.name} does not contain 30 cards.`);
}

if (
  provenance.release_version !== RELEASE_VERSION
  || provenance.source_version !== RELEASE_VERSION
  || provenance.authority_set_id !== EXPECTED_AUTHORITY_SET
) {
  throw new Error("Public v0.7.2 provenance does not identify the frozen authority set.");
}

for (const [key, text] of [
  ["complete_rules", completeRules],
  ["canonical_data", canonicalText],
  ["approved_starters", startersText],
  ["source_provenance", provenanceText],
]) {
  const binding = manifest.binding_sources?.[key];
  if (!binding?.sha256 || sha256(Buffer.from(text, "utf8")) !== binding.sha256) {
    throw new Error(`Public ${key} does not match its manifest SHA-256 binding.`);
  }
}

const requiredBooklets = new Set([
  "player-guide",
  "military",
  "diplomats",
  "financiers",
  "intelligence",
  "mystics",
  "inquisition",
  "complete-rules",
]);
const pdfOutputs = Array.isArray(manifest.pdf_outputs) ? manifest.pdf_outputs : [];
for (const key of requiredBooklets) {
  const output = pdfOutputs.find(item => item?.key === key || item?.key === `${key}-booklet`);
  if (!output?.path || !output?.sha256 || !Number.isInteger(output?.pages) || output.pages < 1) {
    throw new Error(`Public v0.7.2 manifest is missing the ${key} booklet output.`);
  }
  const response = await fetchPublic(`/releases/v0.7.2/${output.path}`);
  const type = String(response.headers.get("content-type") || "").toLowerCase();
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!type.includes("pdf") || sha256(bytes) !== output.sha256) {
    throw new Error(`Public ${key} booklet does not match its manifest binding.`);
  }
}

for (const portraitPath of [paths.chiefJusticePortrait, paths.chiefJusticePopupPortrait]) {
  const response = await fetchPublic(portraitPath);
  const type = String(response.headers.get("content-type") || "").toLowerCase();
  const bytes = Buffer.from(await response.arrayBuffer());
  if (!type.includes("image") || bytes.length < 10000) {
    throw new Error(`Chief Justice portrait asset is invalid: ${portraitPath} type=${type} bytes=${bytes.length}.`);
  }
}

const workerHealth = await (await fetchRetry(`${ARBITER_BASE}/api/health`, {}, 30, 3000)).json();
if (
  workerHealth?.ok !== true
  || workerHealth?.version !== RELEASE_VERSION
  || workerHealth?.currentPublicRelease !== RELEASE_VERSION
  || workerHealth?.published !== true
  || workerHealth?.behaviorRevision !== EXPECTED_BEHAVIOR_REVISION
) {
  throw new Error(`Current Rules Arbiter Worker is not the certified v0.7.2 build: ${JSON.stringify(workerHealth)}`);
}
const corpusHealth = await (await fetchRetry(`${ARBITER_BASE}/api/v072/corpus-health`, {}, 20, 3000)).json();
if (
  corpusHealth?.ok !== true
  || corpusHealth?.version !== RELEASE_VERSION
  || corpusHealth?.authoritySetId !== EXPECTED_AUTHORITY_SET
) {
  throw new Error(`v0.7.2 Rules Arbiter corpus is not the frozen release authority: ${JSON.stringify(corpusHealth)}`);
}
const historicalArbiter = await (await fetchRetry(`${ARBITER_BASE}/api/v071/health`)).json();
if (historicalArbiter?.version !== "v0.7.1") {
  throw new Error(`Historical v0.7.1 Rules Arbiter route was not preserved: ${JSON.stringify(historicalArbiter)}`);
}

const playtestHealth = await (await fetchRetry(`${PLAYTEST_BASE}/health`, {}, 20, 3000)).json();
if (
  playtestHealth?.ok !== true
  || playtestHealth?.version !== RELEASE_VERSION
  || playtestHealth?.database !== true
  || playtestHealth?.sessionCreationConfigured !== true
) {
  throw new Error(`Playtest-session Worker is not healthy on v0.7.2: ${JSON.stringify(playtestHealth)}`);
}

console.log(
  "gauntlet.run live verification passed for v0.7.2: modular rules, frozen authority, eight booklets, Chief Justice UI/assets, certified Rules Arbiter corpus, and playtest-session identity are all current."
);
