import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { validateSharedD1Schema } from "../scripts/validate-shared-d1-schema.mjs";

const original = JSON.parse(readFileSync("config/shared-d1-schema.json", "utf8"));
const check = override => validateSharedD1Schema({ contract: override });

describe("shared D1 schema ownership and migration history", () => {
  it("uses one ordered, byte-verified migration source for both deployed Workers", () => {
    expect(check(original)).toEqual([]);
  });

  it("fails closed if any previously recorded migration is rewritten", () => {
    const modified = structuredClone(original);
    modified.migrations[0].git_blob_sha = "0".repeat(40);
    expect(check(modified)).toEqual(expect.arrayContaining([
      expect.stringContaining("Migration bytes changed: 0001_rules_interactions.sql"),
    ]));
  });

  it("requires complete migration inventory, not a partial manifest", () => {
    const modified = structuredClone(original);
    modified.migrations.pop();
    expect(check(modified)).toEqual(expect.arrayContaining([
      expect.stringContaining("Migration manifest and canonical SQL directory differ"),
    ]));
  });

  it("rejects missing or duplicated consumer configuration", () => {
    const modified = structuredClone(original);
    modified.consumer_configs = ["rules-assistant/wrangler.toml", "missing/wrangler.toml"];
    expect(check(modified)).toEqual(expect.arrayContaining([
      expect.stringContaining("Missing D1 consumer config"),
    ]));
  });

  it("rejects a missing migration executor or changed deployment ordering", () => {
    const modified = structuredClone(original);
    modified.migration_executor.step = "Missing step";
    expect(check(modified)).toEqual(expect.arrayContaining([
      expect.stringContaining("Migration application must precede"),
    ]));
  });
});
