import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const check = process.argv.includes('--check');
const failures = [];

function synchronize(relativePath, transform) {
  const target = path.join(root, relativePath);
  const before = fs.readFileSync(target, 'utf8');
  const after = transform(before);
  if (after === before) return;
  if (check) {
    failures.push(`Stale v0.6.2 public site file: ${relativePath}`);
    return;
  }
  fs.writeFileSync(target, after, 'utf8');
}

function commonFactionPage(html) {
  return html
    .replaceAll('href="../../rulebook/"', 'href="../../v0.6.2/rulebook/"')
    .replaceAll('href="../../deckbuilder/"', 'href="../../v0.6.2/deckbuilder/"')
    .replaceAll('· faction guide', '· v0.6.2 faction guide')
    .replaceAll('<p>Unpublished pre-release playtest project.</p>', '<p>Current playtest edition: v0.6.2.</p>')
    .replaceAll('<p>Unpublished playtest project.</p>', '<p>Current playtest edition: v0.6.2.</p>');
}

function military(html) {
  return commonFactionPage(html)
    .replace(
      'The Commandant turns a defended position into lasting control, strengthening defenses, driving attackers farther back, and capturing occupied ground immediately.',
      'The Commandant turns a defended position into lasting control, strengthening defenses, driving attackers farther back, and advancing the Front Line after a qualifying defensive win.'
    )
    .replace(
      'Orders: Entrench strengthens a defense; Repel increases an attacker’s retreat; Fortify captures enemy-controlled ground after a qualifying victory.',
      'Orders: Entrench strengthens a defense; Repel increases an attacker’s retreat; Fortify advances your Front Line by one Territory after a qualifying defensive victory.'
    );
}

function diplomats(html) {
  return commonFactionPage(html)
    .replace(
      'Before cards are committed, choose an eligible Proposal, stake its Influence, and let the opponent accept or refuse.',
      'During a pending battle before Onset, choose an eligible Proposal, stake its Influence, and let the opponent accept or refuse.'
    );
}

function financiers(html) {
  return commonFactionPage(html)
    .replace(
      /(?:Begin with 2 Capital\.\s*)*Place cards face up in Treasury to raise your Capital limit\. Capital may exceed that limit temporarily, but excess is lost at the end of the turn\./,
      'Begin with 2 Capital. Place cards face up in Treasury to raise your Capital limit. Capital may exceed that limit temporarily, but excess is lost at the end of the turn.'
    )
    .replace(
      'After the Capture step, if Treasury value exceeds Territories controlled, gain 1 additional Action that turn. If you spend both Actions, at least one must be spent on a Financier Faction Action.',
      'After Capture and its effects, but before Draw, if Treasury value exceeds Territories controlled, you may take one Action during both Opening and Denouement. If you take both, at least one must be a Financier Faction Action.'
    )
    .replace(
      'The Executive converts battlefield occupation into an immediate purchase and change of control.',
      'The Executive converts battlefield occupation into an immediate purchase and, when supported, an advance of the contiguous Front Line.'
    )
    .replace(
      'Hostile Takeover: during an Action Opportunity after movement, after winning as the attacker that turn and becoming the occupier of that enemy Territory, spend 1 Action to buy or buy out its Deed. A successful purchase immediately gives you control.',
      'Hostile Takeover: during Denouement, after winning as the attacker that turn and becoming the occupier of an enemy Territory, take the Faction Action to buy or buy out its Deed. A successful purchase advances your Front Line by one Territory, if able; it never creates isolated control.'
    );
}

function intelligence(html) {
  return commonFactionPage(html)
    .replace(
      'Begin one face-down Mission, satisfy its requirement through normal play, then spend a later Action Opportunity to complete it.',
      'Begin one face-down Mission, satisfy its requirement through normal play, then take a later Denouement Faction Action to complete it.'
    );
}

function mystics(html) {
  return commonFactionPage(html)
    .replace(
      'Guardians of the Circle: the first time on your turn that a battle loss would interrupt a begun Rite or Ritual, put an Arcane card from Hand in your Graveyard whose value is at least 1 plus your completed Rites to prevent that interruption.',
      'Guardians of the Circle: the first time on your turn that a battle loss would interrupt a begun Rite or Ritual, put an Arcane card from Hand in your Graveyard with value at least 1 for the first Rite, 2 for the second, 3 for the third, or 4 for the Ritual to prevent that interruption.'
    );
}

function inquisition(html) {
  return commonFactionPage(html)
    .replace(
      'Condemnation changes normal Tactic cleanup. During an Action Opportunity, spend 1 Action and Conviction to Purge. The first Action spent to Purge each turn grants 1 additional Action that turn; at most 1 Action may be spent on Purge each turn.',
      'Condemnation changes normal Tactic cleanup. Purge is a Faction Action during Opening or Denouement. You may take one Action in both phases when one is Purge, but never two Actions in the same phase, and the Purge Faction Action remains once per turn.'
    )
    .replace(
      'Relentless Pursuit: once per turn, at the end of the Aftermath of a battle an opponent initiated against you and lost, spend 2 Conviction to end their turn and move one position toward their end. Any battle begins with you as attacker; no Action Opportunity occurs first.',
      'Relentless Pursuit: once per turn, at the end of the Aftermath of a battle an opponent initiated against you and lost, spend 2 Conviction to end their turn and advance one Position toward their end. Any resulting pending battle uses you as attacker; no Opening or Denouement is inserted first.'
    );
}

function homepage(html) {
  return html
    .replace(
      'Choose a faction and leader, build a 30-card Deck totaling 60 value, and select three different territories.',
      'Choose a faction and leader, build a Deck of at least 30 cards with no more than 60 total value, and select three different Territories.'
    );
}

synchronize('index.html', homepage);
synchronize('factions/military/index.html', military);
synchronize('factions/diplomats/index.html', diplomats);
synchronize('factions/financiers/index.html', financiers);
synchronize('factions/intelligence/index.html', intelligence);
synchronize('factions/mystics/index.html', mystics);
synchronize('factions/inquisition/index.html', inquisition);

if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log(`${check ? 'Verified' : 'Synchronized'} the v0.6.2 homepage and six public faction overviews.`);
