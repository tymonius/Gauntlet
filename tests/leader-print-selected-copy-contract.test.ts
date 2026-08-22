import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("card-design/leader-card-copy.js", "utf8");

describe("selected Leader print copy loader", () => {
  it("does not make one Leader print wait for the entire hidden Leader catalog", () => {
    const printBranch = source.slice(
      source.indexOf("if (PRINT_LEADER_SPECIMEN_ID)"),
      source.indexOf("await waitForLeaderCards(root, entries.length)"),
    );

    expect(printBranch).toContain("waitForLeaderSpecimen(root, PRINT_LEADER_SPECIMEN_ID)");
    expect(printBranch).toContain("applyCopyToLeader(root, leaderId, copy, source, PRINT_LEADER_SPECIMEN_ID)");
    expect(printBranch).toContain("root.dataset.leaderCopyReady = 'true'");
    expect(printBranch).toContain("return;");
    expect(printBranch).not.toContain("waitForLeaderCards");
  });
});
