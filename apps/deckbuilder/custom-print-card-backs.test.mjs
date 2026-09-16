import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const customPrintSource = readFileSync("apps/deckbuilder/custom-print.mjs", "utf8");
const faceAuthoritySource = readFileSync("packages/rendering/face-authority.mjs", "utf8");

function quotedValues(source) {
  return [...source.matchAll(/["']([^"']+)["']/g)].map(match => match[1]);
}

function canonicalBackVariants() {
  const match = faceAuthoritySource.match(/const STANDARD_BACK_VARIANTS = Object\.freeze\(\[([\s\S]*?)\]\);/);
  if (!match) throw new Error("Unable to read canonical standard-back variants.");
  return quotedValues(match[1]);
}

function customPrintBackVariants() {
  const match = customPrintSource.match(/const BACK_VARIANTS = new Set\(\[([\s\S]*?)\]\);/);
  if (!match) throw new Error("Unable to read custom-print back variants.");
  return quotedValues(match[1]);
}

describe("Deckbuilder custom card-back printing", () => {
  it("keeps the selectable card-back catalog aligned with canonical face authority", () => {
    expect(customPrintBackVariants()).toEqual(canonicalBackVariants());
    expect(customPrintSource).toContain('"Card back"');
    expect(customPrintSource).toContain('makeEntry(`back:${faction}`');
    expect(customPrintSource).toContain('{ surface: "back", id: faction }');
  });

  it("prints a selected card back as the primary face without generating another reverse", () => {
    expect(customPrintSource).toContain('"portrait", "none", { surface: "back", id: faction }');
    expect(customPrintSource).toContain('if (entry.render.surface === "back") return backFrameHtml(entry.render.id);');
    expect(customPrintSource).toContain('const src = productionPrint().backSource(safeFaction);');
  });
});
