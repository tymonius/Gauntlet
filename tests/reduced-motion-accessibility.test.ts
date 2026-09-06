import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const polish = readFileSync("site-polish.css", "utf8");
const sessionStyles = readFileSync("playtest/session/styles.css", "utf8");
const sessionPage = readFileSync("playtest/session/index.html", "utf8");
const analyticsBootstrap = readFileSync("analytics-consent.js", "utf8");
const programmaticScrollPages = [
  readFileSync("start/index.html", "utf8"),
  readFileSync("rulebook/index.html", "utf8"),
  readFileSync("playtest/tracked/index.html", "utf8"),
];

describe("public reduced motion contract", () => {
  it("suppresses repeating animations when reduced motion is requested", () => {
    expect(sessionStyles).toContain("animation: breathe 1.5s ease-in-out infinite;");
    expect(sessionPage).toContain('/site-polish.css?v=20260902-1');
    expect(polish).toContain("@media (prefers-reduced-motion: reduce)");
    expect(polish).toContain("animation-duration: .01ms !important;");
    expect(polish).toContain("animation-iteration-count: 1 !important;");
  });

  it("converts explicit smooth programmatic scrolling to immediate scrolling for reduced-motion users", () => {
    expect(analyticsBootstrap).toContain('window.matchMedia("(prefers-reduced-motion: reduce)")');
    expect(analyticsBootstrap).toContain('options.behavior === "smooth"');
    expect(analyticsBootstrap).toContain('{ ...options, behavior: "auto" }');
    expect(analyticsBootstrap).toContain('Element.prototype.scrollIntoView = function scrollIntoViewRespectingReducedMotion');

    for (const page of programmaticScrollPages) {
      expect(page).toContain('/analytics-consent.js?v=20260902-1');
    }
  });
});
