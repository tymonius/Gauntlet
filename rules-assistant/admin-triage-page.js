import { ADMIN_PAGE_WITH_RULES_INTELLIGENCE } from "./admin-intelligence-page.js";
import { createTriageEngine } from "./refinement-triage.js";

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
      <div id="triage-clusters" class="triage-clusters"><div class="triage-empty">Calculating triage…</div></div>
      <p id="triage-status" class="triage-status">Waiting for the authenticated dashboard.</p>
    </section>
`;

function runtimeCode() {
  const engineFactory = createTriageEngine.toString();
  return String.raw`
  var rulesTriageEngine=(${engineFactory})();
  var rulesTriageLastReport=null,rulesTriageLoading=false;
  var rulesTriageSummary=document.getElementById('triage-summary'),rulesTriageClusters=document.getElementById('triage-clusters'),rulesTriageStatus=document.getElementById('triage-status'),rulesTriageExport=document.getElementById('triage-export'),rulesTriageScope=document.getElementById('triage-scope');
  function rulesTriageStat(value,labelText){return '<article class="triage-stat"><strong>'+esc(value)+'</strong><span>'+esc(labelText)+'</span></article>'}
  function renderRulesTriage(report){
    rulesTriageLastReport=report;rulesTriageExport.disabled=false;
    rulesTriageSummary.innerHTML=rulesTriageStat(report.stats.high,'High priority')+rulesTriageStat(report.stats.medium,'Medium priority')+rulesTriageStat(report.stats.attention,'Attention queue')+rulesTriageStat(report.stats.clusters,'Root-cause clusters');
    if(!report.clusters.length){var empty=report.scope==='reviewed_backlog'?'No reviewed interactions currently carry deterministic refinement signals.':(report.stats.unreviewed?'No unreviewed interactions currently cross the deterministic attention threshold.':'There are no unreviewed interactions to triage right now.');rulesTriageClusters.innerHTML='<div class="triage-empty">'+empty+'</div>'}
    else{rulesTriageClusters.innerHTML=report.clusters.map(function(cluster){var reps=cluster.representatives.map(function(item){var why=(item.reasons||[]).slice(0,2).join(' · ');return '<li><span class="triage-score">'+esc(item.score)+'</span> · '+esc(item.question||'(blank question)')+(why?'<span class="triage-reason">'+esc(why)+'</span>':'')+'</li>'}).join('');return '<article class="triage-cluster"><div class="triage-cluster-head"><h3>'+esc(cluster.label)+'</h3><div class="triage-cluster-meta"><span class="badge '+(cluster.highCount?'bad':'')+'">'+esc(cluster.count)+' interaction'+(cluster.count===1?'':'s')+'</span>'+(cluster.highCount?'<span class="badge bad">'+esc(cluster.highCount)+' high</span>':'')+'</div></div><p><strong>Review batch:</strong> '+esc(cluster.count)+' · average score '+esc(cluster.averageScore)+' · max '+esc(cluster.maxScore)+'</p><p>'+esc(cluster.recommendedAction)+'</p><ol>'+reps+'</ol></article>'}).join('')}
    document.dispatchEvent(new CustomEvent('gauntlet:rules-triage',{detail:report}));
  }
  function refreshRulesTriage(){
    if(rulesTriageLoading)return Promise.resolve(rulesTriageLastReport);
    if(!state.token){rulesTriageStatus.textContent='Unlock the dashboard before refreshing triage.';return Promise.resolve(null)}
    var scope=rulesTriageScope&&rulesTriageScope.value==='reviewed_backlog'?'reviewed_backlog':'unreviewed';
    rulesTriageLoading=true;rulesTriageStatus.textContent=scope==='reviewed_backlog'?'Mining reviewed interactions for deterministic refinement signals…':'Calculating deterministic triage…';
    return Promise.all([api('/api/admin/export?format=json').then(function(r){return r.json()}),api('/api/admin/review-intelligence').then(function(r){return r.json()})]).then(function(results){var rows=results[0].interactions||[],report=rulesTriageEngine.triageInteractions(rows,results[1]||{},{scope:scope});renderRulesTriage(report);if(scope==='reviewed_backlog'){rulesTriageStatus.textContent=report.stats.eligible?'Found '+report.stats.eligible+' reviewed interaction'+(report.stats.eligible===1?'':'s')+' with refinement signals. '+report.stats.high+' are high priority across '+report.stats.clusters+' root-cause cluster'+(report.stats.clusters===1?'':'s')+'.':'No reviewed interactions currently carry deterministic refinement signals.'}else{rulesTriageStatus.textContent=report.stats.unreviewed?'Scored '+report.stats.unreviewed+' unreviewed interaction'+(report.stats.unreviewed===1?'':'s')+'. '+report.stats.attention+' currently need attention.':'All '+String(rows.length)+' recorded interactions are already reviewed; there is nothing new to triage.'}return report}).catch(function(error){rulesTriageStatus.textContent=error.message;throw error}).finally(function(){rulesTriageLoading=false})
  }
  function saveRulesTriage(){if(!rulesTriageLastReport)return;var safe={schema:rulesTriageLastReport.schema,generatedAt:rulesTriageLastReport.generatedAt,scope:rulesTriageLastReport.scope,source:'Live Rules Arbiter deterministic triage',privacy:{omitted:['anonymous session identifiers','raw IP addresses','OpenAI safety identifiers'],note:'Conversation linkage was used in-memory for continuity scoring but session identifiers are not exported.'},stats:rulesTriageLastReport.stats,clusters:rulesTriageLastReport.clusters,interactions:rulesTriageLastReport.interactions},blob=new Blob([JSON.stringify(safe,null,2)],{type:'application/json'}),suffix=rulesTriageLastReport.scope==='reviewed_backlog'?'reviewed-backlog':'unreviewed';saveFile(blob,'gauntlet-rules-triage-'+suffix+'-'+new Date().toISOString().slice(0,10)+'.json')}
  document.getElementById('triage-refresh').onclick=function(){refreshRulesTriage().catch(function(){})};
  if(rulesTriageScope)rulesTriageScope.onchange=function(){refreshRulesTriage().catch(function(){})};
  rulesTriageExport.onclick=saveRulesTriage;
  function refreshRulesTriageWhenVisible(){if(dashboard&&!dashboard.classList.contains('hidden'))refreshRulesTriage().catch(function(){})}
  if(dashboard)new MutationObserver(refreshRulesTriageWhenVisible).observe(dashboard,{attributes:true,attributeFilter:['class']});
  setTimeout(refreshRulesTriageWhenVisible,0);
`;
}

function injectRuntime(page, code) {
  const marker = "\n}());\n</script>";
  const index = page.lastIndexOf(marker);
  if (index < 0) return null;
  return page.slice(0, index) + `\n${code}` + page.slice(index);
}

export function enhanceRulesTriageAdmin(page = ADMIN_PAGE_WITH_RULES_INTELLIGENCE) {
  if (!page || page.includes('id="rules-triage"')) return page;
  let enhanced = page;
  if (!enhanced.includes('<form id="filters" class="filters">')) return page;
  enhanced = enhanced.replace('</style>', `${TRIAGE_STYLE}\n  </style>`);
  enhanced = enhanced.replace('    <form id="filters" class="filters">', `${TRIAGE_HTML}    <form id="filters" class="filters">`);
  const injected = injectRuntime(enhanced, runtimeCode());
  return injected || page;
}

export const ADMIN_PAGE_WITH_RULES_TRIAGE = enhanceRulesTriageAdmin();