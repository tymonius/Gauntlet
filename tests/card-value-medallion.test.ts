import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const baseCss = readFileSync("card-design/card-design.css", "utf8");
const refinementCss = readFileSync("card-design/card-design-refinement.css", "utf8");

describe("card value medallion", () => {
  it("centers the value geometrically and applies the approved optical correction", () => {
    expect(baseCss).toMatch(/\.value-medallion\s*\{[\s\S]*?display:\s*grid;/);
    expect(baseCss).toMatch(/\.value-medallion\s*\{[\s\S]*?place-items:\s*center;/);
    expect(refinementCss).toMatch(/\.value-medallion\s*\{[\s\S]*?width:\s*0\.28in;/);
    expect(refinementCss).toMatch(/\.value-medallion\s*\{[\s\S]*?height:\s*0\.28in;/);
    expect(refinementCss).toMatch(/\.value-medallion\s*\{[\s\S]*?padding:\s*0 0 0\.008in;/);
    expect(refinementCss).toMatch(/\.value-medallion\s*\{[\s\S]*?font-size:\s*8\.8pt;/);
  });
});
