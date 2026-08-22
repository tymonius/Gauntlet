import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("card-design/leader-card-copy.js", "utf8");

describe("Leader copy loader diagnostics", () => {
  it("retains the underlying loader error on the Leader review root", () => {
    expect(source).toContain("root.dataset.leaderCopyError = error?.message || String(error)");
  });
});
