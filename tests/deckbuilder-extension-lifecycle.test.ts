import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const app = read("deckbuilder/app.js");
const runtime = read("deckbuilder/current-runtime.js");
const extensions = [
  "deckbuilder/mobile-card-preview.js",
  "deckbuilder/territories.js",
  "deckbuilder/mystics-rites.js",
  "deckbuilder/starter-decks.js",
  "deckbuilder/starter-handoff.js",
  "deckbuilder/faction-components.js",
  "deckbuilder/rendered-card-preview.js",
  "deckbuilder/metadata-ui.js",
  "deckbuilder/print.js",
  "deckbuilder/production-print.js",
  "deckbuilder/card-back-preview.js",
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
    expect(app).toContain('registerDeckListHook: callback => requireHook("deckList", callback)');
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

  it("does not let extensions replace browser primitives or publish side-channel globals", () => {
    for (const { path, source } of extensions) {
      expect(source, `${path} replaces window.open`).not.toMatch(/window\.open\s*=/);
      expect(source, `${path} replaces document.write`).not.toMatch(/document\.write\s*=/);
      expect(source, `${path} publishes a side-channel GAUNTLET global`).not.toMatch(/window\.GAUNTLET_(?!DECKBUILDER\b)[A-Z0-9_]+\s*=/);
    }
  });

  it("keeps Territory and Rite state behind their owning feature modules", () => {
    expect(runtime).not.toMatch(/state\.(?:territories|territoryPool|selectedTerritoryId|pendingTerritories)/);
    expect(runtime).not.toMatch(/state\.(?:rites|ritePool|selectedRiteId|pendingRites|riteSelectionEnabled)/);

    for (const { path, source } of extensions) {
      if (path !== "deckbuilder/territories.js") {
        expect(source, `${path} reads Territory-owned state directly`).not.toMatch(/state\.(?:territories|territoryPool|selectedTerritoryId|pendingTerritories)/);
      }
      if (path !== "deckbuilder/mystics-rites.js") {
        expect(source, `${path} reads Rite-owned state directly`).not.toMatch(/state\.(?:rites|ritePool|selectedRiteId|pendingRites|riteSelectionEnabled)/);
      }
    }
  });

  it("keeps extension-specific copied Deck lines out of core", () => {
    expect(app).not.toContain("state.territories");
    expect(app).not.toContain("state.territoryPool");
    expect(app).not.toContain("state.rites");
    expect(read("deckbuilder/territories.js")).toContain("function territoryDeckListLines()");
    expect(read("deckbuilder/mystics-rites.js")).toContain("function riteDeckListLines()");
  });

  it("keeps core validation free of extension-specific placeholder warnings", () => {
    expect(app).not.toContain("Territory selection is not yet included");
    expect(read("deckbuilder/territories.js")).not.toContain('startsWith("Territory selection")');
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
    expect(territories).toContain("deckbuilder.registerDeckListHook");
    expect(rites).toContain("deckbuilder.registerDeckListHook");
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
    expect(read("deckbuilder/territories.js")).toContain('deckbuilder.registerFeature("territories"');
    expect(read("deckbuilder/mystics-rites.js")).toContain('deckbuilder.registerFeature("mysticsRites"');
    expect(read("deckbuilder/starter-decks.js")).toContain('deckbuilder.registerFeature("starterDecks"');
    expect(read("deckbuilder/faction-components.js")).toContain('deckbuilder.registerFeature("supplementalPackages"');
  });

  it("uses feature readiness instead of document-body readiness side channels", () => {
    const rites = read("deckbuilder/mystics-rites.js");
    const starters = read("deckbuilder/starter-decks.js");
    const components = read("deckbuilder/faction-components.js");
    const bulk = read("deckbuilder/print-all-starters.js");

    expect(rites).toContain("isReady: () => ritesReady");
    expect(bulk).toContain("ritesApi()?.isReady?.() === true");
    expect(rites).not.toContain("dataset.mysticsRites");
    expect(bulk).not.toContain("dataset.mysticsRites");
    expect(starters).not.toContain("dataset.currentGameCards");
    expect(components).not.toContain("dataset.currentFactionComponents");
  });

  it("keeps starter workflows on extension feature APIs rather than extension-owned state", () => {
    const starters = read("deckbuilder/starter-decks.js");
    const bulk = read("deckbuilder/print-all-starters.js");
    for (const source of [starters, bulk]) {
      expect(source).toContain('deckbuilder.feature("territories")');
      expect(source).toContain('deckbuilder.feature("mysticsRites")');
      expect(source).not.toContain("state.territoryPool");
      expect(source).not.toContain("state.territories");
      expect(source).not.toContain("state.rites");
    }
    expect(starters).toContain("territoriesApi()?.setSelectedIds?.(territoryIds)");
    expect(starters).toContain("ritesApi()?.setSelectedIds?.(starterRiteIds(preset))");
    expect(bulk).toContain("territoriesApi()?.setSelectedIds?.(territories)");
    expect(bulk).toContain("ritesApi()?.setSelectedIds?.(starterRiteIds(preset))");
  });

  it("routes custom and bulk tools through the selected Deckbuilder authority", () => {
    expect(read("deckbuilder/custom-print.mjs")).toContain("await deckbuilder.bootstrap()");
    expect(read("deckbuilder/print-all-starters.js")).toContain("await deckbuilder.bootstrap()");
    expect(read("deckbuilder/print-all-starters.js")).toContain('deckbuilder.feature("printDeck")');
    expect(read("deckbuilder/print-all-starters.js")).not.toContain("window.open =");
    expect(read("deckbuilder/custom-print.mjs")).toContain('deckbuilder.feature("productionPrintRenderer")');
    expect(read("deckbuilder/print-capital-ledger.js")).toContain('deckbuilder.feature("productionPrintRenderer")');
    expect(read("deckbuilder/card-back-preview.js")).toContain('deckbuilder.feature("productionPrintRenderer")');
    expect(read("deckbuilder/territories.js")).toContain("await deckbuilder.bootstrap()");
    expect(read("deckbuilder/mystics-rites.js")).toContain("await deckbuilder.bootstrap()");
  });
});
