import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const EXPECTED_CHOICES = [
  ["military", "general"],
  ["military", "commandant"],
  ["diplomats", "ambassador"],
  ["diplomats", "senator"],
  ["financiers", "banker"],
  ["financiers", "executive"],
  ["intelligence", "ranger"],
  ["intelligence", "spymaster"],
  ["mystics", "alchemist"],
  ["mystics", "spirit-walker"],
  ["inquisition", "grand-inquisitor"],
  ["inquisition", "witch-hunter"]
] as const;

describe("standalone new-player onboarding", () => {
  it("provides a public five-step path with no event-session dependency", () => {
    const html = read("start/index.html");
    const app = read("start/app.js");

    expect(html).toContain("Your first game");
    expect(html).toContain("Step 1 · Know the goal");
    expect(html).toContain("Step 2 · Choose a side");
    expect(html).toContain("Step 3 · Learn to play");
    expect(html).toContain("Step 4 · Learn your faction");
    expect(html).toContain("Step 5 · Play");
    expect(html).toContain('id="learnFaction"');
    expect(html).toContain('id="factionLesson"');
    expect(html.match(/name=\"faction\"/g)).toHaveLength(6);

    expect(html).not.toContain("displayName");
    expect(html).not.toContain("sessionLabel");
    expect(app).not.toContain("GAUNTLET_PLAYTEST_SESSION_ENDPOINT");
    expect(app).not.toContain("/api/sessions");
  });

  it("offers every canonical faction and Leader starter pair", () => {
    const app = read("start/app.js");
    const authority = JSON.parse(read("game-data/current-game.json"));
    const available = new Set(authority.starterDecks.decks.map((deck: { factionId: string; leaderId: string }) => `${deck.factionId}/${deck.leaderId}`));

    expect(app).toContain('fetch("../game-data/current-game.json"');
    expect(app).toContain('currentAuthority?.starterDecks');
    expect(app).not.toContain('fetch("../deckbuilder/starter-decks.json"');

    for (const [faction, leader] of EXPECTED_CHOICES) {
      expect(app).toContain(`${faction}:`);
      expect(app).toContain(`id: "${leader}"`);
      expect(available.has(`${faction}/${leader}`)).toBe(true);
    }
  });

  it("keeps starter Deck selection simple and provides Leader-specific first-game guidance", () => {
    const app = read("start/app.js");

    expect(app).not.toContain("starter-first-game-tips.json");
    expect(app).toContain("Gauntlet players can build their own Decks from a large pool of cards.");
    expect(app).toContain("this recommended Deck is already built for your chosen Leader");
    expect(app.match(/firstGame:\s*\[/g)).toHaveLength(EXPECTED_CHOICES.length);
    expect(app).toContain("leader.firstGame.map");

    for (const [, leader] of EXPECTED_CHOICES) {
      expect(app).toContain(`id: "${leader}"`);
    }
  });

  it("keeps faction lessons conceptual and distinguishes shared from alternate victories", () => {
    const html = read("start/index.html");
    const app = read("start/app.js");
    const css = read("start/styles.css");

    expect(html).toContain("How it fits into Gauntlet");
    expect(html).toContain("Your ways to win");
    expect(html).toContain('<ul id="factionLessonSteps"></ul>');
    expect(app.match(/fit:\s*\[/g)).toHaveLength(6);
    expect(app.match(/victory:\s*\{/g)).toHaveLength(6);
    expect(app).toContain("Shared victory");
    expect(app).toContain("Alternate victory");
    expect(app).not.toContain("battle involving you");
    expect(css).toContain("#learn .intro-grid>.intro-card:last-child:nth-child(odd){grid-column:1/-1}");
    expect(css).toContain("[hidden]{display:none!important}");
    expect(css).toContain(".faction-lesson-hero::after");
  });

  it("shows recommended Rite order for each Mystics starter alongside its existing setup guidance", () => {
    const starter = read("deckbuilder/starter-decks.js");
    const authority = JSON.parse(read("game-data/current-game.json"));
    const mystics = authority.starterDecks.decks.filter((deck: any) => deck.factionId === "mystics");

    expect(starter).toContain("Recommended Rite order");
    expect(starter).toContain("recommendedRiteNames(preset)");
    expect(starter).toContain("starter-print-rites");
    expect(mystics).toHaveLength(2);

    for (const deck of mystics) {
      expect(deck.selectedRites).toHaveLength(3);
      expect(deck.recommendedRiteOrder).toHaveLength(3);
      expect([...deck.recommendedRiteOrder].sort()).toEqual([...deck.selectedRites].sort());
    }
  });

  it("hands the exact choice to guided Deckbuilder print mode", () => {
    const app = read("start/app.js");
    const handoff = read("deckbuilder/starter-handoff.js");
    const starter = read("deckbuilder/starter-decks.js");
    const deckbuilder = read("deckbuilder/index.html");

    expect(app).toContain('url.searchParams.set("faction", state.factionId)');
    expect(app).toContain('url.searchParams.set("leader", state.leaderId)');
    expect(app).toContain('url.searchParams.set("starter", "1")');

    expect(starter).toContain("loadSelectedDeck: loadRecommendedDeck");
    expect(starter).toContain("isReady: starterDeckReady");
    expect(handoff).toContain('params.get("starter") !== "1"');
    expect(handoff).toContain("api.loadSelectedDeck");
    expect(handoff).toContain("api.getMatchingCurrentDeck");
    expect(handoff).toContain('document.getElementById("printDeckButton")');
    expect(handoff).toContain('document.getElementById("printCardBacks")');

    expect(deckbuilder).toContain("starter-handoff.css?v=");
    expect(deckbuilder).toContain("starter-handoff.js?v=");
    expect(deckbuilder.indexOf("starter-decks.js")).toBeLessThan(deckbuilder.indexOf("starter-handoff.js"));
  });

  it("keeps the current v0.7.1 start path as the homepage first-time call to action", () => {
    const homepage = read("index.html");
    expect(homepage).toContain('<a href="/start/">Start</a>');
    expect(homepage).toContain('<a class="button primary" href="start/">Start playing</a>');
    expect(homepage).toContain("Current canonical playtest edition · v0.7.1");
    expect(homepage).toContain("New-player setup");
    expect(homepage).toContain("Choose your first side");
    expect(homepage).not.toContain('href="v0.6.2/start/"');
  });

  it("keeps the choice resumable without storing credentials or identity", () => {
    const app = read("start/app.js");
    expect(app).toContain("gauntlet_standalone_onboarding_v1");
    expect(app).toContain("localStorage.setItem");
    expect(app).not.toContain("password");
    expect(app).not.toContain("displayName");
    expect(app).not.toContain("participantId");
  });
});
