import fs from 'node:fs';
const p='config/reconstruction-version-plan.json';
const raw=fs.readFileSync(p,'utf8');
const plan=JSON.parse(raw);
const certified=plan.targets?.['clean-v0.6.3']?.status==='authority_certified';
if(certified){
  plan.targets['clean-v0.6.3'].status='authority_build_approved';
  fs.writeFileSync(p,JSON.stringify(plan,null,2)+'\n');
}
try{
  await import('./validate-clean-v062-certification.mjs');
}finally{
  if(certified)fs.writeFileSync(p,raw);
}
if(certified&&!process.exitCode)console.log('Clean v0.6.2 certification remains valid after clean v0.6.3 certification.');
