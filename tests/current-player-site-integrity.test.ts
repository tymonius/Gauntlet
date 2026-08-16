import { existsSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const read = (file: string) => readFileSync(file, "utf8");

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

describe("current v0.6.3 player-site closeout", () => {
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
      expect(text, `${file} still claims v0.6.1 is current`).not.toMatch(/current(?:\s+public)?\s+release(?:\s+remains|:)\s+v0\.6\.1/i);
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

  it("keeps the Card Reference on current v0.6.3 data without exposing reconstruction UI", () => {
    const html = read("card-reference/index.html");
    const app = read("card-reference/app.js");

    expect(html).toContain("Quick rules lookup · v0.6.3");
    expect(html).toContain("128 playable cards and 25 Territories");
    expect(app).toContain("/artifacts/reconstruction/clean-v0.6.3/complete-authority/canonical-structured-data.json");
    expect(app).toContain("gameplay.cards.length !== 128");
    expect(app).toContain("gameplay.territories.length !== 25");
    expect(app).toContain('secondLine?.name !== "Second Line"');
    expect(app).toContain('smugglersRun?.name !== "Smuggler\'s Run"');
    expect(app).toContain("const RULEBOOK_URL = '../rulebook/';");
    expect(app).not.toContain("../browser-rulebook/");
    expect(app).not.toContain("View clean canonical authority");
    expect(app).not.toContain("This reconstruction");
    expect(app).not.toContain("publication remains locked");
    expect(app).not.toContain("Authority set");
  });

  it("uses the published v0.6.3 Rules Arbiter remotely and preserves local fallback", () => {
    const html = read("rules-arbiter/index.html");
    const app = read("rules-arbiter/app.js");

    expect(html).toContain("Rules support · v0.6.3");
    expect(html).toContain("Answers include the relevant current Rulebook sources");
    expect(app).toContain('const CURRENT_PUBLIC_RELEASE = "v0.6.3";');
    expect(app).toContain("payload.published !== true");
    expect(app).toContain("payload.reconstruction !== false");
    expect(app).toContain("payload.currentPublicRelease !== CURRENT_PUBLIC_RELEASE");
    expect(app).toContain("return askLocal(question);");
    expect(app).toContain('const href = source.sourceUrl || "../rulebook/";');
    expect(app).not.toContain("Reconstruction worker returned");
    expect(app).not.toContain("Clean sources");
    expect(app).not.toContain("certified v0.6.3 authority");
    expect(app).not.toContain("../browser-rulebook/");
  });

  it("keeps the restored Deckbuilder natively identified as current v0.6.3 and bound to current runtime data", () => {
    const html = read("deckbuilder/index.html");
    const runtime = read("deckbuilder/v061-runtime.js");

    expect(html).toContain("Gauntlet v0.6.3 Deckbuilder");
    expect(html).toContain("Playtest tool · canonical v0.6.3");
    expect(visibleText(html)).not.toContain("v0.6.1");
    expect(html).toContain('href="../releases/v0.6.3-reconstructed/"');
    expect(html).not.toContain('href="../releases/v0.6.1/"');
    expect(html).toMatch(/src="v061-runtime\.js(?:\?[^\"]*)?"/);
    expect(runtime).toContain('const VERSION = "v0.6.3";');
    expect(runtime).toContain("Gauntlet_v0.6.3_Canonical_Data.json");
    expect(runtime).toContain('document.title = "Gauntlet v0.6.3 Deckbuilder"');
    expect(runtime).toContain('.replaceAll("v0.6.1", "v0.6.3")');
    expect(runtime).toContain('data.gameVersion = VERSION');
  });
});
