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
    expect(read("tests/standalone-new-player-onboarding.test.ts")).toContain(
      'expect(app).toContain(\'fetch("../game-data/current-game.json"\')',
    );
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
