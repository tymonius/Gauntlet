import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./worker-entry.js", import.meta.url), "utf8");

describe("Rules Arbiter semantic QA routing", () => {
  it("routes the dedicated semantic evaluator before public rules dispatch", () => {
    const semanticImport = source.indexOf('import { handleQaSemanticEvaluation } from "./qa-semantic-evaluator.js";');
    const semanticRoute = source.indexOf('url.pathname === "/api/qa/semantic-evaluate"');
    const publicRulesRoute = source.indexOf('url.pathname === "/api/rules"');

    expect(semanticImport).toBeGreaterThanOrEqual(0);
    expect(semanticRoute).toBeGreaterThanOrEqual(0);
    expect(publicRulesRoute).toBeGreaterThanOrEqual(0);
    expect(semanticRoute).toBeLessThan(publicRulesRoute);
    expect(source.slice(semanticRoute, publicRulesRoute)).toContain("handleQaSemanticEvaluation(request, env)");
  });
});
