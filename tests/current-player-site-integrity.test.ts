import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(file, "utf8");
const LEGACY_RELEASE_ALIAS = `../releases/${["v0.6.3", "reconstructed"].join("-")}/`;

const CORE_PLAYER_HTML = [
  "index.html",
  "start/index.html",
  "rulebook/index.html",
  "card-reference/index.html",
  "factions/index.html",
  "factions/military/index.html",
  "factions/diplomats/index.html",
  "factions/financiers/index.html",
  "factions/intelligence/index.html",
  "factions/mystics/index.html",
  "factions/inquisition/index.html",
  "deckbuilder/index.html",
  "rules-arbiter/index.html"
];

const GLOBAL_TOOL_TARGETS = [
  "rulebook/index.html",
  "factions/index.html",
  "deckbuilder/index.html",
  "card-reference/index.html",
  "rules-arbiter/index.html"
];

function visibleText(html: string) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function staticRefs(html: string) {
  return [...html.matchAll(/\b(?:href|src)=(['"])(.*?)\1/gi)].map(match => match[2]);
}

function localTarget(fromFile: string, ref: string) {
  if (!ref || ref.startsWith("#")) return null;
  if (/^(?:https?:|mailto:|tel:|data:|javascript:)/i.test(ref)) return null;

  const withoutFragment = ref.split("#", 1)[0].split("?", 1)[0];
  if (!withoutFragment) return null;

  const decoded = decodeURIComponent(withoutFragment);
  if (decoded === "/") return "index.html";

  let target = decoded.startsWith("/")
    ? path.normalize(decoded.slice(1))
    : path.normalize(path.join(path.dirname(fromFile), decoded));

  if (!target || target === ".") return "index.html";
  if (decoded.endsWith("/") || (existsSync(target) && statSync(target).isDirectory())) {
    target = path.join(target, "index.html");
  }
  return target;
}

function resolvedTargets(file: string) {
  return new Set(
    staticRefs(read(file))
      .map(ref => localTarget(file, ref))
      .filter((target): target is string => Boolean(target))
  );
}

function expectNavigationTargets(file: string, expectedTargets: string[]) {
  const targets = resolvedTargets(file);
  for (const target of expectedTargets) {
    expect(targets.has(target), `${file} lacks navigation to ${target}`).toBe(true);
  }
}

describe("v0.7.1 player-site release", () => {
  it("keeps every static internal link and asset reference on core player pages resolvable", () => {
    for (const file of CORE_PLAYER_HTML) {
      const html = read(file);
      for (const ref of staticRefs(html)) {
        const target = localTarget(file, ref);
        if (!target) continue;
        expect(existsSync(target), `${file} -> ${ref} resolves to missing ${target}`).toBe(true);
      }
    }
  });

  it("keeps reconstruction and release-governance jargon out of ordinary player-visible page text", () => {
    for (const file of CORE_PLAYER_HTML) {
      const text = visibleText(read(file));
      expect(text, `${file} exposes reconstruction language`).not.toMatch(/\breconstruction\b/i);
      expect(text, `${file} exposes certification language`).not.toMatch(/\bcertified\b/i);
      expect(text, `${file} exposes an authority-set identifier`).not.toMatch(/authority\s+set/i);
      expect(text, `${file} exposes a raw SHA/hash-like identifier`).not.toMatch(/\b[a-f0-9]{64}\b/i);
      expect(text, `${file} claims publication is still locked`).not.toMatch(/publication\s+(?:remains\s+)?locked/i);
      expect(text, `${file} exposes downstream-review language`).not.toMatch(/downstream\s+review\s+only/i);
    }
  });

  it("restores coherent primary navigation on the rules and reference tools", () => {
    for (const file of ["card-reference/index.html", "rules-arbiter/index.html"]) {
      expectNavigationTargets(file, GLOBAL_TOOL_TARGETS);
    }

    expectNavigationTargets("deckbuilder/index.html", [
      "rulebook/index.html",
      "factions/index.html",
      "card-reference/index.html",
      "rules-arbiter/index.html"
    ]);
    expect(resolvedTargets("deckbuilder/index.html").has("deckbuilder/index.html")).toBe(true);

    expectNavigationTargets("rulebook/index.html", [
      "factions/index.html",
      "deckbuilder/index.html",
      "card-reference/index.html",
      "rules-arbiter/index.html"
    ]);
  });

  it("keeps the Card Reference on current-game authority with v0.7.1 publication identity", () => {
    const html = read("card-reference/index.html");
    const app = read("card-reference/app.js");

    expect(html).toContain("<title>Gauntlet v0.7.1 Card Reference</title>");
    expect(html).toContain("Quick rules lookup · v0.7.1 production");
    expect(html).toContain("Complete current v0.7.1 production card and Territory reference.");
    expect(app).toContain("document.title = `Gauntlet ${state.version} Card Reference`;");
    expect(html).toContain("v0.7.1 Release");
    expect(app).toContain("loadCurrentGame");
    expect(app).toContain("currentGame.cards");
    expect(app).toContain("currentGame.leaders");
    expect(app).toContain("currentGame.sharedComponents");
    expect(app).toContain("currentGame.components");
    expect(app).toContain(".filter(component => component.cardLike)");
    expect(app).toContain("'proposal-treaty-card': 'proposal'");
    expect(app).toContain("'rite-card': 'rite'");
    expect(app).toContain("'ritual-card': 'ritual'");
    expect(app).toContain("'reference-card': 'reference'");
    expect(app).toContain("tracker: 'tracker'");
    expect(app).toContain("ledger: 'ledger'");
    expect(app).toContain("'deed-card': 'deed'");
    expect(app).toContain("component-print-render.html");
    expect(app).toContain("currentGame.territories");
    expect(app).toContain("loaded from current-game authority");
    expect(html).toContain('<option value="leader">Leaders</option>');
    expect(html).toContain('<option value="proposal">Proposals</option>');
    expect(html).toContain('<option value="rite">Rites</option>');
    expect(html).toContain('<option value="reference">Reference cards</option>');
    expect(html).toContain('<strong id="otherCardTotal">0</strong><span>Other cards</span>');
    expect(app).not.toContain("/artifacts/reconstruction/clean-v0.6.3/complete-authority/canonical-structured-data.json");
    expect(app).not.toContain("View clean canonical authority");
    expect(app).not.toContain("publication remains locked");
    expect(app).not.toContain("Authority set");
  });

  it("uses the published v0.7.1 Rules Arbiter remotely and preserves immutable local fallback", () => {
    const html = read("rules-arbiter/index.html");
    const app = read("rules-arbiter/app.js");
    const corpus = read("rules-assistant/v071-public-corpus.js");
    const workerEntry = read("rules-assistant/worker-entry.js");

    expect(html).toContain("Rules support · v0.7.1");
    expect(html).toContain("Answers include the relevant current Rulebook sources");
    expect(app).toContain('const CURRENT_PUBLIC_RELEASE = "v0.7.1";');
    expect(app).toContain("../rules-assistant/v071-public-corpus.js");
    expect(app).toContain("payload.published !== true");
    expect(app).toContain("payload.reconstruction !== false");
    expect(app).toContain("payload.currentPublicRelease !== CURRENT_PUBLIC_RELEASE");
    expect(app).toContain("return askLocal(question);");
    expect(corpus).toContain("releases/v0.7.1/Gauntlet_v0.7.1_Rulebook.md");
    expect(corpus).toContain("releases/v0.7.1/Gauntlet_v0.7.1_Canonical_Data.json");
    expect(corpus).not.toContain("loadV064CandidateRulesCorpus");
    expect(workerEntry).toContain('import worker from "./worker-v071.js";');
    expect(workerEntry).toContain('import v063Worker from "./worker-v063.js";');
  });

  it("keeps the Deckbuilder on released v0.7.1 by default with an explicit current-candidate view", () => {
    const html = read("deckbuilder/index.html");
    const runtime = read("deckbuilder/current-runtime.js");
    const print = read("deckbuilder/print.js");
    const bulkPrint = read("deckbuilder/print-all-starters.js");

    expect(html).toContain("Gauntlet v0.7.1 Deckbuilder");
    expect(html).toContain("Playtest tool · canonical v0.7.1");
    expect(visibleText(html)).not.toContain("v0.6.1");
    expect(html).toContain('href="../v0.7.1/"');
    expect(html).not.toContain(`href="${LEGACY_RELEASE_ALIAS}"`);
    expect(html).not.toContain('href="../releases/v0.6.1/"');
    expect(runtime).toContain('import("../game-data/ruleset.mjs")');
    expect(html).toContain('data-ruleset="released"');
    expect(html).toContain('data-ruleset="candidate"');
    expect(runtime).toContain('gauntlet-${module.PUBLISHED_VERSION}-decks');
    expect(runtime).toContain('gauntlet-current-game-decks');
    expect(runtime).not.toContain('gauntlet-v0.7.1-decks');
    expect(runtime).toContain("state.currentGameVersion = data.version");
    expect(runtime).toContain("state.currentGameDisplayVersion = data.displayVersion");
    expect(read("deckbuilder/app.js")).toContain('gameVersion: state.currentGameVersion || "current-game"');
    expect(runtime).toContain('document.title = `Gauntlet ${data.displayVersion} Deckbuilder`');
    expect(runtime).not.toContain('Storage.prototype');
    expect(read("deckbuilder/app.js")).not.toContain("Gauntlet_v0.6.1_Neutral_Card_Pool");
    expect(read("deckbuilder/app.js")).not.toContain("gauntlet-v0.6.1-deck");
    expect(print).toContain('state.currentGameDisplayVersion || state.currentGameVersion || "current"');
    expect(print).not.toContain("v0.6.1");
    expect(bulkPrint).toContain('await deckbuilder.bootstrap()');
    expect(bulkPrint).toContain('deckbuilder.feature("printDeck")');
    expect(bulkPrint).not.toContain('../game-data/ruleset.mjs');
    expect(bulkPrint).not.toContain("starter-decks.json");
    expect(bulkPrint).not.toContain("v0.6.1");
  });

  it("removes stale player-facing v0.6.3/v0.6.4 identity from the promoted surfaces", () => {
    for (const file of [
      "index.html",
      "start/index.html",
      "card-reference/index.html",
      "deckbuilder/index.html",
      "rules-arbiter/index.html",
      "factions/military/index.html",
    ]) {
      const text = visibleText(read(file));
      expect(text, `${file} still advertises v0.6.3 as current`).not.toMatch(/(?:current|canonical|rules support|playtest tool)[^\n]{0,40}v0\.6\.3/i);
      expect(text, `${file} still advertises v0.6.4 development identity`).not.toMatch(/v0\.6\.4\s+development/i);
    }
  });
});
