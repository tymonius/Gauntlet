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
  it("provides a public four-step path with no event-session dependency", () => {
    const html = read("start/index.html");
    const app = read("start/app.js");

    expect(html).toContain("Your first game");
    expect(html).toContain("Step 1 · Understand");
    expect(html).toContain("Step 2 · Choose");
    expect(html).toContain("Step 3 · Learn");
    expect(html).toContain("Step 4 · Print");
    expect(html.match(/class=\"intro-card/g)).toHaveLength(9);
    expect(html.match(/name=\"faction\"/g)).toHaveLength(6);

    expect(html).not.toContain("displayName");
    expect(html).not.toContain("sessionLabel");
    expect(app).not.toContain("GAUNTLET_PLAYTEST_SESSION_ENDPOINT");
    expect(app).not.toContain("/api/sessions");
  });

  it("offers every canonical faction and Leader starter pair", () => {
    const app = read("start/app.js");
    const catalog = JSON.parse(read("deckbuilder/starter-decks.json"));
    const available = new Set(
      catalog.decks.map((deck: { factionId: string; leaderId: string }) => `${deck.factionId}/${deck.leaderId}`)
    );

    for (const [faction, leader] of EXPECTED_CHOICES) {
      expect(app).toContain(`${faction}:`);
      expect(app).toContain(`id: "${leader}"`);
      expect(available.has(`${faction}/${leader}`)).toBe(true);
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

  it("makes the published v0.6.3 start path the homepage first-time call to action", () => {
    const homepage = read("index.html");
    expect(homepage).toContain('<a href="v0.6.3/start/">Start</a>');
    expect(homepage).toContain('<a class="button primary" href="v0.6.3/start/">Start playing</a>');
    expect(homepage).toContain("New-player setup");
    expect(homepage).toContain("Choose your first deck");
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
