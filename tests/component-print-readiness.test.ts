import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentRenderer = readFileSync("card-design/component-render.js", "utf8");

describe("production component print readiness", () => {
  it("replays the shared card preparation lifecycle after an asynchronously inserted component exists", () => {
    expect(componentRenderer).toContain("needsSharedCardPreparation(card)");
    expect(componentRenderer).toContain("card.dataset.parchmentLoaded === undefined");
    expect(componentRenderer).toContain("card.dataset.titleFit === undefined");
    expect(componentRenderer).toContain("card && !sharedPreparationRequested && needsSharedCardPreparation(card)");
    expect(componentRenderer).toContain('window.dispatchEvent(new Event("load"))');

    const selectIndex = componentRenderer.indexOf("card = selectedCard();");
    const replayIndex = componentRenderer.indexOf('window.dispatchEvent(new Event("load"))');
    const readyIndex = componentRenderer.indexOf("if (card && fitReady(card) && imagesReady(card)) break;");
    expect(selectIndex).toBeGreaterThan(-1);
    expect(replayIndex).toBeGreaterThan(selectIndex);
    expect(readyIndex).toBeGreaterThan(replayIndex);
  });
});
