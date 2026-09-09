import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { refinementTriage } from "../rules-assistant/refinement-triage.js";
import {
  applyRefinementResolutionLedger,
  refinementResolutionLedger
} from "../rules-assistant/refinement-resolution-ledger.js";
import { applyCurrentValidityToRefinementReport } from "../rules-assistant/refinement-current-validity.js";

function d1Rows(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const chunks = Array.isArray(parsed) ? parsed : [parsed];
  const rows = [];
  for (const chunk of chunks) {
    if (Array.isArray(chunk?.results)) rows.push(...chunk.results);
    if (Array.isArray(chunk?.result)) {
      for (const nested of chunk.result) {
        if (Array.isArray(nested?.results)) rows.push(...nested.results);
      }
    }
  }
  return rows;
}

const interactions = d1Rows(".tmp/reviewed-backlog/interactions.json");
const audits = d1Rows(".tmp/reviewed-backlog/audits.json");
const diagnostics = d1Rows(".tmp/reviewed-backlog/diagnostics.json");

const raw = refinementTriage.triageInteractions(
  interactions,
  { audits, diagnostics },
  { scope: "reviewed_backlog" }
);
const unresolved = applyRefinementResolutionLedger(raw, refinementResolutionLedger);
const report = applyCurrentValidityToRefinementReport(unresolved, audits);

mkdirSync(".tmp/reviewed-backlog", { recursive: true });
writeFileSync(".tmp/reviewed-backlog/report.json", JSON.stringify(report, null, 2) + "\n");

console.log(JSON.stringify({
  stats: report.stats,
  clusters: report.clusters,
  top: (report.interactions || []).slice(0, 20)
}, null, 2));
