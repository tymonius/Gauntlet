import vm from "node:vm";
import { expect, test } from "vitest";
import { ADMIN_PAGE_WITH_RULES_INTELLIGENCE } from "./admin-intelligence-page.js";
import { enhanceRulesScaffoldAdmin } from "./admin-scaffold-page.js";
import {
  ADMIN_REFINEMENT_RUNTIME_PATH,
  adminRefinementRuntimeSource,
  allowAdminRefinementRuntime,
  attachAdminRefinementRuntime
} from "./admin-refinement-runtime.js";

function composedPage() {
  return attachAdminRefinementRuntime(enhanceRulesScaffoldAdmin(ADMIN_PAGE_WITH_RULES_INTELLIGENCE));
}

function inlineScriptsFrom(page) {
  return [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
}

function element(id) {
  const classes = new Set(id === "dashboard" ? ["hidden"] : []);
  const children = [];
  return {
    id,
    value: id === "triage-scope" ? "reviewed_backlog" : "",
    textContent: "",
    innerHTML: "",
    disabled: false,
    href: "",
    download: "",
    classList: {
      add(...names) { names.forEach((name) => classes.add(name)); },
      remove(...names) { names.forEach((name) => classes.delete(name)); },
      contains(name) { return classes.has(name); }
    },
    appendChild(child) { children.push(child); if (!this.value && child.value) this.value = child.value; },
    remove() {},
    click() {},
    querySelectorAll() { return []; },
    querySelector() { return null; }
  };
}

function response(payload, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => payload
  };
}

test("refinement runtime remains independently valid JavaScript", () => {
  const page = composedPage();
  const scripts = inlineScriptsFrom(page);
  expect(scripts.length).toBeGreaterThan(0);
  for (const source of scripts) expect(() => new Function(source)).not.toThrow();
  expect(page).toContain(`src="${ADMIN_REFINEMENT_RUNTIME_PATH}"`);
  expect(() => new Function(adminRefinementRuntimeSource())).not.toThrow();
  expect(adminRefinementRuntimeSource()).not.toContain("createTriageEngine");
  expect(adminRefinementRuntimeSource()).not.toContain("createRefinementScaffoldEngine");
});

test("server-backed runtime initializes reviewed backlog triage", async () => {
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, element(id));
    return elements.get(id);
  };
  const report = {
    schema: "gauntlet.rules-triage.v1",
    generatedAt: "2026-09-05T10:00:00.000Z",
    scope: "reviewed_backlog",
    stats: { scope: "reviewed_backlog", eligible: 1, unreviewed: 0, reviewedBacklog: 1, high: 1, medium: 0, low: 0, routine: 0, attention: 1, clusters: 1 },
    clusters: [{
      rootCause: "retrieval",
      label: "Retrieval",
      count: 1,
      highCount: 1,
      mediumCount: 0,
      maxScore: 100,
      averageScore: 100,
      interactionIds: ["11111111-1111-4111-8111-111111111111"],
      representatives: [{ interactionId: "11111111-1111-4111-8111-111111111111", question: "When does this effect end?", score: 100, priority: "high", reasons: ["Retrieval failed."] }],
      recommendedAction: "Inspect retrieval."
    }],
    interactions: []
  };

  const context = {
    console,
    URL,
    Blob,
    Promise,
    Date,
    JSON,
    Math,
    Number,
    String,
    Array,
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
  expect(get("triage-status").textContent).toMatch(/initialized/);
  await new Promise((resolve) => setTimeout(resolve, 25));

  expect(get("triage-status").textContent).toMatch(/Found 1 reviewed interaction/);
  expect(get("triage-summary").innerHTML).toContain("High priority");
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
