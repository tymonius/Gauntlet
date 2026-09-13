import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

const PACKAGE_FILES = [
  "README.md",
  "art-direction.mjs",
  "current-game-validation.mjs",
  "current-game.js",
  "current-game.json",
  "current-game.mjs",
  "ruleset.mjs",
];

describe("game-data source/deployment boundary", () => {
  it("keeps the complete maintained authority package under packages/game-data", () => {
    for (const file of PACKAGE_FILES) {
      expect(existsSync(join("packages/game-data", file)), file).toBe(true);
    }
    expect(existsSync("game-data")).toBe(false);
  });

  it("records packages as the canonical non-transitional ownership boundary", () => {
    const architecture = JSON.parse(read("config/repository-architecture.json"));
    expect(architecture.root_directories.packages).toMatchObject({
      role: "authority",
      target_groups: ["packages"],
      transitional: false,
    });
    expect(architecture.root_directories["game-data"]).toBeUndefined();
  });

  it("materializes canonical package source at the stable public game-data route", () => {
    const materializer = read("scripts/materialize-public-route-compatibility.mjs");
    const pages = read(".github/workflows/deploy-pages.yml");

    expect(materializer).toContain("['packages/game-data', 'game-data']");
    expect(pages).toContain('source="packages/game-data"');
    expect(pages).toContain('target="$site/game-data"');
    expect(pages).toContain('test -s "$site/game-data/current-game.json"');
    expect(pages).toContain("packages/game-data/**");
  });

  it("keeps public browser consumers on the stable game-data route", () => {
    expect(read("apps/start/app.js")).toContain('fetch("../game-data/current-game.json"');
    expect(read("card-design/reference-card.js")).toContain("from '../game-data/current-game.mjs'");
    expect(read("tests/standalone-new-player-onboarding.test.ts")).toContain(
      'expect(app).toContain(\'fetch("../game-data/current-game.json"\')',
    );
  });

  it("keeps repository-only consumers on the canonical package source", () => {
    expect(read("scripts/current-game-authority.mjs")).toContain("../packages/game-data/current-game-validation.mjs");
    expect(read("scripts/tts-current-catalog.mjs")).toContain("../packages/game-data/art-direction.mjs");
    expect(read("card-design/face-spec.mjs")).toContain("../packages/game-data/art-direction.mjs");
    expect(read("src/content/v064.ts")).toContain("../../packages/game-data/current-game.json");
  });

  it("maps the stable browser game-data route to package source in direct local renderers", () => {
    for (const name of [
      "generate-tts-card-assets.mjs",
      "generate-tts-territory-assets.mjs",
      "generate-tts-leader-assets.mjs",
    ]) {
      const renderer = read(join("scripts", name));
      expect(renderer, name).toContain("requestPath.startsWith('game-data/')");
      expect(renderer, name).toMatch(/packages\/(?:game-data|\$\{requestPath\})/);
    }
  });

  it("materializes the stable browser game-data route around browser renderers", () => {
    const scripts = JSON.parse(read("package.json")).scripts;
    expect(scripts["tts:supplementals"]).toBe(
      "node tts/run-with-game-data-route.mjs scripts/generate-tts-supplemental-assets.mjs",
    );
    expect(scripts["tts:finalized-supplementals"]).toBe(
      "node tts/run-with-game-data-route.mjs scripts/generate-tts-finalized-supplementals.mjs",
    );
    expect(scripts["card-authority:render"]).toBe(
      "node tts/run-with-game-data-route.mjs scripts/card-authority/validate-rendered-faces.mjs",
    );

    const cardAuthority = read(".github/workflows/card-authority.yml");
    expect(cardAuthority).toContain(
      "node tts/run-with-game-data-route.mjs scripts/card-authority/validate-homepage-showcase.mjs",
    );

    const runner = read("tts/run-with-game-data-route.mjs");
    expect(runner).toContain("resolve(ROOT, 'packages/game-data')");
    expect(runner).toContain("resolve(ROOT, 'game-data')");
    expect(runner).toContain("await cp(GAME_DATA_SOURCE, GAME_DATA_ROUTE, { recursive: true })");
    expect(runner).toContain("await rm(GAME_DATA_ROUTE, { recursive: true, force: true })");
  });

  it("does not route workflow source changes from the retired root game-data path", () => {
    const workflowDir = ".github/workflows";
    const stale: string[] = [];
    for (const name of readdirSync(workflowDir).filter((entry) => /\.ya?ml$/.test(entry))) {
      const lines = read(join(workflowDir, name)).split(/\r?\n/);
      lines.forEach((line, index) => {
        const trimmed = line.trim();
        if (
          /^- ['"]?game-data\/\*\*['"]?$/.test(trimmed)
          || /^\/game-data\/(?:current-game|ruleset|art-direction|current-game-validation)/.test(trimmed)
        ) {
          stale.push(`${name}:${index + 1}:${trimmed}`);
        }
      });
    }
    expect(stale).toEqual([]);
  });
});
