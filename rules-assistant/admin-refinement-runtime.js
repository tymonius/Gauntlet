export const ADMIN_REFINEMENT_RUNTIME_PATH = "/admin-refinement-runtime.js";

export function adminRefinementRuntimeSource() {
  return String.raw`(function(){
  'use strict';
  function byId(id){return document.getElementById(id)}
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]})}
  function token(){try{return sessionStorage.getItem('gauntlet_rules_admin_token')||''}catch(_error){return''}}
  function api(path){var auth=token();if(!auth)return Promise.reject(new Error('Unlock the dashboard before refreshing triage.'));return fetch(path,{headers:{'Authorization':'Bearer '+auth,'Content-Type':'application/json'}}).then(function(response){if(response.status===401)throw new Error('Admin token was rejected.');if(!response.ok)return response.json().catch(function(){return{}}).then(function(body){throw new Error(body.error||('Request failed: '+response.status))});return response.json()})}
  function saveJson(value,name){var blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(url)},1000)}
  function option(value,label){var node=document.createElement('option');node.value=value;node.textContent=label;return node}

  var scope=byId('triage-scope'),refreshButton=byId('triage-refresh'),exportButton=byId('triage-export'),summary=byId('triage-summary'),clusters=byId('triage-clusters'),status=byId('triage-status'),scaffoldSelect=byId('triage-scaffold-cluster'),scaffoldButton=byId('triage-scaffold');
  if(status)status.textContent='Refinement runtime initialized; loading triage…';
  if(!scope||!refreshButton||!exportButton||!summary||!clusters||!status||!scaffoldSelect||!scaffoldButton){if(status)status.textContent='Refinement runtime could not initialize: dashboard controls are missing.';console.error('Gauntlet refinement runtime is missing required dashboard controls.');return}

  var lastReport=null,loading=false,autoTimer=null;
  function selectedScope(){return scope.value==='reviewed_backlog'?'reviewed_backlog':'unreviewed'}
  function triageStat(value,label){return '<article class="triage-stat"><strong>'+esc(value)+'</strong><span>'+esc(label)+'</span></article>'}
  function renderScaffold(report){scaffoldSelect.innerHTML='';if(!report||!Array.isArray(report.clusters)||!report.clusters.length){scaffoldSelect.appendChild(option('','No attention clusters'));scaffoldSelect.disabled=true;scaffoldButton.disabled=true;return}report.clusters.forEach(function(cluster){scaffoldSelect.appendChild(option(cluster.rootCause,cluster.label+' — '+cluster.count))});scaffoldSelect.disabled=false;scaffoldButton.disabled=false}
  function bindingLabel(binding){if(!binding)return'';if(binding.authoritySetId)return'authority '+String(binding.authoritySetId).slice(0,12);if(binding.behaviorRevision)return'behavior '+binding.behaviorRevision;if(binding.commit)return'commit '+String(binding.commit).slice(0,12);return''}
  function resolvedMarkup(report){var resolved=Array.isArray(report.resolvedByRefinement)?report.resolvedByRefinement:[];if(!resolved.length)return'';var rows=resolved.slice(0,8).map(function(item){var binding=bindingLabel(item.binding);return '<li><code>'+esc(item.interactionId)+'</code><span class="triage-reason">'+esc(item.summary||item.resolutionId)+(binding?' · '+esc(binding):'')+'</span></li>'}).join('');return '<article class="triage-cluster triage-resolved"><div class="triage-cluster-head"><h3>Resolved by refinement</h3><div class="triage-cluster-meta"><span class="badge">'+esc(resolved.length)+' retired</span></div></div><p>These reviewed interactions matched the deterministic resolution ledger and are excluded from the active backlog.</p><ol>'+rows+'</ol>'+(resolved.length>8?'<p>+'+esc(resolved.length-8)+' more resolved interaction'+(resolved.length-8===1?'':'s')+' in the export.</p>':'')+'</article>'}
  function renderReport(report){
    lastReport=report;exportButton.disabled=false;
    summary.innerHTML=triageStat(report.stats.high,'High priority')+triageStat(report.stats.medium,'Medium priority')+triageStat(report.stats.attention,'Attention queue')+triageStat(report.stats.clusters,'Root-cause clusters')+triageStat(report.stats.resolvedByRefinement||0,'Resolved by refinement');
    if(!report.clusters.length){var empty=report.scope==='reviewed_backlog'?'No unresolved reviewed interactions currently carry deterministic refinement signals.':(report.stats.unreviewed?'No unreviewed interactions currently cross the deterministic attention threshold.':'There are no unreviewed interactions to triage right now.');clusters.innerHTML='<div class="triage-empty">'+esc(empty)+'</div>'}
    else{clusters.innerHTML=report.clusters.map(function(cluster){var reps=(cluster.representatives||[]).map(function(item){var why=(item.reasons||[]).slice(0,2).join(' · ');return '<li><span class="triage-score">'+esc(item.score)+'</span> · '+esc(item.question||'(blank question)')+(why?'<span class="triage-reason">'+esc(why)+'</span>':'')+'</li>'}).join('');return '<article class="triage-cluster"><div class="triage-cluster-head"><h3>'+esc(cluster.label)+'</h3><div class="triage-cluster-meta"><span class="badge '+(cluster.highCount?'bad':'')+'">'+esc(cluster.count)+' interaction'+(cluster.count===1?'':'s')+'</span>'+(cluster.highCount?'<span class="badge bad">'+esc(cluster.highCount)+' high</span>':'')+'</div></div><p><strong>Review batch:</strong> '+esc(cluster.count)+' · average score '+esc(cluster.averageScore)+' · max '+esc(cluster.maxScore)+'</p><p>'+esc(cluster.recommendedAction)+'</p><ol>'+reps+'</ol></article>'}).join('')}
    clusters.innerHTML+=resolvedMarkup(report);
    renderScaffold(report);
  }
  function reportStatus(report){var resolved=Number(report.stats.resolvedByRefinement||0),suffix=resolved?' '+resolved+' previously flagged interaction'+(resolved===1?' is':'s are')+' retired by the refinement ledger.':'';if(report.scope==='reviewed_backlog')return report.stats.eligible?'Found '+report.stats.eligible+' unresolved reviewed interaction'+(report.stats.eligible===1?'':'s')+' with refinement signals. '+report.stats.high+' are high priority across '+report.stats.clusters+' root-cause cluster'+(report.stats.clusters===1?'':'s')+'.'+suffix:'No unresolved reviewed interactions currently carry deterministic refinement signals.'+suffix;return report.stats.unreviewed?'Scored '+report.stats.unreviewed+' unreviewed interaction'+(report.stats.unreviewed===1?'':'s')+'. '+report.stats.attention+' currently need attention.':'All recorded interactions are already reviewed; there is nothing new to triage.'}
  function refresh(){
    if(loading)return Promise.resolve(lastReport);
    if(!token()){status.textContent='Unlock the dashboard before refreshing triage.';return Promise.resolve(null)}
    var currentScope=selectedScope();loading=true;status.textContent=currentScope==='reviewed_backlog'?'Mining reviewed interactions for deterministic refinement signals…':'Calculating deterministic triage…';
    return api('/api/admin/refinement-triage?scope='+encodeURIComponent(currentScope)).then(function(report){renderReport(report);status.textContent=reportStatus(report);return report}).catch(function(error){status.textContent='Refinement triage failed: '+error.message;throw error}).finally(function(){loading=false})
  }
  function exportReport(){if(!lastReport)return;var suffix=lastReport.scope==='reviewed_backlog'?'reviewed-backlog':'unreviewed';saveJson(lastReport,'gauntlet-rules-triage-'+suffix+'-'+new Date().toISOString().slice(0,10)+'.json')}
  function saveScaffold(){if(!scaffoldSelect.value)return Promise.resolve(false);var rootCause=scaffoldSelect.value,currentScope=selectedScope();status.textContent='Building '+rootCause.replace(/_/g,' ')+' refinement scaffold…';return api('/api/admin/refinement-scaffold?scope='+encodeURIComponent(currentScope)+'&rootCause='+encodeURIComponent(rootCause)).then(function(scaffold){saveJson(scaffold,'gauntlet-rules-refinement-'+rootCause+'-'+new Date().toISOString().slice(0,10)+'.json');status.textContent='Downloaded '+scaffold.label+' refinement scaffold for '+scaffold.cluster.count+' interaction'+(scaffold.cluster.count===1?'':'s')+'. Review with ChatGPT before materializing a draft PR.';return true}).catch(function(error){status.textContent='Refinement scaffold failed: '+error.message;throw error})}

  refreshButton.onclick=function(){refresh().catch(function(){})};
  scope.onchange=function(){refresh().catch(function(){})};
  exportButton.onclick=exportReport;
  scaffoldButton.onclick=function(){saveScaffold().catch(function(){})};

  function autoStart(attempt){if(token()){if(autoTimer)clearTimeout(autoTimer);refresh().catch(function(){});return}if(attempt>=120){status.textContent='Unlock the dashboard before refreshing triage.';return}autoTimer=setTimeout(function(){autoStart(attempt+1)},500)}
  autoStart(0);
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
