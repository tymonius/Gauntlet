import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CANONICAL_INQUISITION = "#a67a27";

describe("Inquisition canonical faction color", () => {
  it("keeps canonical ochre across current public Inquisition identity surfaces", () => {
    const polish = readFileSync("site-polish.css", "utf8");
    const factionStyles = readFileSync("apps/factions/factions.css", "utf8");
    const referenceStyles = readFileSync("apps/card-reference/styles.css", "utf8");
    const referenceFactionColors = readFileSync("apps/card-reference/faction-colors.css", "utf8");
    const trackedStyles = readFileSync("apps/playtest/tracked/styles.css", "utf8");

    expect(factionStyles).toContain(`.faction-inquisition { --faction: ${CANONICAL_INQUISITION}; --faction-dark: ${CANONICAL_INQUISITION};`);
    expect(referenceStyles).toContain(`--preview-accent: ${CANONICAL_INQUISITION};`);
    expect(referenceFactionColors).toContain("color: var(--preview-accent);");
    expect(trackedStyles).toContain("color:var(--faction,#555)");

    expect(factionStyles).not.toContain("--faction-dark: #66470e");
    expect(polish).not.toContain("#815c1c");
    expect(polish).not.toContain("color-mix(in srgb, var(--faction, #555) 85%");
  });
});
