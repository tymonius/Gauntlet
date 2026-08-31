import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const app = read("deckbuilder/app.js");
const runtime = read("deckbuilder/current-runtime.js");
const extensions = [
  "deckbuilder/territories.js",
  "deckbuilder/mystics-rites.js",
  "deckbuilder/starter-decks.js",
  "deckbuilder/starter-handoff.js",
  "deckbuilder/faction-components.js",
  "deckbuilder/rendered-card-preview.js",
  "deckbuilder/metadata-ui.js",
  "deckbuilder/print.js",
  "deckbuilder/production-print.js",
  "deckbuilder/print-summary.js",
  "deckbuilder/custom-print-loader.js",
  "deckbuilder/print-capital-ledger.js",
  "deckbuilder/print-request.js",
  "deckbuilder/print-all-starters.js",
  "deckbuilder/custom-print.mjs",
  "deckbuilder/tts-export.mjs",
].map(path => ({ path, source: read(path) }));

describe("Deckbuilder extension architecture", () => {
  it("has one explicit core API for shared state, lifecycle hooks, features, and authority access", () => {
    expect(app).toContain("window.GAUNTLET_DECKBUILDER = deckbuilderApi");
    expect(app).toContain('registerRenderHook: callback => requireHook("render", callback)');
    expect(app).toContain('registerValidationHook: callback => requireHook("validate", callback)');
    expect(app).toContain('registerSerializeHook: callback => requireHook("serialize", callback)');
    expect(app).toContain('registerHydrateHook: callback => requireHook("hydrate", callback)');
    expect(app).toContain('registerFactionChangeHook: callback => requireHook("factionChange", callback)');
    expect(app).toContain("registerFeature(name, api)");
    expect(app).toContain("setAuthorityBootstrap(callback)");
    expect(app).toContain("setSourceLoader(callback)");
    expect(app).toContain("setCardPreviewRenderer(callback)");
    expect(app).toContain("registerPrintTransform,");
    expect(app).toContain("preparePrintDocument,");
    expect(read("deckbuilder/print.js")).toContain('deckbuilder.registerFeature("printDeck"');
  });

  it("does not let extensions replace core functions by assignment", () => {
    const replacement = /^\s*(renderAll|validateDeck|validateAndRender|currentDeckData|applyDeckData|changeFaction|copyDeckList|renderCardPreview)\s*=/m;
    for (const { path, source } of extensions) {
      expect(source, `${path} replaces a core Deckbuilder function`).not.toMatch(replacement);
      expect(source, `${path} captures a render monkeypatch base`).not.toMatch(/\bbaseRenderAll\b/);
    }
  });

  it("uses lifecycle hooks for Territory, Rite, starter, and component integrations", () => {
    const territories = read("deckbuilder/territories.js");
    const rites = read("deckbuilder/mystics-rites.js");
    const starters = read("deckbuilder/starter-decks.js");
    const components = read("deckbuilder/faction-components.js");

    for (const hook of [
      "registerRenderHook",
      "registerValidationHook",
      "registerSerializeHook",
      "registerHydrateHook",
    ]) {
      expect(territories).toContain(`deckbuilder.${hook}`);
      expect(rites).toContain(`deckbuilder.${hook}`);
    }
    expect(rites).toContain("deckbuilder.registerFactionChangeHook");
    expect(starters).toContain("deckbuilder.registerRenderHook");
    expect(starters).toContain('deckbuilder.registerPrintTransform("starter-strategy"');
    expect(components).toContain("deckbuilder.registerRenderHook");
  });

  it("retires the ad hoc GAUNTLET feature and authority globals", () => {
    const combined = [runtime, ...extensions.map(item => item.source)].join("\n");
    for (const retired of [
      "GAUNTLET_DECKBUILDER_BOOTSTRAP",
      "GAUNTLET_DECKBUILDER_LOAD_SOURCE",
      "GAUNTLET_DECKBUILDER_RULESET",
      "GAUNTLET_CURRENT_GAME_DATA",
      "GAUNTLET_MYSTICS_RITES",
      "GAUNTLET_STARTER_DECKS",
      "GAUNTLET_CURRENT_SUPPLEMENTALS",
    ]) {
      expect(combined).not.toContain(retired);
    }

    expect(runtime).toContain("deckbuilder.setAuthorityBootstrap(currentGame)");
    expect(runtime).toContain("deckbuilder.setSourceLoader");
    expect(runtime).toContain("deckbuilder.setRuleset");
    expect(read("deckbuilder/mystics-rites.js")).toContain('deckbuilder.registerFeature("mysticsRites"');
    expect(read("deckbuilder/starter-decks.js")).toContain('deckbuilder.registerFeature("starterDecks"');
    expect(read("deckbuilder/faction-components.js")).toContain('deckbuilder.registerFeature("supplementalPackages"');
  });

  it("routes custom and bulk tools through the selected Deckbuilder authority", () => {
    expect(read("deckbuilder/custom-print.mjs")).toContain("await deckbuilder.bootstrap()");
    expect(read("deckbuilder/print-all-starters.js")).toContain("await deckbuilder.bootstrap()");
    expect(read("deckbuilder/print-all-starters.js")).toContain('deckbuilder.feature("printDeck")');
    expect(read("deckbuilder/print-all-starters.js")).not.toContain("window.open =");
    expect(read("deckbuilder/custom-print.mjs")).toContain('deckbuilder.feature("productionPrintRenderer")');
    expect(read("deckbuilder/print-capital-ledger.js")).toContain('deckbuilder.feature("productionPrintRenderer")');
    expect(read("deckbuilder/territories.js")).toContain("await deckbuilder.bootstrap()");
    expect(read("deckbuilder/mystics-rites.js")).toContain("await deckbuilder.bootstrap()");
  });
});
