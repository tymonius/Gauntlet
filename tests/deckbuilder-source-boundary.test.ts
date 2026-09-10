import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Deckbuilder source/deployment boundary", () => {
  it("keeps maintained Deckbuilder source under apps", () => {
    expect(existsSync("apps/deckbuilder/index.html")).toBe(true);
    expect(existsSync("apps/deckbuilder/app.js")).toBe(true);
    expect(existsSync("apps/deckbuilder/custom-print.mjs")).toBe(true);
    expect(existsSync("apps/deckbuilder/production-print.js")).toBe(true);
    expect(existsSync("apps/deckbuilder/tts-export.mjs")).toBe(true);
    expect(existsSync("deckbuilder")).toBe(false);

    const architecture = JSON.parse(read("config/repository-architecture.json"));
    expect(architecture.root_directories.apps).toMatchObject({
      role: "active_application",
      transitional: false,
    });
    expect(architecture.root_directories.deckbuilder).toBeUndefined();
  });

  it("stages Deckbuilder at the stable /deckbuilder public path without exposing /apps", () => {
    const pages = read(".github/workflows/deploy-pages.yml");
    expect(pages).toContain("for surface in card-reference deckbuilder factions start playtest; do");
    expect(pages).toContain('source="apps/$surface"');
    expect(pages).toContain('target="$site/$surface"');
    expect(pages).toContain(".github apps artifacts docs governance legacy media rulebook-design");
    expect(pages).toContain('test -s "$site/deckbuilder/index.html"');
    expect(pages).toContain('test -s "$SITE_DIR/deckbuilder/index.html"');

    const publicDirectories = pages.slice(
      pages.indexOf("public_directories=("),
      pages.indexOf("root_public_files="),
    );
    expect(publicDirectories).not.toMatch(/^\s*deckbuilder\s*$/m);
  });

  it("keeps publication validation source-aware while checking the stable public route", () => {
    const publication = read(".github/workflows/current-publication-contract.yml");
    expect(publication).toContain("/apps/deckbuilder/**");
    expect(publication).not.toMatch(/^\s*\/deckbuilder(?:\/|$)/m);
    expect(publication).toContain("cp -a apps/deckbuilder/. deckbuilder/");

    const livePublication = read(".github/workflows/verify-current-live-publication.yml");
    expect(livePublication).toContain("'apps/deckbuilder/**'");
    expect(livePublication).not.toContain("'deckbuilder/**'");
  });

  it("keeps browser journeys on the public route by materializing canonical source locally", () => {
    for (const workflow of [
      ".github/workflows/test-deckbuilder-custom-print-browser.yml",
      ".github/workflows/test-deckbuilder-print-request-browser.yml",
    ]) {
      const source = read(workflow);
      expect(source).toContain("apps/deckbuilder/");
      expect(source).toContain("cp -a apps/deckbuilder/. deckbuilder/");
      expect(source).toContain("/deckbuilder/");
    }
  });

  it("preserves the public Deckbuilder canonical URL", () => {
    const html = read("apps/deckbuilder/index.html");
    expect(html).toContain('rel="canonical" href="https://gauntlet.run/deckbuilder/"');
    expect(html).toContain('<a href="/deckbuilder/">Deckbuilder</a>');
  });
});
