import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const baseCss = readFileSync("card-design/card-design.css", "utf8");
const refinementCss = readFileSync("card-design/card-design-refinement.css", "utf8");

describe("card value medallion", () => {
  it("keeps equal top, bottom, and right clearance and centers the numeral", () => {
    expect(baseCss).toMatch(/\.value-medallion\s*\{[\s\S]*?display:\s*grid;/);
    expect(baseCss).toMatch(/\.value-medallion\s*\{[\s\S]*?place-items:\s*center;/);
    expect(refinementCss).toMatch(/\.value-medallion\s*\{[\s\S]*?top:\s*0\.055in;/);
    expect(refinementCss).toMatch(/\.value-medallion\s*\{[\s\S]*?right:\s*0\.055in;/);
    expect(refinementCss).toMatch(/\.value-medallion\s*\{[\s\S]*?width:\s*0\.19in;/);
    expect(refinementCss).toMatch(/\.value-medallion\s*\{[\s\S]*?height:\s*0\.19in;/);
    expect(refinementCss).toMatch(/\.value-medallion\s*\{[\s\S]*?padding:\s*0;/);
    expect(refinementCss).toMatch(/\.value-medallion\s*\{[\s\S]*?font-family:\s*var\(--font-display-web\);/);
    expect(refinementCss).toMatch(/\.value-medallion\s*\{[\s\S]*?font-size:\s*7\.2pt;/);
    expect(refinementCss).toMatch(/\.value-medallion\s*\{[\s\S]*?font-variant-numeric:\s*lining-nums tabular-nums;/);
  });
});
