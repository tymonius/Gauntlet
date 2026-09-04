import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./worker-entry.js", import.meta.url), "utf8");

describe("Rules Arbiter corpus-health routing", () => {
  it("forwards current corpus-health routes unchanged to the v0.7.1 worker", () => {
    const corpusRoute = source.match(/request\.method === "GET"[\s\S]*?return worker\.fetch\(request, env, context\);/m)?.[0] || "";

    for (const route of [
      "/corpus-health",
      "/api/corpus-health",
      "/v071/corpus-health",
      "/api/v071/corpus-health"
    ]) {
      expect(corpusRoute).toContain(route);
    }

    expect(corpusRoute).toMatch(/return worker\.fetch\(request, env, context\);/);
    expect(corpusRoute).not.toMatch(/rewriteVersionedPath\(request\)/);
  });

  it("routes corpus-health before the generic v0.7.1 versioned rewrite", () => {
    const corpusIndex = source.indexOf('"/api/v071/corpus-health"');
    const versionedRewriteIndex = source.indexOf('url.pathname === "/api/v071/rules"');

    expect(corpusIndex).toBeGreaterThanOrEqual(0);
    expect(versionedRewriteIndex).toBeGreaterThanOrEqual(0);
    expect(corpusIndex).toBeLessThan(versionedRewriteIndex);
  });
});
