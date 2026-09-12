import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { BEHAVIOR_REVISION } from "./worker-v071.js";

const workerSource = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");
const corrections = JSON.parse(readFileSync(new URL("./evals/rules-arbiter-evals.v071-corrections.json", import.meta.url), "utf8"));
const wranglerSource = readFileSync(new URL("./wrangler.toml", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../rules-arbiter/app.js", import.meta.url), "utf8");

describe("v0.7.1 Gate 2 r6 regressions", () => {
  test("pins the strengthened multi-phase Feature timing rule", () => {
    expect(BEHAVIOR_REVISION).toBe("v071-qa-20260912-7");
    expect(workerSource).toContain("that requirement constrains which granted Action must satisfy the Feature requirement");
    expect(workerSource).toContain("treat that requirement as constraining which granted Action must be used for the Feature");
    expect(workerSource).toContain("If only one granted phase is legal for the Feature, the Feature must be used in that phase");
  });

  test("corrects the Deed contiguity authority expectation", () => {
    const correction = corrections.cases.find((item) => item.id === "live-deed-contiguity");
    expect(correction).toMatchObject({
      expectedClassification: "inferred",
      classificationBasis: "combined-authority"
    });
    expect(correction.expectedSourcePatterns).toEqual(["Deeds", "Front Line"]);
    expect(correction.expectedSourcePatterns).not.toContain("Buying and buying out Deeds");
  });

  test("catches the Financial Capacity Opening inversion from the full Gate 2 replay", () => {
    const correction = corrections.cases.find((item) => item.id === "financiers-capacity");
    expect(correction.expectedAnswerPatterns).toContain("Denouement");
    expect(correction.forbiddenAnswerPatterns).toContain("lets one of them be your Opening Action");
    expect(correction.forbiddenAnswerPatterns).toContain("Feature as your Opening Action");
  });

  test("keeps public access available without removing abuse caps", () => {
    expect(wranglerSource).toContain("https://www.gauntlet.run");
    expect(wranglerSource).toContain('RULES_MODEL_REQUESTS_PER_IP_HOUR = "24"');
    expect(wranglerSource).toContain('RULES_MODEL_REQUESTS_PER_DAY = "100"');
    expect(wranglerSource).toContain('RULES_MODEL_REQUESTS_PER_MONTH = "500"');
    expect(workerSource).toContain("positiveInteger(env.RULES_MODEL_REQUESTS_PER_IP_HOUR, 24)");
    expect(workerSource).toContain("positiveInteger(env.RULES_MODEL_REQUESTS_PER_DAY, 100)");
    expect(workerSource).toContain("positiveInteger(env.RULES_MODEL_REQUESTS_PER_MONTH, 500)");
  });

  test("does not claim the AI is connected after falling back to source lookup", () => {
    expect(appSource).toContain("AI ruling service unavailable or at capacity; canonical v0.7.1 source lookup remains available.");
    expect(appSource).toContain("if (isFallbackResult(result)) completionStatus = FALLBACK_STATUS;");
    expect(appSource).toContain('path.includes("fallback") || path.includes("source lookup")');
  });
});
