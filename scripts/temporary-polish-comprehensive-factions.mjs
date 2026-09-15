import { readFile, writeFile } from 'node:fs/promises';

const path = 'scripts/comprehensive-rules-factions.mjs';
let source = await readFile(path, 'utf8');

function replace(before, after, label) {
  if (!source.includes(before)) throw new Error(`Missing polish anchor: ${label}`);
  source = source.replace(before, after);
}

replace(
`function factionIntro(faction) {
  const resource = faction.resource ? \` Its principal resource or progression is **\${faction.resource}**.\` : '';
  return \`\${faction.name} can always win by running the Gauntlet. \${faction.victory}\${resource}\`;
}`,
`function factionIntro(faction) {
  const resource = faction.resource ? \` Its principal resource or progression is **\${faction.resource}**.\` : '';
  const victory = faction.victory.trim();
  let additional = '';
  if (victory !== 'Run the Gauntlet.') {
    const sharedPrefix = 'Run the Gauntlet or ';
    additional = victory.startsWith(sharedPrefix)
      ? \` An additional victory route is to \${victory.slice(sharedPrefix.length, -1)}.\`
      : \` An additional victory route is: \${victory}\`;
  }
  return \`\${faction.name} can always win by running the Gauntlet.\${additional}\${resource}\`;
}`,
'faction intro');

replace(
  'Orders do not spend an Action. To use an Order, pay its listed Command at its stated timing and resolve it immediately. The chosen Leader determines which Orders are available.',
  'The chosen Leader determines which Orders are available.',
  'Military Orders repetition');

replace(
  '**If the battle ends without a winner:** ${terms.no_winner}',
  '**No winner:** ${terms.no_winner}',
  'Diplomat no-winner label');

replace(
  'The Capital Limit is **${capital.limit_formula}**. Recalculate that limit immediately whenever its inputs change. Capital may temporarily exceed the limit, but ${capital.limit_enforcement}',
  'The Capital Limit is **${capital.limit_formula}**. Recalculate that limit immediately whenever its inputs change. Capital may temporarily exceed the limit. ${capital.limit_enforcement}',
  'Capital limit prose');

replace(
`The Mission / Special Operation slot holds at most **\${slot.maximum}** active card. A normal Mission and a Special Operation share that slot. \${slot.eligible_card}

**Start — \${missions.start.timing}, \${missions.start.action_cost} Action.** \${missions.start.text} A Mission cannot complete on the turn it was started.

**Complete — \${missions.complete.timing}, \${missions.complete.action_cost} Action.** \${missions.complete.text}

**Abort — \${missions.abort.timing}, \${missions.abort.action_cost} Action.** \${missions.abort.text}`,
`The Mission / Special Operation slot holds at most **\${slot.maximum}** active card. A normal Mission and a Special Operation share that slot. **Eligibility:** \${slot.eligible_card}

**Start (\${missions.start.action_cost} Action).** \${missions.start.timing} \${missions.start.text} A Mission cannot complete on the turn it was started.

**Complete (\${missions.complete.action_cost} Action).** \${missions.complete.timing} \${missions.complete.text}

**Abort (\${missions.abort.action_cost} Action).** \${missions.abort.timing} \${missions.abort.text}`,
'normal Mission prose');

replace(
  '**Start — ${special.start.timing}, ${special.start.action_cost} Action.** ${special.start.text}',
  '**Start (${special.start.action_cost} Action).** ${special.start.timing} ${special.start.text}',
  'Special Operation start');

replace(
  '**Complete — ${special.complete.timing}, ${special.complete.action_cost} Action.** Intel cost: **${special.complete.intel_cost_formula}**. ${special.complete.text}',
  '**Complete (${special.complete.action_cost} Action).** ${special.complete.timing} Intel cost: **${special.complete.intel_cost_formula}**. ${special.complete.text}',
  'Special Operation complete');

replace(
  'The opponent may replace a removed card from ${interference.replacement_source}; the replacement is ${interference.replacement_face_state}. Replacement is optional.',
  'The opponent may replace a removed card. Replacement source: ${interference.replacement_source}. The replacement is ${interference.replacement_face_state}. Replacement is optional.',
  'Interference replacement source');

replace(
  'Choose exactly **${selection.selectedCount}** different Rites from the **${selection.poolSize}**-Rite pool at ${selection.timing}. ${selection.rule} Visibility: ${selection.visibility}.',
  '${selection.rule}',
  'Mystics selection repetition');

replace(
  '${conviction.timing}\n\n${conviction.text}',
  '**Timing:** ${conviction.timing}\n\n${conviction.text}',
  'Conviction timing');

replace(
  "Purge costs **${purge.action_cost} Action** and may be used during ${p.purge_phases.join(' or ')}. The normal Action use of Purge is limited to ${purge.action_purge_limit}.",
  "Purge costs **${purge.action_cost} Action** and may be used during ${p.purge_phases.join(' or ')}. The normal Action use of Purge is limited to once per turn.",
  'Purge limit prose');

replace(
  '${purification.timing}\n\n${purification.text}',
  '**Timing:** ${purification.timing}\n\n${purification.text}',
  'Purification timing');

source = source
  .replaceAll('return `#### ${ability.name}', 'return `##### ${ability.name}')
  .replaceAll('return `##### ${item.name}', 'return `###### ${item.name}');

await writeFile(path, source);
