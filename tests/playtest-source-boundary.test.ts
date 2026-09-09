import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Playtest source/deployment boundary", () => {
  it("keeps maintained Playtest source under apps instead of recreating a root source alias", () => {
    expect(existsSync("apps/playtest/index.html")).toBe(true);
    expect(existsSync("playtest")).toBe(false);

    const architecture = JSON.parse(read("config/repository-architecture.json"));
    expect(architecture.root_directories.apps).toMatchObject({
      role: "active_application",
      transitional: false,
    });
    expect(architecture.root_directories.playtest).toBeUndefined();
  });

  it("stages the app at the stable /playtest public path without exposing /apps", () => {
    const pages = read(".github/workflows/deploy-pages.yml");
    expect(pages).toContain('for surface in start playtest; do');
    expect(pages).toContain('source="apps/$surface"');
    expect(pages).toContain('target="$site/$surface"');
    expect(pages).toContain(".github apps artifacts docs governance legacy media");
    expect(pages).toContain('test -s "$site/playtest/index.html"');

    const publicDirectories = pages.slice(
      pages.indexOf("public_directories=("),
      pages.indexOf("root_public_files="),
    );
    expect(publicDirectories).not.toMatch(/^\s*playtest\s*$/m);
  });

  it("keeps publication validation source-aware while checking the stable public route", () => {
    const publication = read(".github/workflows/current-publication-contract.yml");
    expect(publication).toContain("/apps/playtest/**/index.html");
    expect(publication).not.toMatch(/^\s*\/playtest\/\*\*\/index\.html\s*$/m);
    expect(publication).toContain("cp -a apps/playtest/. playtest/");

    const livePublication = read(".github/workflows/verify-current-live-publication.yml");
    expect(livePublication).toContain("'apps/playtest/**'");
    expect(livePublication).toContain("'.github/workflows/current-publication-contract.yml'");
  });

  it("preserves player-facing /playtest navigation contracts", () => {
    const start = read("apps/start/app.js");
    expect(start).toContain('new URL("../playtest/tracked/"');
  });
});
