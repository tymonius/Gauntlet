import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("rulebook/mobile-toc-focus.js", "utf8");
const html = readFileSync("rulebook/index.html", "utf8");

describe("mobile Rulebook TOC focus", () => {
  it("loads the focus handoff with the browser Rulebook", () => {
    expect(html).toContain('<script type="module" src="mobile-toc-focus.js?v=20260903-1"></script>');
  });

  it("moves focus from a closed mobile TOC to the linked rule heading", () => {
    expect(source).toContain("window.matchMedia('(max-width: 900px)').matches");
    expect(source).toContain("target.tabIndex = -1;");
    expect(source).toContain("target.focus({ preventScroll: true });");
    expect(source).toContain("target.addEventListener('blur', () => target.removeAttribute('tabindex'), { once: true });");
  });
});
