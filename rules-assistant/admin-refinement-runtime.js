import { createTriageEngine } from "./refinement-triage.js";
import { createRefinementScaffoldEngine } from "./refinement-scaffold.js";

export const ADMIN_REFINEMENT_RUNTIME_PATH = "/admin-refinement-runtime.js";

export function adminRefinementRuntimeSource() {
  const triageFactory = createTriageEngine.toString();
  const scaffoldFactory = createRefinementScaffoldEngine.toString();
  return String.raw`(function(){
  'use strict';
  var triage=(${triageFactory})();
  var scaffoldEngine=(${scaffoldFactory})();
  function byId(id){return document.getElementById(id)}
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]})}
  function token(){try{return sessionStorage.getItem('gauntlet_rules_admin_token')||''}catch(_error){return''}}
  function api(path){var auth=token();if(!auth)return Promise.reject(new Error('Unlock the dashboard before refreshing triage.'));return fetch(path,{headers:{'Authorization':'Bearer '+auth,'Content-Type':'application/json'}}).then(function(response){if(response.status===401)throw new Error('Admin token was rejected.');if(!response.ok)return response.json().catch(function(){return{}}).then(function(body){throw new Error(body.error||('Request failed: '+response.status))});return response.json()})}
  function saveFile(blob,name){var url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000)}
  function option(value,label){var node=document.createElement('option');node.value=value;node.textContent=label;return node}

  var dashboard=byId('dashboard'),scope=byId('triage-scope'),refreshButton=byId('triage-refresh'),exportButton=byId('triage-export'),summary=byId('triage-summary'),clusters=byId('triage-clusters'),status=byId('triage-status'),scaffoldSelect=byId('triage-scaffold-cluster'),scaffoldButton=byId('triage-scaffold');
  if(!scope||!refreshButton||!exportButton||!summary||!clusters||!status||!scaffoldSelect||!scaffoldButton){if(status)status.textContent='Refinement runtime could not initialize.';console.error('Gauntlet refinement runtime is missing required dashboard controls.');return}

  var lastReport=null,loading=false;
  function triageStat(value,label){return '<article class="triage-stat"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span></article>'}
  function renderScaffold(report){scaffoldSelect.innerHTML='';if(!report||!Array.isArray(report.clusters)||!report.clusters.length){scaffoldSelect.appendChild(option('','No attention clusters'));scaffoldSelect.disabled=true;scaffoldButton.disabled=true;return}report.clusters.forEach(function(cluster){scaffoldSelect.appendChild(option(cluster.rootCause,cluster.label+' — '+cluster.count))});scaffoldSelect.disabled=false;scaffoldButton.disabled=false}
  function renderReport(report){
    lastReport=report;exportButton.disabled=false;
    summary.innerHTML=triageStat(report.stats.high,'High priority')+triageStat(report.stats.medium,'Medium priority')+triageStat(report.stats.attention,'Attention queue')+triageStat(report.stats.clusters,'Root-cause clusters');
    if(!report.clusters.length){var empty=report.scope==='reviewed_backlog'?'No reviewed interactions currently carry deterministic refinement signals.':(report.stats.unreviewed?'No unreviewed interactions currently cross the deterministic attention threshold.':'There are no unreviewed interactions to triage right now.');clusters.innerHTML='<div class="triage-empty">'+esc(empty)+'</div>'}
    else{clusters.innerHTML=report.clusters.map(function(cluster){var reps=(cluster.representatives||[]).map(function(item){var why=(item.reasons||[]).slice(0,2).join(' · ');return '<li><span class="triage-score">'+esc(item.score)+'</span> · '+esc(item.question||'(blank question)')+(why?'<span class="triage-reason">'+esc(why)+'</span>':'')+'</li>'}).join('');return '<article class="triage-cluster"><div class="triage-cluster-head"><h3>'+esc(cluster.label)+'</h3><div class="triage-cluster-meta"><span class="badge '+(cluster.highCount?'bad':'')+'">'+esc(cluster.count)+' interaction'+(cluster.count===1?'':'s')+'</span>'+(cluster.highCount?'<span class="badge bad">'+esc(cluster.highCount)+' high</span>':'')+'</div></div><p><strong>Review batch:</strong> '+esc(cluster.count)+' · average score '+esc(cluster.averageScore)+' · max '+esc(cluster.maxScore)+'</p><p>'+esc(cluster.recommendedAction)+'</p><ol>'+reps+'</ol></article>'}).join('')}
    renderScaffold(report);
  }
  function refresh(){
    if(loading)return Promise.resolve(lastReport);
    if(!token()){status.textContent='Unlock the dashboard before refreshing triage.';return Promise.resolve(null)}
    var selectedScope=scope.value==='reviewed_backlog'?'reviewed_backlog':'unreviewed';
    loading=true;status.textContent=selectedScope==='reviewed_backlog'?'Mining reviewed interactions for deterministic refinement signals…':'Calculating deterministic triage…';
    return Promise.all([api('/api/admin/export?format=json'),api('/api/admin/review-intelligence')]).then(function(results){var rows=results[0].interactions||[],report=triage.triageInteractions(rows,results[1]||{},{scope:selectedScope});renderReport(report);if(selectedScope==='reviewed_backlog'){status.textContent=report.stats.eligible?'Found '+report.stats.eligible+' reviewed interaction'+(report.stats.eligible===1?'':'s')+' with refinement signals. '+report.stats.high+' are high priority across '+report.stats.clusters+' root-cause cluster'+(report.stats.clusters===1?'':'s')+'.':'No reviewed interactions currently carry deterministic refinement signals.'}else{status.textContent=report.stats.unreviewed?'Scored '+report.stats.unreviewed+' unreviewed interaction'+(report.stats.unreviewed===1?'':'s')+'. '+report.stats.attention+' currently need attention.':'All '+rows.length+' recorded interactions are already reviewed; there is nothing new to triage.'}return report}).catch(function(error){status.textContent=error.message;throw error}).finally(function(){loading=false})
  }
  function exportReport(){if(!lastReport)return;var safe={schema:lastReport.schema,generatedAt:lastReport.generatedAt,scope:lastReport.scope,source:'Live Rules Arbiter deterministic triage',privacy:{omitted:['anonymous session identifiers','raw IP addresses','OpenAI safety identifiers'],note:'Conversation linkage was used in-memory for continuity scoring but session identifiers are not exported.'},stats:lastReport.stats,clusters:lastReport.clusters,interactions:lastReport.interactions},blob=new Blob([JSON.stringify(safe,null,2)],{type:'application/json'}),suffix=lastReport.scope==='reviewed_backlog'?'reviewed-backlog':'unreviewed';saveFile(blob,'gauntlet-rules-triage-'+suffix+'-'+new Date().toISOString().slice(0,10)+'.json')}
  function saveScaffold(){if(!lastReport||!scaffoldSelect.value)return false;var scaffold=scaffoldEngine.buildRefinementScaffold(lastReport,scaffoldSelect.value),blob=new Blob([JSON.stringify(scaffold,null,2)],{type:'application/json'});saveFile(blob,'gauntlet-rules-refinement-'+scaffoldSelect.value+'-'+new Date().toISOString().slice(0,10)+'.json');status.textContent='Downloaded '+scaffold.label+' refinement scaffold for '+scaffold.cluster.count+' interaction'+(scaffold.cluster.count===1?'':'s')+'. Review with ChatGPT before materializing a draft PR.';return true}

  refreshButton.onclick=function(){refresh().catch(function(){})};
  scope.onchange=function(){refresh().catch(function(){})};
  exportButton.onclick=exportReport;
  scaffoldButton.onclick=function(){if(saveScaffold())return;refresh().then(function(){saveScaffold()}).catch(function(){})};

  function activate(){if(!dashboard||!dashboard.classList.contains('hidden'))refresh().catch(function(){})}
  if(dashboard)new MutationObserver(activate).observe(dashboard,{attributes:true,attributeFilter:['class']});
  setTimeout(activate,0);
}());`;
}

export function attachAdminRefinementRuntime(html) {
  const source = String(html || "");
  if (!source || source.includes(`src="${ADMIN_REFINEMENT_RUNTIME_PATH}"`)) return source;
  const tag = `<script src="${ADMIN_REFINEMENT_RUNTIME_PATH}" defer></script>`;
  return source.includes("</body>") ? source.replace("</body>", `${tag}\n</body>`) : `${source}\n${tag}`;
}

export function allowAdminRefinementRuntime(contentSecurityPolicy) {
  const policy = String(contentSecurityPolicy || "");
  if (!policy) return policy;
  const pattern = /(\bscript-src\b[^;]*)/i;
  const match = policy.match(pattern);
  if (!match) return `${policy.trim().replace(/;?$/, ";")} script-src 'self';`;
  if (/\bscript-src\b[^;]*'self'/i.test(policy)) return policy;
  return policy.replace(pattern, "$1 'self'");
}
