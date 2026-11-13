import { existsSync, readFileSync } from "node:fs";
import { posix } from "node:path";
import { describe, expect, it } from "vitest";

const DEPLOYED_ENTRYPOINT = "rules-assistant/admin-refinement-worker.js";
const WORKER_RUNTIME_ROOT = "rules-assistant/";
const read = (path) => readFileSync(path, "utf8");

function rootRuntimeImports(path) {
  const source = read(path);
  const imports = [];
  // Include multiline static imports and exact export-forwarding shims.
  for (const match of source.matchAll(/^\s*(?:import|export)\s+[^;]*?\bfrom\s+["']([^"']+)["']/gm)) {
    const target = match[1];
    if (!target.startsWith(".")) continue;
    const resolved = posix.normalize(posix.join(posix.dirname(path), target));
    if (resolved.startsWith(WORKER_RUNTIME_ROOT) && resolved.endsWith(".js")) {
      expect(existsSync(resolved), `${path} imports missing ${resolved}`).toBe(true);
      imports.push(resolved);
    }
  }
  return imports;
}

function reachableRootRuntimeModules() {
  const pending = [DEPLOYED_ENTRYPOINT];
  const seen = new Set();
  while (pending.length) {
    const path = pending.pop();
    if (seen.has(path)) continue;
    seen.add(path);
    pending.push(...rootRuntimeImports(path).filter((dependency) => !seen.has(dependency)));
  }
  return seen;
}

describe("deployed Rules Arbiter root-runtime source coverage", () => {
  it("traces the real Worker entry through both compatibility fallback branches", () => {
    const files = reachableRootRuntimeModules();
    for (const path of [
      "rules-assistant/worker-entry.js",
      "rules-assistant/worker-v072.js",
      "rules-assistant/worker-v072-candidate.js",
      "rules-assistant/smart-worker.js",
      "rules-assistant/reliable-worker.js",
      "rules-assistant/local-search.js",
      "rules-assistant/rules-intelligence.js",
      "rules-assistant/rules-openai.js",
      "rules-assistant/rules-history.js",
      "rules-assistant/rules-persistence.js",
      "rules-assistant/rules-plan-enrichment.js",
      "rules-assistant/rules-status.js",
      "rules-assistant/rules-packets.js",
      "rules-assistant/rules-deterministic.js",
      "rules-assistant/source-lookup-review.js",
      "rules-assistant/github-actions-qa-auth.js",
      "rules-assistant/qa-semantic-evaluator.js"
    ]) {
      expect(files.has(path), `${path} must remain traceable from deployed entrypoint`).toBe(true);
    }
    expect(read("rules-assistant/worker-entry.js")).toContain('import smartWorker from "./smart-worker.js"');
    expect(read("rules-assistant/worker-entry.js")).toContain('import reliableWorker from "./reliable-worker.js"');
  });

  it("watches every root .js dependency in both independent production workflows", () => {
    const deploy = read(".github/workflows/deploy-rules-arbiter.yml");
    const live = read(".github/workflows/verify-current-live-publication.yml");
    const reachable = reachableRootRuntimeModules();
    expect(deploy).toMatch(/^\s+- "rules-assistant\/\*\.js"$/m);
    expect(deploy).toMatch(/^\s+- "legacy\/rules-assistant\/v071\/\*\*"$/m);
    expect(live).toContain("rules-assistant/*.js|");
    expect(live).toContain("      - 'rules-assistant/**'");
    expect(live).toContain("reason=worker_inputs_changed");
    // Root-JavaScript scoping covers new shared helpers without listing each name.
    for (const path of reachable) {
      expect(path).toMatch(/^rules-assistant\/[^/]+\.js$/);
    }
  });

  it("syntax-checks root modules and runs this regression before deploying", () => {
    const deploy = read(".github/workflows/deploy-rules-arbiter.yml");
    expect(deploy).toContain("for runtime_source in rules-assistant/*.js; do");
    expect(deploy).toContain('node --check "$runtime_source"');
    expect(deploy).toContain("tools/rules-assistant/qa/tests/worker-runtime-trigger-coverage.test.mjs");
    expect(deploy).toContain("Verify production health");
    expect(deploy).toContain("Verify v0.7.2 candidate health and corpus");
    expect(deploy).toContain("Verify frozen v0.7.2 health and corpus");
  });
});
