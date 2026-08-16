import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSymbol = (name: string) => readFileSync(`images/faction-symbols/${name}.svg`, "utf8");

const military = readSymbol("military");
const diplomats = readSymbol("diplomats");
const inquisition = readSymbol("inquisition");
const financiers = readSymbol("financiers");
const intelligence = readSymbol("intelligence");
const mystics = readSymbol("mystics");
const notes = readFileSync("images/faction-symbols/README.md", "utf8");

describe("approved faction symbols", () => {
  it("keeps the approved cavalry-saber Military mark", () => {
    expect(military).toContain('viewBox="0 0 1269 1167"');
    expect(military).toContain("<path");
  });

  it("uses the approved laurel wreath for Diplomats", () => {
    expect(diplomats).toContain('viewBox="0 0 1139.86 945.34"');
    expect((diplomats.match(/<path/g) || []).length).toBeGreaterThanOrEqual(2);
    expect(diplomats).not.toContain("<ellipse");
  });

  it("uses the approved stylized flame for Inquisition", () => {
    expect(inquisition).toContain('viewBox="0 0 859.41 1430.42"');
    expect((inquisition.match(/<path/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  it("uses the approved minted-coin mark for Financiers", () => {
    expect(financiers).toContain('viewBox="0 0 974.21 1000.14"');
    expect((financiers.match(/<path/g) || []).length).toBeGreaterThanOrEqual(3);
    expect(financiers).not.toContain("side-profile");
  });

  it("uses the approved eye-in-triangle mark for Intelligence", () => {
    expect(intelligence).toContain('viewBox="0 0 1019.78 840.99"');
    expect(intelligence.match(/<path/g)).toHaveLength(3);
    expect(intelligence).toContain("<polygon");
    expect(intelligence).toContain("M570.5,715.89");
    expect(intelligence).toContain("M710.05,382.13");
    expect(intelligence).toContain("M581.62,502.92");
  });

  it("uses the approved pentagram seal for Mystics", () => {
    expect(mystics).toContain('viewBox="0 0 916.66 940.66"');
    expect((mystics.match(/<path/g) || []).length).toBeGreaterThanOrEqual(5);
  });

  it("records all six faction marks as approved", () => {
    expect(notes).toContain("All six faction marks are approved");
    expect(notes).toContain("**Intelligence** — eye within a triangular/pyramidal frame");
    expect(notes).not.toContain("still being refined");
    expect(notes).not.toContain("temporary production asset");
  });

  it("distinguishes the Mystics faction from the Arcane card type", () => {
    expect(notes).toContain("**Mystics**");
    expect(notes).toContain("`Arcane` is a card type, not a faction name.");
  });
});
