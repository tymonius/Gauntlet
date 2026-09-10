import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const FACTION_GUIDES = [
  "diplomats",
  "financiers",
  "inquisition",
  "intelligence",
  "military",
  "mystics",
];

describe("Factions source/deployment boundary", () => {
  it("keeps maintained Factions source under apps and homepage-only styling in shared assets", () => {
    expect(existsSync("apps/factions/index.html")).toBe(true);
    expect(existsSync("apps/factions/factions.css")).toBe(true);
    for (const faction of FACTION_GUIDES) {
      expect(existsSync(`apps/factions/${faction}/index.html`)).toBe(true);
    }
    expect(existsSync("assets/homepage-factions.css")).toBe(true);
    expect(existsSync("apps/factions/homepage.css")).toBe(false);
    expect(existsSync("factions")).toBe(false);

    const architecture = JSON.parse(read("config/repository-architecture.json"));
    expect(architecture.root_directories.apps).toMatchObject({
      role: "active_application",
      transitional: false,
    });
    expect(architecture.root_directories.factions).toBeUndefined();
  });

  it("stages Factions at the stable /factions public path without exposing /apps", () => {
    const pages = read(".github/workflows/deploy-pages.yml");
    expect(pages).toContain("for surface in card-reference factions start playtest; do");
    expect(pages).toContain('source="apps/$surface"');
    expect(pages).toContain('target="$site/$surface"');
    expect(pages).toContain(".github apps artifacts docs governance legacy media rulebook-design");
    expect(pages).toContain('test -s "$site/factions/index.html"');
    expect(pages).toContain('test -s "$SITE_DIR/factions/index.html"');

    const publicDirectories = pages.slice(
      pages.indexOf("public_directories=("),
      pages.indexOf("root_public_files="),
    );
    expect(publicDirectories).not.toMatch(/^\s*factions\s*$/m);
  });

  it("keeps publication validation source-aware while checking the stable public route", () => {
    const publication = read(".github/workflows/current-publication-contract.yml");
    expect(publication).toContain("/apps/factions/**");
    expect(publication).not.toMatch(/^\s*\/factions(?:\/|$)/m);
    expect(publication).toContain("cp -a apps/factions/. factions/");

    const livePublication = read(".github/workflows/verify-current-live-publication.yml");
    expect(livePublication).toContain("'apps/factions/**'");
    expect(livePublication).not.toContain("'factions/**'");
  });

  it("preserves the public Factions routes while separating shared homepage presentation", () => {
    const homepage = read("index.html");
    const factions = read("apps/factions/index.html");
    const military = read("apps/factions/military/index.html");

    expect(homepage).toContain('<link rel="stylesheet" href="assets/homepage-factions.css" />');
    expect(homepage).not.toContain('factions/homepage.css');
    expect(homepage).toContain('<a href="/factions/">Factions</a>');
    expect(homepage).toContain('href="factions/military/"');
    expect(factions).toContain('rel="canonical" href="https://gauntlet.run/factions/"');
    expect(military).toContain('rel="canonical" href="https://gauntlet.run/factions/military/"');
  });
});
