import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const workflow = readFileSync(
  resolve(here, "../.github/workflows/verify-current-live-publication.yml"),
  "utf8"
);
const lifecycle = JSON.parse(readFileSync(resolve(here, "../config/release-lifecycle.json"), "utf8"));

describe("Rules Arbiter Worker deployment gate", () => {
  it("reconciles the local behavior revision with the live Worker", () => {
    expect(workflow).toContain("Determine whether Rules Arbiter Worker needs deployment");
    expect(workflow).toContain("scripts/resolve-current-live-publication.mjs");
    expect(workflow).not.toContain("rules-assistant/worker-v071.js");
    expect(workflow).not.toContain("https://gauntlet-rules-assistant.tymon-scott.workers.dev/api/health");
    expect(lifecycle.releases['v0.7.1'].publication.rules_arbiter.worker_source).toBe('rules-assistant/worker-v071.js');
    expect(lifecycle.releases['v0.7.1'].publication.rules_arbiter.health_path).toBe('/api/health');
    expect(workflow).toContain("behaviorRevision");
    expect(workflow).toContain("behavior_revision_mismatch");
    expect(workflow).toContain("live_revision_unavailable");
  });

  it("still deploys for direct Worker input changes and manual runs", () => {
    expect(workflow).toContain('github.event_name }}\" == \"workflow_dispatch');
    expect(workflow).toContain("rules-assistant/worker-entry.js|rules-assistant/worker-v*.js");
    expect(workflow).toContain("reason=worker_inputs_changed");
    expect(workflow).toContain("if: steps.scope.outputs.worker == 'true'");
    expect(workflow).toContain("npx wrangler deploy --config rules-assistant/wrangler.toml");
  });
});
