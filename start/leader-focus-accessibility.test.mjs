import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("start/app.js", "utf8");

describe("Start leader selection focus", () => {
  it("restores focus after rebuilding the selected Leader radio group", () => {
    expect(source).toContain("renderChoice();\n        focusSelectedLeader(leader.id);");
    expect(source).toContain("function focusSelectedLeader(leaderId)");
    expect(source).toContain(".find(input => input.value === leaderId);");
    expect(source).toContain("target?.focus({ preventScroll: true });");
  });
});
