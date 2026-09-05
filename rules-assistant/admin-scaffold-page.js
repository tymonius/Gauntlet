import { enhanceRulesTriageAdmin } from "./admin-triage-page.js";
import { createTriageEngine } from "./refinement-triage.js";
import { createRefinementScaffoldEngine } from "./refinement-scaffold.js";

const CONTROLS = '<select id="triage-scaffold-cluster" aria-label="Root-cause cluster" disabled><option value="">No cluster selected</option></select><button id="triage-scaffold" type="button" class="btn alt" disabled>Scaffold refinement</button>';

function browserScript() {
  const triageFactory = createTriageEngine.toString();
  const scaffoldFactory = createRefinementScaffoldEngine.toString();
  return String.raw`<script id="rules-refinement-scaffold-script">
(function(){
  var triage=(${triageFactory})();
  var scaffoldEngine=(${scaffoldFactory})();
  var select=document.getElementById('triage-scaffold-cluster'),button=document.getElementById('triage-scaffold'),status=document.getElementById('triage-status'),dashboard=document.getElementById('dashboard'),report=null,loading=false;
  function token(){return sessionStorage.getItem('gauntlet_rules_admin_token')||''}
  function api(path){return fetch(path,{headers:{'Authorization':'Bearer '+token(),'Content-Type':'application/json'}}).then(function(response){if(response.status===401)throw new Error('Admin token was rejected.');if(!response.ok)throw new Error('Scaffold request failed: '+response.status);return response.json()})}
  function option(value,label){var node=document.createElement('option');node.value=value;node.textContent=label;return node}
  function load(){if(loading||!token())return Promise.resolve();loading=true;return Promise.all([api('/api/admin/export?format=json'),api('/api/admin/review-intelligence')]).then(function(results){report=triage.triageInteractions(results[0].interactions||[],results[1]||{});select.innerHTML='';if(!report.clusters.length){select.appendChild(option('','No attention clusters'));select.disabled=true;button.disabled=true;return}report.clusters.forEach(function(cluster){select.appendChild(option(cluster.rootCause,cluster.label+' — '+cluster.count))});select.disabled=false;button.disabled=false}).catch(function(error){status.textContent=error.message;select.disabled=true;button.disabled=true}).finally(function(){loading=false})}
  function save(){if(!report||!select.value)return;var scaffold=scaffoldEngine.buildRefinementScaffold(report,select.value),blob=new Blob([JSON.stringify(scaffold,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='gauntlet-rules-refinement-'+select.value+'-'+new Date().toISOString().slice(0,10)+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(url)},0);status.textContent='Downloaded '+scaffold.label+' refinement scaffold for '+scaffold.cluster.count+' interaction'+(scaffold.cluster.count===1?'':'s')+'. Review with ChatGPT before materializing a draft PR.'}
  button.addEventListener('click',function(){if(report&&select.value)save();else load().then(save)});
  var refresh=document.getElementById('triage-refresh');if(refresh)refresh.addEventListener('click',function(){setTimeout(load,0)});
  function whenVisible(){if(dashboard&&!dashboard.classList.contains('hidden'))load()}
  if(dashboard)new MutationObserver(whenVisible).observe(dashboard,{attributes:true,attributeFilter:['class']});
  setTimeout(whenVisible,0);
})();
</script>`;
}

export function enhanceRulesScaffoldAdmin(page) {
  let enhanced = enhanceRulesTriageAdmin(page);
  if (!enhanced || enhanced.includes('id="triage-scaffold"')) return enhanced;
  const marker = '<button id="triage-export" type="button" class="btn alt" disabled>Export triage JSON</button>';
  if (!enhanced.includes(marker)) return enhanced;
  enhanced = enhanced.replace(marker, `${marker}${CONTROLS}`);
  enhanced = enhanced.replace('</body>', `${browserScript()}\n</body>`);
  return enhanced;
}
