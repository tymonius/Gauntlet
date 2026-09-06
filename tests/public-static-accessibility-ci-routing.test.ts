import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(".github/workflows/test.yml", "utf8");

describe("public static accessibility CI routing", () => {
  it("routes HTML changes through the accessibility contract", () => {
    expect(workflow).toContain("const accessibility = uncertain || matches(/\\.html$/) || exact('tests/public-static-accessibility.test.ts');");
    expect(workflow).toContain("core.setOutput('accessibility', String(accessibility));");
    expect(workflow).toContain("['Public static accessibility', String(accessibility)]");
  });

  it("runs the static accessibility contract for that scope", () => {
    expect(workflow).toContain("if: steps.scope.outputs.accessibility == 'true'");
    expect(workflow).toContain("run: npx vitest run tests/public-static-accessibility.test.ts");
  });
});
