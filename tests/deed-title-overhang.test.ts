import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sharedCardStyles = readFileSync("card-design/card-design.css", "utf8");
const deedScript = readFileSync("card-design/deed-card.js", "utf8");

describe("Deed wordmark overhang", () => {
  it("allows the Declaration capital D to extend beyond the generic title box", () => {
    expect(sharedCardStyles).toContain(".card-title {");
    expect(sharedCardStyles).toContain("overflow: hidden");
    expect(deedScript).toContain("title.style.overflow = 'visible'");
    expect(deedScript).toContain("title.style.maxWidth = 'none'");
  });
});
