import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentRenderHtml = readFileSync("card-design/component-print-render.html", "utf8");
const componentRenderJs = readFileSync("card-design/component-print-render.js", "utf8");
const leaderCopyScript = readFileSync("card-design/leader-card-copy.js", "utf8");
const leaderCopy = JSON.parse(readFileSync("card-design/leader-copy/v0.6.4/leader-card-copy.json", "utf8"));
const printTransform = readFileSync("deckbuilder/print-duplex-sheet-pairing.js", "utf8");

describe("Deckbuilder current Leader printing", () => {
  it("loads the same standardized Leader copy layer used by the current Card Design catalog", () => {
    expect(componentRenderHtml).toContain('/card-design/leader-card-copy.js');
    expect(leaderCopyScript).toContain("./leader-copy/v0.6.4/leader-card-copy.json");
    expect(leaderCopy.gameVersion).toBe("v0.6.4-candidate");
    expect(Object.keys(leaderCopy.leaders)).toHaveLength(12);
  });

  it("does not detach a Leader into the print frame until current copy and fitting are complete", () => {
    expect(componentRenderJs).toContain('root?.dataset.leaderCopyReady === "true"');
    expect(componentRenderJs).toContain('card.dataset.leaderCopyVersion');
    expect(componentRenderJs).toContain('card.classList.contains("leader-card--standardized")');
    expect(componentRenderJs).toContain('card.dataset.parchmentLoaded === "true"');
    expect(componentRenderJs).toContain('card.dataset.titleFit === "true"');
    expect(componentRenderJs).toContain('Current Leader card copy failed to load.');
    expect(leaderCopyScript).toContain('delete leaderCard.dataset.titleFit');
    expect(leaderCopyScript).toContain("leaderCard.classList.remove('fit-warning', 'title-fit-warning', 'overlay-title-fit-warning')");
    expect(leaderCopyScript).toContain("window.dispatchEvent(new Event('resize'))");
  });

  it("keeps the Deckbuilder Leader shell only as a handoff to the current production component renderer", () => {
    expect(printTransform).toContain('replaceProductionLeader(documentNode, currentGame)');
    expect(printTransform).toContain('currentGame.findLeader?.(faction, leaderId)');
    expect(printTransform).toContain('kind: "leader"');
    expect(printTransform).toContain('id: `${faction}-${leader.id}`');
    expect(printTransform).toContain('/card-design/component-print-render.html?kind=');
  });

  it("locks a representative Leader to the latest standardized wording rather than the older legacy Orders copy", () => {
    const general = leaderCopy.leaders.general;
    const orders = general.sections.find((section: any) => section.name === "Orders");
    const onward = orders.items.find((item: any) => item.name === "Onward");
    const rout = orders.items.find((item: any) => item.name === "Rout");

    expect(onward.text).toBe("During your Movement, move one additional Position. This may start a Battle.");
    expect(rout.text).toBe("Advance one Position. This movement may create a pending battle.");
    expect(general.sections[0].name).toBe("Run the Gauntlet");
  });
});
