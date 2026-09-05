import vm from "node:vm";
import { expect, test } from "vitest";
import { ADMIN_PAGE_WITH_RULES_INTELLIGENCE } from "./admin-intelligence-page.js";
import { enhanceRulesScaffoldAdmin } from "./admin-scaffold-page.js";

function composedPage() {
  return enhanceRulesScaffoldAdmin(ADMIN_PAGE_WITH_RULES_INTELLIGENCE);
}

function scriptsFrom(page) {
  return [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
}

function element(id) {
  const classes = new Set(id === "dashboard" ? ["hidden"] : []);
  return {
    id,
    value: id === "triage-scope" ? "reviewed_backlog" : "",
    textContent: "",
    innerHTML: "",
    disabled: false,
    classList: {
      add(...names) { names.forEach((name) => classes.add(name)); },
      remove(...names) { names.forEach((name) => classes.delete(name)); },
      contains(name) { return classes.has(name); }
    },
    appendChild() {},
    remove() {},
    showModal() {},
    close() {},
    addEventListener() {},
    setAttribute() {},
    click() {},
    querySelectorAll() { return []; },
    querySelector() { return null; },
    reset() {},
    files: []
  };
}

function response(payload, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => payload,
    text: async () => JSON.stringify(payload)
  };
}

test("final composed admin browser script compiles", () => {
  const scripts = scriptsFrom(composedPage());
  expect(scripts.length).toBeGreaterThan(0);
  for (const source of scripts) expect(() => new Function(source)).not.toThrow();
});

test("final composed admin runtime actually initializes reviewed backlog triage", async () => {
  const page = composedPage();
  const scripts = scriptsFrom(page);
  const elements = new Map();
  const get = (id) => {
    if (!elements.has(id)) elements.set(id, element(id));
    return elements.get(id);
  };
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
  const documentListeners = new Map();
  const context = {
    console,
    URL,
    URLSearchParams,
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
    encodeURIComponent,
    sessionStorage: {
      getItem(key) { return key === "gauntlet_rules_admin_token" ? "test-token" : null; },
      setItem() {},
      removeItem() {}
    },
    document: {
      body: get("body"),
      getElementById: get,
      createElement(tag) { return element(tag); },
      querySelectorAll() { return []; },
      addEventListener(type, handler) { documentListeners.set(type, handler); },
      dispatchEvent(event) { const handler = documentListeners.get(event.type); if (handler) handler(event); return true; }
    },
    CustomEvent: class CustomEvent {
      constructor(type, init = {}) { this.type = type; this.detail = init.detail; }
    },
    MutationObserver: class MutationObserver { constructor(callback) { this.callback = callback; } observe() {} disconnect() {} },
    FileReader: class FileReader {},
    fetch(path) {
      const value = String(path);
      if (value.startsWith("/api/admin/summary")) return Promise.resolve(response({ total: 308, unreviewed: 0, negativeFeedback: 5, unresolved: 51, lowConfidence: 27 }));
      if (value.startsWith("/api/admin/interactions?")) return Promise.resolve(response({ items: [], total: 308 }));
      if (value === "/api/admin/export?format=json") return Promise.resolve(response({ exportedAt: "2026-09-05T00:00:00.000Z", interactions: [reviewedInteraction], sources: [] }));
      if (value === "/api/admin/review-intelligence") return Promise.resolve(response({ audits: [], diagnostics: [] }));
      return Promise.resolve(response({}));
    },
    setTimeout,
    clearTimeout
  };

  for (const source of scripts) vm.runInNewContext(source, context, { filename: "composed-admin.js" });
  await new Promise((resolve) => setTimeout(resolve, 25));

  expect(get("dashboard").classList.contains("hidden")).toBe(false);
  expect(get("triage-status").textContent).toMatch(/Found 1 reviewed interaction/);
  expect(get("triage-summary").innerHTML).toContain("High priority");
  expect(get("triage-clusters").innerHTML).toContain("Retrieval");
});
