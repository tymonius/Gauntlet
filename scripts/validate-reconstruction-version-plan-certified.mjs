import fs from'node:fs';import{spawnSync}from'node:child_process';
const P='config/reconstruction-version-plan.json',raw=fs.readFileSync(P,'utf8'),plan=JSON.parse(raw),v=plan.targets?.['clean-v0.6.3'];
const fail=m=>{console.error(`reconstruction-version-plan-certified: ${m}`);process.exit(1)};
if(!v)fail('clean-v0.6.3 target missing');
if(v.status==='authority_build_approved'){
  const r=spawnSync(process.execPath,['scripts/validate-reconstruction-version-plan.mjs'],{stdio:'inherit'});process.exit(r.status??1);
}
if(v.status!=='authority_certified')fail(`unexpected status ${v.status}`);
if(v.certification?.basis!=='Manual merge of the clean v0.6.3 authority certification PR on main')fail('certification basis drifted');
if(v.certification?.faction_authority_pr!==619||v.certification?.faction_authority_merge_commit!=='f550329931a2d868b865870af51724db1e1ad1b2')fail('PR #619 certification pin drifted');
if(v.certification?.rulebook_authority_pr!==621||v.certification?.rulebook_authority_merge_commit!=='f50dfe110f54c85eb59312dae9314fb427c5d36c')fail('PR #621 certification pin drifted');
if(v.certification?.manifest!=='artifacts/reconstruction/clean-v0.6.3/certification/authority-set.json')fail('certification manifest path drifted');
if(v.certification?.publication_unlocked!==false||v.certification?.downstream_regeneration_unlocked!==true||v.downstream_regeneration_unlocked!==true)fail('certification lifecycle flags drifted');
if(v.starter_policy?.candidate_source!=='https://github.com/tymonius/Gauntlet/pull/573'||v.starter_policy?.status!=='eligible_for_downstream_regeneration_after_clean_v063_certification')fail('starter downstream transition drifted');
const compat=structuredClone(plan),c=compat.targets['clean-v0.6.3'];c.status='authority_build_approved';c.starter_policy.status='downstream_only_until_clean_v063_authority_exists';delete c.certification;delete c.downstream_regeneration_unlocked;
try{
  fs.writeFileSync(P,JSON.stringify(compat,null,2)+'\n');
  const r=spawnSync(process.execPath,['scripts/validate-reconstruction-version-plan.mjs'],{stdio:'inherit'});
  if((r.status??1)!==0)process.exitCode=r.status??1;
}finally{fs.writeFileSync(P,raw)}
if(process.exitCode)process.exit(process.exitCode);
console.log('Certified clean-v0.6.3 reconstruction plan validated; downstream regeneration unlocked; publication remains locked.');
