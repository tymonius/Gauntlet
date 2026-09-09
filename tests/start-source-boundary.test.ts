import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Start source/deployment boundary", () => {
  it("keeps maintained Start source under apps instead of recreating a root source alias", () => {
    expect(existsSync("apps/start/index.html")).toBe(true);
    expect(existsSync("start")).toBe(false);

    const architecture = JSON.parse(read("config/repository-architecture.json"));
    expect(architecture.root_directories.apps).toMatchObject({
      role: "active_application",
      transitional: false,
    });
    expect(architecture.root_directories.start).toBeUndefined();
  });

  it("stages the app at the stable /start public path without exposing /apps", () => {
    const pages = read(".github/workflows/deploy-pages.yml");
    expect(pages).toContain('for surface in start playtest; do');
    expect(pages).toContain('source="apps/$surface"');
    expect(pages).toContain('target="$site/$surface"');
    expect(pages).toContain(".github apps artifacts docs governance legacy media");
    expect(pages).toContain('test -s "$site/start/index.html"');

    const publicDirectories = pages.slice(
      pages.indexOf("public_directories=("),
      pages.indexOf("root_public_files="),
    );
    expect(publicDirectories).not.toMatch(/^\s*start\s*$/m);
  });

  it("keeps publication validation source-aware while checking the stable public route", () => {
    const publication = read(".github/workflows/current-publication-contract.yml");
    expect(publication).toContain("/apps/start/**");
    expect(publication).not.toMatch(/^\s*\/start(?:\/|$)/m);
    expect(publication).toContain("cp -a apps/start/. start/");

    const livePublication = read(".github/workflows/verify-current-live-publication.yml");
    expect(livePublication).toContain("'apps/start/**'");
    expect(livePublication).not.toContain("'start/**'");
  });

  it("preserves the stable player-facing Start route", () => {
    const homepage = read("index.html");
    const start = read("apps/start/index.html");
    expect(homepage).toContain('<a href="/start/">Start</a>');
    expect(homepage).toContain('<a class="button primary" href="start/">Start playing</a>');
    expect(start).toContain('rel="canonical" href="https://gauntlet.run/start/"');
  });
});
