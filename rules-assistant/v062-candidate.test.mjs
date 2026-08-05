import { readFile } from "node:fs/promises";
import { expect, test } from "vitest";
import workerEntry from "./worker-entry.js";
import candidateWorker from "./worker-v062-candidate.js";
import {
  buildV062RulesCorpus,
  V062_CORPUS_SOURCES
} from "./v062-corpus.js";
import {
  materializeV062DeterministicSources,
  resolveV062DeterministicRuling,
  V062_DETERMINISTIC_CASE_COUNT
} from "./rules-deterministic-v062.js";

const root = new URL("../", import.meta.url);
const baseData = JSON.parse(await readFile(new URL("../releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json", import.meta.url), "utf8"));
const markdownSources = await Promise.all(V062_CORPUS_SOURCES.map(async (sourcePath) => ({
  sourcePath,
  sourceUrl: `https://gauntlet.run/${sourcePath}`,
  markdown: await readFile(new URL(`../${sourcePath}`, import.meta.url), "utf8")
})));

const corpus = buildV062RulesCorpus({ baseData, markdownSources });

test("builds a versioned v0.6.2 corpus without v0.6.1 fallback citations", () => {
  expect(corpus.version).toBe("v0.6.2-candidate");
  expect(corpus.documents.length).toBeGreaterThan(150);
  expect(corpus.sourcePaths).toContain("v0.6.2/data/Gauntlet_v0.6.2_Canonical_Data.json");
  expect(corpus.documents.some((document) => document.sourcePath === "releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json")).toBe(false);
  expect(corpus.documents.some((document) => document.sourcePath.includes("Gauntlet_v0.6.2_Shared_Rules_Candidate"))).toBe(true);
});

test("covers the adopted high-risk interactions deterministically", () => {
  expect(V062_DETERMINISTIC_CASE_COUNT).toBeGreaterThanOrEqual(28);

  const terms = resolveV062DeterministicRuling({ question: "If Terms are accepted, do we still reach Onset?" });
  expect(terms?.id).toBe("accepted-terms-prevent-onset");
  expect(terms?.answer).toContain("do not perform Aftermath");

  const edge = resolveV062DeterministicRuling({ question: "How does Defensive Edge decide a tied battle?" });
  expect(edge?.answer).toContain("defender wins tied battle totals");

  const altar = resolveV062DeterministicRuling({ question: "How does Nature's Altar work?" });
  expect(altar?.answer).toContain("Begin a Rite Faction Action");

  const rendition = resolveV062DeterministicRuling({ question: "Which Asset must I discard first with Extraordinary Rendition?" });
  expect(rendition?.answer).toContain("before any others");
});

test("materializes candidate sources for deterministic rulings", () => {
  const ruling = resolveV062DeterministicRuling({ question: "Does accepted Terms still create a battle?" });
  const sources = materializeV062DeterministicSources(corpus, ruling);
  expect(sources.length).toBeGreaterThan(0);
  expect(sources.every((source) => !source.sourcePath.includes("v0.6.1_Canonical_Data"))).toBe(true);
});

test("reports candidate health through the explicit candidate dispatcher route", async () => {
  const response = await workerEntry.fetch(new Request("https://rules.example/api/v062-candidate/health"), {});
  expect(response.status).toBe(200);
  const payload = await response.json();
  expect(payload.version).toBe("v0.6.2-candidate");
  expect(payload.publishedVersion).toBe("v0.6.1");
  expect(payload.deterministicCaseCount).toBe(V062_DETERMINISTIC_CASE_COUNT);
  expect(payload.responseTypes).toContain("provisional_ruling");
});

test("rejects non-v0.6.2 requests before loading the corpus", async () => {
  const response = await candidateWorker.fetch(new Request("https://rules.example/api/v062/rules", {
    method: "POST",
    headers: {
      Origin: "https://gauntlet.run",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      question: "How does Capture work?",
      rulesVersion: "v0.6.1"
    })
  }), {
    ALLOWED_ORIGINS: "https://gauntlet.run"
  });
  expect(response.status).toBe(409);
  expect((await response.json()).error).toContain("v0.6.2-candidate");
});

test("answers a deterministic candidate question without a model call", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input) => {
    const url = new URL(typeof input === "string" ? input : input.url);
    const pathname = url.pathname.replace(/^\//, "");
    if (pathname === "releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json") {
      return Response.json(baseData);
    }
    if (V062_CORPUS_SOURCES.includes(pathname)) {
      const source = markdownSources.find((entry) => entry.sourcePath === pathname);
      return new Response(source.markdown, { status: 200 });
    }
    throw new Error(`Unexpected fetch in candidate test: ${url}`);
  };

  try {
    const response = await candidateWorker.fetch(new Request("https://rules.example/api/v062/rules", {
      method: "POST",
      headers: {
        Origin: "https://gauntlet.run",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question: "If accepted Terms stop the battle, do we perform Aftermath?",
        rulesVersion: "v0.6.2"
      })
    }), {
      ALLOWED_ORIGINS: "https://gauntlet.run",
      SITE_ORIGIN: "https://gauntlet.run"
    });

    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.version).toBe("v0.6.2-candidate");
    expect(payload.executionPath).toBe("deterministic");
    expect(payload.responseType).toBe("written_rule");
    expect(payload.answer).toContain("do not perform Aftermath");
    expect(payload.sources.length).toBeGreaterThan(0);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
