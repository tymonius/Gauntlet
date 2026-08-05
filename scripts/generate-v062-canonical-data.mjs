import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { buildV062CanonicalData, V062_VERSION } from "../v0.6.2/data/canonical-data.js";

const root = process.cwd();
const basePath = path.join(root, "releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json");
const outputPath = path.join(root, "v0.6.2/data/Gauntlet_v0.6.2_Canonical_Data.json");
const base = JSON.parse(fs.readFileSync(basePath, "utf8"));
const data = buildV062CanonicalData(base);
const output = `${JSON.stringify(data, null, 2)}\n`;

if (process.argv.includes("--write")) {
  fs.writeFileSync(outputPath, output);
  console.log(`Wrote ${path.relative(root, outputPath)} (${data.cards.length} cards).`);
} else if (process.argv.includes("--check") && fs.existsSync(outputPath)) {
  const committed = fs.readFileSync(outputPath, "utf8");
  if (committed !== output) {
    console.error(`${path.relative(root, outputPath)} is stale. Run npm run data:v062:write.`);
    process.exit(1);
  }
  console.log(`${V062_VERSION} canonical data is current (${data.cards.length} cards).`);
} else {
  console.log(`${V062_VERSION} canonical data materialized in memory: ${data.cards.length} cards, ${data.territories.length} Territories, ${data.proposals.length} Proposals.`);
}
