import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root=process.cwd(), check=process.argv.includes('--check'), failures=[];
const read=p=>fs.readFileSync(path.join(root,p),'utf8').replace(/\r\n/g,'\n');
const json=p=>JSON.parse(read(p));
const norm=s=>String(s).replace(/\r\n/g,'\n').replace(/\s+$/,'')+'\n';
const req=p=>{if(!fs.existsSync(path.join(root,p)))throw new Error(`Missing v0.6.3 publication input: ${p}`)};
function text(p,s){const out=norm(s),t=path.join(root,p);if(check){if(!fs.existsSync(t))failures.push(`Missing ${p}`);else if(read(p)!==out)failures.push(`Stale ${p}`)}else{fs.mkdirSync(path.dirname(t),{recursive:true});fs.writeFileSync(t,out)}}
function bin(p,s){req(s);const t=path.join(root,p),src=path.join(root,s);if(check){if(!fs.existsSync(t))failures.push(`Missing ${p}`);else if(!fs.readFileSync(t).equals(fs.readFileSync(src)))failures.push(`Stale ${p}`)}else{fs.mkdirSync(path.dirname(t),{recursive:true});fs.copyFileSync(src,t)}}
function files(p){req(p);const a=path.join(root,p),st=fs.statSync(a);if(st.isFile())return[p.replaceAll('\\','/')];return fs.readdirSync(a,{withFileTypes:true}).flatMap(e=>{const c=path.join(p,e.name).replaceAll('\\','/');return e.isDirectory()?files(c):[c]})}
function fp(inputs){const list=[...new Set(inputs.flatMap(files))].sort(),h=crypto.createHash('sha256');for(const f of list){h.update(f);h.update('\0');h.update(fs.readFileSync(path.join(root,f)));h.update('\0')}return{algorithm:'sha256',files:list.length,digest:h.digest('hex')}}
const assert=(c,m)=>{if(!c)throw new Error(m)}, V='v0.6.3', D='2026-08-12', DISPLAY='August 12, 2026';
const S='artifacts/v0.6.3/release-candidate', P='artifacts/v0.6.3/print-candidate', R='releases/v0.6.3';
const close=json('artifacts/v0.6.3/closeout/Gauntlet_v0.6.3_Closeout_Manifest.json');
assert(close.release_version===V&&close.stage_readiness?.cross_surface_gate==='validated','Final v0.6.3 closeout is not green.');
const sf=fp([S]), pf=fp([`${P}/html`,`${P}/Gauntlet_v0.6.3_Print_Manifest.json`]);
assert(sf.digest===close.freshness?.source_package?.digest&&sf.files===close.freshness?.source_package?.files,'Source package changed after closeout.');
assert(pf.digest===close.freshness?.print_semantics?.digest&&pf.files===close.freshness?.print_semantics?.files,'Print semantics changed after closeout.');

const sm=json(`${S}/Gauntlet_v0.6.3_Manifest.json`), pm=json(`${P}/Gauntlet_v0.6.3_Print_Manifest.json`);
assert(sm.playable_card_designs===128&&sm.territories===25&&sm.proposals===9&&sm.starter_decks===12,'Source counts changed.');
assert(pm.outputs?.length===11,'Expected 11 validated print PDFs.');

const canonical=json(`${S}/Gauntlet_v0.6.3_Canonical_Data.json`);
canonical.version=V;canonical.name='Gauntlet v0.6.3 Canonical Data';canonical.date=D;canonical.status='Published playtest edition';
canonical.release_manifest=`${R}/Gauntlet_v0.6.3_Manifest.json`;
if(canonical.normalization?.canonical_data_integration)canonical.normalization.canonical_data_integration.published_release=true;
for(const c of canonical.cards||[])c.source=`${R}/Gauntlet_v0.6.3_Complete_Card_Reference.md`;
for(const t of canonical.territories||[])t.source=`${R}/Gauntlet_v0.6.3_Complete_Card_Reference.md`;
for(const f of canonical.factions||[]){delete f.source_candidate;f.source=`${R}/Gauntlet_v0.6.3_Faction_and_Component_Guide.md`}
for(const p of canonical.proposals||[])p.source=`${R}/Gauntlet_v0.6.3_Faction_and_Component_Guide.md`;

const starters=json(`${S}/Gauntlet_v0.6.3_Starter_Decks.json`);
starters.version=V;starters.status='published';starters.publishedDate=D;

function publishDoc(s){
 return String(s)
  .replace('**Version 0.6.3 — Release Candidate**','**Version 0.6.3 — Third Playtest Revision**')
  .replace('**Version 0.6.3 — Player-Facing Candidate**','**Version 0.6.3 — Third Playtest Revision**')
  .replace('**Status:** Release candidate — not published; v0.6.2 remains the published playtest edition',`**Published:** ${DISPLAY}`)
  .replaceAll('**Status:** Release candidate — not published','**Status:** Published')
  .replaceAll('The v0.6.3 Complete Card Reference candidate','The v0.6.3 Complete Card Reference')
  .replaceAll('v0.6.3 release candidate','v0.6.3 release')
  .replaceAll('v0.6.3 candidate','v0.6.3')
  .replaceAll('Release-candidate source','Published release source')
  .replaceAll('release-candidate source','published release source')
  .replaceAll('v0.6.2 remains authoritative for published play','v0.6.3 is authoritative for published play');
}
const docs=['Rulebook','Reference_Guide','First_Game_Guide','Faction_and_Component_Guide','Complete_Card_Reference','Returning_Player_Changes'];
for(const n of docs)text(`${R}/Gauntlet_v0.6.3_${n}.md`,publishDoc(read(`${S}/Gauntlet_v0.6.3_${n}.md`)));
const changes=read(`${S}/Gauntlet_v0.6.3_Release_Notes.md`).match(/## Principal release changes\n([\s\S]*?)(?:\n## Publication boundary|\s*$)/)?.[1]?.trim()||'';
text(`${R}/Gauntlet_v0.6.3_Release_Notes.md`,`# Gauntlet v0.6.3 — Release Notes

**Status:** Published  
**Published:** ${DISPLAY}  
**Previous version:** v0.6.2

Gauntlet v0.6.3 is the current canonical playtest edition. It was promoted atomically after source, print, and cross-surface closeout validation.

## Principal release changes

${changes}

## Publication

The immutable release package, versioned browser tools, root website, public Rules Arbiter, and executable digital default all moved to v0.6.3 together. v0.6.2 remains available as a historical release.
`);

const manifest={version:V,release_version:V,name:'Third Playtest Revision',status:'published',published_date:D,previous_version:'v0.6.2',
 counts:{playable_cards:128,territories:25,arenas:sm.arenas,proposals:9,factions:6,leaders:12,starter_decks:12,print_pdfs:11},
 closeout:{status:'validated',matrix:close.closeout_matrix,source_package_fingerprint:close.freshness.source_package,print_semantics_fingerprint:close.freshness.print_semantics,tracked_candidate_surfaces_fingerprint:close.freshness.tracked_candidate_surfaces},
 public_defaults:{website:V,browser_tools:V,rules_arbiter:V,digital_rules:V},
 historical_access:{v062_release:'releases/v0.6.2/',v062_site:'v0.6.2/',v062_rules_api:'/api/v062/rules',v061_rules_api:'/api/v061/rules',v063_candidate_rules_api:'/api/v063-candidate/rules'},
 source_candidate:S,print_candidate:P};
text(`${R}/Gauntlet_v0.6.3_Manifest.json`,JSON.stringify(manifest,null,2));
text(`${R}/deployment-status.json`,JSON.stringify({canonical_public_version:V,status:'published',published_date:D,release_package:`${R}/`,closeout_gate:'validated',public_defaults:manifest.public_defaults,previous_version:'v0.6.2'},null,2));
text(`${R}/README.md`,`# Gauntlet v0.6.3 — Third Playtest Revision

**Published:** ${DISPLAY}

This directory is the immutable published package for Gauntlet v0.6.3. It contains the canonical source documents, canonical data, twelve finalized starter Decks, release/print manifests, and all 11 validated print PDFs.

The prior v0.6.2 package remains preserved under \`releases/v0.6.2/\`.
`);
text(`${R}/Gauntlet_v0.6.3_Canonical_Data.json`,JSON.stringify(canonical,null,2));
text(`${R}/Gauntlet_v0.6.3_Starter_Decks.json`,JSON.stringify(starters,null,2));
text(`${R}/Gauntlet_v0.6.3_Print_Manifest.json`,JSON.stringify(pm,null,2));
for(const o of pm.outputs)bin(`${R}/${o.file}`,`${P}/pdf/${o.file}`);
text('v0.6.3/data/Gauntlet_v0.6.3_Canonical_Data.json',JSON.stringify(canonical,null,2));
text('v0.6.3/data/starter-decks.js',read('v0.6.3/data/starter-decks-candidate.js').replace("version: 'v0.6.3-candidate'","version: 'v0.6.3'").replace("status: 'Finalized competitive starter Deck set for v0.6.3'","status: 'Published competitive starter Deck set for v0.6.3'"));

function publicHtml(s){
 return String(s)
  .replace(/\s*<meta name="robots" content="noindex,nofollow">\n?/g,'\n')
  .replaceAll('v0.6.3 development candidate · v0.6.2 remains the canonical published playtest edition.','v0.6.3 · current canonical playtest edition.')
  .replaceAll('v0.6.3 development candidate · v0.6.2 remains canonical','v0.6.3 · current canonical playtest edition')
  .replaceAll('development candidate · v0.6.2 remains canonical','current canonical playtest edition')
  .replaceAll('Development Candidate','Third Playtest Revision')
  .replaceAll('development navigation','release navigation')
  .replaceAll('v0.6.3 dev','v0.6.3')
  .replaceAll('Candidate Rules Arbiter','Rules Arbiter')
  .replaceAll('Published v0.6.2','Previous v0.6.2')
  .replaceAll('candidate Rules Arbiter','Rules Arbiter')
  .replaceAll('development candidate','current canonical playtest edition')
  .replaceAll('development review surface','current canonical playtest edition')
  .replaceAll('Development Deckbuilder','Published Deckbuilder')
  .replaceAll('Development Card Reference','Published canonical reference')
  .replaceAll('Loading integrated v0.6.3 candidate…','Loading published v0.6.3 data…')
  .replaceAll('Gauntlet_v0.6.3_Canonical_Data_Candidate.json','Gauntlet_v0.6.3_Canonical_Data.json')
  .replaceAll('v0.6.2 remains the published playtest edition','v0.6.3 is the published playtest edition')
  .replaceAll('Active next-release candidate; v0.6.2 remains the published playtest edition','Published current playtest edition')
  .replaceAll('Player-Facing Candidate','Third Playtest Revision')
  .replaceAll('Rulebook Candidate','Rulebook');
}
for(const p of ['index.html','rulebook/index.html','start/index.html','quick-reference/index.html','changes/index.html','deckbuilder/index.html','reference/index.html','rules-arbiter/index.html'])text(`v0.6.3/${p}`,publicHtml(read(`v0.6.3/${p}`)));
let home=read('v0.6.3/index.html')
 .replaceAll('Next-release development surface','Current canonical playtest edition')
 .replaceAll('Gauntlet v0.6.3 candidate','Gauntlet v0.6.3')
 .replaceAll('This portal materializes the integrated v0.6.3 rules and card-data candidates for browser review without changing the published v0.6.2 release.','Third Playtest Revision · Published August 12, 2026.')
 .replaceAll('Rulebook candidate','Rulebook').replaceAll('Deckbuilder candidate','Deckbuilder')
 .replaceAll('Candidate state','Release state')
 .replaceAll('The public Rules Arbiter remains on the published v0.6.2 corpus. A separate <a href="rules-arbiter/">v0.6.3 development Rules Arbiter</a> is available for candidate review.','The public Rules Arbiter uses the published v0.6.3 corpus.')
 .replaceAll('Open integrated candidate JSON','Open canonical JSON');
text('v0.6.3/index.html',home);

text('v0.6.3/print/index.html',`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Gauntlet v0.6.3 published print materials."><link rel="canonical" href="https://gauntlet.run/v0.6.3/print/"><title>Gauntlet v0.6.3 Printed Materials</title><link rel="stylesheet" href="../styles.css"></head><body><main class="shell"><p class="eyebrow">Current canonical playtest edition</p><h1>Printed Materials</h1><p>Gauntlet v0.6.3 — Third Playtest Revision.</p><div class="release-actions">${pm.outputs.map(o=>`<a href="/releases/v0.6.3/${o.file}">${o.key.replaceAll('_',' ')}</a>`).join(' ')}</div><p><a href="/v0.6.3/deckbuilder/">Build or print a Deck →</a></p></main></body></html>`);

text('v0.6.3/deckbuilder/app.js',read('v0.6.3/deckbuilder/app.js')
 .replace('const V063_VERSION = "v0.6.3-candidate";','const V063_VERSION = "v0.6.3";')
 .replace('gauntlet-v063-candidate-deckbuilder','gauntlet-v063-deckbuilder')
 .replaceAll('Candidate load failed.','Canonical load failed.')
 .replaceAll('Canonical_Data_Candidate.json','Canonical_Data.json')
 .replaceAll('candidate cards loaded.','published cards loaded.')
 .replaceAll('v0.6.3 development ·','v0.6.3 published ·')
 .replaceAll('Candidate data returned','Canonical data returned').replaceAll('candidate Deck','Deck'));
text('v0.6.3/deckbuilder/starter-adapter.js',read('v0.6.3/deckbuilder/starter-adapter.js').replace('../data/starter-decks-candidate.js','../data/starter-decks.js').replaceAll('release-candidate builders','published release builders'));
text('v0.6.3/reference/app.js',read('v0.6.3/reference/app.js').replace('const VERSION = "v0.6.3-candidate";','const VERSION = "v0.6.3";').replaceAll('Candidate load failed.','Canonical load failed.').replaceAll('Canonical_Data_Candidate.json','Canonical_Data.json').replaceAll('v0.6.3 development candidate','v0.6.3 published canonical reference').replaceAll('Candidate data returned','Canonical data returned'));

const corpus=read('rules-assistant/v062-published-corpus.js').replaceAll('V062','V063').replaceAll('v062','v063').replaceAll('v0.6.2','v0.6.3');
text('rules-assistant/v063-published-corpus.js',corpus);
text('rules-assistant/worker-v063.js',read('rules-assistant/worker-v063-candidate.js')
 .replace(/import \{\n  defaultDevelopmentV063SourceUrls,\n  loadDevelopmentV063RulesCorpus,\n  V063_RULES_VERSION,\n  V063_VERSION_LABEL\n\} from "\.\/v063-development-corpus\.js";/,'import { defaultPublishedV063SourceUrls, loadPublishedV063RulesCorpus, V063_PUBLISHED_VERSION } from "./v063-published-corpus.js";')
 .replace('export const RULES_VERSION = V063_RULES_VERSION;','export const RULES_VERSION = V063_PUBLISHED_VERSION;')
 .replace('const VERSION_ALIASES = new Set([RULES_VERSION, "v0.6.3-candidate", "v0.6.3"]);','const VERSION_ALIASES = new Set([RULES_VERSION]);')
 .replaceAll('V063_VERSION_LABEL','"Gauntlet v0.6.3"')
 .replaceAll('unpublished v0.6.3 development candidate','published v0.6.3 playtest edition')
 .replaceAll('v0.6.2 remains the published playtest edition, but where the candidate expressly changes a rule or card, the v0.6.3 candidate controls this answer.','Use the published v0.6.3 rules and card text.')
 .replaceAll('candidate sources','published v0.6.3 sources').replaceAll('candidate text','published text').replaceAll('candidate rules','published rules')
 .replaceAll('the candidate leaves','the published rules leave').replaceAll('development ruling rather than published v0.6.2 law','provisional table ruling rather than written v0.6.3 law')
 .replaceAll('This is a v0.6.3 development ruling and does not alter the published v0.6.2 rules.','This is a provisional table ruling and does not alter the published v0.6.3 rules.')
 .replaceAll('gauntlet-rules-assistant-v063-candidate','gauntlet-rules-assistant-v063').replaceAll('candidate: true','candidate: false').replaceAll('publishedVersion: "v0.6.2"','publishedVersion: "v0.6.3"')
 .replaceAll('This development Rules Arbiter answers ${"Gauntlet v0.6.3"} questions only.','This Rules Arbiter answers Gauntlet v0.6.3 questions only.')
 .replaceAll('v0.6.3 candidate','v0.6.3')
 .replace('loadDevelopmentV063RulesCorpus({\n      ...defaultDevelopmentV063SourceUrls(env.SITE_ORIGIN || "https://gauntlet.run"),','loadPublishedV063RulesCorpus({\n      ...defaultPublishedV063SourceUrls(env.SITE_ORIGIN || "https://gauntlet.run"),'));

text('rules-assistant/widget.js',read('rules-assistant/widget.js')
 .replace('defaultPublishedV062SourceUrls, loadPublishedV062RulesCorpus','defaultPublishedV063SourceUrls, loadPublishedV063RulesCorpus')
 .replace('./v062-published-corpus.js','./v063-published-corpus.js')
 .replaceAll('defaultPublishedV062SourceUrls','defaultPublishedV063SourceUrls').replaceAll('loadPublishedV062RulesCorpus','loadPublishedV063RulesCorpus')
 .replace('version: "v0.6.2"','version: "v0.6.3"').replaceAll('v0.6.2 rulebook','v0.6.3 rulebook'));

let entry=read('rules-assistant/worker-entry.js').replace('import publishedWorker from "./worker-v062.js";','import publishedV062Worker from "./worker-v062.js";\nimport publishedWorker from "./worker-v063.js";\nimport v063CandidateWorker from "./worker-v063-candidate.js";');
entry=entry.replace(/    if \(\n      url\.pathname === "\/api\/rules" \|\|[\s\S]*?    \) \{\n      return publishedWorker\.fetch\(request, env, context\);\n    \}/,`    if (["/api/v062/rules","/v062/rules","/api/v062/health","/v062/health"].includes(url.pathname)) return publishedV062Worker.fetch(request, env, context);

    if (["/api/rules","/rules","/api/health","/health","/api/v063/rules","/v063/rules","/api/v063/health","/v063/health"].includes(url.pathname)) return publishedWorker.fetch(request, env, context);

    if (url.pathname.startsWith("/api/v063-candidate/") || url.pathname.startsWith("/v063-candidate/")) {
      const candidateUrl = new URL(request.url);
      candidateUrl.pathname = candidateUrl.pathname.replace(/^\\/api\\/v063-candidate\\//,"/api/v063/").replace(/^\\/v063-candidate\\//,"/v063/");
      return v063CandidateWorker.fetch(new Request(candidateUrl, request), env, context);
    }`);
text('rules-assistant/worker-entry.js',entry);

text('v0.6.3/rules-arbiter/app.js',read('v0.6.3/rules-arbiter/app.js')
 .replace(/import \{\n  defaultDevelopmentV063SourceUrls,\n  loadDevelopmentV063RulesCorpus,\n  V063_RULES_VERSION\n\} from "\.\.\/\.\.\/rules-assistant\/v063-development-corpus\.js";/,'import { defaultPublishedV063SourceUrls, loadPublishedV063RulesCorpus, V063_PUBLISHED_VERSION } from "../../rules-assistant/v063-published-corpus.js";')
 .replaceAll('V063_RULES_VERSION','V063_PUBLISHED_VERSION').replaceAll('Candidate Arbiter unavailable.','Rules Arbiter unavailable.')
 .replaceAll('Candidate worker configured; local candidate corpus remains the fallback.','Published worker configured; local published corpus remains the fallback.')
 .replaceAll('Local candidate corpus mode. No unpublished worker endpoint is required.','Local published corpus mode.')
 .replaceAll('candidate: true','candidate: false').replaceAll('publishedVersion: "v0.6.2"','publishedVersion: "v0.6.3"')
 .replaceAll('Candidate worker returned','Rules worker returned').replaceAll('payload.candidate !== true','payload.candidate !== false')
 .replaceAll('v0.6.3 candidate Rules Arbiter','v0.6.3 Rules Arbiter').replaceAll('Candidate worker unavailable; using local candidate corpus.','Rules worker unavailable; using local published corpus.')
 .replaceAll('defaultDevelopmentV063SourceUrls','defaultPublishedV063SourceUrls').replaceAll('loadDevelopmentV063RulesCorpus','loadPublishedV063RulesCorpus')
 .replaceAll('Candidate sources','Canonical sources').replaceAll('This answer uses the unpublished v0.6.3 candidate. Published play remains governed by v0.6.2 until release cutover.','This answer uses the published v0.6.3 canonical rules sources.'));

text('src/content/current.ts',"export * from './v063';\nexport const CURRENT_RULES_VERSION = 'v0.6.3' as const;");
text('index.html',read('index.html').replaceAll('v0.6.2/start/','v0.6.3/start/').replaceAll('v0.6.2/rulebook/','v0.6.3/rulebook/').replaceAll('v0.6.2/deckbuilder/','v0.6.3/deckbuilder/').replaceAll('v0.6.2/reference/','v0.6.3/reference/').replaceAll('releases/v0.6.2/','releases/v0.6.3/').replaceAll('Current canonical playtest edition · v0.6.2','Current canonical playtest edition · v0.6.3').replaceAll('canonical v0.6.2 sources','canonical v0.6.3 sources').replaceAll('complete v0.6.2 rules','complete v0.6.3 rules').replaceAll('v0.6.2 Deckbuilder','v0.6.3 Deckbuilder').replaceAll('v0.6.2 Release','v0.6.3 Release'));
for(const f of ['military','diplomats','financiers','intelligence','mystics','inquisition'])text(`factions/${f}/index.html`,read(`factions/${f}/index.html`).replaceAll('· v0.6.2 faction guide','· v0.6.3 faction guide').replaceAll('href="../../v0.6.2/rulebook/"','href="../../v0.6.3/rulebook/"').replaceAll('href="../../v0.6.2/deckbuilder/"','href="../../v0.6.3/deckbuilder/"').replaceAll('Current playtest edition: v0.6.2.','Current playtest edition: v0.6.3.'));

if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log(`${check?'Verified':'Built'} published Gauntlet v0.6.3 package and atomic public cutover.`);
