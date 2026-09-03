import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");
const current = JSON.parse(read("game-data/current-game.json"));
const construction = current.gameplay.deck_construction;
const app = read("deckbuilder/app.js");
const territories = read("deckbuilder/territories.js");
const print = read("deckbuilder/print.js");
const printRequest = read("deckbuilder/print-request.js");
const starters = read("deckbuilder/starter-decks.js");
const html = read("deckbuilder/index.html");
const currentRuntime = read("game-data/current-game.mjs");
const ruleset = read("game-data/ruleset.mjs");

describe("Deckbuilder construction authority", () => {
  it("preserves the current v0.7.1 construction contract", () => {
    expect(construction).toMatchObject({
      minimum_cards: 30,
      maximum_deckbuilding_value: 60,
      territories_per_player: 3,
      maximum_arenas: 1,
    });
  });

  it("exposes normalized selected-ruleset construction limits through the core API", () => {
    expect(currentRuntime).toContain("deckConstruction: Object.freeze(clone(gameplay.deck_construction || {}))");
    expect(ruleset).toContain("deckConstruction: Object.freeze(clone(gameplay.deck_construction || {}))");
    expect(app).toContain("function constructionRules()");
    expect(app).toContain("source.minimum_cards ?? source.minimumCards");
    expect(app).toContain("source.maximum_deckbuilding_value ?? source.maximumDeckbuildingValue");
    expect(app).toContain("source.territories_per_player ?? source.territoriesPerPlayer");
    expect(app).toContain("source.maximum_arenas ?? source.maximumArenas");
    expect(app).toContain("constructionRules,");
  });

  it("validates playable cards and value against authority instead of literals", () => {
    expect(app).toContain("cardCount < rules.minimumCards");
    expect(app).toContain("pointTotal > rules.maximumDeckbuildingValue");
    expect(app).toContain("constructionRules: rules");
    expect(app).not.toContain("cardCount < 30");
    expect(app).not.toContain("pointTotal > 60");
    expect(app).not.toContain("/60 value");
  });

  it("uses player-facing Deck status labels with Incomplete reserved for a short main deck", () => {
    expect(app).toContain("function deckStatusLabel(result)");
    expect(app).toContain('result.cardCount < result.constructionRules.minimumCards');
    expect(app).toContain('return "Incomplete"');
    expect(app).toContain('return result.valid ? "Valid" : "Invalid"');
    expect(app).not.toContain('"Card-valid"');
  });

  it("allows empty Territory resets before construction authority is available", () => {
    expect(territories).toContain("const entries = items || []");
    expect(territories).toContain("if (!entries.length) return []");
  });

  it("keeps Territory count and Arena limits under Territory extension ownership", () => {
    expect(territories).toContain("constructionRules().territoriesPerPlayer");
    expect(territories).toContain("rules.maximumArenas");
    expect(territories).toContain("rules.territoriesPerPlayer");
    expect(territories).not.toContain("REQUIRED_TERRITORIES");
    expect(territories).not.toContain("MAX_ARENAS");
  });

  it("threads construction authority through player-visible Deckbuilder summaries", () => {
    expect(html).toContain('id="minimumCardCount"');
    expect(html).toContain('id="maximumDeckbuildingValue"');
    expect(html).toContain('id="territoryRequiredCount"');
    expect(html).not.toContain('<span id="cardCount">0</span> / 30+');
    expect(html).not.toContain('<span id="pointTotal">0</span> / 60');
    expect(html).not.toContain('<span id="territoryMetricCount">0</span> / 3');

    expect(print).toContain("data.constructionRules.minimumCards");
    expect(print).toContain("data.constructionRules.maximumDeckbuildingValue");
    expect(print).toContain("data.constructionRules.territoriesPerPlayer");
    expect(printRequest).toContain("validation.constructionRules.maximumDeckbuildingValue");
    expect(starters).toContain("rules.minimumCards");
    expect(starters).toContain("rules.maximumDeckbuildingValue");
  });
});
