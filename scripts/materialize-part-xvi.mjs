import { readFile, writeFile } from 'node:fs/promises';

const contractPath = 'config/rules-surface-contract.json';
const rendererPath = 'scripts/render-comprehensive-rules.mjs';

const termRegistry = [
  { id: 'action', term: 'Action', definitionSource: { path: ['gameplay','turn','actions','normal_timing'] }, sections: ['III.2 Actions'], seeAlso: ['opening','denouement'] },
  { id: 'advantage-disadvantage', term: 'Advantage and Disadvantage', sections: ['V.5 Advantage and disadvantage'] },
  { id: 'aftermath', term: 'Aftermath', sections: ['V.10 Aftermath'] },
  { id: 'arcane', term: 'Arcane', definitionSource: { path: ['arcaneSymbol','mystics_rule','body'] }, sections: ['Part XIV — Mystics Rules'] },
  { id: 'asset', term: 'Asset', sections: ['VII.3 Banking Assets','VII.5 Asset Removal'], seeAlso: ['asset-bank'] },
  { id: 'asset-bank', term: 'Asset Bank', definitionSource: { path: ['gameplay','card_zones','asset_bank','text'] }, sections: ['VII.1 Card zones'], seeAlso: ['asset'] },
  { id: 'battle-total', term: 'Battle Total', definitionSource: { path: ['gameplay','battle','battle_total','calculation'] }, sections: ['V.4 Battle total'] },
  { id: 'blasphemy', term: 'Blasphemy', definitionSource: { path: ['gameplay','faction_rules','inquisition','blasphemy','text'] }, sections: ['Part XV — Inquisition Rules'], seeAlso: ['conviction','arcane'] },
  { id: 'bound-card', term: 'Bound Card', definitionSource: { path: ['gameplay','card_rules','bind','normal_availability'] }, sections: ['VII.6 Bound cards'] },
  { id: 'capital', term: 'Capital', sections: ['Part XII — Financier Rules'], seeAlso: ['capital-limit','treasury','deed'] },
  { id: 'capital-limit', term: 'Capital Limit', definitionSource: { path: ['gameplay','faction_rules','financiers','capital','limit_formula'] }, sections: ['Part XII — Financier Rules'], seeAlso: ['capital','treasury'] },
  { id: 'capture', term: 'Capture', definitionSource: { path: ['gameplay','battlefield','capture'] }, sections: ['VI.2 Capture'], seeAlso: ['front-line','control'] },
  { id: 'command', term: 'Command', sections: ['Part X — Military Rules'], seeAlso: ['orders'] },
  { id: 'condemnation', term: 'Condemnation', definitionSource: { path: ['gameplay','faction_rules','inquisition','condemnation','text'] }, sections: ['Part XV — Inquisition Rules'], seeAlso: ['conviction'] },
  { id: 'control', term: 'Control', sections: ['VI.1 Front Line','VI.2 Capture'], seeAlso: ['front-line','occupation'] },
  { id: 'controlling-interest', term: 'Controlling Interest', definitionSource: { path: ['gameplay','faction_rules','financiers','controlling_interest','text'] }, sections: ['Part XII — Financier Rules'], seeAlso: ['deed'] },
  { id: 'convergence', term: 'Convergence', definitionSource: { path: ['mystics','unlocks','2','text'] }, sections: ['Part XIV — Mystics Rules'], seeAlso: ['rite','ritual-of-ascension'] },
  { id: 'conviction', term: 'Conviction', sections: ['Part XV — Inquisition Rules'], seeAlso: ['purge','condemnation','blasphemy'] },
  { id: 'counterattack', term: 'Counterattack', definitionSource: { path: ['gameplay','battlefield','counterattack'] }, sections: ['IV.5 Counterattack'], seeAlso: ['occupation'] },
  { id: 'deck', term: 'Deck', sections: ['II.1 Deck construction'], seeAlso: ['draw-pile'] },
  { id: 'deed', term: 'Deed', aliases: ['Deeds'], sections: ['Part XII — Financier Rules'], seeAlso: ['capital','controlling-interest'] },
  { id: 'defensive-edge', term: 'Defensive Edge', definitionSource: { path: ['gameplay','battle','defensive_edge'] }, sections: ['V.6 Defensive Edge and Tiebreak Roll'], seeAlso: ['tiebreak-roll'] },
  { id: 'denouement', term: 'Denouement', sections: ['III.1 Turn sequence','III.2 Actions'], seeAlso: ['action','opening'] },
  { id: 'discard-pile', term: 'Discard Pile', definitionSource: { path: ['gameplay','card_zones','discard_pile','text'] }, sections: ['VII.1 Card zones','III.3 Draw'], seeAlso: ['draw-pile','graveyard'] },
  { id: 'draw-pile', term: 'Draw Pile', definitionSource: { path: ['gameplay','card_zones','draw_pile','text'] }, sections: ['VII.1 Card zones','III.3 Draw'], seeAlso: ['deck','discard-pile'] },
  { id: 'faction-feature', term: 'Faction Feature', definitionSource: { path: ['factionFeatureTaxonomy','factionFeature'] }, sections: ['I.1 Faction Features and Leader Abilities'], seeAlso: ['leader-ability'] },
  { id: 'fall-back', term: 'Fall Back', definitionSource: { path: ['gameplay','battlefield','movement_rules','choices','fall_back'] }, sections: ['IV.2 Normal movement'], seeAlso: ['retreat','withdrawal'] },
  { id: 'financial-capacity', term: 'Financial Capacity', definitionSource: { path: ['gameplay','faction_rules','financiers','financial_capacity'] }, sections: ['Part XII — Financier Rules'] },
  { id: 'front-line', term: 'Front Line', definitionSource: { path: ['gameplay','battlefield','front_line'] }, sections: ['VI.1 Front Line','VI.2 Capture'], seeAlso: ['control','capture'] },
  { id: 'gambit', term: 'Gambit', aliases: ['Gambits'], sections: ['V.1 Normal battle sequence','V.2 Commitment sources and Reserve','VII.2 Effect headings'], seeAlso: ['tactic','reserve'] },
  { id: 'gauntlet', term: 'Gauntlet', definitionSource: { path: ['gameplay','battlefield','gauntlet'] }, sections: ['IV.1 Gauntlet and Position'] },
  { id: 'graveyard', term: 'Graveyard', definitionSource: { path: ['gameplay','card_zones','graveyard','text'] }, sections: ['VII.1 Card zones'], seeAlso: ['discard-pile'] },
  { id: 'hand', term: 'Hand', definitionSource: { path: ['gameplay','card_zones','hand','text'] }, sections: ['VII.1 Card zones'] },
  { id: 'influence', term: 'Influence', sections: ['Part XI — Diplomat Rules'], seeAlso: ['proposal','stake','terms'] },
  { id: 'intel', term: 'Intel', sections: ['Part XIII — Intelligence Rules'], seeAlso: ['operation-progress','mission','special-operation'] },
  { id: 'interference-intelligence', term: 'Interference', sections: ['Part XIII — Intelligence Rules'], seeAlso: ['surveillance','reveal-stage-interference'] },
  { id: 'invocation', term: 'Invocation', definitionSource: { path: ['mystics','unlocks','0','text'] }, sections: ['Part XIV — Mystics Rules'], seeAlso: ['rite','arcane'] },
  { id: 'last-stand', term: 'Last Stand', definitionSource: { path: ['gameplay','battlefield','last_stand','access'] }, sections: ['VI.4 Last Stand'], seeAlso: ['defensive-edge'] },
  { id: 'leader-ability', term: 'Leader Ability', definitionSource: { path: ['factionFeatureTaxonomy','leaderAbility'] }, sections: ['I.1 Faction Features and Leader Abilities'], seeAlso: ['faction-feature'] },
  { id: 'leverage', term: 'Leverage', definitionSource: { path: ['gameplay','faction_rules','diplomats','leverage','text'] }, sections: ['Part XI — Diplomat Rules'], seeAlso: ['influence','terms'] },
  { id: 'mission', term: 'Mission', aliases: ['Missions'], definitionSource: { path: ['gameplay','faction_rules','intelligence','mission_slot','eligible_card'] }, sections: ['Part XIII — Intelligence Rules'], seeAlso: ['operation-progress','special-operation'] },
  { id: 'negation', term: 'Negation', definitionSource: { path: ['gameplay','card_rules','negation','effect'] }, sections: ['VIII.6 Negation'] },
  { id: 'occupation', term: 'Occupation', aliases: ['Occupier'], definitionSource: { path: ['gameplay','battlefield','occupation'] }, sections: ['IV.4 Occupation'], seeAlso: ['control','counterattack'] },
  { id: 'onset', term: 'Onset', definitionSource: { path: ['gameplay','battle','onset'] }, sections: ['V.3 Onset'] },
  { id: 'opening', term: 'Opening', sections: ['III.1 Turn sequence','III.2 Actions'], seeAlso: ['action','denouement'] },
  { id: 'operation-progress', term: 'Operation Progress', definitionSource: { path: ['gameplay','faction_rules','intelligence','operation_progress','text'] }, sections: ['Part XIII — Intelligence Rules'], seeAlso: ['intel','mission'] },
  { id: 'orders', term: 'Orders', definitionSource: { path: ['gameplay','faction_rules','military','orders'] }, sections: ['Part X — Military Rules'], seeAlso: ['command'] },
  { id: 'overlay', term: 'Overlay', definitionSource: { path: ['gameplay','card_rules','overlay','active_layer'] }, sections: ['IX.1 Overlays'] },
  { id: 'peace-treaty', term: 'Peace Treaty', definitionSource: { path: ['gameplay','faction_rules','diplomats','peace_treaty','text'] }, sections: ['Part XI — Diplomat Rules'], seeAlso: ['proposal','ratification'] },
  { id: 'position', term: 'Position', definitionSource: { path: ['gameplay','battlefield','position'] }, sections: ['IV.1 Gauntlet and Position'] },
  { id: 'proposal', term: 'Proposal', aliases: ['Proposals'], sections: ['Part XI — Diplomat Rules'], seeAlso: ['stake','ratification','terms'] },
  { id: 'purge', term: 'Purge', sections: ['Part XV — Inquisition Rules'], seeAlso: ['conviction'] },
  { id: 'purification', term: 'Purification', definitionSource: { path: ['gameplay','faction_rules','inquisition','purification','text'] }, sections: ['Part XV — Inquisition Rules'], seeAlso: ['conviction'] },
  { id: 'ratification', term: 'Ratification', definitionSource: { path: ['gameplay','faction_rules','diplomats','ratification','text'] }, sections: ['Part XI — Diplomat Rules'], seeAlso: ['proposal','peace-treaty'] },
  { id: 'reserve', term: 'Reserve', definitionSource: { path: ['gameplay','card_zones','reserve','text'] }, sections: ['V.2 Commitment sources and Reserve','VII.1 Card zones'], seeAlso: ['gambit','tactic'] },
  { id: 'retreat', term: 'Retreat', definitionSource: { path: ['gameplay','battle','retreat'] }, sections: ['V.8 Retreat and withdrawal'], seeAlso: ['fall-back','withdrawal'] },
  { id: 'reveal-stage-interference', term: 'Reveal-stage Interference', definitionSource: { path: ['gameplay','card_rules','reveal_stage_interference','definition'] }, sections: ['VIII.5 Reveal-stage interference'], seeAlso: ['interference-intelligence'] },
  { id: 'rite', term: 'Rite', aliases: ['Rites'], sections: ['Part XIV — Mystics Rules'], seeAlso: ['ritual-of-ascension','invocation','transmutation','convergence'] },
  { id: 'ritual-of-ascension', term: 'Ritual of Ascension', aliases: ['Ritual'], definitionSource: { path: ['mystics','unlocks','3','text'] }, sections: ['Part XIV — Mystics Rules'], seeAlso: ['rite','convergence'] },
  { id: 'special-operation', term: 'Special Operation', aliases: ['Special Operations'], sections: ['Part XIII — Intelligence Rules'], seeAlso: ['mission','operation-progress','intel'] },
  { id: 'stake', term: 'Stake', sections: ['Part XI — Diplomat Rules'], seeAlso: ['influence','proposal','terms'] },
  { id: 'surveillance', term: 'Surveillance', sections: ['Part XIII — Intelligence Rules'], seeAlso: ['intel','interference-intelligence'] },
  { id: 'tactic', term: 'Tactic', aliases: ['Tactics'], sections: ['V.1 Normal battle sequence','V.2 Commitment sources and Reserve','VII.2 Effect headings'], seeAlso: ['gambit','reserve'] },
  { id: 'terms', term: 'Terms', definitionSource: { path: ['gameplay','battle','terms'] }, sections: ['V.3 Onset','Part XI — Diplomat Rules'], seeAlso: ['proposal','stake'] },
  { id: 'tiebreak-roll', term: 'Tiebreak Roll', definitionSource: { path: ['gameplay','battle','tiebreak_roll'] }, sections: ['V.6 Defensive Edge and Tiebreak Roll'], seeAlso: ['defensive-edge'] },
  { id: 'transmutation', term: 'Transmutation', definitionSource: { path: ['mystics','unlocks','1','text'] }, sections: ['Part XIV — Mystics Rules'], seeAlso: ['rite'] },
  { id: 'treasury', term: 'Treasury', sections: ['Part XII — Financier Rules'], seeAlso: ['capital','capital-limit'] },
  { id: 'withdrawal', term: 'Withdrawal', definitionSource: { path: ['gameplay','battle','withdrawal_procedure','result_semantics'] }, sections: ['V.8 Retreat and withdrawal'], seeAlso: ['fall-back','retreat'] }
];

const contract = JSON.parse(await readFile(contractPath, 'utf8'));
const comprehensive = contract?.publicationArchitecture?.comprehensiveRules;
if (!comprehensive) throw new Error('Missing comprehensiveRules publication contract.');
comprehensive.termRegistry = termRegistry;
await writeFile(contractPath, `${JSON.stringify(contract, null, 2)}\n`);

let renderer = await readFile(rendererPath, 'utf8');
const marker = 'function validateArchitecture(contract) {';
if (!renderer.includes(marker)) throw new Error('Renderer insertion marker not found.');
if (!renderer.includes('function renderDefinitionsIndex(')) {
  const helper = String.raw`function resolveAuthorityPath(authority, path) {
  let value = authority;
  for (const segment of path) {
    if (value == null || !(segment in value)) {
      throw new Error(\`Part XVI term source does not resolve: \${path.join('.')}\`);
    }
    value = value[segment];
  }
  return value;
}

function renderDefinitionsIndex(authority, contract) {
  const registry = contract?.publicationArchitecture?.comprehensiveRules?.termRegistry;
  if (!Array.isArray(registry) || registry.length === 0) {
    throw new Error('Part XVI requires a non-empty Comprehensive Rules termRegistry.');
  }

  const byId = new Map(registry.map(entry => [entry.id, entry]));
  const definitionEntries = [];
  const indexEntries = [];

  for (const entry of registry) {
    const sourceValue = entry.definitionSource
      ? resolveAuthorityPath(authority, entry.definitionSource.path)
      : null;
    if (sourceValue != null && typeof sourceValue !== 'string') {
      throw new Error(\`Part XVI definition source must resolve to a string: \${entry.id}\`);
    }

    const reference = entry.sections.join('; ');
    const body = sourceValue || \`See \${reference}.\`;
    const related = (entry.seeAlso || [])
      .map(id => byId.get(id)?.term)
      .filter(Boolean);
    const relatedText = related.length ? \` See also \${related.map(term => \`**\${term}**\`).join(', ')}.\` : '';
    definitionEntries.push({ term: entry.term, text: \`**\${entry.term}.** \${body}\${relatedText}\` });
    indexEntries.push({ term: entry.term, text: \`- **\${entry.term}:** \${reference}\` });

    for (const alias of entry.aliases || []) {
      definitionEntries.push({ term: alias, text: \`**\${alias}.** See **\${entry.term}**.\` });
      indexEntries.push({ term: alias, text: \`- **\${alias}:** See **\${entry.term}** — \${reference}\` });
    }
  }

  const sortEntries = entries => entries.sort((a, b) => a.term.localeCompare(b.term, 'en', { sensitivity: 'base' }));
  const definitions = sortEntries(definitionEntries).map(entry => entry.text).join('\n\n');
  const index = sortEntries(indexEntries).map(entry => entry.text).join('\n');

  return \`\${partHeader(...PARTS[15])}\n\n### XVI.1 Defined Terms and Cross-References\n\n\${definitions}\n\n### XVI.2 Rules Index\n\n\${index}\`;
}

`;
  renderer = renderer.replace(marker, helper + marker);
}

const staged = "    stagedPart(...PARTS[15], 'Definitions and the index will be assembled only after a canonical definitions/index source is established; this projection does not invent one.'),";
if (!renderer.includes(staged)) throw new Error('Staged Part XVI renderer call not found.');
renderer = renderer.replace(staged, '    renderDefinitionsIndex(authority, contract),');
renderer = renderer.replace(
  'Parts I–XV are active generated projections. Part XVI remains staged because no canonical definitions/index authority has yet been established.',
  'Parts I–XVI are active generated projections. Part XVI uses publication-only term metadata from the rules-surface contract while all mechanical definitions remain direct projections of canonical gameplay authority.'
);
await writeFile(rendererPath, renderer);

console.log(`Materialized ${termRegistry.length} primary Part XVI terms without adding gameplay prose to the registry.`);
