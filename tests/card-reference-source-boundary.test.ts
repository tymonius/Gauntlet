import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Card Reference source/deployment boundary", () => {
  it("keeps maintained Card Reference source under apps instead of recreating a root source alias", () => {
    expect(existsSync("apps/card-reference/index.html")).toBe(true);
    expect(existsSync("card-reference")).toBe(false);

    const architecture = JSON.parse(read("config/repository-architecture.json"));
    expect(architecture.root_directories.apps).toMatchObject({
      role: "active_application",
      transitional: false,
    });
    expect(architecture.root_directories["card-reference"]).toBeUndefined();
  });

  it("stages the app at the stable /card-reference public path without exposing /apps", () => {
    const pages = read(".github/workflows/deploy-pages.yml");
    expect(pages).toContain("for surface in card-reference start playtest; do");
    expect(pages).toContain('source="apps/$surface"');
    expect(pages).toContain('target="$site/$surface"');
    expect(pages).toContain(".github apps artifacts docs governance legacy media rulebook-design");
    expect(pages).toContain('test -s "$site/card-reference/index.html"');

    const publicDirectories = pages.slice(
      pages.indexOf("public_directories=("),
      pages.indexOf("root_public_files="),
    );
    expect(publicDirectories).not.toMatch(/^\s*card-reference\s*$/m);
  });

  it("keeps publication validation source-aware while checking the stable public route", () => {
    const publication = read(".github/workflows/current-publication-contract.yml");
    expect(publication).toContain("/apps/card-reference/**");
    expect(publication).not.toMatch(/^\s*\/card-reference(?:\/|$)/m);
    expect(publication).toContain("cp -a apps/card-reference/. card-reference/");

    const livePublication = read(".github/workflows/verify-current-live-publication.yml");
    expect(livePublication).toContain("'apps/card-reference/**'");
    expect(livePublication).not.toContain("'card-reference/**'");
  });

  it("preserves the stable player-facing Card Reference route", () => {
    const homepage = read("index.html");
    const cardReference = read("apps/card-reference/index.html");
    expect(homepage).toContain('<a href="/card-reference/">Card Reference</a>');
    expect(homepage).toContain('<a class="button secondary" href="card-reference/">Browse all 142 cards</a>');
    expect(cardReference).toContain('rel="canonical" href="https://gauntlet.run/card-reference/"');
  });
});
