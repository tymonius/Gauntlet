import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const cardScript = readFileSync("card-design/card-design.js", "utf8");
const rendererScript = readFileSync("card-design/playable-card-renderer.js", "utf8");

describe("card title fitting", () => {
  it("allows long one-line titles to shrink below the previous clipping floor", () => {
    expect(cardScript).toContain(
      "const DEFAULT_MINIMUM_TITLE_SIZE = 8 * CSS_PIXELS_PER_POINT;"
    );
    expect(cardScript).toContain(
      "while (title.scrollWidth > title.clientWidth + 0.5 && size > minimum)"
    );
  });

  it("records title fit state and treats unresolved clipping as a card fit failure", () => {
    expect(cardScript).toContain("card.classList.toggle('title-fit-warning', !fits)");
    expect(cardScript).toContain("card.dataset.titleFit = fits ? 'true' : 'false'");
    expect(cardScript).toContain("const titleFits = fitTitle(card)");
    expect(cardScript).toContain("if (!titleFits || cardOverflows(card))");
  });

  it("keeps the headless renderer from clearing warnings while a title is clipped", () => {
    expect(rendererScript).toContain("const title = element?.querySelector('.card-title')");
    expect(rendererScript).toContain(
      "return title.scrollWidth > title.clientWidth + 0.5"
    );
  });
});
