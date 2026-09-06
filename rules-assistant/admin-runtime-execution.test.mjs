import vm from "node:vm";
import { expect, test } from "vitest";
import {
  ADMIN_REFINEMENT_RUNTIME_PATH,
  adminRefinementRuntimeSource,
  allowAdminRefinementRuntime,
  attachAdminRefinementRuntime
} from "./admin-refinement-runtime.js";
import { enhanceRulesScaffoldAdmin } from "./admin-scaffold-page.js";

function composedPage() {
  const base = `<!doctype html><html><body><main id="admin-dashboard" class="visible"><section class="review-panel"></section></main></body></html>`;
  return attachAdminRefinementRuntime(enhanceRulesScaffoldAdmin(base));
}

function element(tag = "div") {
  return {
    tagName: String(tag).toUpperCase(),
    value: "",
    textContent: "",
    innerHTML: "",
    disabled: false,
    onclick: null,
    onchange: null,
    children: [],
    appendChild(child) { this.children.push(child); return child; },
    remove() {},
    click() {},
    setAttribute() {},
    addEventListener() {}
  };
}

function response(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body
  };
}

test("runtime source is self-contained executable JavaScript", () => {
  expect(() => new vm.Script(adminRefinementRuntimeSource())).not.toThrow();
});

test("server-backed runtime initializes reviewed backlog triage", async () => {
  const nodes = new Map();
  function get(id) {
    if (!nodes.has(id)) nodes.set(id, element());
    return nodes.get(id);
  }
  get("triage-scope").value = "reviewed_backlog";

  const report = {
    schema: "gauntlet.rules-triage.v1",
    generatedAt: "2026-09-05T20:00:00.000Z",
    scope: "reviewed_backlog",
    stats: {
      scope: "reviewed_backlog",
      eligible: 1,
      unreviewed: 0,
      reviewedBacklog: 1,
      high: 1,
      medium: 0,
      low: 0,
      routine: 0,
      attention: 1,
      clusters: 1,
      resolvedByRefinement: 0
    },
    clusters: [{
      rootCause: "retrieval",
      label: "Retrieval",
      count: 1,
      highCount: 1,
      mediumCount: 0,
      maxScore: 75,
      averageScore: 75,
      interactionIds: ["11111111-1111-4111-8111-111111111111"],
      representatives: [{
        interactionId: "11111111-1111-4111-8111-111111111111",
        question: "Where does the card go?",
        score: 75,
        priority: "high",
        reasons: ["Retrieval missed the governing source."]
      }],
      recommendedAction: "Inspect retrieval."
    }],
    interactions: [],
    resolvedByRefinement: []
  };

  const context = {
    console,
    Blob,
    URL: {
      createObjectURL() { return "blob:test"; },
      revokeObjectURL() {}
    },
    Date,
    JSON,
    String,
    Number,
    Array,
    Math,
    Promise,
    Object,
    Set,
    Map,
    RegExp,
    Error,
    sessionStorage: {
      getItem(key) { return key === "gauntlet_rules_admin_token" ? "test-token" : null; }
    },
    document: {
      body: get("body"),
      getElementById: get,
      createElement(tag) { return element(tag); }
    },
    fetch(path) {
      const value = String(path);
      if (value === "/api/admin/refinement-triage?scope=reviewed_backlog") return Promise.resolve(response(report));
      return Promise.resolve(response({ error: "Unexpected path" }, 404));
    },
    setTimeout,
    clearTimeout
  };

  vm.runInNewContext(adminRefinementRuntimeSource(), context, { filename: "admin-refinement-runtime.js" });
  expect(get("triage-status").textContent).toMatch(/Mining reviewed interactions/);
  await new Promise((resolve) => setTimeout(resolve, 25));

  expect(get("triage-status").textContent).toMatch(/Found 1 unresolved reviewed interaction/);
  expect(get("triage-summary").innerHTML).toContain("High priority");
  expect(get("triage-summary").innerHTML).toContain("Resolved by refinement");
  expect(get("triage-clusters").innerHTML).toContain("Retrieval");
  expect(get("triage-scaffold-cluster").disabled).toBe(false);
  expect(get("triage-scaffold").disabled).toBe(false);
});

test("runtime delivery is CSP-compatible and idempotent", () => {
  const once = composedPage();
  const twice = attachAdminRefinementRuntime(once);
  expect(twice).toBe(once);
  expect((once.match(new RegExp(ADMIN_REFINEMENT_RUNTIME_PATH.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) || []).length).toBe(1);
  const policy = allowAdminRefinementRuntime("default-src 'self'; script-src 'unsafe-inline'; connect-src 'self';");
  expect(policy).toMatch(/script-src[^;]*'self'/);
});
