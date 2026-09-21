import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  V072_CANDIDATE_RULES_VERSION,
  V072_COMPLETE_RULES_SOURCE_PATH,
  V072_CURRENT_GAME_SOURCE_PATH,
  defaultV072CandidateSourceUrls,
  loadV072CandidateRulesCorpus,
  sanitizeV072CandidateDataForRules,
  validateV072CandidateData,
} from "./v072-candidate-corpus.js";

const currentGameText = readFileSync(
  new URL("../packages/game-data/current-game.json", import.meta.url),
  "utf8"
);
const completeRulesText = readFileSync(
  new URL("../packages/rules/comprehensive/comprehensive-rules.md", import.meta.url),
  "utf8"
);
const currentGame = JSON.parse(currentGameText);

function responseFor(body) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

describe("v0.7.2 candidate Rules Arbiter corpus", () => {
  test("binds to the canonical active-development authority and reviewed Complete Rules", () => {
    expect(validateV072CandidateData({
      currentGame,
      completeRulesMarkdown: completeRulesText,
    })).toBe(true);

    expect(currentGame.authority).toBe("current-game");
    expect(currentGame.version).toBe(V072_CANDIDATE_RULES_VERSION);
    expect(currentGame.status).toBe("active-development");
    expect(completeRulesText).toContain("<!-- RULES-REVIEW-MODE:reviewed-technical -->");
  });

  test("uses the public candidate materialization paths rather than source-only package URLs", () => {
    expect(defaultV072CandidateSourceUrls("https://gauntlet.run/")).toEqual({
      siteOrigin: "https://gauntlet.run",
      currentGameUrl: "https://gauntlet.run/game-data/current-game.json",
      completeRulesUrl: "https://gauntlet.run/rulebook/sources/complete-rules.md",
      rulebookBrowserUrl: "https://gauntlet.run/rulebook/?rules=candidate&doc=complete-rules",
    });
  });

  test("removes duplicate legacy card-face fields when structured effects are authoritative", () => {
    const sanitized = sanitizeV072CandidateDataForRules(currentGame);
    const card = sanitized.gameplay.cards.find(item => item.id === "neutral-advance-guard");
    expect(card.effects).toHaveLength(2);
    expect(card.action).toBeUndefined();
    expect(card.gambit_tactic).toBeUndefined();

    const original = currentGame.gameplay.cards.find(item => item.id === "neutral-advance-guard");
    expect(original.action).toBeTruthy();
    expect(original.gambit_tactic).toBeTruthy();
  });

  test("builds a deterministic candidate corpus with player-facing and canonical source binding", async () => {
    const urls = defaultV072CandidateSourceUrls();
    const fetchImpl = async url => {
      if (url === urls.currentGameUrl) return responseFor(currentGameText);
      if (url === urls.completeRulesUrl) return responseFor(completeRulesText);
      return new Response("not found", { status: 404 });
    };

    const first = await loadV072CandidateRulesCorpus({ fetchImpl });
    const second = await loadV072CandidateRulesCorpus({ fetchImpl });

    expect(first.version).toBe(V072_CANDIDATE_RULES_VERSION);
    expect(first.candidate).toBe(true);
    expect(first.published).toBe(false);
    expect(first.currentPublicRelease).toBe("v0.7.1");
    expect(first.authoritySetId).toMatch(/^[a-f0-9]{64}$/);
    expect(second.authoritySetId).toBe(first.authoritySetId);

    expect(first.documents.length).toBeGreaterThan(150);
    expect(first.documents.some(document =>
      document.kind === "rulebook"
      && document.sourcePath === V072_COMPLETE_RULES_SOURCE_PATH
      && document.sourceUrl.startsWith(urls.rulebookBrowserUrl)
    )).toBe(true);
    expect(first.documents.some(document =>
      document.kind !== "rulebook"
      && document.sourcePath === V072_CURRENT_GAME_SOURCE_PATH
      && document.sourceUrl === urls.currentGameUrl
    )).toBe(true);

    expect(first.byId.has("card:neutral-advance-guard")).toBe(true);
    expect([...first.byId.keys()].some(id => id.startsWith("leader:"))).toBe(true);
    expect([...first.byId.keys()].some(id => id.startsWith("territory:"))).toBe(true);
  });
});
