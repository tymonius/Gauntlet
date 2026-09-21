import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const benchmark = JSON.parse(readFileSync(
  new URL("./evals/rules-arbiter-v072-candidate-regression-replay.json", import.meta.url),
  "utf8"
));
const clarification = JSON.parse(readFileSync(
  new URL("./evals/rules-arbiter-v072-candidate-clarification-replay.json", import.meta.url),
  "utf8"
));
const workflow = readFileSync(
  new URL("../.github/workflows/v072-candidate-rules-arbiter-regression-replay.yml", import.meta.url),
  "utf8"
);

describe("v0.7.2 candidate live regression replay freeze", () => {
  test("pins the exact deployed candidate identity", () => {
    expect(benchmark.rulesVersion).toBe("v0.7.2-candidate");
    expect(benchmark.behaviorRevision).toBe("v072-qa-20260921-01");
    expect(benchmark.authoritySetId).toBe("faacd55458ec1595f480798449033a2c8705e018d828ae8034c5fe2b2a6f35b0");
    expect(benchmark.gradingMode).toBe("semantic-v1");
    expect(clarification.rulesVersion).toBe(benchmark.rulesVersion);
    expect(clarification.behaviorRevision).toBe(benchmark.behaviorRevision);
    expect(clarification.authoritySetId).toBe(benchmark.authoritySetId);
  });

  test("replays final canaries plus the material historical failure modes", () => {
    expect(benchmark.cases).toHaveLength(33);
    expect(clarification.cases).toHaveLength(5);
    const ids = new Set(benchmark.cases.map(item => item.id));
    for (const id of [
      "blind-u-denouement-after-hold",
      "blind-u-player-mission-delay",
      "v072-regression-tiebreak-polarity",
      "v072-regression-retribution-activation",
      "v072-regression-demilitarized-zone-replacement",
      "v072-regression-strategic-withdrawal-polarity",
      "v072-regression-actuarial-alchemy-tiebreak",
    ]) {
      expect(ids.has(id), id).toBe(true);
    }
  });

  test("gates semantic rulings and ambiguity behavior without cutting over public v0.7.1", () => {
    expect(workflow).toContain("GAUNTLET_RULES_QA_SEMANTIC_ONLY: \"true\"");
    expect(workflow).toContain("/api/v072-candidate/rules");
    expect(workflow).toContain('health?.currentPublicRelease !== "v0.7.1"');
    expect(workflow).toContain("published !== false");
    expect(workflow).toContain("steps.semantic.outcome != 'success' || steps.clarification.outcome != 'success'");
  });

  test("automatic paid replay is one-shot and tied to its explicit authorization marker", () => {
    expect(workflow).toContain('.github/qa-triggers/v072-candidate-regression-20260921.txt');
    expect(workflow).not.toContain("pull_request:");
  });
});
