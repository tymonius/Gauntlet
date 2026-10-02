import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const preparation = readFileSync("card-design/face-preparation.mjs", "utf8");

describe("card title fitting", () => {
  it("allows long one-line titles to shrink to the canonical minimum", () => {
    expect(preparation).toContain("DEFAULT_MINIMUM_TITLE_SIZE");
    expect(preparation).toContain(
      "while (title.scrollWidth > title.clientWidth + 0.5 && size > minimum)"
    );
  });

  it("records title fit state and treats unresolved clipping as a card fit failure", () => {
    expect(preparation).toContain("card.classList.toggle('title-fit-warning', !fits)");
    expect(preparation).toContain("card.dataset.titleFit = fits ? 'true' : 'false'");
    expect(preparation).toContain("const titleFits = fitTitle(card)");
    expect(preparation).toContain("const fits = titleFits && overlayFits && !cardOverflows(card)");
    expect(preparation).toContain("card.classList.toggle('fit-warning', !fits)");
  });
});
