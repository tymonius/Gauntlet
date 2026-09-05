import { ADMIN_PAGE_WITH_RULES_INTELLIGENCE } from "./admin-intelligence-page.js";

const TRIAGE_STYLE = String.raw`
    .triage-panel{margin:0 0 14px;padding:14px;border:1px solid #87632f55;border-radius:11px;background:#fffaf0}
    .triage-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:10px}
    .triage-head h2{margin:0 0 3px;font-size:22px}.triage-head p{margin:0;color:var(--muted);font-size:12px;max-width:760px}
    .triage-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}.triage-actions select{width:auto;min-width:180px}
    .triage-summary{display:grid;grid-template-columns:repeat(4,minmax(100px,1fr));gap:8px;margin:10px 0}
    .triage-stat{padding:10px;border:1px solid #87632f35;border-radius:9px;background:#fffdf8}.triage-stat strong{display:block;font:700 22px/1 Georgia,serif}.triage-stat span{font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase}
    .triage-clusters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.triage-cluster{padding:11px;border:1px solid #87632f35;border-radius:9px;background:#fffdf8}.triage-cluster h3{margin:0;font-size:16px}.triage-cluster-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.triage-cluster-meta{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.triage-cluster p{margin:8px 0;color:var(--muted);font-size:12px;line-height:1.4}.triage-cluster ol{margin:7px 0 0;padding-left:20px}.triage-cluster li{margin:7px 0;font-size:12px;line-height:1.35}.triage-reason{display:block;margin-top:2px;color:var(--muted);font-size:11px}.triage-score{font-weight:850;color:var(--red)}.triage-empty{padding:14px;border:1px dashed #87632f55;border-radius:9px;color:var(--muted);text-align:center}.triage-status{margin:7px 0 0;color:var(--muted);font-size:12px}
    @media(max-width:900px){.triage-clusters{grid-template-columns:1fr}.triage-summary{grid-template-columns:repeat(2,1fr)}.triage-head{flex-direction:column}.triage-actions{justify-content:flex-start}}
`;

const TRIAGE_HTML = String.raw`    <section id="rules-triage" class="triage-panel">
      <div class="triage-head"><div><p class="eyebrow">Refinement triage</p><h2>Deterministic attention queue</h2><p>Score new live interactions or mine already-reviewed interactions that still carry refinement signals. Clusters identify likely systemic root causes from feedback, confidence, ruling status, recorded authority, retrieval diagnostics, audits, and conversation continuity; no model call is made.</p></div><div class="triage-actions"><select id="triage-scope" aria-label="Triage scope"><option value="unreviewed">New / unreviewed</option><option value="reviewed_backlog">Reviewed backlog</option></select><button id="triage-refresh" type="button" class="btn alt">Refresh triage</button><button id="triage-export" type="button" class="btn alt" disabled>Export triage JSON</button></div></div>
      <div id="triage-summary" class="triage-summary"><article class="triage-stat"><strong>—</strong><span>High priority</span></article><article class="triage-stat"><strong>—</strong><span>Medium priority</span></article><article class="triage-stat"><strong>—</strong><span>Attention queue</span></article><article class="triage-stat"><strong>—</strong><span>Root-cause clusters</span></article></div>
      <div id="triage-clusters" class="triage-clusters"><div class="triage-empty">Waiting for refinement runtime…</div></div>
      <p id="triage-status" class="triage-status">Waiting for refinement runtime.</p>
    </section>
`;

export function enhanceRulesTriageAdmin(page = ADMIN_PAGE_WITH_RULES_INTELLIGENCE) {
  if (!page || page.includes('id="rules-triage"')) return page;
  let enhanced = page;
  if (!enhanced.includes('<form id="filters" class="filters">')) return page;
  enhanced = enhanced.replace('</style>', `${TRIAGE_STYLE}\n  </style>`);
  enhanced = enhanced.replace('    <form id="filters" class="filters">', `${TRIAGE_HTML}    <form id="filters" class="filters">`);
  return enhanced;
}

export const ADMIN_PAGE_WITH_RULES_TRIAGE = enhanceRulesTriageAdmin();
