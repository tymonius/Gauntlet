import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const app = readFileSync("rules-arbiter/app.js", "utf8");
const styles = readFileSync("rules-arbiter/styles.css", "utf8");

describe("Rules Arbiter runtime heading hierarchy", () => {
  it("renders Sources as a level-two heading beneath the page h1", () => {
    expect(app).toContain('<h2 class="arbiter-sources-heading">Sources</h2>');
    expect(app).not.toContain("<h3>Sources</h3>");
  });

  it("preserves the compact visual size of the former sources heading", () => {
    expect(styles).toContain(".arbiter-sources-heading");
    expect(styles).toContain("font-size: 1.17em;");
  });
});
