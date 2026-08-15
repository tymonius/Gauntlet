import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const brandCss = readFileSync("brand.css", "utf8");
const deckbuilderCss = readFileSync("deckbuilder/styles.css", "utf8");
const shellCss = readFileSync("deckbuilder/shell.css", "utf8");
const deckbuilderHtml = readFileSync("deckbuilder/index.html", "utf8");

describe("Deckbuilder header width", () => {
  it("keeps shared header chrome width configurable instead of universally forcing 1180px", () => {
    expect(brandCss).toContain("var(--gauntlet-header-max-width, 1180px)");
    expect(brandCss).not.toContain("width: min(1180px, calc(100% - 40px)) !important");
  });

  it("aligns the Deckbuilder header with its 1380px content shell", () => {
    expect(deckbuilderCss).toContain("width: min(1380px, calc(100% - 40px))");
    expect(shellCss).toContain("--gauntlet-header-max-width:1380px");
    expect(shellCss).toContain("width:min(1380px,calc(100% - 40px))!important");
    expect(deckbuilderHtml).toContain('href="shell.css?v=20260815-1"');
  });
});
