import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  V072_RULES_VERSION,
  V072_COMPLETE_RULES_SOURCE_PATH,
  V072_CANONICAL_SOURCE_PATH,
  defaultV072SourceUrls,
  loadV072RulesCorpus,
  validateV072ReleaseData,
} from "./v072-release-corpus.js";

const paths = {
  rules: "releases/v0.7.2/Gauntlet_v0.7.2_Complete_Rules.md",
  canonical: "releases/v0.7.2/Gauntlet_v0.7.2_Canonical_Data.json",
  starters: "releases/v0.7.2/Gauntlet_v0.7.2_Starter_Decks.json",
  provenance: "releases/v0.7.2/Gauntlet_v0.7.2_Source_Provenance.json",
  manifest: "releases/v0.7.2/Gauntlet_v0.7.2_Manifest.json",
  freeze: "config/v072-release-freeze.json",
};

const read = path => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const snapshot = () => Object.fromEntries(
  Object.entries(paths).filter(([key]) => key !== "freeze").map(([key, path]) => [key, read(path)])
);

function responseFor(body) {
  return new Response(body, { status: 200, headers: { "content-type": "text/plain; charset=utf-8" } });
}

describe("frozen v0.7.2 release corpus", () => {
  test("builder reproduces the committed staged package byte-for-byte", () => {
    const before = snapshot();
    execFileSync(process.execPath, ["scripts/build-v072-release-source.mjs"], {
      cwd: new URL("..", import.meta.url),
      stdio: "pipe",
    });
    expect(snapshot()).toEqual(before);
  });

  test("freeze record pins the exact declared gameplay/rules authority", () => {
    const freeze = JSON.parse(read(paths.freeze));
    expect(freeze.releaseVersion).toBe("v0.7.2");
    expect(freeze.status).toBe("frozen-release-candidate");
    expect(freeze.authoritySetId).toBe("a644061be1f605d0c83ff8b1cde7e0d5b6323ef01fa804dd720bdbae205b1b6b");
    expect(freeze.sources.currentGame.gitBlob).toBe("163582f53725e377ad31336433457bb77cc8a43f");
    expect(freeze.sources.completeRules.gitBlob).toBe("c5915af9aa9668ebaf20755a3755f5d12474c7a0");
  });

  test("validates staged release identity and frozen authority binding", () => {
    const canonicalData = JSON.parse(read(paths.canonical));
    const manifest = JSON.parse(read(paths.manifest));
    const provenance = JSON.parse(read(paths.provenance));
    expect(validateV072ReleaseData({
      canonicalData,
      manifest,
      provenance,
      completeRulesMarkdown: read(paths.rules),
    })).toBe(true);
    expect(manifest.status).toBe("candidate");
    expect(manifest.public_defaults.rules_arbiter).toBe("v0.7.1");
  });

  test("loads the immutable staged package and binds public release URLs", async () => {
    const urls = defaultV072SourceUrls();
    const bodies = new Map([
      [urls.completeRulesUrl, read(paths.rules)],
      [urls.canonicalDataUrl, read(paths.canonical)],
      [urls.manifestUrl, read(paths.manifest)],
      [urls.provenanceUrl, read(paths.provenance)],
      [urls.startersUrl, read(paths.starters)],
    ]);
    const corpus = await loadV072RulesCorpus({
      fetchImpl: async url => bodies.has(url) ? responseFor(bodies.get(url)) : new Response("not found", { status: 404 }),
    });

    expect(corpus.version).toBe(V072_RULES_VERSION);
    expect(corpus.published).toBe(false);
    expect(corpus.candidate).toBe(true);
    expect(corpus.currentPublicRelease).toBe("v0.7.1");
    expect(corpus.authoritySetId).toBe("a644061be1f605d0c83ff8b1cde7e0d5b6323ef01fa804dd720bdbae205b1b6b");
    expect(corpus.documents.some(document =>
      document.kind === "rulebook" && document.sourcePath === V072_COMPLETE_RULES_SOURCE_PATH
    )).toBe(true);
    expect(corpus.documents.some(document =>
      document.kind !== "rulebook" && document.sourcePath === V072_CANONICAL_SOURCE_PATH
    )).toBe(true);
  });

  test("registers v0.7.2 as staged candidate without public cutover", () => {
    const lifecycle = JSON.parse(readFileSync(new URL("../config/release-lifecycle.json", import.meta.url), "utf8"));
    expect(lifecycle.current_release).toBe("v0.7.1");
    expect(lifecycle.releases["v0.7.1"].status).toBe("current");
    expect(lifecycle.releases["v0.7.2"].status).toBe("candidate");
    expect(lifecycle.releases["v0.7.2"].public_cutover).toBe(false);
    expect(lifecycle.releases["v0.7.2"].frozen_authority_set_id)
      .toBe("a644061be1f605d0c83ff8b1cde7e0d5b6323ef01fa804dd720bdbae205b1b6b");
  });

  test("publishes only the staged v0.7.2 runtime authority files, not the releases tree", () => {
    const boundary = JSON.parse(readFileSync(new URL("../config/publication-boundary.json", import.meta.url), "utf8"));
    expect(boundary.pages.sourceOnlyRepositoryRoots).toContain("releases");
    const staged = boundary.materializedFiles
      .filter(item => item.kind === "staged-release-runtime")
      .map(item => item.publicPath)
      .sort();
    expect(staged).toEqual([
      "/releases/v0.7.2/Gauntlet_v0.7.2_Canonical_Data.json",
      "/releases/v0.7.2/Gauntlet_v0.7.2_Complete_Rules.md",
      "/releases/v0.7.2/Gauntlet_v0.7.2_Manifest.json",
      "/releases/v0.7.2/Gauntlet_v0.7.2_Source_Provenance.json",
      "/releases/v0.7.2/Gauntlet_v0.7.2_Starter_Decks.json",
    ]);
  });

  test("fails closed if a staged binding is tampered", async () => {
    const urls = defaultV072SourceUrls();
    const bodies = new Map([
      [urls.completeRulesUrl, read(paths.rules) + "\nTAMPERED\n"],
      [urls.canonicalDataUrl, read(paths.canonical)],
      [urls.manifestUrl, read(paths.manifest)],
      [urls.provenanceUrl, read(paths.provenance)],
      [urls.startersUrl, read(paths.starters)],
    ]);
    await expect(loadV072RulesCorpus({
      fetchImpl: async url => responseFor(bodies.get(url)),
    })).rejects.toThrow(/hash mismatch/i);
  });
});
