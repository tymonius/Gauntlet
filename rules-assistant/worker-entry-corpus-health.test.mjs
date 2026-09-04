import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./worker-entry.js", import.meta.url), "utf8");

test("worker entry forwards current corpus-health routes unchanged to the v0.7.1 worker", () => {
  const corpusRoute = source.match(/request\.method === "GET"[\s\S]*?return worker\.fetch\(request, env, context\);/m)?.[0] || "";

  for (const route of [
    "/corpus-health",
    "/api/corpus-health",
    "/v071/corpus-health",
    "/api/v071/corpus-health"
  ]) {
    assert.match(corpusRoute, new RegExp(route.replaceAll("/", "\\/")));
  }

  assert.match(corpusRoute, /return worker\.fetch\(request, env, context\);/);
  assert.doesNotMatch(corpusRoute, /rewriteVersionedPath\(request\)/);
});

test("corpus-health routing precedes the generic v0.7.1 versioned rewrite", () => {
  const corpusIndex = source.indexOf('"/api/v071/corpus-health"');
  const versionedRewriteIndex = source.indexOf('url.pathname === "/api/v071/rules"');

  assert.ok(corpusIndex >= 0, "expected v0.7.1 corpus-health route");
  assert.ok(versionedRewriteIndex >= 0, "expected v0.7.1 versioned route");
  assert.ok(corpusIndex < versionedRewriteIndex, "corpus-health must bypass rewriteVersionedPath");
});
