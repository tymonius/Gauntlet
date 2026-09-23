import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const entry = readFileSync(new URL("./worker-entry.js", import.meta.url), "utf8");

describe("published v0.7.2 Rules Arbiter routing", () => {
  test("exposes explicit frozen v0.7.2 routes", () => {
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

  test("routes the unversioned public Chief Justice to frozen v0.7.2", () => {
    const start = entry.indexOf("// The unversioned public Rules Arbiter follows the current canonical release.");
    const end = entry.indexOf("// Withdrawn v0.6.2 remains explicitly addressable", start);
    expect(start).toBeGreaterThanOrEqual(0);
    expect(end).toBeGreaterThan(start);
    const publicRouting = entry.slice(start, end);
    expect(publicRouting).toContain("return v072Worker.fetch(request, env, context);");
    expect(publicRouting).toContain('requestedVersion === "v0.7.1"');
    expect(publicRouting).toContain("return worker.fetch(request, env, context);");
  });

  test("preserves explicit v0.7.1 and mutable candidate compatibility routes", () => {
    expect(entry).toContain("/api/v071/rules");
    expect(entry).toContain("/api/v071/health");
    expect(entry).toContain("/api/v071/corpus-health");
    expect(entry).toContain("/api/v072-candidate/rules");
    expect(entry).toContain("return v072CandidateWorker.fetch(request, env, context);");
  });
});
