import { ADMIN_PAGE_WITH_RULES_INTELLIGENCE } from "./admin-intelligence-page.js";
import { createTriageEngine } from "./refinement-triage.js";

const TRIAGE_STYLE = String.raw`
    .triage-panel{margin:0 0 14px;padding:14px;border:1px solid #87632f55;border-radius:11px;background:#fffaf0}
    .triage-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px;margin-bottom:10px}
    .triage-head h2{margin:0 0 3px;font-size:22px}.triage-head p{margin:0;color:var(--muted);font-size:12px;max-width:760px}
    .triage-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
    .triage-summary{display:grid;grid-template-columns:repeat(4,minmax(100px,1fr));gap:8px;margin:10px 0}
    .triage-stat{padding:10px;border:1px solid #87632f35;border-radius:9px;background:#fffdf8}.triage-stat strong{display:block;font:700 22px/1 Georgia,serif}.triage-stat span{font-size:10px;color:var(--muted);font-weight:800;text-transform:uppercase}
    .triage-clusters{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.triage-cluster{padding:11px;border:1px solid #87632f35;border-radius:9px;background:#fffdf8}.triage-cluster h3{margin:0;font-size:16px}.triage-cluster-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.triage-cluster-meta{display:flex;gap:5px;flex-wrap:wrap;justify-content:flex-end}.triage-cluster p{margin:8px 0;color:var(--muted);font-size:12px;line-height:1.4}.triage-cluster ol{margin:7px 0 0;padding-left:20px}.triage-cluster li{margin:5px 0;font-size:12px;line-height:1.35}.triage-score{font-weight:850;color:var(--red)}.triage-empty{padding:14px;border:1px dashed #87632f55;border-radius:9px;color:var(--muted);text-align:center}.triage-status{margin:7px 0 0;color:var(--muted);font-size:12px}
    @media(max-width:900px){.triage-clusters{grid-template-columns:1fr}.triage-summary{grid-template-columns:repeat(2,1fr)}.triage-head{flex-direction:column}.triage-actions{justify-content:flex-start}}
`;

const TRIAGE_HTML = String.raw`    <section id="rules-triage" class="triage-panel">
      <div class="triage-head"><div><p class="eyebrow">Refinement triage</p><h2>Deterministic attention queue</h2><p>Unreviewed live interactions are scored from feedback, confidence, ruling status, recorded authority, retrieval diagnostics, and conversation continuity. Clusters identify likely systemic root causes; no model call is made.</p></div><div class="triage-actions"><button id="triage-refresh" type="button" class="btn alt">Refresh triage</button><button id="triage-export" type="button" class="btn alt" disabled>Export triage JSON</button></div></div>
      <div id="triage-summary" class="triage-summary"><article class="triage-stat"><strong>—</strong><span>High priority</span></article><article class="triage-stat"><strong>—</strong><span>Medium priority</span></article><article class="triage-stat"><strong>—</strong><span>Attention queue</span></article><article class="triage-stat"><strong>—</strong><span>Root-cause clusters</span></article></div>
      <div id="triage-clusters" class="triage-clusters"><div class="triage-empty">Open the dashboard to calculate triage.</div></div>
      <p id="triage-status" class="triage-status"></p>
    </section>
`;

function browserScript() {
  const engineFactory = createTriageEngine.toString();
  return String.raw`<script id="rules-triage-script">
(function(){
  var engine=(${engineFactory})();
  var lastReport=null,loading=false;
  var summaryEl=document.getElementById('triage-summary'),clustersEl=document.getElementById('triage-clusters'),statusEl=document.getElementById('triage-status'),exportButton=document.getElementById('triage-export');
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]})}
  function adminApi(path){var token=sessionStorage.getItem('gauntlet_rules_admin_token')||'';return fetch(path,{headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'}}).then(function(response){if(response.status===401)throw new Error('Admin token was rejected.');if(!response.ok)throw new Error('Triage request failed: '+response.status);return response.json()})}
  function stat(value,label){return '<article class="triage-stat"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span></article>'}
  function render(report){
    lastReport=report;exportButton.disabled=false;
    summaryEl.innerHTML=stat(report.stats.high,'High priority')+stat(report.stats.medium,'Medium priority')+stat(report.stats.attention,'Attention queue')+stat(report.stats.clusters,'Root-cause clusters');
    if(!report.clusters.length){clustersEl.innerHTML='<div class="triage-empty">No unreviewed interactions currently cross the deterministic attention threshold.</div>';return}
    clustersEl.innerHTML=report.clusters.map(function(cluster){var reps=cluster.representatives.map(function(item){return '<li><span class="triage-score">'+esc(item.score)+'</span> · '+esc(item.question||'(blank question)')+'</li>'}).join('');return '<article class="triage-cluster"><div class="triage-cluster-head"><h3>'+esc(cluster.label)+'</h3><div class="triage-cluster-meta"><span class="badge '+(cluster.highCount?'bad':'')+'">'+esc(cluster.count)+' interaction'+(cluster.count===1?'':'s')+'</span>'+(cluster.highCount?'<span class="badge bad">'+esc(cluster.highCount)+' high</span>':'')+'</div></div><p><strong>Review batch:</strong> '+esc(cluster.count)+' · average score '+esc(cluster.averageScore)+' · max '+esc(cluster.maxScore)+'</p><p>'+esc(cluster.recommendedAction)+'</p><ol>'+reps+'</ol></article>'}).join('');
  }
  function refresh(){if(loading)return Promise.resolve();var token=sessionStorage.getItem('gauntlet_rules_admin_token')||'';if(!token)return Promise.resolve();loading=true;statusEl.textContent='Calculating deterministic triage…';return Promise.all([adminApi('/api/admin/export?format=json'),adminApi('/api/admin/review-intelligence')]).then(function(results){var report=engine.triageInteractions(results[0].interactions||[],results[1]||{});render(report);statusEl.textContent='Scored '+report.stats.unreviewed+' unreviewed interaction'+(report.stats.unreviewed===1?'':'s')+'. '+report.stats.attention+' currently need attention.'}).catch(function(error){statusEl.textContent=error.message}).finally(function(){loading=false})}
  function saveReport(){if(!lastReport)return;var safe={schema:lastReport.schema,generatedAt:lastReport.generatedAt,source:'Live Rules Arbiter deterministic triage',privacy:{omitted:['anonymous session identifiers','raw IP addresses','OpenAI safety identifiers'],note:'Conversation linkage was used in-memory for continuity scoring but session identifiers are not exported.'},stats:lastReport.stats,clusters:lastReport.clusters,interactions:lastReport.interactions},blob=new Blob([JSON.stringify(safe,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='gauntlet-rules-triage-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},0)}
  document.getElementById('triage-refresh').addEventListener('click',refresh);
  exportButton.addEventListener('click',saveReport);
  var dashboard=document.getElementById('dashboard');
  function refreshWhenVisible(){if(dashboard&&!dashboard.classList.contains('hidden'))refresh()}
  if(dashboard)new MutationObserver(refreshWhenVisible).observe(dashboard,{attributes:true,attributeFilter:['class']});
  setTimeout(refreshWhenVisible,0);
})();
</script>`;
}

export function enhanceRulesTriageAdmin(page = ADMIN_PAGE_WITH_RULES_INTELLIGENCE) {
  if (!page || page.includes('id="rules-triage"')) return page;
  let enhanced = page;
  if (!enhanced.includes('<form id="filters" class="filters">')) return page;
  enhanced = enhanced.replace('</style>', `${TRIAGE_STYLE}\n  </style>`);
  enhanced = enhanced.replace('    <form id="filters" class="filters">', `${TRIAGE_HTML}    <form id="filters" class="filters">`);
  enhanced = enhanced.replace('</body>', `${browserScript()}\n</body>`);
  return enhanced;
}

export const ADMIN_PAGE_WITH_RULES_TRIAGE = enhanceRulesTriageAdmin();
