import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const entry = readFileSync(new URL("./worker-entry.js", import.meta.url), "utf8");
const candidate = readFileSync(new URL("./worker-v072-candidate.js", import.meta.url), "utf8");

describe("v0.7.2 candidate Rules Arbiter routing", () => {
  test("exposes explicit candidate rules, health, and corpus-health routes", () => {
    expect(entry).toContain('import v072CandidateWorker from "./worker-v072-candidate.js";');
    for (const path of [
      "/api/v072-candidate/rules",
      "/v072-candidate/rules",
      "/api/v072-candidate/health",
      "/v072-candidate/health",
      "/api/v072-candidate/corpus-health",
      "/v072-candidate/corpus-health",
    ]) {
      expect(entry, path).toContain(path);
    }
  });

  test("keeps the unversioned public Chief Justice on the current v0.7.1 Worker", () => {
    const start = entry.indexOf("// The unversioned public Rules Arbiter follows the current canonical release.");
    const end = entry.indexOf("// Withdrawn v0.6.2 remains explicitly addressable", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const publicRouting = entry.slice(start, end);
    expect(publicRouting).toContain('return worker.fetch(request, env, context);');
    expect(publicRouting).not.toContain("v072CandidateWorker");
  });

  test("candidate Worker recognizes only the candidate version identity", () => {
    expect(candidate).toContain('export const RULES_VERSION = V072_CANDIDATE_RULES_VERSION;');
    expect(candidate).toContain('"/api/v072-candidate/rules"');
    expect(candidate).toContain('"/api/v072-candidate/health"');
    expect(candidate).toContain('"/api/v072-candidate/corpus-health"');
  });
});
