import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const readSymbol = (name: string) => readFileSync(`images/faction-symbols/${name}.svg`, "utf8");

const military = readSymbol("military");
const diplomats = readSymbol("diplomats");
const inquisition = readSymbol("inquisition");
const financiers = readSymbol("financiers");
const mystics = readSymbol("mystics");
const notes = readFileSync("images/faction-symbols/README.md", "utf8");

describe("approved faction symbols", () => {
  it("keeps the approved cavalry-saber Military mark", () => {
    expect(military).toContain('viewBox="0 0 1269 1167"');
    expect(military).toContain("<path");
  });

  it("uses the simplified laurel wreath for Diplomats", () => {
    expect(diplomats).toContain('viewBox="0 0 64 64"');
    expect(diplomats).toContain('fill-rule="evenodd"');
    expect(diplomats).not.toContain("<ellipse");
  });

  it("uses the approved stylized flame for Inquisition", () => {
    expect(inquisition).toContain('viewBox="0 0 64 64"');
    expect(inquisition).toContain('fill-rule="evenodd"');
    expect(inquisition.match(/<path/g)).toHaveLength(1);
  });

  it("uses a clearly minted coin with a solid six-pointed star for Financiers", () => {
    expect(financiers).toContain('viewBox="0 0 64 64"');
    expect(financiers.match(/<circle/g)).toHaveLength(2);
    expect(financiers).toContain("M 32.00 18.00");
    expect(financiers).not.toContain("side-profile");
  });

  it("uses the approved pentagram seal for Mystics", () => {
    expect(mystics).toContain('viewBox="0 0 64 64"');
    expect(mystics).toContain('<circle cx="32" cy="32" r="27"');
    expect(mystics).toContain("L 43.17 47.37");
  });

  it("records Intelligence as pending final artwork rather than treating the temporary eye as approved", () => {
    expect(notes).toContain("Intelligence");
    expect(notes).toContain("still being refined");
    expect(notes).toContain("temporary production asset");
  });

  it("distinguishes the Mystics faction from the Arcane card type", () => {
    expect(notes).toContain("**Mystics**");
    expect(notes).toContain("`Arcane` is a card type, not a faction name.");
  });
});
