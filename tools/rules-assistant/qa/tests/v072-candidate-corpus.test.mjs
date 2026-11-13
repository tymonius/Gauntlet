// Candidate corpus port: production routing remains intentionally unchanged.
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  frozenV072CandidateCurrentGameSource,
  frozenV072CandidateCompleteRulesSource
} from "../../../../legacy/rules-assistant/v072-candidate/frozen-sources.mjs";
import { describe, expect, test } from "vitest";
import {
  V072_CANDIDATE_RULES_VERSION,
  V072_CANDIDATE_FROZEN_COMMIT,
  V072_CANDIDATE_FROZEN_AUTHORITY_SET_ID,
  V072_COMPLETE_RULES_SOURCE_PATH,
  V072_CURRENT_GAME_SOURCE_PATH,
  defaultV072CandidateSourceUrls,
  loadV072CandidateRulesCorpus,
  sanitizeV072CandidateDataForRules,
  validateV072CandidateData,
} from "../../../../rules-assistant/v072-candidate-corpus.js";

const currentGameText = readFileSync(
  new URL("../../../../packages/game-data/current-game.json", import.meta.url),
  "utf8"
);
const completeRulesText = frozenV072CandidateCompleteRulesSource;
const currentGame = JSON.parse(currentGameText);
const candidateGame = JSON.parse(frozenV072CandidateCurrentGameSource);
const frozenCommit = "5f2012690e4574c4f675e3d13db642c6fb1db87f";

function gitBlobSha(text) {
  return createHash("sha1")
    .update(`blob ${Buffer.byteLength(text)}\\0`)
    .update(text)
    .digest("hex");
}

describe("v0.7.2 candidate Rules Arbiter corpus", () => {
  test("matches both frozen Git source blobs and their combined release authority set", () => {
    const freeze = JSON.parse(readFileSync(new URL("../../../../config/v072-release-freeze.json", import.meta.url), "utf8"));
    expect(V072_CANDIDATE_FROZEN_COMMIT).toBe(frozenCommit);
    expect(gitBlobSha(frozenV072CandidateCurrentGameSource)).toBe(freeze.sources.currentGame.gitBlob);
    expect(gitBlobSha(frozenV072CandidateCompleteRulesSource)).toBe(freeze.sources.completeRules.gitBlob);
    const hash = createHash("sha256")
      .update(frozenV072CandidateCurrentGameSource)
      .update(Buffer.from([0]))
      .update(frozenV072CandidateCompleteRulesSource)
      .digest("hex");
    expect(hash).toBe(freeze.authoritySetId);
    expect(V072_CANDIDATE_FROZEN_AUTHORITY_SET_ID).toBe(freeze.authoritySetId);
    expect(candidateGame.version).toBe(V072_CANDIDATE_RULES_VERSION);
    expect(candidateGame.status).toBe("active-development");
    expect(candidateGame.authority).toBe("current-game");
  });

  test("recognizes the prior manually approved replay as a distinct historical source snapshot", () => {
    const replay = JSON.parse(readFileSync(new URL("../evals/rules-arbiter-v072-candidate-regression-replay.json", import.meta.url), "utf8"));
    expect(replay.authoritySetId).toBe("faacd55458ec1595f480798449033a2c8705e018d828ae8034c5fe2b2a6f35b0");
    expect(replay.authoritySetId).not.toBe(V072_CANDIDATE_FROZEN_AUTHORITY_SET_ID);
  });

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

  test("uses immutable historical GitHub source links rather than current-game aliases", () => {
    const root = `https://github.com/tymonius/Gauntlet/blob/${frozenCommit}`;
    expect(defaultV072CandidateSourceUrls("https://gauntlet.run/")).toEqual({
      siteOrigin: "https://gauntlet.run",
      currentGameUrl: `${root}/packages/game-data/current-game.json`,
      completeRulesUrl: `${root}/packages/rules/comprehensive/comprehensive-rules.md`,
      rulebookBrowserUrl: `${root}/packages/rules/comprehensive/comprehensive-rules.md`,
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
    let attemptedFetches = 0;
    const fetchImpl = () => { attemptedFetches += 1; throw new Error("Unexpected moving-source fetch"); };
    const first = await loadV072CandidateRulesCorpus({ fetchImpl });
    const second = await loadV072CandidateRulesCorpus({ fetchImpl });
    expect(attemptedFetches).toBe(0);

    expect(first.version).toBe(V072_CANDIDATE_RULES_VERSION);
    expect(first.candidate).toBe(true);
    expect(first.published).toBe(false);
    expect(first.currentPublicRelease).toBe("v0.7.2");
    expect(first.authoritySetId).toBe(V072_CANDIDATE_FROZEN_AUTHORITY_SET_ID);
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
