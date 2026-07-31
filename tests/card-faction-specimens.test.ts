import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const specimenHtml = readFileSync("card-design/faction-specimens.html", "utf8");
const specimenCss = readFileSync("card-design/faction-specimens.css", "utf8");

describe("faction card-front specimens", () => {
  it("includes one canonical v0.6.1 specimen for Neutral and every faction", () => {
    for (const faction of [
      "neutral",
      "military",
      "diplomats",
      "financiers",
      "intelligence",
      "mystics",
      "inquisition",
    ]) {
      expect(specimenHtml).toContain(`data-faction="${faction}"`);
    }

    for (const title of [
      "Rallying Cry",
      "Unbroken Ranks",
      "Sanctions: Embargo",
      "Speculation",
      "Assassins",
      "Witchcraft",
      "Confession",
    ]) {
      expect(specimenHtml).toContain(title);
    }

    expect(specimenHtml).toContain("v0.6.1");
  });

  it("uses existing final or faction-reference artwork where available", () => {
    for (const path of [
      "../images/artwork/cards/neutral/rallying-cry.png",
      "../images/artwork/reference/reserve/battlefield-column-in-rain.png",
      "../images/artwork/cards/diplomats/sanctions-embargo.jpg",
      "../images/artwork/cards/intelligence/assassins.jpg",
      "../images/artwork/reference/environments/alchemist-study.jpg",
      "../images/artwork/reference/environments/inquisition-tribunal.jpg",
    ]) {
      expect(specimenHtml).toContain(path);
    }

    expect(specimenHtml).toContain("Artwork pending");
  });

  it("reserves Shock and Awe for a separate readable layout study", () => {
    expect(specimenHtml).not.toContain('<h3 class="card-title">Shock and Awe</h3>');
    expect(specimenHtml).toContain("Shock and Awe is intentionally reserved");
    expect(specimenHtml).not.toContain("ultra-dense-card");
  });

  it("keeps Neutral ivory and uses the established faction colors for outer borders", () => {
    for (const color of [
      "#eee7d5",
      "#9e262c",
      "#264f91",
      "#227044",
      "#282827",
      "#5d347e",
      "#a67a27",
    ]) {
      expect(specimenCss).toContain(color);
    }

    expect(specimenCss).toContain("background: var(--faction-border);");
  });
});
