import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const hostedAssetPath = /^tts\/v[^/]+\/assets\//;
const hostedSavePath = /^tts\/v[^/]+\/Gauntlet_.*_TTS_Mod\.json$/;

describe("hosted TTS output boundary", () => {
  it("keeps versioned hosted assets and public mod saves out of Git", () => {
    const gitignore = readFileSync(".gitignore", "utf8");
    expect(gitignore).toContain("tts/v*/assets/");
    expect(gitignore).toContain("tts/v*/Gauntlet_*_TTS_Mod.json");

    const trackedTtsPaths = execFileSync("git", ["ls-files", "--", "tts"], {
      encoding: "utf8",
    })
      .split(/\r?\n/)
      .filter(Boolean);

    const trackedHostedOutput = trackedTtsPaths.filter(
      (path) => hostedAssetPath.test(path) || hostedSavePath.test(path)
    );

    expect(trackedHostedOutput).toEqual([]);
  });
});
