import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function pngDimensions(path: string): { width: number; height: number } | null {
  const bytes = readFileSync(path);
  if (bytes.length < 24 || bytes.toString("ascii", 1, 4) !== "PNG") return null;
  return {
    width: bytes.readUInt32BE(16),
    height: bytes.readUInt32BE(20),
  };
}

describe("leader image asset diagnostics", () => {
  it("prints top-level image inventory and dimensions", () => {
    const directory = "images";
    const files = readdirSync(directory, { withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => {
        const path = join(directory, entry.name);
        return {
          name: entry.name,
          bytes: statSync(path).size,
          dimensions: pngDimensions(path),
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log("LEADER_IMAGE_INVENTORY=" + JSON.stringify(files));
    expect(files.length).toBeGreaterThan(0);
  });
});
