import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const outRoot = path.join(root, 'artifacts/reconstruction/clean-v0.6.2/faction-guides');

const sources = {
  military: 'releases/v0.6.1/faction-guides/military/Gauntlet_v0.6.1_Military_Faction_Guide.md',
  diplomat: 'releases/v0.6.1/faction-guides/diplomat/Gauntlet_v0.6.1_Diplomat_Faction_Guide.md',
  financier: 'releases/v0.6.1/faction-guides/financier/Gauntlet_v0.6.1_Financier_Faction_Guide.md',
  intelligence: 'releases/v0.6.1/faction-guides/intelligence/Gauntlet_v0.6.1_Intelligence_Faction_Guide.md',
  mystics: 'releases/v0.6.1/faction-guides/mystics/Gauntlet_v0.6.1_Mystics_Faction_Guide.md',
  inquisition: 'releases/v0.6.1/faction-guides/inquisition/Gauntlet_v0.6.1_Inquisition_Faction_Guide.md'
};

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}
function replaceOnce(text, from, to, label) {
  const count = text.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  return text.replace(from, to);
}
function replaceAllRequired(text, from, to, label) {
  if (!text.includes(from)) throw new Error(`${label}: expected at least one match`);
  return text.split(from).join(to);
}
function insertBefore(text, marker, addition, label) {
  if (!text.includes(marker)) throw new Error(`${label}: marker missing`);
  return text.replace(marker, `${addition}\n\n${marker}`);
}
function common(text, faction) {
  text = replaceOnce(text, `# Gauntlet v0.6.1 ${faction} Faction Guide`, `# Gauntlet v0.6.2 ${faction} Faction Guide`, `${faction} title`);
  const oldNotice = new RegExp(`> \\*\\*Definitive v0\\.6\\.1 ${faction} faction source\\.\\*\\*[^\\n]*`);
  if (!oldNotice.test(text)) throw new Error(`${faction} source notice missing`);
  text = text.replace(oldNotice, `> **Clean v0.6.2 ${faction} faction authority candidate.** Reconstructed from the definitive v0.6.1 faction guide plus only the version-scoped v0.6.2 decisions approved by PR #606/#607. Shared rules are governed by the clean v0.6.2 Rulebook candidate. The withdrawn v0.6.2 Rulebook and combined faction guide are evidence only.`);
  text = text.replaceAll("Defender's Advantage", 'Defensive Edge');
  text = text.replaceAll('Gauntlet v0.6.1 © 2026 Tymon Scott.', 'Gauntlet v0.6.2 reconstruction candidate © 2026 Tymon Scott.');
  return text;
}

function normalizePhaseLanguage(text) {
  return text
    .replaceAll('Action Opportunity after movement', 'Denouement')
    .replaceAll('after-movement Action Opportunity', 'Denouement')
    .replaceAll('during an Action Opportunity after movement', 'during Denouement, as an Action')
    .replaceAll('During an Action Opportunity after movement', 'During Denouement, as an Action')
    .replaceAll('during an after-movement Action Opportunity', 'during Denouement')
    .replaceAll('during opening effects', 'during Onset')
    .replaceAll('During opening effects', 'During Onset');
}

function military() {
  let t = common(read(sources.military), 'Military');
  t = replaceOnce(t, '| Faction pool | 12 Military card titles. |', '| Faction pool | 13 Military card titles. |', 'Military pool count');
  t = replaceOnce(t, 'Military has **no Faction Actions**. Orders are Faction Abilities used at their printed timings; they do not use an Action Opportunity. Playing a Military card for its Action effect still costs 1 Action under the shared rules.', 'Military has **no Faction Actions**. Orders are Faction Abilities used at their printed timings; they do not use an Action. Playing a Military card for its Action effect still uses the normal Action rules.', 'Military action taxonomy');
  t = replaceOnce(t, '> **Onward — 1 Command:** During your Movement step, before a battle begins, move one additional position. This movement may start a battle.', '> **Onward — 1 Command:** During your Movement, before a pending battle is created, move one additional Position. This movement may create a pending battle.', 'Onward');
  t = replaceOnce(t, '> **Rout — 2 Command:** At the end of the Aftermath of a battle you initiated and won, advance one position. This movement may start another battle.', '> **Rout — 2 Command:** At the end of the Aftermath of a battle you initiated and won, advance one Position. This movement may create a pending battle.', 'Rout');
  t = replaceOnce(t, '> **Fortify — 2 Command:** During the Aftermath of a battle you won while occupying an enemy-controlled Territory, capture that Territory.', '> **Fortify — 2 Command:** During the Aftermath of a battle you won while occupying an enemy-controlled Territory, advance your Front Line by one Territory, if able.', 'Fortify');
  t = replaceOnce(t, '> **Action:** Play only during an Action Opportunity after you win a battle this turn. Return one Tactic you chose during that battle from your Discard Pile to your Hand.', '> **Action — Denouement:** Play only if you won a battle this turn. Return one Tactic you chose during that battle from your Discard Pile to your Hand.', 'Battlefield Promotion');
  t = t.replaceAll('revealed Territory', 'Territory');
  t = replaceOnce(t, '> **Action:** Play only during an Action Opportunity after you win a battle you initiated this turn. Advance one position. This movement may start a battle. If it does, you cannot set a Gambit or use Orders during that battle. Form your Reserve with one fewer card for each earlier battle after the first that you fought this turn. This may reduce your Reserve to zero cards. Put Give Chase in your Graveyard after this movement.', '> **Action — Denouement:** Play only if you won a battle you initiated this turn. Advance one Position. This movement may create a pending battle. If it does, you cannot set a Gambit or use Orders during that battle. Form your Reserve with one fewer card for each earlier battle after the first that you fought this turn. This may reduce your Reserve to zero cards. Put Give Chase in your Graveyard after this movement.', 'Give Chase action');
  t = t.replaceAll('This movement may start a battle.', 'This movement may create a pending battle.');
  t = replaceAllRequired(t, 'after you retreat, the attacker captures that Territory', 'after you retreat, the attacker advances their Front Line by one Territory, if able', 'Hold the Line Front Line');
  t = replaceOnce(t, 'Consolidate — Capture the contested Territory and set your Command to 2.', 'Consolidate — Advance your Front Line by one Territory, if able, then set your Command to 2.', 'Shock and Awe Consolidate');
  const invasion = `## Invasion\n\n**Cost:** 4\n\n> **Action — Opening:** During your Movement this turn, you may advance up to two additional Positions, one at a time. This additional movement may only be used to advance and may create a pending battle.\n>\n> **Battle:** If you are the attacker, form your Reserve with one additional card and you may choose one additional Tactic.\n\nUnused additional movement is lost when a pending battle is created. Invasion and Onward modify the same active Movement sequence; later movement created by Rout, Give Chase, Countercharge, Shock and Awe, or another effect is a new sequence and does not inherit unused Invasion movement.`;
  t = insertBefore(t, '# 7. Quick reference', invasion, 'Military Invasion insertion');
  return t;
}

function diplomat() {
  let t = common(read(sources.diplomat), 'Diplomat');
  t = replaceOnce(t, '| Faction procedure | Offer Terms during opening effects. |', '| Faction procedure | Offer Terms during a pending battle before Onset. |', 'Diplomat procedure');
  t = replaceOnce(t, '| Faction pool | 12 Diplomat card titles. |', '| Faction pool | 13 Diplomat card titles. |', 'Diplomat pool count');
  t = replaceOnce(t, 'Diplomats have **no Faction Actions**. Offering Terms is a faction procedure during opening effects, and Leverage is a Faction Ability used before dice are rolled after refused Terms. Neither spends an Action. Playing a Diplomat card for its Action effect still costs 1 Action under the shared rules.', 'Diplomats have **no Faction Actions**. Offering Terms is a faction procedure during a pending battle before Onset, and Leverage is a Faction Ability used before dice are rolled after refused Terms. Neither takes an Action. Playing a Diplomat card for its Action effect still uses the normal Action rules.', 'Diplomat action taxonomy');
  t = replaceOnce(t, 'Terms occur during opening effects after the attacker, defender, and contested position are established but before Gambits are set.', 'Terms occur during a pending battle after the attacker, defender, contested Position, and attacker\'s previous Position are established but before Onset.', 'Terms timing');
  const acceptedOld = `### Accepted Terms\n\nWhen Terms are accepted:\n\n1. no battle is fought;\n2. apply the Proposal's **Accepted** effect;\n3. return the Stake;\n4. if the Proposal is unratified, flip it to its Treaty Article side;\n5. if newly ratified, gain Influence equal to its Stake; and\n6. apply effects that occur after acceptance.\n\nAccepted Terms do not create a battle, winner, loser, retreat, or Aftermath.\n\nA Stake-0 Proposal grants no Influence merely for being accepted.`;
  const acceptedNew = `### Accepted Terms\n\nWhen Terms are accepted:\n\n1. no battle begins;\n2. apply the Proposal's **Accepted** effect;\n3. return the Stake;\n4. if the Proposal is unratified, flip it to its Treaty Article side;\n5. if newly ratified, gain 1 Influence; and\n6. apply effects that occur after acceptance.\n\nAccepted Terms do not create Onset, a battle, winner, loser, retreat, or Aftermath. Unless the Proposal says otherwise, the attacker withdraws and the defender remains at the contested Position.\n\nAn already-ratified Proposal grants no default ratification reward.`;
  t = replaceOnce(t, acceptedOld, acceptedNew, 'Accepted Terms');
  const refusedOld = `| Result | Stake | Ratification | Normal reward |\n|---|---|---|---|\n| Diplomat wins | Return | If new, impose and flip | Gain 1 Influence unless stated otherwise |\n| Diplomat loses | Lose | None | None |\n| No winner | Return | None | None |`;
  const refusedNew = `| Result | Stake | Ratification | Normal reward |\n|---|---|---|---|\n| Diplomat wins | Return | If new, impose and flip | Gain 2 Influence if newly ratified unless stated otherwise |\n| Diplomat loses | Lose | None | None |\n| No winner | Return | None | None |`;
  t = replaceOnce(t, refusedOld, refusedNew, 'Refused Terms table');
  t = replaceOnce(t, 'Before dice are rolled in a battle following refused Terms, the Diplomat may spend any amount of available Influence. Add +1 to the Diplomat\'s battle total for each Influence spent.\n\nStaked Influence cannot be spent as Leverage.', `Before dice are rolled in a battle following refused Terms, the Diplomat may spend Influence for Leverage:\n\n| Bonus | Total Influence cost |\n|---:|---:|\n| +1 | 1 |\n| +2 | 3 |\n| +3 | 6 |\n| +4 | 10 |\n\nThe progression continues without a fixed maximum. Each additional +1 costs one more Influence than the previous increment. Staked Influence cannot be spent as Leverage.`, 'Leverage');
  const proposalSectionStart = t.indexOf('# 5. Proposal set');
  const proposalSectionEnd = t.indexOf('# 6. Diplomat-specific rules');
  if (proposalSectionStart < 0 || proposalSectionEnd < 0) throw new Error('Diplomat Proposal section boundaries missing');
  const exactProposals = `# 5. Proposal set\n\nProposal cards are physically presented to the receiving player. Accepted and Refused text therefore uses explicit roles rather than perspective-dependent **you** or **your**.\n\n## De-escalation\n\n**Stake:** 0  \n**Requirement:** None\n\n> **Accepted:** Both players withdraw. The accepting player draws one card.\n>\n> **Refused:** The Diplomat draws one card.\n\n## Orderly Withdrawal\n\n**Stake:** 0  \n**Requirement:** The Diplomat must be the attacker.\n\n> **Accepted:** The Diplomat withdraws. The accepting player remains at the contested Position, then draws one card.\n>\n> **Refused:** Add +1 to the Diplomat's battle total.\n\n## Capitulation\n\n**Stake:** 0  \n**Requirement:** The Diplomat must be the defender.\n\n> **Accepted:** The Diplomat withdraws. The accepting player remains at the contested Position and becomes the occupier when applicable, then draws one card.\n>\n> **Refused:** If the Diplomat loses, the Diplomat draws two cards.\n\n## Open Channels\n\n**Stake:** 1  \n**Requirement:** The Diplomat must have a card in Hand.\n\n> **Accepted:** Both players reveal their Hands, then both players withdraw. The accepting player draws one card.\n>\n> **Refused:** The refusing player reveals their Hand. When the Diplomat forms their Reserve, the Diplomat draws one additional card.\n\n## Mutual Disarmament\n\n**Stake:** 1  \n**Requirement:** Both players must have a card in Hand.\n\n> **Accepted:** Each player discards one card from Hand. The accepting player draws one card, then both players withdraw.\n>\n> **Refused:** The Diplomat may discard one card from Hand. If they do, the Diplomat draws one additional card when forming their Reserve.\n\n## Prisoner Exchange\n\n**Stake:** 1  \n**Requirement:** Each player must have a card in their Graveyard.\n\n> **Accepted:** Each player may move one card from their Graveyard to their Discard Pile. Then both players withdraw.\n>\n> **Refused:** If the Diplomat loses, the Diplomat may move one card from their Graveyard to their Discard Pile.\n\n## Rebuilding Pact\n\n**Stake:** 1  \n**Requirement:** The Diplomat must have a card in Hand that can be banked as an Asset.\n\n> **Accepted:** Each player may bank one eligible card from Hand as an Asset without taking an Action. Then both players withdraw.\n>\n> **Refused:** During the Aftermath, the Diplomat may bank one eligible card from Hand as an Asset without taking an Action.\n\n## Ultimatum\n\n**Stake:** 2  \n**Requirement:** None\n\n> **Accepted:** The accepting player withdraws. The Diplomat remains at the contested Position and becomes the occupier when applicable.\n>\n> **Refused:** Add +1 to the Diplomat's battle total.\n\n## Diplomatic Recognition\n\n**Stake:** 2  \n**Requirement:** The Diplomat must be defending a Counterattack while occupying a Territory the opposing player controlled immediately before the Diplomat became its occupier.\n\n> **Accepted:** The Diplomat advances their Front Line by one Territory, if able. The accepting player withdraws, then draws two cards.\n>\n> **Refused:** If the Diplomat wins, advance the Diplomat's Front Line by one Territory during the Aftermath, if able. The Diplomat gains no Influence for imposing this Proposal.\n\n`;
  t = t.slice(0, proposalSectionStart) + exactProposals + t.slice(proposalSectionEnd);
  t = replaceOnce(t, '> **Accepted:** Put that card in your Graveyard.', '> **Accepted:** Put that card in your Graveyard, then gain 1 Influence.', 'Good Faith');
  const gunboatOld = `> **Terms:** When you offer Terms, before the opponent accepts or refuses, you may reveal Gunboat Diplomacy from your Hand.\n>\n> **Accepted:** Put Gunboat Diplomacy in your Discard Pile.\n>\n> **Refused:** Set Gunboat Diplomacy face up as an additional Gambit in the resulting battle. It does not count against your Gambit limit.\n>\n> **Battle:** Add +2 to your battle total. In the Aftermath, put this card in your Discard Pile.`;
  const gunboatNew = `> **Terms:** When you offer Terms, before the opponent accepts or refuses, you may reveal Gunboat Diplomacy from your Hand.\n>\n> **Accepted:** Put Gunboat Diplomacy in your Discard Pile.\n>\n> **Refused:** Set Gunboat Diplomacy face up as an additional Gambit in the resulting battle. It does not count against your Gambit limit.\n>\n> **Battle:** Add +2 to your battle total.\n\nNormal destinations apply. A refusal-set Gambit goes to the Graveyard; a normally chosen Tactic goes to the Discard Pile.`;
  t = replaceOnce(t, gunboatOld, gunboatNew, 'Gunboat Diplomacy');
  const detente = `## Détente\n\n**Cost:** 3  \n**Card form:** Asset\n\n> **Action:** Bank this card. You may have only one banked Détente.\n>\n> **Asset:** The first time each turn an opponent accepts one of your Proposals that was already ratified when you offered it, gain 1 Influence.\n\nDétente does not trigger when the accepted Proposal becomes ratified during those Terms.`;
  t = insertBefore(t, '# 8. Quick reference', detente, 'Détente insertion');
  t = t.replaceAll('Terms occur during Onset before Gambits.', 'Terms occur during a pending battle before Onset.');
  t = t.replaceAll('Terms occur during opening effects before Gambits.', 'Terms occur during a pending battle before Onset.');
  return t;
}

function financier() {
  let t = common(read(sources.financier), 'Financier');
  t = replaceOnce(t, '| Faction pool | 12 Financier card titles. |', '| Faction pool | 13 Financier card titles. |', 'Financier pool count');
  t = replaceOnce(t, '| Faction Actions | Place a card in Treasury, buy or buy out a Deed, Play the Market, or use Hostile Takeover; all occur after movement. |', '| Faction Actions | Place a card in Treasury, buy or buy out a Deed, Play the Market, or use Hostile Takeover; each is taken during Denouement. |', 'Financier phase table');
  t = replaceOnce(t, 'Begin with 0 Capital and an empty Treasury. Place Deed Cards in the shared unowned supply.', 'Begin with 2 Capital and an empty Treasury. Place Deed Cards in the shared unowned supply. Starting Capital 2 is the v0.6.2 playtest revision.', 'Financier starting Capital');
  t = replaceAllRequired(t, 'During an Action Opportunity after movement, spend 1 Action', 'During Denouement, take an Action', 'Financier Denouement procedures');
  const fcStart = t.indexOf('### Financial Capacity');
  const treasuryStart = t.indexOf('### Treasury');
  if (fcStart < 0 || treasuryStart < 0) throw new Error('Financial Capacity boundaries missing');
  const fc = `### Financial Capacity\n\nAfter completing the Capture step and applying all effects that occur after it, but before Draw, compare the total card value in your Treasury with the number of Territories you control.\n\nIf Treasury value is greater, you may take one Action during both Opening and Denouement that turn, provided at least one of those Actions is a Financier Faction Action. A Financier Faction Action is normally legal only during Denouement.\n\nFinancial Capacity does not permit two Actions in one phase. Determine eligibility once at this timing; later Treasury or control changes do not grant or remove the permission that turn.\n\n`;
  t = t.slice(0, fcStart) + fc + t.slice(treasuryStart);
  const additionalStart = t.indexOf('### Additional Action Opportunities');
  if (additionalStart >= 0) {
    const leadersStart = t.indexOf('# 4. Leaders', additionalStart);
    t = t.slice(0, additionalStart) + t.slice(leadersStart);
  }
  const hostileOld = `> **Hostile Takeover:** During an Action Opportunity after movement, if you won a battle as the attacker this turn and are now the occupier of that enemy Territory, you may spend 1 Action to buy or buy out its Deed. Treat yourself as the occupier, but not the controller, for the cost calculation. If the purchase succeeds, immediately take control of that Territory.`;
  const hostileNew = `> **Hostile Takeover:** During Denouement, if you won a battle as the attacker this turn and are now the occupier of that enemy Territory, you may take an Action to buy or buy out its Deed. Treat yourself as the occupier, but not the controller, for the cost calculation. If the purchase succeeds, advance your Front Line by one Territory, if able.`;
  t = replaceOnce(t, hostileOld, hostileNew, 'Hostile Takeover');
  t = replaceOnce(t, '> **Action:** Choose one unoccupied Territory whose Deed you own that is adjacent to a Territory you control. Take control of the chosen Territory.', '> **Action — Denouement:** Choose the next opposing Territory immediately beyond your Front Line if its Deed is yours and it is unoccupied. Advance your Front Line by one Territory.', 'Foreclosure action');
  t = replaceOnce(t, '> **Battle:** In the Aftermath, if you initiated it on a Territory whose Deed you owned when the battle began and you won, capture that Territory instead of occupying it.', '> **Battle:** During the Aftermath, if you initiated the battle on a Territory whose Deed you owned when the battle began and you won, advance your Front Line by one Territory, if able, instead of becoming the occupier.', 'Foreclosure battle');
  t = replaceOnce(t, '> **Action:** Bank this card. Draw two cards, then gain 1 Action and immediately take another Action Opportunity.', '> **Action:** Bank this card. Draw two cards. After this Action resolves, you may take one additional Action during this phase.', 'Tariffs');
  t = replaceOnce(t, '> **Action:** Make one Deed you own unowned. Gain Capital equal to the number of Deeds you owned before doing so, then gain 1 Action and immediately take another Action Opportunity.', '> **Action:** Make one Deed you own unowned. Gain Capital equal to the number of Deeds you owned before doing so. After this Action resolves, you may take one additional Action during this phase.', 'Divestment');
  t = replaceOnce(t, '> **Action:** Choose one other card in your Hand or Treasury and place it beneath this card as collateral. Bank this card. Gain Capital equal to the collateral card\'s value plus 2, then gain 1 Action and immediately take another Action Opportunity.', '> **Action:** Choose one other card in your Hand or Treasury and place it beneath this card as collateral. Bank this card. Gain Capital equal to the collateral card\'s value plus 2. After this Action resolves, you may take one additional Action during this phase.', 'Margin Loan');
  const compound = `## Compound Interest\n\n**Cost:** 4  \n**Card form:** Asset\n\n> **Action:** Bank this card. You may have only one banked Compound Interest.\n>\n> **Asset:** After your normal Draw, if your Treasury contains at least one card, you may reveal the top card of your Draw Pile. Place it face up in your Treasury or put it in your Discard Pile.\n\nRevealing is optional. Once revealed, the card cannot remain on top of the Draw Pile. Compound Interest has no Battle mode.`;
  t = insertBefore(t, '# 7. Quick reference', compound, 'Compound Interest insertion');
  return t;
}

function intelligence() {
  let t = common(read(sources.intelligence), 'Intelligence');
  t = replaceOnce(t, '| Faction Actions | Start, complete, or abort a Mission; start or complete a Special Operation; all occur after movement. |', '| Faction Actions | Start, complete, or abort a Mission; start or complete a Special Operation; all are Denouement Actions. |', 'Intelligence faction actions table');
  t = replaceOnce(t, '| Unique card | Sleeper Network, cost 5; maximum one copy per Playable Deck. |', '| Faction pool | 13 Intelligence card titles. |\n| Unique card | Sleeper Network, cost 5; maximum one copy per Playable Deck. |', 'Intelligence pool count');
  t = replaceAllRequired(t, 'Each costs 1 Action and may be used only during an Action Opportunity after movement:', 'Each costs one Action and is legal only during Denouement:', 'Intelligence action phase');
  t = replaceAllRequired(t, 'During an Action Opportunity after movement, spend 1 Action', 'During Denouement, take an Action', 'Intelligence Mission procedures');
  t = t.replaceAll('Fieldcraft does not alter Territory control, Occupation, capture, Defensive Edge, Last Stand bonuses, or limits calculated from Territories.', 'Fieldcraft does not alter Territory control, Occupation, Capture, Defensive Edge, Last Stand bonuses, or limits calculated from Territories.');
  t = replaceOnce(t, 'When Counterintelligence prevents an opposing effect from revealing a Hand, Reserve, face-down battle card, or Territory, it prevents the entire opposing revealing effect, not only the information portion. Rules-mandated reveals are unaffected.', 'Counterintelligence prevents an opposing effect from revealing a Hand, Reserve, or face-down battle card. It prevents the entire opposing revealing effect, not only the information portion. Rules-mandated reveals are unaffected.', 'Intelligence Counterintelligence');
  t = t.replaceAll('Place Fog of War as an Overlay on a revealed Territory.', 'Place Fog of War as an Overlay on a Territory.');
  t = replaceOnce(t, '> **Use:** During opening effects in a battle you initiated, you may discard this card to reveal the opponent\'s Hand. You may then withdraw or continue the attack.', '> **Use:** During Onset in a battle you initiated, you may discard this card to reveal the opponent\'s Hand. You may then withdraw or continue the attack.', 'Reconnaissance');
  t = replaceOnce(t, '> **Use:** During an Action Opportunity, spend 1 Action to put this card in your Graveyard and reveal its bound cards. Play each whose Action effect can apply now, one at a time and in any order, without spending additional Actions. Discard the rest.', '> **Use:** During Opening or Denouement, as an Action, put this card in your Graveyard and reveal its bound cards. Play each whose Action effect can apply now, one at a time and in any order, without taking additional Actions. Discard the rest.', 'Sleeper Network use');
  const rendition = `## Extraordinary Rendition\n\n**Cost:** 4  \n**Card form:** Asset with a bound opposing card\n\n> **Action:** Bank this card. When you do, reveal the opponent's Hand, choose one card there, and bind it face up beneath Extraordinary Rendition. You may have only one banked Extraordinary Rendition.\n>\n> **Asset:** The bound card cannot be played, moved, or affected except by Extraordinary Rendition. Whenever you discard one or more Assets you control, discard Extraordinary Rendition before any others, if able. When Extraordinary Rendition leaves play, put the bound card in its owner's Discard Pile.\n\nThe first-discard requirement applies to voluntary Asset discard, required Asset loss, and Asset replacement. Extraordinary Rendition has no Use, Battle, or Mission mode.`;
  t = insertBefore(t, '# 8. Quick reference', rendition, 'Extraordinary Rendition insertion');
  return t;
}

function mystics() {
  let t = common(read(sources.mystics), 'Mystics');
  t = replaceOnce(t, '| Trait | All twelve Mystics cards have the Arcane trait. |', '| Trait | All thirteen Mystics cards have the Arcane trait. |', 'Mystics Arcane count');
  t = replaceOnce(t, '| Faction Actions | Begin a Rite or, after all three Rites are complete, begin the Ritual of Ascendance; both occur after movement. |', '| Faction Actions | Begin a Rite or, after all three Rites are complete, begin the Ritual of Ascendance; both are normally Denouement Actions. |', 'Mystics faction phase');
  t = replaceOnce(t, '| Unique card | Necromancy, cost 5; maximum one copy per Playable Deck. |', '| Faction pool | 13 Mystics card titles. |\n| Unique card | Necromancy, cost 5; maximum one copy per Playable Deck. |', 'Mystics pool count');
  t = replaceAllRequired(t, 'Each costs 1 Action and may be used only during an Action Opportunity after movement:', 'Each costs one Action and is normally legal only during Denouement:', 'Mystics Faction Actions');
  t = replaceAllRequired(t, 'During an Action Opportunity after movement, spend 1 Action', 'During Denouement, take an Action', 'Mystics Rite procedures');
  t = replaceOnce(t, 'You may begin this Rite only by spending 1 Action during an Action Opportunity after movement after winning a battle that made you the occupier of a Territory the opponent controlled immediately before that battle.', 'You may take the Begin a Rite Faction Action for Rite of Crossing during Denouement only after winning a battle that turn that made you the occupier of a Territory the opponent controlled immediately before that battle.', 'Rite of Crossing');
  const blackOld = `> **Tactic:** When revealed, you may bind one other card from your Hand with a Tactic or Battle effect. Play it face up as an additional Tactic and apply its effect immediately after this card's effect. In the Aftermath, put this card and the bound card in your Graveyard.`;
  const blackNew = `> **Tactic:** Gain advantage. Then you may play one card from your Hand with a Tactic or Battle effect face up as an additional Tactic. In the Aftermath, put this card and that card in your Graveyard.`;
  t = replaceOnce(t, blackOld, blackNew, 'Black Covenant');
  const altar = `## Nature's Altar\n\n**Cost:** 4  \n**Trait:** Arcane  \n**Card form:** Territory Overlay\n\n> **Action:** Place Nature's Altar as an Overlay on your current Territory or an adjacent Territory.\n>\n> **Battle:** During the Aftermath, if you win, you may place Nature's Altar as an Overlay on the contested Territory.\n>\n> **Overlay:** During your Opening, if your Player Token is on this Territory, you may take the Begin a Rite Faction Action. A Rite begun this way may complete during that turn if you control this Territory when its completion condition and timing are satisfied.\n>\n> This does not change the Rite's beginning cost, requirements, or completion condition.\n\nNature's Altar creates the only general exception to the rule that a Rite cannot complete on the turn it begins. Rite of Crossing retains its specialized beginning restriction. If the Altar's controller does not control its Territory at completion timing, the same-turn exception does not apply.`;
  t = insertBefore(t, '# 9. Quick reference', altar, 'Nature\'s Altar insertion');
  return t;
}

function inquisition() {
  let t = common(read(sources.inquisition), 'Inquisition');
  t = replaceOnce(t, '| Faction Actions | Purge. The first Action spent to Purge each turn grants 1 additional Action that turn. |', '| Faction Actions | Purge — Opening or Denouement. If one phase Action is Purge, the Inquisition may take one Action in the other phase as well. |', 'Inquisition faction table');
  t = replaceOnce(t, '| Faction pool | 12 Inquisition card titles. |', '| Faction pool | 13 Inquisition card titles. |', 'Inquisition pool count');
  const faStart = t.indexOf('## Faction Actions');
  const compStart = t.indexOf('# 2. Components and setup');
  if (faStart < 0 || compStart < 0) throw new Error('Inquisition Faction Actions boundaries missing');
  const factionActions = `## Faction Actions\n\n**Purge is the Inquisition's only Faction Action.**\n\n> **Purge — Opening or Denouement:** Spend one Action and the listed Conviction to perform one Purge. You may take one Action during both Opening and Denouement that turn, provided one of those Actions is Purge.\n\n- Purge may occupy either Action phase.\n- The other Action must occupy the other phase.\n- Purge never permits two Actions in one phase.\n- Purge may be taken as a Faction Action no more than once per turn.\n- A Purge directly permitted without taking an Action, such as Final Judgment, is separate and does not consume the once-per-turn Purge Faction Action or activate the two-phase permission.\n\n`;
  t = t.slice(0, faStart) + factionActions + t.slice(compStart);
  const purgeStart = t.indexOf('### Purge');
  const purifyStart = t.indexOf('### Purification');
  if (purgeStart < 0 || purifyStart < 0) throw new Error('Inquisition Purge boundaries missing');
  const purge = `### Purge\n\nDuring Opening or Denouement, take an Action and spend Conviction to Purge:\n\n| Cost | Purge |\n|---:|---|\n| 1 | Choose one: put the top card of the opponent's Discard Pile in their Graveyard; or choose up to two cards there with combined value 2 or less and put them in their Graveyard. |\n| 2 | Choose one opposing Asset and put it in its owner's Graveyard. |\n| 3 | The opponent chooses one card from their Hand and puts it in their Graveyard. |\n| 4 | Reveal the opponent's Hand. Choose one card and put it in their Graveyard. |\n\nIf one Action that turn is Purge, you may take one Action in the other Action phase as well. This never permits two Actions in one phase. You may take the Purge Faction Action no more than once per turn. A directly permitted Purge is separate.\n\nA Purge is not playing a card.\n\n`;
  t = t.slice(0, purgeStart) + purge + t.slice(purifyStart);
  const fjOld = `> **Final Judgment:** Once per turn, during the Aftermath of a battle you won, after the battle cards have been cleared and effects triggered by those moves have been applied, you may immediately Purge without spending an Action. Reduce that Purge's Conviction cost by 1, to a minimum of 1.\n\nThe normal Conviction gain from that battle may occur before Final Judgment.`;
  const fjNew = `> **Final Judgment:** Once per turn, during the Aftermath of a battle you won, after battle cards are cleared and effects triggered by those moves are applied, you may immediately Purge without taking an Action. Reduce that Purge's Conviction cost by 1, to a minimum of 1.\n\nThe normal Conviction gain from that battle may occur before Final Judgment. Final Judgment is a Faction Ability. It does not consume the once-per-turn Purge Faction Action and does not activate the two-phase Purge permission.`;
  t = replaceOnce(t, fjOld, fjNew, 'Final Judgment');
  const rpOld = `> **Relentless Pursuit:** Once per turn, at the end of the Aftermath of a battle an opponent initiated against you and lost, you may spend 2 Conviction. End their turn, then move one position toward their end of the Gauntlet. This movement may start a battle; you are the attacker. No Action Opportunity occurs before that battle.`;
  const rpNew = `> **Relentless Pursuit:** Once per turn, at the end of the Aftermath of a battle an opponent initiated against you and lost, you may spend 2 Conviction. End their turn, then advance one Position. This movement may create a pending battle; you are the attacker. Do not create an Opening or Denouement phase before that pending battle.\n\nAccepted Terms may still prevent the resulting battle from reaching Onset.`;
  t = replaceOnce(t, rpOld, rpNew, 'Relentless Pursuit');
  const martyrdom = `## Martyrdom\n\n**Cost:** 5  \n**Unique:** Maximum one copy per Playable Deck\n\n> When you lose a battle while Martyrdom is in your Hand, during the Aftermath before battle cards are cleared, you may play it without taking an Action. If you do, cards remaining in the opponent's Reserve go to their Graveyard instead of their Discard Pile during this Aftermath. After battle cards are cleared, set your Conviction to 4 and put Martyrdom in your Graveyard.\n>\n> Martyrdom does not prevent the loss, retreat, Occupation, or other normal consequences of the battle result.\n\nSetting Conviction to 4 is one set operation, not four separate gains. In an Inquisition mirror, an applicable No Martyrs controlled by the winner prevents the losing opponent from playing or benefiting from Martyrdom.`;
  t = insertBefore(t, '# 7. Quick reference', martyrdom, 'Martyrdom insertion');
  return t;
}

const outputs = {
  military: normalizePhaseLanguage(military()),
  diplomat: normalizePhaseLanguage(diplomat()),
  financier: normalizePhaseLanguage(financier()),
  intelligence: normalizePhaseLanguage(intelligence()),
  mystics: normalizePhaseLanguage(mystics()),
  inquisition: inquisition()
};

for (const [slug, text] of Object.entries(outputs)) {
  const dir = path.join(outRoot, slug);
  fs.mkdirSync(dir, { recursive: true });
  const display = slug === 'diplomat' ? 'Diplomat' : slug === 'financier' ? 'Financier' : slug === 'intelligence' ? 'Intelligence' : slug === 'mystics' ? 'Mystics' : slug === 'inquisition' ? 'Inquisition' : 'Military';
  fs.writeFileSync(path.join(dir, `Gauntlet_v0.6.2_${display}_Faction_Guide.md`), text);
}

const manifest = {
  schema_version: 1,
  status: 'authority_candidate_pending_semantic_review',
  target: 'clean-v0.6.2',
  authority_base: 'v0.6.1',
  approval_pr: 606,
  build_unlock_pr: 607,
  forbidden_authority_sources: [
    'releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Rulebook.md',
    'releases/v0.6.2-withdrawn/Gauntlet_v0.6.2_Faction_and_Component_Guide.md'
  ],
  evidence_sources: [
    'docs/Gauntlet_v0.6.2_Shared_Rules_Candidate.md',
    'docs/Gauntlet_v0.6.2_Faction_and_Component_Candidate.md',
    'docs/Gauntlet_v0.6.2_Faction_Component_Compatibility_Audit.md',
    'https://github.com/tymonius/Gauntlet/pull/511',
    'config/reconstruction-version-plan.json',
    'config/reconstruction-version-resolutions.json'
  ],
  guides: Object.keys(outputs)
};
fs.mkdirSync(outRoot, { recursive: true });
fs.writeFileSync(path.join(outRoot, 'authority-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

console.log('Built six clean v0.6.2 faction authority candidates from v0.6.1 baseline sources.');
