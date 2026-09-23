import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const RELEASE_VERSION = "v0.7.2";
const CURRENT_GAME = "packages/game-data/current-game.json";
const COMPLETE_RULES = "packages/rules/comprehensive/comprehensive-rules.md";
const FREEZE = "config/v072-release-freeze.json";
const RELEASE_DIR = join(ROOT, "releases", RELEASE_VERSION);

const jsonText = value => JSON.stringify(value, null, 2) + "\n";
const clone = value => JSON.parse(JSON.stringify(value));
const sha256 = value => createHash("sha256").update(value).digest("hex");
const gitBlobSha = value => createHash("sha1")
  .update(`blob ${value.length}\0`)
  .update(value)
  .digest("hex");
const read = relative => readFile(join(ROOT, relative));
const write = async (relative, value) => {
  const target = join(ROOT, relative);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, value);
};

const [gameBytes, rulesBytes, freezeBytes, existingManifestBytes] = await Promise.all([
  read(CURRENT_GAME),
  read(COMPLETE_RULES),
  read(FREEZE),
  read("releases/v0.7.2/Gauntlet_v0.7.2_Manifest.json").catch(() => null),
]);
const freeze = JSON.parse(freezeBytes.toString("utf8"));
const current = JSON.parse(gameBytes.toString("utf8"));

if (
  freeze?.releaseVersion !== RELEASE_VERSION
  || freeze?.status !== "frozen-release-candidate"
  || !freeze?.authoritySetId
) {
  throw new Error("v0.7.2 freeze record is missing or invalid.");
}
if (
  gitBlobSha(gameBytes) !== freeze.sources?.currentGame?.gitBlob
  || gitBlobSha(rulesBytes) !== freeze.sources?.completeRules?.gitBlob
) {
  throw new Error("Frozen v0.7.2 source bytes changed after the release freeze.");
}
const authoritySetId = sha256(Buffer.concat([gameBytes, Buffer.from([0]), rulesBytes]));
if (authoritySetId !== freeze.authoritySetId) {
  throw new Error(`Frozen v0.7.2 authority set changed: ${authoritySetId}`);
}
if (
  current?.authority !== "current-game"
  || current?.version !== "v0.7.2-candidate"
  || current?.status !== "active-development"
) {
  throw new Error("Frozen v0.7.2 current-game source has the wrong candidate identity.");
}
if (
  current.gameplay?.cards?.length !== 142
  || current.gameplay?.territories?.length !== 25
  || current.gameplay?.factions?.length !== 6
  || current.leaders?.length !== 12
  || current.proposals?.length !== 9
  || current.starterDecks?.decks?.length !== 12
) {
  throw new Error("Frozen v0.7.2 source has incomplete gameplay counts.");
}

const canonical = {
  schema_version: 2,
  release_version: RELEASE_VERSION,
  source_version: RELEASE_VERSION,
  source_authority: `/${CURRENT_GAME}`,
  status: "release-candidate",
  frozen_authority_set_id: authoritySetId,
  provenance: {
    current_game_authority: CURRENT_GAME,
    complete_rules_authority: COMPLETE_RULES,
    historical_derivation: clone(current.provenance),
    note: "Staged v0.7.2 release data is a deterministic snapshot of the frozen current-game authority. Historical inputs remain provenance only.",
  },
  gameplay: clone(current.gameplay),
  proposals: clone(current.proposals),
  arcane_symbol: clone(current.arcaneSymbol),
  component_contract: clone(current.componentContract),
  faction_feature_taxonomy: clone(current.factionFeatureTaxonomy),
  faction_features: clone(current.factionFeatures),
  leaders: clone(current.leaders),
  mystics: clone(current.mystics),
};

const starters = {
  ...clone(current.starterDecks),
  version: RELEASE_VERSION,
  release_version: RELEASE_VERSION,
  source_version: RELEASE_VERSION,
  source_authority: `/${CURRENT_GAME}`,
  status: "release-candidate",
  frozen_authority_set_id: authoritySetId,
};

const provenance = {
  schema_version: 3,
  release_version: RELEASE_VERSION,
  source_version: RELEASE_VERSION,
  status: "release-candidate",
  authority_set_id: authoritySetId,
  freeze_record: FREEZE,
  frozen_sources: clone(freeze.sources),
  current_game_authority: CURRENT_GAME,
  complete_rules_authority: COMPLETE_RULES,
  historical_derivation: clone(current.provenance),
  counts: {
    playable_cards: 142,
    territories: 25,
    factions: 6,
    leaders: 12,
    proposals: 9,
    starter_decks: 12,
  },
};

const completeRulesText = rulesBytes.toString("utf8");
const canonicalText = jsonText(canonical);
const startersText = jsonText(starters);
const provenanceText = jsonText(provenance);
const bindingSources = {
  complete_rules: {
    path: "releases/v0.7.2/Gauntlet_v0.7.2_Complete_Rules.md",
    sha256: sha256(Buffer.from(completeRulesText, "utf8")),
  },
  canonical_data: {
    path: "releases/v0.7.2/Gauntlet_v0.7.2_Canonical_Data.json",
    sha256: sha256(Buffer.from(canonicalText, "utf8")),
  },
  approved_starters: {
    path: "releases/v0.7.2/Gauntlet_v0.7.2_Starter_Decks.json",
    sha256: sha256(Buffer.from(startersText, "utf8")),
  },
  source_provenance: {
    path: "releases/v0.7.2/Gauntlet_v0.7.2_Source_Provenance.json",
    sha256: sha256(Buffer.from(provenanceText, "utf8")),
  },
};

const existingManifest = existingManifestBytes ? JSON.parse(existingManifestBytes.toString("utf8")) : null;

const manifest = {
  schema_version: 1,
  release_version: RELEASE_VERSION,
  name: "The Chief Justice",
  status: "candidate",
  authority_set_id: authoritySetId,
  frozen_on: freeze.frozenAt,
  staged_package_path: "releases/v0.7.2/",
  source_provenance: {
    source_version: RELEASE_VERSION,
    base_version: "v0.7.1",
    current_game_authority: CURRENT_GAME,
    freeze_record: FREEZE,
  },
  binding_sources: bindingSources,
  counts: {
    playable_cards: 142,
    territories: 25,
    factions: 6,
    leaders: 12,
    starter_decks: 12,
    json_exports: 3,
    rules_documents: 1,
  },
  public_defaults: {
    website: "v0.7.1",
    browser_tools: "v0.7.1",
    rules_arbiter: "v0.7.1",
    digital_rules: "v0.7.1",
    rulebook: "v0.7.1",
  },
  staged_routes: {
    rules_arbiter: "/api/v072/rules",
    health: "/api/v072/health",
    corpus_health: "/api/v072/corpus-health",
  },
  json_exports: [
    "Gauntlet_v0.7.2_Canonical_Data.json",
    "Gauntlet_v0.7.2_Starter_Decks.json",
    "Gauntlet_v0.7.2_Source_Provenance.json",
  ],
};

if (existingManifest?.status === "current") {
  Object.assign(manifest, clone(existingManifest), {
    schema_version: 1,
    release_version: RELEASE_VERSION,
    authority_set_id: authoritySetId,
    binding_sources: bindingSources,
  });
}

await Promise.all([
  write("releases/v0.7.2/Gauntlet_v0.7.2_Complete_Rules.md", completeRulesText),
  write("releases/v0.7.2/Gauntlet_v0.7.2_Canonical_Data.json", canonicalText),
  write("releases/v0.7.2/Gauntlet_v0.7.2_Starter_Decks.json", startersText),
  write("releases/v0.7.2/Gauntlet_v0.7.2_Source_Provenance.json", provenanceText),
  write("releases/v0.7.2/Gauntlet_v0.7.2_Manifest.json", jsonText(manifest)),
]);

console.log(`Materialized staged ${RELEASE_VERSION} from frozen authority ${authoritySetId}.`);
console.log(`Cards: 142; Territories: 25; Leaders: 12; Starter Decks: 12.`);
