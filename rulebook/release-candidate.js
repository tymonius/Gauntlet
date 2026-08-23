const CANDIDATE_VERSION = 'v0.6.4-candidate';

function replaceRequired(source, search, replacement, label = search) {
  if (!source.includes(search)) throw new Error(`Release-candidate Rulebook could not locate ${label}.`);
  return source.replace(search, replacement);
}

function replacePatternRequired(source, pattern, replacement, label) {
  if (!pattern.test(source)) throw new Error(`Release-candidate Rulebook could not locate ${label}.`);
  pattern.lastIndex = 0;
  return source.replace(pattern, replacement);
}

function replaceRangeRequired(source, startMarker, endMarker, replacement, label) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`Release-candidate Rulebook could not locate ${label} start.`);
  const endStart = source.indexOf(endMarker, start + startMarker.length);
  if (endStart < 0) throw new Error(`Release-candidate Rulebook could not locate ${label} end.`);
  const end = endStart + endMarker.length;
  return `${source.slice(0, start)}${replacement}${source.slice(end)}`;
}

function markdownSectionBounds(source, heading, level) {
  const marker = `${'#'.repeat(level)} ${heading}`;
  const start = source.indexOf(marker);
  if (start < 0) return null;

  const remainderStart = start + marker.length;
  const remainder = source.slice(remainderStart);
  const nextHeading = new RegExp(`\\n#{1,${level}}\\s+`, 'g').exec(remainder);
  const end = nextHeading ? remainderStart + nextHeading.index : source.length;
  return { start, end, marker };
}

function replaceMarkdownSection(source, heading, level, body) {
  const bounds = markdownSectionBounds(source, heading, level);
  if (!bounds) throw new Error(`Release-candidate Rulebook could not locate heading ${heading}.`);
  const replacement = `${bounds.marker}\n\n${String(body || '').trim()}\n`;
  return `${source.slice(0, bounds.start)}${replacement}${source.slice(bounds.end)}`;
}

function appendToMarkdownSection(source, heading, level, body) {
  const bounds = markdownSectionBounds(source, heading, level);
  if (!bounds) throw new Error(`Release-candidate Rulebook could not locate heading ${heading}.`);
  const insertion = `\n\n${String(body || '').trim()}\n`;
  return `${source.slice(0, bounds.end).trimEnd()}${insertion}${source.slice(bounds.end)}`;
}

function ruleById(currentGame, id) {
  const rule = currentGame?.ruleChanges?.rulebook_overrides?.find((entry) => entry.id === id);
  if (!rule?.body) throw new Error(`Release-candidate Rulebook is missing current rule ${id}.`);
  return rule;
}

function leaderSection(currentGame, faction, leaderId, sectionName) {
  const leader = currentGame?.leaders?.find((entry) => entry.faction === faction && entry.id === leaderId);
  const section = leader?.sections?.find((entry) => entry?.[0] === sectionName);
  if (!section?.[1]) throw new Error(`Release-candidate Rulebook is missing ${leaderId}/${sectionName}.`);
  return { text: section[1], cost: section[2] || '' };
}

function applyProposalWording(source, currentGame) {
  let result = source;
  for (const proposal of currentGame?.proposals || []) {
    const body = [
      `**Stake:** ${proposal.stake}`,
      `**Requirement:** ${proposal.requirement}`,
      '',
      `> **Accepted:** ${proposal.accepted}`,
      '',
      `> **Refused:** ${proposal.refused}`,
    ].join('\n');
    result = replaceMarkdownSection(result, proposal.name, 3, body);
  }
  return result;
}

function applyArcaneWording(source, currentGame) {
  const arcane = currentGame?.arcaneSymbol;
  if (!arcane?.general_rule?.body || !arcane?.mystics_rule?.body) return source;

  let result = source;
  if (!result.includes(`### ${arcane.general_rule.heading}`)) {
    result = appendToMarkdownSection(
      result,
      'Printed card effects',
      2,
      `### ${arcane.general_rule.heading}\n\n${arcane.general_rule.body}`,
    );
  } else {
    result = replaceMarkdownSection(result, arcane.general_rule.heading, 3, arcane.general_rule.body);
  }
  result = replaceMarkdownSection(result, arcane.mystics_rule.heading, 3, arcane.mystics_rule.body);
  return result;
}

function applyOnsetMigration(source, currentGame) {
  const onset = ruleById(currentGame, 'battle-onset');
  const terms = ruleById(currentGame, 'battle-terms');
  const accepted = ruleById(currentGame, 'battle-accepted-terms');
  const refused = ruleById(currentGame, 'battle-refused-terms');
  const withdrawal = ruleById(currentGame, 'battle-withdrawal');

  let result = source;

  result = replaceRequired(
    result,
    "Entering the opponent's position creates a pending battle.",
    "Entering the opponent's position initiates a battle and immediately enters Onset.",
    'Game at a Glance battle initiation',
  );
  result = replaceRequired(
    result,
    'Before that battle begins, applicable Diplomat Terms resolve. If the pending battle continues, Onset begins the battle.',
    'During Onset, applicable Diplomat Terms resolve first. If the battle proceeds, resolve the remaining Onset effects before setting Gambits.',
    'Game at a Glance Terms timing',
  );

  result = replaceRequired(
    result,
    "Entering the opponent's position creates a pending battle.",
    "Entering the opponent's position initiates a battle and immediately enters Onset.",
    'Movement summary battle initiation',
  );

  result = replaceRangeRequired(
    result,
    "Entering the opponent's position:\n\n1. move the attacking token into the contested position;",
    'even if the pending battle is later prevented by Terms or another effect.',
    [
      "Entering the opponent's position:",
      '',
      '1. move the attacking token into the contested position;',
      "2. establish the attacker, defender, contested position, and the attacker's previous position; and",
      '3. enter Onset.',
      '',
      'The Onset procedure in Chapter 7 begins immediately. Resolve Terms first when applicable, then determine whether the battle proceeds.',
      '',
      'When movement initiates a battle, the current movement sequence ends and all unused movement in that sequence is lost, even if the battle sequence ends during Onset.',
    ].join('\n'),
    'Movement complete-rules battle initiation',
  );

  result = replaceRangeRequired(
    result,
    'The pre-battle sequence is:\n\n> **Pending battle → Terms → Onset → Gambits**',
    'If Terms are refused or none are offered, proceed to Onset. The battle begins during Onset.',
    [
      'The battle sequence begins with:',
      '',
      '> **Onset → Gambits**',
      '',
      "During Onset, establish the attacker, defender, contested position, and attacker's previous position. Resolve Terms first when applicable.",
      '',
      'If the battle is prevented or a player withdraws during Onset, the sequence ends there without Gambits, a battle result, or Aftermath.',
      '',
      'If the battle proceeds, resolve the remaining Onset effects and continue to Gambits.',
    ].join('\n'),
    'Battle how-it-works sequence',
  );

  result = replaceRangeRequired(
    result,
    '#### Pending battle',
    'After all Onset effects resolve, proceed to Gambits.',
    [
      '#### Onset',
      '',
      onset.body,
      '',
      '#### Terms',
      '',
      terms.body,
      '',
      '##### Accepted Terms',
      '',
      accepted.body,
      '',
      '##### Refused Terms',
      '',
      refused.body,
    ].join('\n'),
    'Battle complete-rules Onset and Terms',
  );

  result = replaceRequired(
    result,
    'Terms are not part of this sequence because they resolve before the battle reaches Onset.',
    'Terms, when applicable, resolve during Onset before other pre-Gambit effects.',
    'Battle sequence Terms note',
  );

  result = replaceRangeRequired(
    result,
    'A player withdraws when a pending or active battle ends without determining a winner.',
    'Withdrawal does not count as Fall Back or ordinary movement for effects unless an effect says otherwise.',
    [
      'A player withdraws when a battle sequence ends without determining a winner.',
      '',
      'There is no winner or loser. Victory, loss, and retreat triggers do not occur.',
      '',
      withdrawal.body,
      '',
      'Withdrawal does not count as Fall Back or ordinary movement for effects unless an effect says otherwise.',
    ].join('\n'),
    'Withdrawal timing',
  );

  result = replaceRequired(
    result,
    '- Effect-granted movement may create a pending battle and may initiate a legal Last Stand unless expressly prohibited.',
    '- Effect-granted movement may initiate a battle and may initiate a legal Last Stand unless expressly prohibited.',
    'effect-granted movement battle initiation',
  );
  result = replaceRequired(
    result,
    '- When movement creates a pending battle, that movement sequence ends and unused movement from it is lost normally.',
    '- When movement initiates a battle, that movement sequence ends and unused movement from it is lost normally.',
    'effect-granted movement ending',
  );

  result = replaceMarkdownSection(
    result,
    'Battles ending without a winner',
    2,
    [
      'When a rule or effect ends a battle sequence **without a winner**:',
      '',
      '- neither player wins or loses; withdrawal is not a loss;',
      '- if the sequence ends during Onset, no Gambits are set, no battle result occurs, and no Aftermath is resolved;',
      '- if Onset has completed and the battle has proceeded to Gambits, unresolved Gambit or Tactic effects do not apply after the battle-ending instruction unless that instruction expressly says otherwise;',
      '- effects that already applied are not undone;',
      '- after Onset, complete any remaining non-result Aftermath procedures that are still applicable;',
      '- after Onset, clear committed cards and cards remaining in Reserve normally unless the ending effect gives them another destination; and',
      '- apply normal positional consequences, including Occupation when applicable, based on the Player Tokens that remain after any instructed withdrawal.',
      '',
      'An effect conditioned on a player winning or losing does not apply when the battle sequence ends without a winner.',
    ].join('\n'),
  );

  const onward = leaderSection(currentGame, 'military', 'general', 'Onward');
  const rout = leaderSection(currentGame, 'military', 'general', 'Rout');
  result = replacePatternRequired(
    result,
    /^> \*\*Onward — 1 Command:\*\*.*$/m,
    `> **Onward — 1 Command:** ${onward.text}`,
    'General Onward wording',
  );
  result = replacePatternRequired(
    result,
    /^> \*\*Rout — 2 Command:\*\*.*$/m,
    `> **Rout — 2 Command:** ${rout.text}`,
    'General Rout wording',
  );

  result = replaceRequired(
    result,
    '| Faction procedure | Offer Terms during a pending battle before Onset. |',
    '| Faction procedure | Offer Terms during Onset before other pre-Gambit effects. |',
    'Diplomat summary Terms timing',
  );
  result = replaceRequired(
    result,
    'Offering Terms is a faction procedure during a pending battle before Onset, and Leverage is a Faction Ability used before dice are rolled after refused Terms.',
    'Offering Terms is a faction procedure during Onset before other pre-Gambit effects, and Leverage is a Faction Ability used before dice are rolled after refused Terms.',
    'Diplomat faction-action Terms timing',
  );

  result = replaceRangeRequired(
    result,
    '#### Offering Terms\n\nTerms occur during a pending battle',
    '3. Once either player offers Terms, the other cannot offer Terms for that battle, even if the Proposal is refused.',
    [
      '#### Offering Terms',
      '',
      "Terms occur during Onset after the attacker, defender, contested Position, and attacker's previous Position are established and before other pre-Gambit effects.",
      '',
      'To offer Terms:',
      '',
      '1. choose one eligible Proposal;',
      '2. confirm its Requirement;',
      '3. confirm enough available Influence for its Stake;',
      '4. lower available Influence by the Stake; and',
      '5. the opponent accepts or refuses.',
      '',
      'A Diplomat may normally offer one Proposal in a battle sequence.',
      '',
      '#### Diplomat mirrors',
      '',
      'Only one player may offer Terms in a battle sequence.',
      '',
      '1. The attacker has the first opportunity.',
      '2. If the attacker passes, the defender may offer.',
      '3. Once either player offers Terms, the other cannot offer Terms in that battle sequence, even if the Proposal is refused.',
    ].join('\n'),
    'Diplomat Terms procedure',
  );

  result = replaceRequired(
    result,
    '1. no battle begins;',
    '1. the battle sequence ends during Onset;',
    'Accepted Terms first step',
  );
  result = replaceRequired(
    result,
    'Accepted Terms do not create Onset, a battle, winner, loser, retreat, or Aftermath. Unless the Proposal says otherwise, the attacker withdraws and the defender remains at the contested Position.',
    'Accepted Terms end the sequence during Onset. No battle is fought, no Gambits are set, and there is no winner, loser, retreat result, or Aftermath. Unless the Proposal says otherwise, the attacker withdraws and the defender remains at the contested Position.',
    'Accepted Terms consequence',
  );
  result = replaceRequired(
    result,
    '2. continue to Set Gambits;',
    '2. continue Onset and, if the battle proceeds, continue to Set Gambits;',
    'Refused Terms continuation',
  );

  const pursuit = leaderSection(currentGame, 'inquisition', 'witch-hunter', 'Relentless Pursuit');
  result = replacePatternRequired(
    result,
    /^> \*\*Relentless Pursuit:\*\*.*$/m,
    `> **Relentless Pursuit:** ${pursuit.text}`,
    'Witch Hunter Relentless Pursuit wording',
  );
  result = replaceRequired(
    result,
    'Accepted Terms may still prevent the resulting battle from reaching Onset.',
    'Accepted Terms may still end the resulting battle sequence during Onset before Gambits are set.',
    'Witch Hunter accepted-Terms timing',
  );

  result = replaceRequired(
    result,
    '4. **Movement:** Advance, Hold, or Fall Back; resolve any pending battle immediately.',
    '4. **Movement:** Advance, Hold, or Fall Back; resolve any initiated battle sequence immediately.',
    'Quick Turn battle wording',
  );
  result = replaceRangeRequired(
    result,
    "1. Entering the opponent's position creates a **pending battle**.",
    '3. If the pending battle continues, **Onset** begins the battle.',
    [
      "1. Entering the opponent's position initiates a battle and immediately enters **Onset**.",
      "2. Establish the attacker, defender, contested position, and attacker's previous position; resolve applicable **Terms** first.",
      '3. If the battle proceeds, resolve remaining Onset effects, then continue to Gambits.',
    ].join('\n'),
    'Quick Battle opening steps',
  );

  result = replaceRequired(
    result,
    '**Onset:** The formal opening stage of an active battle. A pending battle becomes a battle during Onset.\n\n**Pending battle:** The state after attacker, defender, contested position, and attacker\'s previous position are established but before Onset. Terms resolve here.',
    '**Onset:** The first phase of the battle sequence. Establish the battle context here, resolve Terms first when applicable, determine whether the battle proceeds, and resolve other pre-Gambit effects before Gambits are set.',
    'Glossary Onset and Pending battle entries',
  );

  if (/\bpending(?:-|\s+)battle\b/i.test(result)) {
    throw new Error('Release-candidate Rulebook still contains Pending Battle terminology.');
  }
  if (/\bbefore Onset\b/i.test(result)) {
    throw new Error('Release-candidate Rulebook still contains pre-Onset timing from the released rules.');
  }
  return result;
}

export function applyReleaseCandidateRulebook(source, currentGame) {
  if (currentGame?.version !== CANDIDATE_VERSION) {
    throw new Error(`Release-candidate Rulebook expected ${CANDIDATE_VERSION}, received ${currentGame?.version || 'missing'}.`);
  }

  let result = String(source || '');
  result = replaceRequired(result, '**Version 0.6.3**', '**Version 0.6.4 — Release Candidate**', 'Rulebook version label');
  result = replaceRequired(
    result,
    '**Version 0.6.4 — Release Candidate**',
    '**Version 0.6.4 — Release Candidate**\n\n> **Release candidate.** This view layers the current-development rules over the published v0.6.3 Rulebook. Switch back to **Released v0.6.3** for the published ruleset.',
    'candidate notice insertion',
  );

  result = applyOnsetMigration(result, currentGame);
  result = applyProposalWording(result, currentGame);
  result = applyArcaneWording(result, currentGame);
  return result;
}
