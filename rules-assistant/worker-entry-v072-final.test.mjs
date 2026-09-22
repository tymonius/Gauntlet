import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const entry = readFileSync(new URL("./worker-entry.js", import.meta.url), "utf8");

describe("frozen v0.7.2 Rules Arbiter routing", () => {
  test("exposes only explicit final-release v0.7.2 routes before cutover", () => {
    expect(entry).toContain('import v072Worker from "./worker-v072.js";');
    for (const path of [
      "/api/v072/rules",
      "/v072/rules",
      "/api/v072/health",
      "/v072/health",
      "/api/v072/corpus-health",
      "/v072/corpus-health",
    ]) {
      expect(entry, path).toContain(path);
    }
  });

  test("keeps the unversioned public Chief Justice on v0.7.1 until final certification", () => {
    const start = entry.indexOf("// The unversioned public Rules Arbiter follows the current canonical release.");
    const end = entry.indexOf("// Withdrawn v0.6.2 remains explicitly addressable", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const publicRouting = entry.slice(start, end);
    expect(publicRouting).toContain("return worker.fetch(request, env, context);");
    expect(publicRouting).not.toContain("v072Worker");
  });

  test("preserves the mutable candidate comparison routes separately", () => {
    expect(entry).toContain("/api/v072-candidate/rules");
    expect(entry).toContain("return v072CandidateWorker.fetch(request, env, context);");
  });
});
