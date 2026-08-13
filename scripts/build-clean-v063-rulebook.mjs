import fs from 'node:fs';
import crypto from 'node:crypto';

const B='artifacts/reconstruction/clean-v0.6.2/rulebook/Gauntlet_v0.6.2_Rulebook.md';
const S='docs/Gauntlet_v0.6.3_Shared_Rules_Candidate.md';
const G='docs/Gauntlet_v0.6.3_General_Card_Rules_Candidate.md';
const FM='artifacts/reconstruction/clean-v0.6.3/faction-guides/authority-manifest.json';
const P='config/reconstruction-version-plan.json';
const R='config/reconstruction-version-resolutions.json';
const OUT='artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md';
const MAN='artifacts/reconstruction/clean-v0.6.3/rulebook/authority-manifest.json';
const DIR='artifacts/reconstruction/clean-v0.6.3/rulebook';
const read=p=>fs.readFileSync(p,'utf8').replace(/\r\n/g,'\n');
const json=p=>JSON.parse(read(p));
const hash=t=>crypto.createHash('sha256').update(t).digest('hex');
const must=(c,m)=>{if(!c)throw new Error(m)};
const between=(t,a,b)=>{const i=t.indexOf(a),j=t.indexOf(b,i+a.length);must(i>=0&&j>=0,`missing boundary ${a}`);return {i,j,text:t.slice(i,j)}};
const replace=(t,a,b,x)=>{const r=between(t,a,b);return t.slice(0,r.i)+x.trimEnd()+'\n\n'+t.slice(r.j)};
const base=read(B),shared=read(S),general=read(G),fm=json(FM),plan=json(P),res=json(R);

must(hash(base)==='cdc3e8f82c1d3803f076f5ee60a84b4d9b932133fd463f8e513482fe01270fb5','certified v0.6.2 Rulebook hash drifted');
must(fm.target==='clean-v0.6.3'&&fm.publication_unlocked===false&&fm.guides.length===6,'approved faction authority boundary drifted');
must(plan.targets['clean-v0.6.3'].authority_base==='clean-v0.6.2'&&plan.targets['clean-v0.6.3'].authority_build_unlocked===true,'v0.6.3 authority build is not unlocked');
for(const e of fm.guides)must(hash(read(e.path))===e.sha256,`faction guide hash drifted: ${e.path}`);

function section(n){const m=new RegExp(`^# ${n}\\. `,'m').exec(shared);must(m,`missing shared section ${n}`);const tail=shared.slice(m.index+m[0].length),next=new RegExp(`^# ${n+1}\\. `,'m').exec(tail),end=next?m.index+m[0].length+next.index:shared.length;return shared.slice(m.index,end).replace(/\n---\s*$/,'').trimEnd()}
const body=s=>s.replace(/^# \d+\. [^\n]+\n+/,'').trim();
const demote=s=>s.replace(/^## /gm,'### ');
const sub=(t,a,b)=>between(t,a,b).text.trimEnd();
function generalProcedures(){
  const a=general.indexOf('### Gambit and Tactic effect headings'),b=general.indexOf('## 12. Card-text consequences');
  must(a>=0&&b>a,'general-card-rules boundary missing');
  let withinNumbered=false;
  return general.slice(a,b).trim().split('\n').map(line=>{
    const numbered=/^## \d+\. (.+)$/.exec(line);
    if(numbered){withinNumbered=true;return `### ${numbered[1]}`;}
    if(line.startsWith('### ')&&withinNumbered)return `#${line}`;
    if(line==='---')return '';
    return line;
  }).join('\n').replace('This inherits the same-phase additional-Action rule established for v0.6.2: it expands the number of Actions permitted in that phase rather than reopening a phase that has ended.','This expands the number of Actions permitted in the current phase rather than reopening a phase that has ended.');
}
function faction(e,n){
  const t=read(e.path),a=t.search(/^# 1\. /m),b=t.search(/^# \d+\. Canonical /m);
  must(a>=0&&b>a,`bad faction guide ${e.faction}`);
  const label={military:'Military',diplomat:'Diplomats',financier:'Financiers',intelligence:'Intelligence',mystics:'Mystics',inquisition:'Inquisition'}[e.faction];
  let first=true,nested=false;
  let rendered=t.slice(a,b).trimEnd().split('\n').map(line=>{
    const top=/^# \d+\. (.+)$/.exec(line);
    if(top){if(first){first=false;nested=false;return `# ${n}. ${label}`;}nested=true;return `## ${top[1]}`;}
    if(line.startsWith('### '))return nested?'#'+line:line;
    if(line.startsWith('## '))return nested?'#'+line:line;
    return line;
  }).join('\n');
  const packageNames={military:'A Military',diplomat:'A Diplomat',financier:'A Financier',intelligence:'An Intelligence',mystics:'A Mystics',inquisition:'An Inquisition'};
  rendered=rendered.replace(`${packageNames[e.faction]} Deck includes:`,`${packageNames[e.faction]} game package includes:`);
  return rendered;
}

let t=base;
t=t.replace('**Version 0.6.2 — Clean Reconstruction Candidate**','**Version 0.6.3 — Clean Reconstruction Candidate**');
t=t.replace(/> \*\*Authority candidate, not current\/public rules\.\*\*[^\n]+/,'> **Authority candidate, not current/public rules.** Reconstructed from the certified clean v0.6.2 Rulebook, approved v0.6.3 shared-rule sources, and the six clean v0.6.3 faction authorities approved through PR #619. The withdrawn v0.6.3 Rulebook and combined faction guide are forbidden authority skeletons. Publication remains locked.');
t=t.replace("Players advance toward one another, fight battles, occupy and capture opposing Territories, develop Assets, and pursue faction-specific plans. The normal way to win remains cumulative: cross the battlefield, advance your contiguous Front Line through the opponent's final Territory, then win the Last Stand beyond the Gauntlet.","Players advance toward one another, fight battles, occupy and capture opposing Territories, develop Assets, and pursue faction-specific plans. The normal shared victory is to **run the Gauntlet** by either capturing the Territory at the opponent's end or winning that opponent's Last Stand.");
t=t.replace('Each player begins just outside their end of a six-Territory battlefield.','Each player begins on the Territory at their own end of a six-Territory battlefield.');
t=replace(t,'# How to Win','# Golden Rules',`# How to Win\n\nThe normal shared victory is to **run the Gauntlet**. You win immediately when you either:\n\n1. capture the Territory at your opponent's end of the Gauntlet; or\n2. win your opponent's Last Stand.\n\nThese are independent routes. A Last Stand does not require control of the final Territory first, but it does require a separate legal movement sequence after the battle that forced the opponent beyond the Gauntlet.\n\nSome factions also have an alternate victory condition described in Part III.`);
t=t.replace('For a first game, use two prepared or recommended Decks. Each player needs one complete Deck, one Player Token, and a six-sided die.','For a first game, use two prepared or recommended game packages. Each player needs one complete game package, one Player Token, and a six-sided die.');
t=t.replace('- one complete **Deck**;','- one complete game package;');
t=t.replace('A complete Deck contains:\n\n- one faction;\n- one Leader Card from that faction;\n- one Playable Deck;\n- three different Territory Cards; and\n- any components required by that faction or Leader.',"Each player's complete game package contains:\n\n- one faction;\n- one Leader Card from that faction;\n- one **Deck** of ordinary playable cards;\n- three different Territory Cards; and\n- any components required by that faction or Leader.");
t=t.replaceAll('Playable Deck','Deck').replace('- **Battle:** may be used as either a Gambit or a Tactic.','- **Gambit/Tactic:** may be used as either a Gambit or a Tactic.').replace('unless it also has a Gambit, Tactic, or Battle effect.','unless it also has a Gambit, Tactic, or Gambit/Tactic effect.');
const playAreas=`### Recommended play areas\n\nEach player should maintain distinct areas for Draw Pile, Discard Pile, Graveyard, Hand, Asset Bank, Leader and supplemental components, Reserve, Gambit, and Tactic. Cards in different zones must remain visibly separate.`;
t=replace(t,'# 3. Setup','# 4. Your Turn',`# 3. Setup\n\n${body(section(1))}\n\n${playAreas}`);
const assets=`### Assets and the Asset Bank\n\nA card with an **Asset** effect has an inherent banking Action:\n\n> **Bank:** As an Action, play this card from your Hand and bank it.\n\n**Asset is the only banked-card effect heading in v0.6.3.** A printed special banking Action overrides the inherent Bank procedure.\n\nA player's Asset limit equals the number of Territories they control. If that limit falls below the number of banked Assets, immediately discard Assets until within the limit; each Asset forced to leave this way is **Removed**. Voluntary use/discard and normal self-expiration are not Removal unless expressly stated.\n\nAn Asset is **Removed** whenever a rule or effect forces it to leave play, regardless of destination.\n\nOverlays are not Assets and follow Chapter 12.`;
t=replace(t,'### Assets and the Asset Bank','# 6. Movement and Position',assets);
t=t.replace('A position is any space where a Player Token may be placed under the v0.6.1 positioning rules.','A **Position** is any Territory or off-board space where a Player Token may be placed under the positioning rules.');
t=t.replace('and\n- does not create another Action phase or Action phase.','and\n- does not create another Action phase.');
t=t.replace('# 7. Battles','# 7. Battles\n\n> **DON\'T FORGET THE BOARD**  \n> Territory. Assets. Then Gambits.\n>\n> This is a memory cue only; it does not alter timing or permission.');
t=replace(t,'### Final Territory and Last Stand','### Occupation',`### Final Territory and Last Stand\n\nCapturing the Territory at the opponent's end immediately runs the Gauntlet and wins. Control of that Territory is not required to initiate a Last Stand. After the opponent is forced beyond their end, an attacker on the final Territory may initiate a Last Stand only through a **new legal movement sequence** that Advances beyond the Gauntlet. Unused movement from the sequence that created the preceding battle cannot carry into the Last Stand.`);
t=t.replace('\nCard- and faction-specific wording is implemented in Wave B.','');
t=replace(t,'# 9. Running the Gauntlet','# Part II — Complete Shared Rules',`# 9. Running the Gauntlet\n\n${body(section(2))}\n\n## Final-Territory Capture Victory\n\n${demote(body(section(3)))}\n\n## Forcing and Winning a Last Stand\n\n${demote(body(section(4)))}`);
t=t.replace(/# Part II — Complete Shared Rules(?:\n\n(?:---\n\n)?# Part II — Complete Shared Rules)+/g,'# Part II — Complete Shared Rules');

const old11=between(base,'# 11. Detailed Card and Timing Rules','# 12. Overlays and Other Shared Card Rules').text.replaceAll('Playable Deck','Deck');
const sharedTiming=sub(old11,'### Shared-timing rule','### Multiple and additional Gambits or Tactics'),repl=sub(old11,'### Replacements and revisions','### Reveal and information'),reveal=sub(old11,'### Reveal and information','### Negation'),neg=sub(old11,'### Negation','### Copied effects');
const ch11=`# 11. Detailed Card and Timing Rules\n\n## How it works\n\nUse this chapter for shared timing, replacement, reveal, banked Assets, bound cards, copied/repeated effects, granted movement, and battles ending without a winner.\n\n## Complete rules\n\n- **May** is optional; **Must** is required.\n- Follow instructions in order.\n- More-specific rules prevail only when rules genuinely conflict.\n- An effect applies only at its stated timing and cannot be canceled after it has applied.\n\n## Inherited interaction rules\n\n${sharedTiming}\n\n### Multiple Gambits or Tactics\n\nAn effect may allow more than the normal limit. Unless stated otherwise, that permission is optional. When several Tactics are chosen at the same choice, choose them simultaneously; later additional Tactics use the shared rule below.\n\n${repl}\n\n${reveal}\n\n${neg}\n\n## Adopted v0.6.3 card procedures\n\n${generalProcedures()}`;
t=replace(t,'# 11. Detailed Card and Timing Rules','# 12. Overlays and Other Shared Card Rules',ch11);
const r12=between(t,'# 12. Overlays and Other Shared Card Rules','# Part III — Factions');t=t.slice(0,r12.j)+`\n\n### Cards that become Territories\n\nWhenever **Manifest Destiny** enters the Gauntlet as a Territory, it is a normal Territory with a normal Deed. Existing Deed purchase costs, caps, procedures, income rules, and Controlling Interest rules apply unchanged.\n\n`+t.slice(r12.j);
const order=['military','diplomat','financier','intelligence','mystics','inquisition'],entries=[...fm.guides].sort((a,b)=>order.indexOf(a.faction)-order.indexOf(b.faction)),fc=entries.map((e,i)=>faction(e,13+i)).join('\n\n---\n\n');
const a='<!-- GENERATED CLEAN V0.6.2 FACTION CONTENT START -->',b='<!-- GENERATED CLEAN V0.6.2 FACTION CONTENT END -->',fr=between(t,a,b);t=t.slice(0,fr.i)+`<!-- GENERATED CLEAN V0.6.3 FACTION CONTENT START -->\n\n${fc}\n\n<!-- GENERATED CLEAN V0.6.3 FACTION CONTENT END -->`+t.slice(fr.j+b.length);
t=t.replace('Each Deck belongs to one faction and uses one of that faction\'s two Leaders. The faction determines which faction cards may be included, which supplemental components are prepared, which public resources or progress are tracked, and which faction-specific Actions, abilities, and procedures are available.','Each player chooses one faction and one of that faction\'s two Leaders. The faction determines which faction cards may be included in that player\'s Deck, which supplemental components are prepared, which public resources or progress are tracked, and which faction-specific Actions, abilities, and procedures are available.');
t=t.replace(' Starting Capital 2 is the v0.6.2 playtest revision.','');
t=t.replace("**Last Stand:** The battle beyond the opponent's final Territory in the cumulative normal Run-the-Gauntlet victory sequence.","**Last Stand:** A battle beyond the opponent's end. It is an independent Run-the-Gauntlet route and requires a separate legal movement sequence, not prior capture or control of the final Territory.");
const ga='**Denouement:** The Action phase after Movement and any battle caused by it.';must(t.includes(ga),'glossary anchor missing');t=t.replace(ga,`**Deck:** The constructed set of ordinary playable cards selected under Deck-construction rules.\n\n**Draw Pile:** The shuffled in-play pile formed from the Deck during setup.\n\n${ga}`);
t=t.replace(/\n---\n\n---\n/g,'\n---\n').replace(/\n{4,}/g,'\n\n\n').replace(/[ \t]+$/gm,'');

for(const old of ['Playable Deck','place the fourth face down beneath the Draw Pile','just outside their end of a six-Territory battlefield',"Capturing the opponent's final Territory is necessary but does not by itself win","Access to the normal Last Stand victory sequence requires the opponent's final Territory to be controlled","Smuggler's Pass",'v0.6.1 positioning rules','implemented in Wave B','Action phase or Action phase','Starting Capital 2 is the v0.6.2 playtest revision.'])must(!t.includes(old),`obsolete text survived: ${old}`);
for(const old of ['A Military Deck includes:','A Diplomat Deck includes:','A Financier Deck includes:','An Intelligence Deck includes:','A Mystics Deck includes:','An Inquisition Deck includes:'])must(!t.includes(old),`broad Deck umbrella survived: ${old}`);
for(const need of ["after that opponent accepts the owner's Terms, put the Sanction in its owner's Discard Pile",'**Remove** is a defined Asset event.',"when a card leaves play, cards bound to it are put in their owners' Discard Piles",'resolve reveal-stage interference before ordinary effects at that stage','resolve that effect as a new application at the current timing','When a rule or effect ends a battle **without a winner**','the reroll replaces the result it rerolls and the new result is used','Whenever **Manifest Destiny** enters the Gauntlet as a Territory'])must(t.includes(need),`required v0.6.3 rule missing: ${need}`);
must((t.match(/^# Part II — Complete Shared Rules$/gm)||[]).length===1,'Part II heading must occur exactly once');
must((t.match(/^# 6\. Movement and Position$/gm)||[]).length===1,'Chapter 6 heading must occur exactly once');
must((t.match(/^### Occupation$/gm)||[]).length===1,'Chapter 8 Occupation heading must occur exactly once');
must(t.includes('# 13. Military\n\n## How it works'),'Part III opening hierarchy drifted');

const out=t.trimEnd()+'\n';fs.mkdirSync(DIR,{recursive:true});fs.writeFileSync(OUT,out);
const manifest={schema_version:1,status:'authority_candidate_pending_merge_review',target:'clean-v0.6.3-rulebook',authority_base:'certified clean-v0.6.2 Rulebook',authority_base_set_id:'563ce3a0ac39a0bbba52cc113ae9ffbcaeb3c0985bad4cfa66fe462fb2cacb3b',authority_base_rulebook_sha256:'cdc3e8f82c1d3803f076f5ee60a84b4d9b932133fd463f8e513482fe01270fb5',approved_faction_authority_pr:619,approved_faction_authority_manifest:FM,shared_rule_sources:[S,G,'docs/Gauntlet_v0.6.3_Card_Language_Normalization.md',R],forbidden_authority_sources:plan.targets['clean-v0.6.3'].forbidden_authority_sources,required_v063_deltas:plan.targets['clean-v0.6.3'].required_v063_deltas,recovered_late_decisions:res['clean-v0.6.3'].additional_recovered_decisions.map(x=>x.id),integration_normalizations:['deck-means-ordinary-cards-only','deduplicate-section-boundaries','preserve-certified-part-iii-heading-depth','remove-stale-development-version-notes'],publication_unlocked:false,downstream_unlocked:false,output:{path:OUT,sha256:hash(out),bytes:Buffer.byteLength(out),lines:out.split('\n').length-1}};fs.writeFileSync(MAN,JSON.stringify(manifest,null,2)+'\n');
fs.writeFileSync(`${DIR}/README.md`,'# Clean v0.6.3 Rulebook authority candidate\n\nDerived from certified clean v0.6.2 Rulebook authority, approved v0.6.3 shared-rule sources, and PR #619 faction authority. Withdrawn v0.6.3 release documents are forbidden as drafting skeletons. Publication and downstream regeneration remain locked pending complete clean-v0.6.3 certification.\n');
fs.writeFileSync(`${DIR}/source-boundary.md`,'# Source boundary\n\nThe authority base is the certified clean v0.6.2 Rulebook (SHA-256 `cdc3e8f82c1d3803f076f5ee60a84b4d9b932133fd463f8e513482fe01270fb5`) within authority set `563ce3a0ac39a0bbba52cc113ae9ffbcaeb3c0985bad4cfa66fe462fb2cacb3b`. Part III comes only from the six clean v0.6.3 faction guides approved through PR #619. Shared deltas come from the adopted v0.6.3 shared-rules/general-card-rules/card-language sources and reconstruction resolution layer. The withdrawn v0.6.3 Rulebook and combined faction/component guide remain forbidden authority skeletons. Publication remains locked.\n');
fs.writeFileSync(`${DIR}/semantic-review.md`,'# Semantic review\n\nThe reconstruction preserves the certified clean-v0.6.2 Rulebook architecture while applying only approved v0.6.3 setup, independent Run-the-Gauntlet victory, Deck/Draw Pile terminology, centralized card procedures, recovered Manifest Destiny, and PR #619 faction-authority deltas. Integration-only normalization removes broad pre-v0.6.3 uses of Deck, stale development/version notes, duplicate generated headings, and heading-depth artifacts without changing mechanics. Publication and downstream regeneration remain locked pending complete clean-v0.6.3 certification.\n');
console.log(`Built ${OUT}`);
