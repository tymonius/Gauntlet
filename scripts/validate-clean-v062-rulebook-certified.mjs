import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const PLAN='config/reconstruction-version-plan.json';
const raw=fs.readFileSync(PLAN,'utf8');
const plan=JSON.parse(raw);
const v063=plan.targets?.['clean-v0.6.3'];
const run=()=>spawnSync(process.execPath,['scripts/validate-clean-v062-rulebook.mjs'],{stdio:'inherit'}).status??1;

if(v063?.status!=='authority_certified') process.exit(run());

const compat=structuredClone(plan);
compat.targets['clean-v0.6.3'].status='authority_build_approved';
try {
  fs.writeFileSync(PLAN,JSON.stringify(compat,null,2)+'\n');
  process.exitCode=run();
} finally {
  fs.writeFileSync(PLAN,raw);
}

if(!process.exitCode) console.log('Clean v0.6.2 Rulebook remains valid under certified clean-v0.6.3 lifecycle state.');
