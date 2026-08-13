import fs from 'node:fs';
import crypto from 'node:crypto';

const OUT='artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md';
const MAN='artifacts/reconstruction/clean-v0.6.3/rulebook/authority-manifest.json';
const t=fs.readFileSync(OUT,'utf8').replace(/\r\n/g,'\n');
const m=JSON.parse(fs.readFileSync(MAN,'utf8'));
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const fail=x=>{throw new Error(x)};
const need=x=>{if(!t.includes(x))fail(`missing required text: ${x}`)};
const reject=x=>{if(t.includes(x))fail(`obsolete text survived: ${x}`)};

if(m.target!=='clean-v0.6.3-rulebook')fail('manifest target drifted');
if(m.authority_base_set_id!=='563ce3a0ac39a0bbba52cc113ae9ffbcaeb3c0985bad4cfa66fe462fb2cacb3b')fail('authority-set pin drifted');
if(m.authority_base_rulebook_sha256!=='cdc3e8f82c1d3803f076f5ee60a84b4d9b932133fd463f8e513482fe01270fb5')fail('base Rulebook pin drifted');
if(m.approved_faction_authority_pr!==619)fail('faction authority PR pin drifted');
if(m.publication_unlocked!==false||m.downstream_unlocked!==false)fail('candidate must keep publication/downstream locked');
if((m.required_v063_deltas??[]).length!==25)fail('required v0.6.3 delta set drifted');
if(JSON.stringify(m.recovered_late_decisions??[])!==JSON.stringify(['GNT-DEC-2026-0812-001','GNT-DEC-2026-0812-002','GNT-DEC-2026-0812-003']))fail('recovered late decisions drifted');
if(m.output?.path!==OUT||m.output?.sha256!==hash(t))fail('output manifest does not match Rulebook bytes');

for(const x of [
'**Version 0.6.3 — Clean Reconstruction Candidate**',
'draw four cards, choose one card from those four, and place it face up in your Discard Pile',
"Place each Player Token on the Territory at that player's end of the Gauntlet.",
'After both players have chosen their opening discard and arranged their Territories',
'A player runs the Gauntlet and wins immediately when that player either captures the Territory at the opponent',
'The advancing player does not need to control or have captured the final Territory before initiating the Last Stand.',
'The attacker must receive another movement sequence from a rule or effect.',
'**Deck:** The constructed set of ordinary playable cards selected under Deck-construction rules.',
'**Draw Pile:** The shuffled in-play pile formed from the Deck during setup.',
'**Gambit/Tactic:** may be used as either a Gambit or a Tactic.',
'**Bank:** As an Action, play this card from your Hand and bank it.',
'**Asset is the only banked-card effect heading in v0.6.3.**',
'When an effect grants movement, apply the normal movement rules unless it says otherwise.',
'When an effect permits an **additional Tactic**',
"after that opponent accepts the owner's Terms, put the Sanction in its owner's Discard Pile",
'**Remove** is a defined Asset event.',
"when a card leaves play, cards bound to it are put in their owners' Discard Piles",
'resolve reveal-stage interference before ordinary effects at that stage',
'resolve that effect as a new application at the current timing',
'When a rule or effect ends a battle **without a winner**',
'the reroll replaces the result it rerolls and the new result is used',
'Whenever **Manifest Destiny** enters the Gauntlet as a Territory',
'<!-- GENERATED CLEAN V0.6.3 FACTION CONTENT START -->',
'<!-- GENERATED CLEAN V0.6.3 FACTION CONTENT END -->',
'# 13. Military','# 14. Diplomats','# 15. Financiers','# 16. Intelligence','# 17. Mystics','# 18. Inquisition'
])need(x);

for(const x of ['Playable Deck','> **Battle:**','> **Activate:**','> **Use:**',"Capturing the opponent's final Territory is necessary but does not by itself win","Access to the normal Last Stand victory sequence requires the opponent's final Territory to be controlled",'place the fourth face down beneath the Draw Pile','just outside their end of a six-Territory battlefield',"Smuggler's Pass",'GENERATED CLEAN V0.6.2 FACTION CONTENT','releases/v0.6.3/Gauntlet_v0.6.3_Rulebook.md','releases/v0.6.3/Gauntlet_v0.6.3_Faction_and_Component_Guide.md'])reject(x);

const p3=t.slice(t.indexOf('# Part III — Factions'),t.indexOf('# Part IV — Reference'));
if(/^# \d+\. Canonical .* card pool$/m.test(p3))fail('Part III must not embed faction card catalogs');
const chapters=[...p3.matchAll(/^# (1[3-8])\. /gm)].map(x=>Number(x[1]));
if(JSON.stringify(chapters)!==JSON.stringify([13,14,15,16,17,18]))fail(`unexpected Part III chapter sequence: ${JSON.stringify(chapters)}`);

console.log('Clean v0.6.3 Rulebook authority validation passed.');
