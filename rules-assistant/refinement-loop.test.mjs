import { describe, expect, test } from "vitest";
import {
  deriveConversationQueryFocus,
  retrieveRules
} from "./local-search.js";
import { ADMIN_PAGE_WITH_RULES_INTELLIGENCE } from "./admin-intelligence-page.js";
import { mergeRegressionCandidates } from "../scripts/ingest-rules-regression-candidates.mjs";

function syntheticCorpus() {
  const documents = [
    {
      id: "rulebook:battle-card-destinations",
      kind: "rulebook",
      title: "Battle card destinations",
      heading: "Clearing battle cards",
      body: "Gambits go to their owners' Graveyards. Tactics go to their owners' Discard Piles."
    },
    {
      id: "rulebook:battle-card-roles",
      kind: "rulebook",
      title: "Battle card roles",
      heading: "Gambit and Tactic roles",
      body: "Gambit and Tactic are separate battle-card roles used during a battle."
    },
    {
      id: "rulebook:territory-control",
      kind: "rulebook",
      title: "Territory control",
      heading: "Territory control",
      body: "Territory control and the Front Line determine capture."
    }
  ].map((document) => ({
    ...document,
    sourcePath: "Rulebook.md",
    sourceUrl: "https://gauntlet.run/rulebook/",
    searchText: `${document.title} ${document.heading} ${document.body}`.toLowerCase()
  }));
  return { version: "v0.7.1", documents };
}

describe("Rules Arbiter refinement loop", () => {
  test("recent conversational clauses become retrieval focus for terse follow-ups", () => {
    const query = [
      "Earlier we were discussing Territory control and the Front Line.",
      "A Gambit is set from Hand.",
      "A Tactic is chosen from Reserve.",
      "Their normal destinations differ.",
      "Which are??"
    ].join(" ");

    const focus = deriveConversationQueryFocus(query);
    expect(focus.contextual).toBe(true);
    expect(focus.tokens).toContain("destinations");
    expect(focus.tokens).toContain("tactic");

    const results = retrieveRules(syntheticCorpus(), query, { limit: 3 });
    expect(results[0].canonicalId).toBe("rulebook:battle-card-destinations");
  });

  test("conversation focus is generic rather than Gambit/Tactic-specific", () => {
    const focus = deriveConversationQueryFocus(
      "There are three victory paths: capture, Last Stand, and Peace Treaty. Which are?"
    );
    expect(focus.tokens).toEqual(expect.arrayContaining(["victory", "capture", "last", "stand", "peace", "treaty"]));
  });

  test("review exports carry privacy-safe conversation context", () => {
    expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("conversationContext:conversationContextFor");
    expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("Use conversationContext when present to resolve terse follow-ups");
    expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("privacy-safe preceding conversation content");
    expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).not.toContain("conversationContext:{sessionId");
  });

  test("imported regression candidates automatically produce a downloadable fixture bundle", () => {
    expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("gauntlet.rules-regression-candidates.v1");
    expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("if(rec.regressionCandidate)regressionCandidates.push");
    expect(ADMIN_PAGE_WITH_RULES_INTELLIGENCE).toContain("Downloaded '+regressionCandidates.length+' regression candidate");
  });

  test("generated candidates ingest into the deterministic v0.7.1 benchmark", () => {
    const benchmark = {
      schema: "gauntlet.rules-arbiter-evals.v2",
      rulesVersion: "v0.7.1",
      cases: []
    };
    const bundle = {
      schema: "gauntlet.rules-regression-candidates.v1",
      candidates: [
        {
          interactionId: "11111111-1111-4111-8111-111111111111",
          fixtureReadiness: { ready: true, missing: [] },
          suggestedFixture: {
            id: "review-11111111",
            category: "conversation",
            question: "Which are?",
            expectedClassification: "explicit",
            expectedSourcePatterns: ["rulebook:how-to-win"],
            interactionId: "11111111-1111-4111-8111-111111111111",
            origin: "review-audit-regression-candidate",
            history: [
              { role: "user", content: "What are the ways to win?" },
              { role: "assistant", content: "There are several victory paths.", rulingStatus: "explicit" }
            ]
          }
        }
      ]
    };

    const result = mergeRegressionCandidates(benchmark, bundle);
    expect(result.added).toHaveLength(1);
    expect(result.manual).toHaveLength(0);
    expect(result.benchmark.cases[0]).toMatchObject({
      id: "review-11111111",
      category: "conversation",
      expectedClassification: "explicit",
      interactionId: "11111111-1111-4111-8111-111111111111"
    });
    expect(result.benchmark.cases[0].history).toHaveLength(2);
  });

  test("candidate ingest refuses to invent missing regression authority", () => {
    const benchmark = {
      schema: "gauntlet.rules-arbiter-evals.v2",
      rulesVersion: "v0.7.1",
      cases: []
    };
    const bundle = {
      schema: "gauntlet.rules-regression-candidates.v1",
      candidates: [
        {
          interactionId: "22222222-2222-4222-8222-222222222222",
          fixtureReadiness: { ready: false, missing: ["governing source IDs"] },
          suggestedFixture: null
        }
      ]
    };

    const result = mergeRegressionCandidates(benchmark, bundle);
    expect(result.added).toHaveLength(0);
    expect(result.manual).toEqual([
      {
        interactionId: "22222222-2222-4222-8222-222222222222",
        reason: "governing source IDs"
      }
    ]);
  });
});
