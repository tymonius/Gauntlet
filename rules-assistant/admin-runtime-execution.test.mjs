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
    appendChild(child) { children.push(child); },
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

test("final admin page keeps the legacy script valid and loads a separate first-party refinement runtime", () => {
  const page = composedPage();
  const scripts = inlineScriptsFrom(page);
  expect(scripts.length).toBeGreaterThan(0);
  for (const source of scripts) expect(() => new Function(source)).not.toThrow();
  expect(page).toContain(`src="${ADMIN_REFINEMENT_RUNTIME_PATH}"`);
  expect(page).not.toContain("var rulesTriageEngine=");
  expect(() => new Function(adminRefinementRuntimeSource())).not.toThrow();
});

test("standalone refinement runtime actually initializes reviewed backlog triage", async () => {
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, element(id));
    return elements.get(id);
  };
  get("dashboard").classList.remove("hidden");

  const reviewedInteraction = {
    id: "11111111-1111-4111-8111-111111111111",
    session_id: "session-a",
    sequence_index: 1,
    created_at: "2026-09-04T20:00:00.000Z",
    question: "When does this effect end?",
    answer: "The current rules do not specify this clearly.",
    review_status: "needs_correction",
    ruling_status: "provisional",
    confidence: "low",
    source_count: 0,
    feedback_rating: "incorrect",
    issue_types_json: "[\"retrieval_failure\"]"
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
    MutationObserver: class MutationObserver { observe() {} },
    fetch(path) {
      const value = String(path);
      if (value === "/api/admin/export?format=json") return Promise.resolve(response({ interactions: [reviewedInteraction], sources: [] }));
      if (value === "/api/admin/review-intelligence") return Promise.resolve(response({ audits: [], diagnostics: [] }));
      return Promise.resolve(response({}));
    },
    setTimeout,
    clearTimeout
  };

  vm.runInNewContext(adminRefinementRuntimeSource(), context, { filename: "admin-refinement-runtime.js" });
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
