import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("standalone feedback text contrast", () => {
  const css = readFileSync("playtest/feedback/styles.css", "utf8");

  it("uses the dark tracked muted token for explanatory copy", () => {
    expect(css).toContain(".section-note{margin:0;color:var(--tracked-muted)");
    expect(css).toContain(".field-help{margin:0;color:var(--tracked-muted)");
    expect(css).toContain(".rating-card p{margin:0;color:var(--tracked-muted)");
    expect(css).toContain(".privacy-note{margin:0 0 1rem;color:var(--tracked-muted)");
  });

  it("darkens form controls enough for white text", () => {
    expect(css).toContain("background:rgba(20,20,20,.65);color:#fff;");
  });

  it("keeps rating numbers readable in both unselected and selected states", () => {
    expect(css).toContain("background:rgba(17,17,17,.6);color:#fff7e8;");
    expect(css).toContain(".rating-option input:checked + span{background:var(--crimson-dark);");
  });

  it("removes the audited pale-on-pale text colors", () => {
    expect(css).not.toMatch(/color:rgba\(255,245,235,\.(?:72|78|82)\)/);
  });
});
