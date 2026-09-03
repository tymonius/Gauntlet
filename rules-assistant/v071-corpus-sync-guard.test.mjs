import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const worker = readFileSync(new URL("./worker-v071.js", import.meta.url), "utf8");
const liveQa = readFileSync(new URL("../.github/workflows/v071-rules-arbiter-live-qa.yml", import.meta.url), "utf8");
const publication = readFileSync(new URL("../.github/workflows/verify-current-live-publication.yml", import.meta.url), "utf8");
const materializeWorkflow = readFileSync(new URL("../.github/workflows/materialize-v071-release-package.yml", import.meta.url), "utf8");
const materializer = readFileSync(new URL("../scripts/build-v071-release-source.mjs", import.meta.url), "utf8");

describe("v0.7.1 Rules Arbiter corpus synchronization guard", () => {
  test("release materialization no longer owns the maintained v0.7.1 landing", () => {
    expect(materializer).not.toContain("const PUBLIC_DIR");
    expect(materializer).not.toContain("writeText(join(PUBLIC_DIR, 'index.html')");
    expect(materializer).not.toContain("const landing = `<!doctype html>");
    expect(materializeWorkflow).not.toContain("            v0.7.1/index.html");
    expect(materializeWorkflow).toContain("assert(fs.existsSync('v0.7.1/index.html'), 'Missing v0.7.1 release landing page')");
  });

  test("Worker exposes a free exact corpus identity and cannot cache it indefinitely", () => {
    expect(worker).toContain('"/api/v071/corpus-health"');
    expect(worker).toContain("authoritySetId: corpus.authoritySetId");
    expect(worker).toContain("const CORPUS_CACHE_TTL_MS = 5 * 60 * 1000");
    expect(worker).toContain("async function getCorpus(env, { force = false } = {})");
    expect(worker).toContain("if (force || cacheExpired)");
    expect(worker.indexOf('"/api/v071/corpus-health"')).toBeLessThan(worker.indexOf('request.method !== "POST"'));
  });

  test("paid QA proves local, published, and Worker authority identity before any model-backed case", () => {
    expect(liveQa).toContain("Verify frozen v0.7.1 corpus matches current authority");
    expect(liveQa).toContain("git diff --exit-code");
    expect(liveQa).toContain("EXPECTED_RULES_AUTHORITY_SET");
    expect(liveQa).toContain("Verify published corpus and refresh Worker cache");
    expect(liveQa).toContain("/api/v071/corpus-health");
    expect(liveQa).toContain("No paid QA calls were made.");
    expect(liveQa.indexOf("Verify frozen v0.7.1 corpus matches current authority")).toBeLessThan(liveQa.indexOf("Run live Rules Arbiter QA"));
    expect(liveQa.indexOf("Verify published corpus and refresh Worker cache")).toBeLessThan(liveQa.indexOf("Run live Rules Arbiter QA"));
    expect(liveQa.match(/\n  push:/g)).toBeNull();
  });

  test("publication verification refreshes the Worker only after the public site converges", () => {
    expect(publication).toContain("Verify deployed site against the current-publication contract");
    expect(publication).toContain("Refresh current Rules Arbiter corpus against published authority");
    expect(publication).toContain("/api/v071/corpus-health");
    expect(publication.indexOf("Verify deployed site against the current-publication contract")).toBeLessThan(publication.indexOf("Refresh current Rules Arbiter corpus against published authority"));
  });
});