import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { augmentRetrievalForContext, BEHAVIOR_REVISION } from "./worker-v071.js";
import { classifyTransportInfrastructure } from "../scripts/v071-live-rules-qa-support.mjs";

const workerSource = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");
const runnerSource = readFileSync(new URL("../scripts/run-v071-live-rules-qa.mjs", import.meta.url), "utf8");
const workflowSource = readFileSync(new URL("../.github/workflows/current-rules-arbiter-live-qa.yml", import.meta.url), "utf8");
const corrections = JSON.parse(readFileSync(new URL("./evals/rules-arbiter-evals.v071-corrections.json", import.meta.url), "utf8"));

describe("v0.7.1 Gate 2 live replay regressions", () => {
  test("pins the refined classification boundary", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260911-5");
    expect(workerSource).toContain("Multiple citations alone do not make an answer inferred.");
    expect(workerSource).toContain("Procedural compilation is not inference");
    expect(workerSource).toContain("a no-contiguity ruling is inferred, not explicit");
    expect(workerSource).toContain("absence of adjacency, contiguity, restrictions, permissions, or requirements");
    expect(workerSource).toContain("state the baseline restriction that the exception changes as well as the exception itself");
    expect(workerSource).toContain("A generic additional-Action permission does not make that direct timing restriction inferred.");
    expect(workerSource).toContain("Satisfy the requirement in a phase where the Feature is already legal unless the text expressly changes its timing.");
    expect(workerSource).toContain("Never treat an extra-Action grant as permission to use a phase-limited Feature in a different phase.");
  });

  test("adds specific-over-general authority for named-card conflicts", () => {
    const corpus = {
      documents: [
        { id: "card:test-buyout", title: "Card: Leveraged Buyout", heading: "Leveraged Buyout", kind: "card", sourcePath: "cards.json", sourceUrl: "https://example.test/cards", body: "Battle collateral goes to the Graveyard when battle cards are cleared." },
        { id: "rulebook:golden-rules", title: "Golden Rules", heading: "Golden Rules", kind: "rulebook", sourcePath: "rules.md", sourceUrl: "https://example.test/rules", body: "When rules conflict, follow the more specific one." },
        { id: "rulebook:collateral", title: "Collateral", heading: "Collateral", kind: "rulebook", sourcePath: "rules.md", sourceUrl: "https://example.test/rules", body: "Leveraged Buyout collateral used from battle goes to the Graveyard after the purchase." }
      ]
    };
    const retrieval = [
      { id: "S1", canonicalId: "card:test-buyout", title: "Card: Leveraged Buyout", heading: "Leveraged Buyout", excerpt: "Battle collateral goes to the Graveyard when battle cards are cleared." },
      { id: "S2", canonicalId: "rulebook:collateral", title: "Collateral", heading: "Collateral", excerpt: "Leveraged Buyout collateral used from battle goes to the Graveyard after the purchase." }
    ];
    const augmented = augmentRetrievalForContext(corpus, "How does Leveraged Buyout work?", [], retrieval);
    expect(augmented.slice(0, 3).map((source) => source.canonicalId)).toEqual([
      "card:test-buyout",
      "rulebook:collateral",
      "rulebook:golden-rules"
    ]);
    expect(workerSource).toContain("cite the printed card, the conflicting rulebook authority, and the Golden Rules");

    const discardCorrection = corrections.cases.find((item) => item.id === "core-zone-discard");
    expect(discardCorrection).toMatchObject({
      expectedClassification: "explicit",
      classificationBasis: "direct-authority",
      expectedAnswerPatterns: ["Discard Pile"]
    });

    const capacityCorrection = corrections.cases.find((item) => item.id === "financiers-capacity");
    expect(capacityCorrection.expectedAnswerPatterns).toEqual(["Denouement"]);
    expect(capacityCorrection.forbiddenAnswerPatterns).toContain("Feature in Opening");
    expect(capacityCorrection.forbiddenAnswerPatterns).toContain("permits one of them in Opening");

    const correction = corrections.cases.find((item) => item.id === "card-leveraged-buyout");
    expect(correction).toMatchObject({
      expectedClassification: "inferred",
      classificationBasis: "combined-authority"
    });
    expect(correction.expectedSourcePatterns).toContain("Golden Rules");
    expect(correction.expectedAnswerPatterns).toContain("battle cards are cleared");
  });

  test("treats Worker 5xx failures as infrastructure and gives resource-limit failures a real cooldown", () => {
    const failure = classifyTransportInfrastructure(
      503,
      "<html>Error code: 1102 Worker exceeded resource limits</html>",
      null
    );
    expect(failure).toContain("infrastructure: production endpoint HTTP 503");
    expect(failure).toContain("Cloudflare error 1102");
    expect(classifyTransportInfrastructure(429, "rate limited", null)).toBeNull();
    expect(runnerSource).toContain("const attemptsUsed = Math.min(attempts, maxAttempts);");
    expect(runnerSource).toContain("attempts: attemptsUsed");
    expect(runnerSource).toContain("workerResourceLimitBackoffMs = [15_000, 30_000, 60_000]");
    expect(runnerSource).toContain("isWorkerResourceLimitFailure(last)");
    expect(runnerSource).toContain("const delayMs = retryDelayMs(last, attempts);");
    expect(runnerSource).toContain("status != null && status >= 500 ? 3000 * attempt");
    expect(workflowSource).toContain("GAUNTLET_RULES_QA_MAX_ATTEMPTS: '4'");
  });

  test("does not expose retrieval-coverage language in rulings", () => {
    expect(workerSource).toContain("available passage");
    expect(runnerSource).toContain("available passages?");
    expect(runnerSource).toContain("retrieved sources?");
  });
});
