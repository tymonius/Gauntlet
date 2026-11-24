import { mkdtempSync, readFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import * as retrieval from "../../../../packages/rules-arbiter-runtime/local-search.js";
import * as compatibility from "../../../../rules-assistant/local-search.js";
import { loadPublicationBoundary, materializePublicFiles } from "../../../../scripts/publication-boundary.mjs";

const source = "packages/rules-arbiter-runtime/local-search.js";
const publicPath = "/rules-assistant/local-search.js";
const corpusPath = "/rules-assistant/v072-release-corpus.js";

describe("shared retrieval publication boundary", () => {
  it("retains the same repository import API without a second implementation", () => {
    expect(Object.keys(compatibility)).toEqual(Object.keys(retrieval));
    for (const key of Object.keys(retrieval)) expect(compatibility[key]).toBe(retrieval[key]);
    expect(readFileSync("rules-assistant/local-search.js", "utf8")).toContain('export * from "../packages/rules-arbiter-runtime/local-search.js"');
    expect(readFileSync(source, "utf8")).not.toMatch(/^\s*import\s/m);
  });

  it("stages the implementation, not the shim, at the unchanged browser path", () => {
    const contract = loadPublicationBoundary();
    const mappings = contract.materializedFiles.filter(file => [publicPath, corpusPath].includes(file.publicPath));
    expect(mappings).toHaveLength(2);
    expect(mappings.find(file => file.publicPath === publicPath).source).toBe(source);
    expect(contract.pages.sourceOnlyRepositoryRoots).toContain("packages");
    expect(contract.materializedFiles.filter(file => file.source.startsWith("packages/rules-arbiter-runtime/")).map(file => file.publicPath)).toEqual([publicPath]);
    const destinationRoot = mkdtempSync(join(tmpdir(), "gauntlet-retrieval-publication-"));
    try {
      materializePublicFiles({ destinationRoot, contract: { ...contract, materializedFiles: mappings } });
      const staged = join(destinationRoot, publicPath.slice(1));
      const stagedCorpus = join(destinationRoot, corpusPath.slice(1));
      expect(readFileSync(staged)).toEqual(readFileSync(source));
      expect(readFileSync(staged, "utf8")).not.toContain("../packages/rules-arbiter-runtime/");
      expect(readFileSync(stagedCorpus, "utf8")).toContain('from "./local-search.js"');
      expect(existsSync(join(destinationRoot, "packages"))).toBe(false);
    } finally {
      rmSync(destinationRoot, { recursive: true, force: true });
    }
  });
});
