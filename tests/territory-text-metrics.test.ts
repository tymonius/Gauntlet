import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const territoryStyles = readFileSync("card-design/territory-card.css", "utf8");

describe("Territory effect typography", () => {
  it("preserves Adobe Caslon descenders in normal and compact layouts", () => {
    expect(territoryStyles).toContain("padding: 0.045in 0.07in 0.045in");
    expect(territoryStyles).toContain("line-height: 1.18");
    expect(territoryStyles).toContain("padding-bottom: 0.035in");
    expect(territoryStyles).toContain("line-height: 1.12");
  });
});
