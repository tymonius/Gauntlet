import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const entry = readFileSync(new URL("./worker-entry.js", import.meta.url), "utf8");
const reliable = readFileSync(new URL("./reliable-worker.js", import.meta.url), "utf8");
const widget = readFileSync(new URL("./widget.js", import.meta.url), "utf8");

test("production rulings use the reliable wrapper by default", () => {
  expect(entry).toContain('import reliableWorker from "./reliable-worker.js"');
  expect(entry).toContain('env.RULES_RELIABLE_FALLBACK || "on"');
  expect(entry).toContain("return reliableWorker.fetch(request, env, context)");
});

test("retryable AI failures become persisted degraded interactions", () => {
  expect(reliable).toContain("response.ok || response.status < 500");
  expect(reliable).toContain("buildLocalFallbackAnswer");
  expect(reliable).toContain("persistSmartInteraction");
  expect(reliable).toContain('mode: "local_fallback"');
  expect(reliable).toContain('degraded: true');
  expect(reliable).toContain("AI pipeline failed with HTTP");
});

test("degraded answers remain visibly identified as source lookups", () => {
  expect(widget).toContain('source_lookup: "Direct source lookup"');
  expect(reliable).toContain("buildLocalFallbackAnswer(question, results");
});
