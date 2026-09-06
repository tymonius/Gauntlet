import { enhanceRulesTriageAdmin } from "./admin-triage-page.js";

const CONTROLS = '<select id="triage-scaffold-cluster" aria-label="Root-cause cluster" disabled><option value="">No cluster selected</option></select><button id="triage-scaffold" type="button" class="btn alt" disabled>Scaffold refinement</button>';

export function enhanceRulesScaffoldAdmin(page) {
  let enhanced = enhanceRulesTriageAdmin(page);
  if (!enhanced || enhanced.includes('id="triage-scaffold"')) return enhanced;
  const marker = '<button id="triage-export" type="button" class="btn alt" disabled>Export triage JSON</button>';
  if (!enhanced.includes(marker)) return enhanced;
  return enhanced.replace(marker, `${marker}${CONTROLS}`);
}
