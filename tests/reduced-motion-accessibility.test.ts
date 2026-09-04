import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const polish = readFileSync("site-polish.css", "utf8");
const sessionStyles = readFileSync("playtest/session/styles.css", "utf8");
const sessionPage = readFileSync("playtest/session/index.html", "utf8");

describe("public reduced motion contract", () => {
  it("suppresses repeating animations when reduced motion is requested", () => {
    expect(sessionStyles).toContain("animation: breathe 1.5s ease-in-out infinite;");
    expect(sessionPage).toContain('/site-polish.css?v=20260902-1');
    expect(polish).toContain("@media (prefers-reduced-motion: reduce)");
    expect(polish).toContain("animation-duration: .01ms !important;");
    expect(polish).toContain("animation-iteration-count: 1 !important;");
  });
});
