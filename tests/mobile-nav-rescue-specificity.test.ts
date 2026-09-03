import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("shared mobile navigation rescue", () => {
  it("matches the specificity of the shared brand rule that hides mobile navigation", () => {
    const css = readFileSync("site-polish.css", "utf8");
    expect(css).toContain(
      ":is(.site-header, .global-header, .rulebook-header, .arbiter-header) > :is(nav, .header-actions) {"
    );
    expect(css).toContain("display: flex !important;");
    expect(css).toContain(
      ":is(.site-header, .global-header, .rulebook-header, .arbiter-header) > :is(nav, .header-actions) a {"
    );
    expect(css).toContain("min-height: 32px;");
  });
});
