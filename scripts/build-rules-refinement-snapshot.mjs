#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { buildPrivacySafeReviewedBacklogSnapshot } from "../rules-assistant/refinement-snapshot.js";

function usage() {
  return "Usage: node scripts/build-rules-refinement-snapshot.mjs --interactions <wrangler.json> --diagnostics <wrangler.json> --audits <wrangler.json> --output <snapshot.json>";
}

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const name = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${name}`);
    args[name] = value;
    index += 1;
  }
  for (const required of ["interactions", "diagnostics", "audits", "output"]) {
    if (!args[required]) throw new Error(`Missing required --${required} argument.`);
  }
  return args;
}

function wranglerRows(value, label) {
  const blocks = Array.isArray(value) ? value : [value];
  const rows = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    if (block.success === false) throw new Error(`${label} D1 query reported failure.`);
    if (Array.isArray(block.results)) rows.push(...block.results);
  }
  if (!blocks.length) throw new Error(`${label} D1 query returned no result blocks.`);
  return rows;
}

async function readWranglerRows(path, label) {
  const raw = await readFile(resolve(path), "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new Error(`${label} D1 output is not valid JSON: ${error.message}`);
  }
  return wranglerRows(parsed, label);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [interactions, diagnostics, audits] = await Promise.all([
    readWranglerRows(args.interactions, "Interactions"),
    readWranglerRows(args.diagnostics, "Diagnostics"),
    readWranglerRows(args.audits, "Audits")
  ]);

  const snapshot = buildPrivacySafeReviewedBacklogSnapshot({ interactions, diagnostics, audits });
  const output = resolve(args.output);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");

  const stats = snapshot.stats || {};
  console.log([
    `Rules Arbiter reviewed backlog snapshot: ${stats.eligible ?? 0} active`,
    `${stats.high ?? 0} high`,
    `${stats.medium ?? 0} medium`,
    `${stats.historicalOnly ?? 0} historical-only`,
    `${stats.resolvedByRefinement ?? 0} resolved by refinement`,
    `${snapshot.clusters.length} clusters`
  ].join("; "));
}

main().catch((error) => {
  console.error(error.message);
  console.error(usage());
  process.exitCode = 1;
});
