// Candidate corpus port: production routing remains intentionally unchanged.
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
const candidateGame = {
  ...currentGame,
  version: V072_CANDIDATE_RULES_VERSION,
  displayVersion: V072_CANDIDATE_RULES_VERSION,
  status: "active-development",
};
const candidateGameText = JSON.stringify(candidateGame);

function responseFor(body) {
  return new Response(body, {
    status: 200,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

describe("v0.7.2 candidate Rules Arbiter corpus", () => {
  test("validates candidate identity without requiring the live authority to remain a candidate", () => {
    expect(() => validateV072CandidateData({
      currentGame,
      completeRulesMarkdown: completeRulesText,
    })).toThrow(/wrong identity or status/);

    expect(validateV072CandidateData({
      currentGame: candidateGame,
      completeRulesMarkdown: completeRulesText,
    })).toBe(true);

    expect(candidateGame.authority).toBe("current-game");
    expect(candidateGame.version).toBe(V072_CANDIDATE_RULES_VERSION);
    expect(candidateGame.status).toBe("active-development");
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
    const sanitized = sanitizeV072CandidateDataForRules(candidateGame);
    const card = sanitized.gameplay.cards.find(item => item.id === "neutral-advance-guard");
    expect(card.effects).toHaveLength(2);
    expect(card.action).toBeUndefined();
    expect(card.gambit_tactic).toBeUndefined();

    const original = candidateGame.gameplay.cards.find(item => item.id === "neutral-advance-guard");
    expect(original.action).toBeTruthy();
    expect(original.gambit_tactic).toBeTruthy();
  });

  test("builds a deterministic candidate corpus with player-facing and canonical source binding", async () => {
    const urls = defaultV072CandidateSourceUrls();
    const fetchImpl = async url => {
      if (url === urls.currentGameUrl) return responseFor(candidateGameText);
      if (url === urls.completeRulesUrl) return responseFor(completeRulesText);
      return new Response("not found", { status: 404 });
    };

    const first = await loadV072CandidateRulesCorpus({ fetchImpl });
    const second = await loadV072CandidateRulesCorpus({ fetchImpl });

    expect(first.version).toBe(V072_CANDIDATE_RULES_VERSION);
    expect(first.candidate).toBe(true);
    expect(first.published).toBe(false);
    expect(first.currentPublicRelease).toBe("v0.7.2");
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
