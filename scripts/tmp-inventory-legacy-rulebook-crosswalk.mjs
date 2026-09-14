import crypto from 'node:crypto';
import fs from 'node:fs';

const LEGACY_SOURCE = 'rulebook/player-facing/current-rulebook.md';
const OUT_JSON = 'config/legacy-rulebook-retirement-crosswalk.json';
const OUT_DOC = 'docs/rules/legacy-rulebook-retirement-crosswalk.md';

const legacy = fs.readFileSync(LEGACY_SOURCE, 'utf8');

function normalizeSection(raw) {
  return `${raw.replace(/\r\n/g, '\n').trimEnd()}\n`;
}
function fingerprint(raw) {
  return crypto.createHash('sha256').update(normalizeSection(raw), 'utf8').digest('hex');
}
function parseTopLevelSections(markdown) {
  const matches = [...markdown.matchAll(/^# (.+)$/gm)];
  return matches.map((match, index) => ({
    heading: match[1].trim(),
    raw: markdown.slice(match.index, matches[index + 1]?.index ?? markdown.length),
  }));
}

const S = (surface, sections = []) => ({ surface, sections });
const F = (faction, sections = []) => ({ surface: 'faction-guide', faction, sections });

const metadata = [
  { id: 'title', heading: 'GAUNTLET', classification: 'editorial' },
  {
    id: 'welcome', heading: 'Welcome to Gauntlet', classification: 'mechanical',
    dependsOn: ['core.deck-construction', 'core.battlefield', 'core.battlefield.victory', 'core.factions.framework'],
    teachingSuccessors: [S('player-guide', ['welcome', 'battlefield-and-victory', 'factions'])],
  },
  { id: 'how-to-use', heading: 'How to Use This Rulebook', classification: 'editorial' },
  {
    id: 'game-at-a-glance', heading: 'Game at a Glance', classification: 'mechanical',
    dependsOn: ['core.turn.sequence', 'core.turn.actions', 'core.battlefield.movement', 'core.battle.movement-initiation', 'core.battle.onset', 'core.battle.sequence', 'core.battle.reserve', 'core.battle.normal-result', 'core.battlefield.front-line', 'core.battlefield.capture', 'core.battlefield.occupation', 'faction.diplomats.features'],
    teachingSuccessors: [S('player-guide', ['turn', 'movement', 'battles', 'ground'])],
  },
  {
    id: 'how-to-win', heading: 'How to Win', classification: 'mechanical',
    dependsOn: ['core.battlefield.victory', 'core.battlefield.front-line', 'core.battlefield.capture', 'core.battlefield.last-stand', 'core.battlefield.movement'],
    teachingSuccessors: [S('player-guide', ['battlefield-and-victory', 'run-the-gauntlet'])],
  },
  {
    id: 'golden-rules', heading: 'Golden Rules', classification: 'mechanical',
    dependsOn: ['core.cards.golden-rules'],
  },
  { id: 'part-i', heading: 'Part I — Learn to Play', classification: 'editorial' },
  {
    id: 'components', heading: '1. Components', classification: 'mechanical',
    dependsOn: ['core.components', 'core.deck-construction', 'core.battlefield', 'core.factions.framework'],
    teachingSuccessors: [S('player-guide', ['cards-and-play-area', 'setup'])],
  },
  {
    id: 'cards-zones-play-area', heading: '2. Cards, Zones, and the Play Area', classification: 'mechanical',
    dependsOn: ['core.cards', 'core.card-zones', 'core.cards.assets', 'core.cards.bind', 'core.battle.reserve', 'core.battle.aftermath', 'core.turn.actions', 'core.components'],
    teachingSuccessors: [S('player-guide', ['cards-and-play-area', 'battles', 'turn'])],
  },
  {
    id: 'setup', heading: '3. Setup', classification: 'mechanical',
    dependsOn: ['core.setup', 'core.battlefield.starting-position', 'core.card-zones', 'core.components'],
    teachingSuccessors: [S('player-guide', ['setup'])],
  },
  {
    id: 'your-turn', heading: '4. Your Turn', classification: 'mechanical',
    dependsOn: ['core.turn', 'core.turn.sequence', 'core.turn.draw', 'core.turn.actions', 'core.turn.cleanup', 'core.battlefield.capture', 'core.battlefield.movement', 'core.battle.movement-initiation'],
    teachingSuccessors: [S('player-guide', ['turn', 'movement', 'ground'])],
  },
  {
    id: 'actions-features-leaders-assets', heading: '5. Actions, Faction Features, Leader Abilities, and Assets', classification: 'mechanical',
    dependsOn: ['core.turn.actions', 'core.factions.framework', 'core.cards.assets', 'core.turn.cleanup', 'faction.military.features', 'faction.inquisition.features'],
    teachingSuccessors: [S('player-guide', ['turn', 'cards-and-play-area'])],
  },
  {
    id: 'movement-position', heading: '6. Movement and Position', classification: 'mechanical',
    dependsOn: ['core.battlefield.position', 'core.battlefield.movement', 'core.battle.movement-initiation', 'core.battle.onset'],
    teachingSuccessors: [S('player-guide', ['movement'])],
  },
  {
    id: 'battles', heading: '7. Battles', classification: 'mechanical',
    dependsOn: ['core.battle', 'core.battle.sequence', 'core.battle.commitment-order', 'core.battle.onset', 'core.battle.gambit-count', 'core.battle.tactic-count', 'core.battle.reserve-size', 'core.battle.reserve', 'core.battle.battle-total', 'core.battle.advantage-disadvantage', 'core.battle.defensive-edge', 'core.battle.tiebreak', 'core.battle.normal-result', 'core.battle.aftermath', 'core.battle.withdrawal', 'core.battle.retreat', 'core.battle.withdrawal-procedure', 'core.cards.no-winner', 'faction.diplomats.features', 'faction.diplomats.proposals'],
    teachingSuccessors: [S('player-guide', ['battles']), F('diplomats', ['features'])],
  },
  {
    id: 'front-line-occupation-capture', heading: '8. Front Line, Occupation, and Capture', classification: 'mechanical',
    dependsOn: ['core.battlefield.capture', 'core.battlefield.front-line', 'core.battlefield.occupation', 'core.battlefield.counterattack', 'core.battlefield.last-stand', 'core.battlefield.victory'],
    teachingSuccessors: [S('player-guide', ['ground'])],
  },
  {
    id: 'running-gauntlet', heading: '9. Running the Gauntlet', classification: 'mechanical',
    dependsOn: ['core.battlefield.victory', 'core.battlefield.front-line', 'core.battlefield.capture', 'core.battlefield.last-stand', 'core.battlefield.movement', 'core.battle.defensive-edge'],
    teachingSuccessors: [S('player-guide', ['run-the-gauntlet'])],
  },
  { id: 'part-ii', heading: 'Part II — Complete Shared Rules', classification: 'editorial' },
  {
    id: 'constructing-deck', heading: '10. Constructing a Deck', classification: 'mechanical',
    dependsOn: ['core.deck-construction', 'core.components', 'faction.mystics.definition', 'faction.mystics.features', 'faction.mystics.rites'],
    teachingSuccessors: [S('player-guide', ['deckbuilding']), F('mystics', ['components'])],
  },
  {
    id: 'detailed-card-timing', heading: '11. Detailed Card and Timing Rules', classification: 'mechanical',
    dependsOn: ['core.cards.golden-rules', 'core.cards.shared-timing', 'core.cards.reveal', 'core.cards.negation', 'core.cards.replacement', 'core.cards.revising-choice', 'core.cards.choices', 'core.cards.assets', 'core.cards.bind', 'core.cards.shorthand', 'core.cards.repeat', 'core.cards.no-winner', 'core.battle.reserve', 'core.battle.withdrawal-procedure', 'core.battlefield.movement', 'core.battle.movement-initiation', 'core.turn.actions', 'faction.diplomats.features'],
  },
  {
    id: 'overlays-shared-card-rules', heading: '12. Overlays and Other Shared Card Rules', classification: 'mechanical',
    dependsOn: ['core.cards.overlay', 'core.cards.becoming-territories', 'faction.financiers.features'],
    teachingSuccessors: [S('player-guide', ['cards-and-play-area'])],
  },
  {
    id: 'part-iii-factions', heading: 'Part III — Factions', classification: 'mechanical',
    dependsOn: ['core.factions.framework', 'core.components', 'core.deck-construction', 'core.battlefield.victory'],
    teachingSuccessors: [S('player-guide', ['factions'])],
  },
  {
    id: 'military', heading: '13. Military', classification: 'mechanical',
    dependsOn: ['faction.military.definition', 'faction.military.features', 'core.battlefield.victory'],
    teachingSuccessors: [F('military', ['meet', 'resource', 'features', 'victory', 'leaders'])],
  },
  {
    id: 'diplomats', heading: '14. Diplomats', classification: 'mechanical',
    dependsOn: ['faction.diplomats.definition', 'faction.diplomats.features', 'faction.diplomats.proposals', 'core.battle.onset', 'core.battlefield.victory', 'core.cards.no-winner', 'core.battle.withdrawal-procedure'],
    teachingSuccessors: [F('diplomats', ['meet', 'resource', 'features', 'victory', 'leaders'])],
  },
  {
    id: 'financiers', heading: '15. Financiers', classification: 'mechanical',
    dependsOn: ['faction.financiers.definition', 'faction.financiers.features', 'core.turn.actions', 'core.turn.cleanup', 'core.battlefield.capture', 'core.battlefield.victory'],
    teachingSuccessors: [F('financiers', ['meet', 'resource', 'features', 'victory', 'leaders'])],
  },
  {
    id: 'intelligence', heading: '16. Intelligence', classification: 'mechanical',
    dependsOn: ['faction.intelligence.definition', 'faction.intelligence.features', 'core.turn.actions', 'core.battle.commitment-order', 'core.cards.revising-choice', 'core.cards.reveal', 'core.battlefield.victory'],
    teachingSuccessors: [F('intelligence', ['meet', 'resource', 'features', 'victory', 'leaders'])],
  },
  {
    id: 'mystics', heading: '17. Mystics', classification: 'mechanical',
    dependsOn: ['faction.mystics.definition', 'faction.mystics.features', 'faction.mystics.rites', 'core.cards.bind', 'core.battle.movement-initiation', 'core.battlefield.victory'],
    teachingSuccessors: [F('mystics', ['meet', 'resource', 'features', 'victory', 'leaders'])],
  },
  {
    id: 'inquisition', heading: '18. Inquisition', classification: 'mechanical',
    dependsOn: ['faction.inquisition.definition', 'faction.inquisition.features', 'core.turn.draw', 'core.battle.aftermath', 'core.battlefield.victory'],
    teachingSuccessors: [F('inquisition', ['meet', 'resource', 'features', 'victory', 'leaders'])],
  },
  { id: 'part-iv-reference', heading: 'Part IV — Reference', classification: 'editorial' },
  {
    id: 'quick-turn-reference', heading: 'Quick Turn Reference', classification: 'procedural',
    dependsOn: ['core.turn.sequence', 'core.turn.draw', 'core.turn.actions', 'core.turn.cleanup', 'core.battlefield.capture', 'core.battlefield.movement'],
    teachingSuccessors: [S('player-guide', ['turn'])],
  },
  {
    id: 'quick-battle-reference', heading: 'Quick Battle Reference', classification: 'procedural',
    dependsOn: ['core.battle.sequence', 'core.battle.onset', 'core.battle.commitment-order', 'core.battle.reserve', 'core.battle.battle-total', 'core.battle.advantage-disadvantage', 'core.battle.defensive-edge', 'core.battle.tiebreak', 'core.battle.normal-result', 'core.battle.aftermath'],
    teachingSuccessors: [S('player-guide', ['battles'])],
  },
  {
    id: 'glossary', heading: 'Glossary', classification: 'reference', coverageMode: 'termRegistry',
  },
  { id: 'copyright-playtest', heading: 'Copyright and Playtest Use', classification: 'editorial' },
];

const parsed = parseTopLevelSections(legacy);
const byHeading = new Map(parsed.map(section => [section.heading, section]));
const actualHeadings = parsed.map(section => section.heading);
const expectedHeadings = metadata.map(section => section.heading);
if (JSON.stringify(actualHeadings) !== JSON.stringify(expectedHeadings)) {
  throw new Error(`Inventory mismatch.\nExpected: ${expectedHeadings.join(' | ')}\nActual:   ${actualHeadings.join(' | ')}`);
}

const sections = metadata.map(entry => {
  if (entry.classification === 'editorial') return entry;
  return { ...entry, sourceFingerprint: fingerprint(byHeading.get(entry.heading).raw) };
});

const crosswalk = {
  schemaVersion: 1,
  legacySource: LEGACY_SOURCE,
  technicalSuccessor: 'comprehensive-rules',
  retirementReadiness: 'coverage-proven',
  routeRetirementIncluded: false,
  reviewBasis: 'Each mechanically relevant top-level legacy section is fingerprinted against the exact reviewed prose and mapped to registered gameplay-rule dependencies or the Comprehensive Rules term registry. Any legacy prose change invalidates this proof until re-reviewed.',
  sections,
};
fs.mkdirSync('config', { recursive: true });
fs.writeFileSync(OUT_JSON, `${JSON.stringify(crosswalk, null, 2)}\n`);

function successorLabel(entry) {
  const labels = (entry.teachingSuccessors || []).map(successor => {
    if (successor.surface === 'player-guide') return `Player's Guide (${(successor.sections || []).join(', ')})`;
    if (successor.surface === 'faction-guide') return `${successor.faction} Faction Guide (${(successor.sections || []).join(', ')})`;
    return successor.surface;
  });
  if (entry.classification !== 'editorial') labels.push('Comprehensive Rules');
  return labels.length ? labels.join('; ') : 'No rules successor required';
}

const rows = sections.map(entry => `| ${entry.heading.replaceAll('|', '\\|')} | ${entry.classification} | ${entry.dependsOn?.length || (entry.coverageMode === 'termRegistry' ? 'term registry' : 0)} | ${successorLabel(entry).replaceAll('|', '\\|')} |`);
const doc = `# Legacy Rulebook retirement crosswalk\n\nThis document records the reviewed coverage proof for \`${LEGACY_SOURCE}\`. It does **not** retire or redirect \`/rulebook/\`; it establishes that the old monolithic Rulebook does not need to remain a separate mechanical authority once retirement is approved.\n\n## Proof model\n\n- Every top-level legacy section is inventoried in order.\n- Every non-editorial section is SHA-256 fingerprinted against the exact reviewed prose. Any edit invalidates validation until the mapping is re-reviewed.\n- Mechanical and procedural sections declare registered rule dependencies from \`config/rules-surface-contract.json\`.\n- The active Comprehensive Rules remain the direct technical successor and must cover the complete registered rule graph.\n- Teaching successors are validated as active Player's Guide or Faction Guide sections where a player-facing replacement exists.\n- The legacy Glossary is replaced by the Comprehensive Rules term registry and Definitions/Index part.\n\nThis is a **structural and authority-graph proof**, not an automated semantic interpretation of English prose. Its reliability comes from binding the human-reviewed mapping to exact source fingerprints and invalidating it whenever that prose changes.\n\n## Coverage\n\n| Legacy section | Classification | Authority dependencies | Successor |\n| --- | --- | ---: | --- |\n${rows.join('\n')}\n\n## Retirement boundary\n\nPassing this crosswalk means the legacy Rulebook is mechanically redundant with the active rules architecture. Actual route retirement, redirects, navigation changes, release/booklet implications, and archival handling remain a separate explicit change.\n`;
fs.mkdirSync('docs/rules', { recursive: true });
fs.writeFileSync(OUT_DOC, doc);

console.log(`Wrote ${OUT_JSON} and ${OUT_DOC} for ${sections.length} legacy top-level sections.`);
