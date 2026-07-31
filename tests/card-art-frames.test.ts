import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const refinementCss = readFileSync("card-design/card-design-refinement.css", "utf8");
const frameCss = readFileSync("card-design/card-art-frames.css", "utf8");

const factions = [
  "neutral",
  "military",
  "diplomats",
  "financiers",
  "intelligence",
  "mystics",
  "inquisition",
];

describe("faction art-window frames", () => {
  it("loads the shared frame stylesheet in every card-rendering surface", () => {
    expect(refinementCss).toContain('@import url("card-art-frames.css");');
    expect(frameCss).toContain(".gauntlet-card .card-art");
    expect(frameCss).toContain("var(--art-frame-image) center / 100% 100% no-repeat");
  });

  it("keeps one common mounted art footprint", () => {
    expect(frameCss).toContain("border-radius: 0.045in;");
    expect(frameCss).toContain("inset: 0.028in;");
    expect(frameCss).toContain("width: auto;");
    expect(frameCss).toContain("height: auto;");
    expect(frameCss).toContain("--art-frame-matte");
    expect(frameCss).toContain("inset 0 0 0 0.024in");
  });

  it("provides a dedicated scalable frame overlay for every faction", () => {
    for (const faction of factions) {
      const path = `images/artwork/card-frames/${faction}-art-frame.svg`;
      expect(existsSync(path)).toBe(true);

      const svg = readFileSync(path, "utf8");
      expect(svg).toContain('viewBox="0 0 1000 760"');
      expect(svg).toContain('preserveAspectRatio="none"');
      expect(svg).toContain("<use href=\"#corner\"");
      expect(svg).not.toContain("<script");
      expect(svg).not.toContain("<image");

      expect(frameCss).toContain(`../${path}`);
      expect(frameCss).toContain(`[data-faction="${faction}"]`);
    }
  });

  it("keeps ornament as a noninteractive overlay above the illustration", () => {
    expect(frameCss).toContain("isolation: isolate;");
    expect(frameCss).toContain(".gauntlet-card .card-art::after");
    expect(frameCss).toContain("z-index: 2;");
    expect(frameCss).not.toContain("filter:");
    expect(frameCss).not.toContain("mix-blend-mode");
  });
});
