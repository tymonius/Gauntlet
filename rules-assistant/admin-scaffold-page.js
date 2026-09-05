import { enhanceRulesTriageAdmin } from "./admin-triage-page.js";
import { createRefinementScaffoldEngine } from "./refinement-scaffold.js";

const CONTROLS = '<select id="triage-scaffold-cluster" aria-label="Root-cause cluster" disabled><option value="">No cluster selected</option></select><button id="triage-scaffold" type="button" class="btn alt" disabled>Scaffold refinement</button>';

function runtimeCode() {
  const scaffoldFactory = createRefinementScaffoldEngine.toString();
  return String.raw`
  var rulesRefinementScaffoldEngine=(${scaffoldFactory})();
  var rulesScaffoldSelect=document.getElementById('triage-scaffold-cluster'),rulesScaffoldButton=document.getElementById('triage-scaffold'),rulesScaffoldStatus=document.getElementById('triage-status'),rulesScaffoldReport=null;
  function rulesScaffoldOption(value,labelText){var node=document.createElement('option');node.value=value;node.textContent=labelText;return node}
  function renderRulesScaffold(report){rulesScaffoldReport=report;rulesScaffoldSelect.innerHTML='';if(!report||!report.clusters||!report.clusters.length){rulesScaffoldSelect.appendChild(rulesScaffoldOption('','No attention clusters'));rulesScaffoldSelect.disabled=true;rulesScaffoldButton.disabled=true;return}report.clusters.forEach(function(cluster){rulesScaffoldSelect.appendChild(rulesScaffoldOption(cluster.rootCause,cluster.label+' — '+cluster.count))});rulesScaffoldSelect.disabled=false;rulesScaffoldButton.disabled=false}
  function saveRulesScaffold(){if(!rulesScaffoldReport||!rulesScaffoldSelect.value)return false;var scaffold=rulesRefinementScaffoldEngine.buildRefinementScaffold(rulesScaffoldReport,rulesScaffoldSelect.value),blob=new Blob([JSON.stringify(scaffold,null,2)],{type:'application/json'});saveFile(blob,'gauntlet-rules-refinement-'+rulesScaffoldSelect.value+'-'+new Date().toISOString().slice(0,10)+'.json');rulesScaffoldStatus.textContent='Downloaded '+scaffold.label+' refinement scaffold for '+scaffold.cluster.count+' interaction'+(scaffold.cluster.count===1?'':'s')+'. Review with ChatGPT before materializing a draft PR.';return true}
  document.addEventListener('gauntlet:rules-triage',function(event){renderRulesScaffold(event.detail)});
  if(typeof rulesTriageLastReport!=='undefined'&&rulesTriageLastReport)renderRulesScaffold(rulesTriageLastReport);
  rulesScaffoldButton.onclick=function(){if(saveRulesScaffold())return;if(typeof refreshRulesTriage==='function'){refreshRulesTriage().then(function(){saveRulesScaffold()}).catch(function(){})}};
`;
}

function injectRuntime(page, code) {
  const marker = "\n}());\n</script>";
  const index = page.lastIndexOf(marker);
  if (index < 0) return null;
  return page.slice(0, index) + `\n${code}` + page.slice(index);
}

export function enhanceRulesScaffoldAdmin(page) {
  let enhanced = enhanceRulesTriageAdmin(page);
  if (!enhanced || enhanced.includes('id="triage-scaffold"')) return enhanced;
  const marker = '<button id="triage-export" type="button" class="btn alt" disabled>Export triage JSON</button>';
  if (!enhanced.includes(marker)) return enhanced;
  enhanced = enhanced.replace(marker, `${marker}${CONTROLS}`);
  const injected = injectRuntime(enhanced, runtimeCode());
  return injected || enhanced;
}
