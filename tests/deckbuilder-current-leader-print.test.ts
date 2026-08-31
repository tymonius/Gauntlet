import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentRenderHtml = readFileSync("card-design/component-print-render.html", "utf8");
const componentRenderJs = readFileSync("card-design/component-print-render.js", "utf8");
const leaderCopyScript = readFileSync("card-design/leader-card-copy.js", "utf8");
const currentGame = JSON.parse(readFileSync("game-data/current-game.json", "utf8"));
const printTransform = readFileSync("deckbuilder/print-duplex-sheet-pairing.js", "utf8");

describe("Deckbuilder current Leader printing", () => {
  it("loads standardized Leader rules from current-game authority", () => {
    expect(componentRenderHtml).toContain('/card-design/leader-card-copy.js');
    expect(leaderCopyScript).toContain("import('../game-data/current-game.mjs')");
    expect(leaderCopyScript).toContain('currentGame.leaders');
    expect(leaderCopyScript).not.toContain('leader-card-copy.json');
    expect(currentGame.version).toBe("v0.7.1");
    expect(currentGame.leaders).toHaveLength(12);
  });

  it("standardizes only the requested Leader inside a component print iframe", () => {
    expect(leaderCopyScript).toContain("PRINT_LEADER_SPECIMEN_ID");
    expect(leaderCopyScript).toContain("params.get('kind')");
    expect(leaderCopyScript).toContain("params.get('id')");
    expect(leaderCopyScript).toContain("waitForLeaderSpecimen(root, PRINT_LEADER_SPECIMEN_ID)");
    expect(leaderCopyScript).toContain("applyCopyToLeader(root, leaderId, copy, source, PRINT_LEADER_SPECIMEN_ID)");
    expect(leaderCopyScript).toContain("if (PRINT_LEADER_SPECIMEN_ID)");
    expect(leaderCopyScript).toContain("return;");
    expect(leaderCopyScript).toContain("await waitForLeaderCards(root, entries.length)");
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
    expect(leaderCopyScript).toContain("root.dataset.leaderCopyReady = 'true'");
    expect(leaderCopyScript).toContain("root.dataset.leaderCopyError = error?.message || String(error)");
    expect(leaderCopyScript).toContain("window.dispatchEvent(new Event('resize'))");
  });

  it("renders the selected Leader directly through the current production component renderer", () => {
    expect(printTransform).toContain("function renderProductionLeaderHtml(faction, leader)");
    expect(printTransform).toContain('currentGame.findLeader?.(factionId, leaderId)');
    expect(printTransform).toContain('kind: "leader"');
    expect(printTransform).toContain('id: `${factionId}-${canonicalLeader.id}`');
    expect(printTransform).toContain('/card-design/component-print-render.html?kind=');
    expect(printTransform).not.toContain("replaceProductionLeader");
  });

  it("locks a representative Leader to the finalized current wording", () => {
    const general = currentGame.leaders.find((leader: any) => leader.id === 'general');
    const orders = general.sections.find((section: any) => section.name === "Orders");
    const onward = orders.items.find((item: any) => item.name === "Onward");
    const rout = orders.items.find((item: any) => item.name === "Rout");

    expect(onward.text).toBe("During your Movement, move one additional Position. This may start a Battle.");
    expect(rout.text).toBe("Advance one Position. This movement may initiate a battle.");
    expect(general.sections[0].name).toBe("Run the Gauntlet");
  });
});
