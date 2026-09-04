import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Inquisition canonical faction color", () => {
  it("keeps canonical ochre across public Inquisition identity surfaces", () => {
    const polish = readFileSync("site-polish.css", "utf8");
    const factionStyles = readFileSync("factions/factions.css", "utf8");
    const referenceStyles = readFileSync("card-reference/styles.css", "utf8");
    const referenceFactionColors = readFileSync("card-reference/faction-colors.css", "utf8");
    const trackedStyles = readFileSync("playtest/tracked/styles.css", "utf8");
    const rulebookApp = readFileSync("rulebook/app.js", "utf8");

    expect(factionStyles).toContain(".faction-inquisition { --faction: #a67a27; --faction-dark: #a67a27;");
    expect(referenceStyles).toContain("--preview-accent: #a67a27;");
    expect(referenceFactionColors).toContain("color: var(--preview-accent);");
    expect(trackedStyles).toContain("color:var(--faction,#555)");
    expect(rulebookApp).toContain("['Inquisition', { color: '#a67a27'");

    expect(factionStyles).not.toContain("--faction-dark: #66470e");
    expect(rulebookApp).not.toContain("#9a6e21");
    expect(polish).not.toContain("#815c1c");
    expect(polish).not.toContain("color-mix(in srgb, var(--faction, #555) 85%");
  });
});
