import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const mysticsPage = readFileSync("factions/mystics/index.html", "utf8");

describe("published faction pages", () => {
  it("describes the v0.6.1 Mystics Ritual victory rather than the obsolete third-Rite win", () => {
    expect(mysticsPage).not.toContain("The third wins the game.");
    expect(mysticsPage).not.toContain("The third completion immediately wins the game");
    expect(mysticsPage).toContain(
      "The third unlocks Convergence and permission to begin the Ritual of Ascension."
    );
    expect(mysticsPage).toContain(
      "Initiate and win a battle while all three remain bound to complete the Ritual and win the game."
    );
  });
});
