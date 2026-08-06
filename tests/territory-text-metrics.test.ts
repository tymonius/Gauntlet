import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const territoryStyles = readFileSync("card-design/territory-card.css", "utf8");

describe("Territory effect layout", () => {
  it("lets effect text claim its natural height before artwork", () => {
    expect(territoryStyles).toContain("--art-height: 1.42in");
    expect(territoryStyles).toContain("grid-template-rows: minmax(0, var(--art-height)) auto");
    expect(territoryStyles).toContain("overflow: visible");
    expect(territoryStyles).toContain("padding: 0.045in 0.07in 0.045in");
    expect(territoryStyles).toContain("line-height: 1.1");
    expect(territoryStyles).not.toContain("line-height: 1.18");
  });
});
