import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { buildV062CanonicalData } from '../v0.6.2/data/canonical-data.js';

const root = process.cwd();
const check = process.argv.includes('--check');
const releaseDate = '2026-08-05';
const releaseDir = 'releases/v0.6.2';
const failures = [];

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
const normalize = (value) => String(value).replace(/\r\n/g, '\n');

function expectedFile(relativePath, content) {
  const target = path.join(root, relativePath);
  const output = normalize(content).replace(/\s+$/, '') + '\n';
  if (check) {
    if (!fs.existsSync(target)) {
      failures.push(`Missing generated file: ${relativePath}`);
      return;
    }
    if (normalize(fs.readFileSync(target, 'utf8')) !== output) {
      failures.push(`Stale generated file: ${relativePath}`);
    }
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, 'utf8');
}

function section(text, start, end = null) {
  const startIndex = text.indexOf(start);
  if (startIndex < 0) throw new Error(`Missing source marker: ${start}`);
  const endIndex = end ? text.indexOf(end, startIndex + start.length) : -1;
  return text.slice(startIndex, endIndex >= 0 ? endIndex : undefined).trim();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function inlineMarkdown(value) {
  return escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function markdownToHtml(markdown) {
  const lines = normalize(markdown).split('\n');
  const out = [];
  let list = null;
  let quote = false;
  let table = false;
  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  const closeQuote = () => {
    if (quote) out.push('</blockquote>');
    quote = false;
  };
  const closeTable = () => {
    if (table) out.push('</tbody></table>');
    table = false;
  };
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.trimEnd();
    if (!line.trim()) {
      closeList(); closeQuote(); closeTable();
      continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeList(); closeQuote(); closeTable();
      const level = Math.min(6, heading[1].length + 1);
      const id = heading[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      out.push(`<h${level} id="${id}">${inlineMarkdown(heading[2])}</h${level}>`);
      continue;
    }
    if (/^---+$/.test(line.trim())) {
      closeList(); closeQuote(); closeTable();
      out.push('<hr>');
      continue;
    }
    if (line.startsWith('>')) {
      closeList(); closeTable();
      if (!quote) { out.push('<blockquote>'); quote = true; }
      out.push(`<p>${inlineMarkdown(line.replace(/^>\s?/, ''))}</p>`);
      continue;
    }
    closeQuote();
    const bullet = line.match(/^[-*]\s+(.+)$/);
    const numbered = line.match(/^\d+\.\s+(.+)$/);
    if (bullet || numbered) {
      closeTable();
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inlineMarkdown((bullet || numbered)[1])}</li>`);
      continue;
    }
    if (/^\|.*\|$/.test(line)) {
      closeList();
      if (/^\|(?:\s*:?-+:?\s*\|)+$/.test(line)) continue;
      const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
      if (!table) { out.push('<table><tbody>'); table = true; }
      out.push(`<tr>${cells.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('')}</tr>`);
      continue;
    }
    closeList(); closeTable();
    out.push(`<p>${inlineMarkdown(line)}</p>`);
  }
  closeList(); closeQuote(); closeTable();
  return out.join('\n');
}

function page({ title, description, body, canonicalPath }) {
  return `<!doctype html>
<html lang="en">
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-8YYYZJGGPE"></script>
  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','G-8YYYZJGGPE');</script>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="https://gauntlet.run/${canonicalPath}">
  <link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32">
  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any">
  <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="/v0.6.2/styles.css">
  <style>
    .release-shell{max-width:1060px;margin:0 auto;padding:2rem 1rem 5rem}.release-nav{display:flex;gap:1rem;flex-wrap:wrap;margin-bottom:2rem}.release-nav a{font-weight:700}.release-doc{background:rgba(255,255,255,.78);padding:clamp(1rem,3vw,3rem);border:1px solid rgba(80,55,30,.25);box-shadow:0 18px 50px rgba(60,35,20,.12)}.release-doc h2,.release-doc h3{scroll-margin-top:1rem}.release-doc table{width:100%;border-collapse:collapse;display:block;overflow:auto}.release-doc td{border:1px solid rgba(80,55,30,.25);padding:.45rem .6rem;vertical-align:top}.release-doc blockquote{margin:1rem 0;padding:.2rem 1rem;border-left:4px solid #8f1f25;background:rgba(143,31,37,.06)}.release-actions{display:flex;flex-wrap:wrap;gap:.75rem;margin:1.5rem 0}.release-actions a{display:inline-block;padding:.7rem 1rem;border:1px solid currentColor;text-decoration:none;font-weight:700}.release-actions a:first-child{background:#8f1f25;color:white;border-color:#8f1f25}
  </style>
</head>
<body>
  <main class="release-shell">
    <nav class="release-nav" aria-label="v0.6.2 release navigation"><a href="/">Gauntlet home</a><a href="/v0.6.2/">v0.6.2</a><a href="/v0.6.2/start/">Start</a><a href="/v0.6.2/deckbuilder/">Deckbuilder</a><a href="/v0.6.2/reference/">Card reference</a><a href="/v0.6.2/changes/">What changed</a></nav>
    <article class="release-doc">${body}</article>
  </main>
  <script type="module" src="/rules-assistant/widget.js"></script>
</body>
</html>`;
}

const baseRulebook = read('releases/v0.6.1/Gauntlet_v0.6.1_Rulebook.md');
const sharedRulesSource = read('docs/Gauntlet_v0.6.2_Shared_Rules_Candidate.md');
const sharedReferenceSource = read('docs/Gauntlet_v0.6.2_Shared_Reference_Candidate.md');
const factionSource = read('docs/Gauntlet_v0.6.2_Faction_and_Component_Candidate.md');
const compatibilitySource = read('docs/Gauntlet_v0.6.2_Faction_Component_Compatibility_Audit.md');
const firstGameSource = read('docs/Gauntlet_v0.6.2_First_Game_and_Tableside_Candidate.md');
const starterSource = read('docs/Gauntlet_v0.6.2_Starter_Decks_Candidate.json');
const returningSource = read('docs/Gauntlet_v0.6.2_Returning_Player_Changes.md');

const baseData = JSON.parse(read('releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json'));
const canonical = buildV062CanonicalData(baseData);
canonical.version = 'v0.6.2';
canonical.name = 'Second Playtest Revision';
canonical.date = releaseDate;
canonical.status = 'Published playtest edition';
canonical.inherits_from = 'releases/v0.6.1/Gauntlet_v0.6.1_Canonical_Data.json';
canonical.release_manifest = 'releases/v0.6.2/Gauntlet_v0.6.2_Manifest.json';
for (const faction of canonical.factions || []) {
  delete faction.source_candidate;
  faction.source = 'releases/v0.6.2/Gauntlet_v0.6.2_Faction_and_Component_Guide.md';
}
for (const card of canonical.cards || []) {
  card.source = 'releases/v0.6.2/Gauntlet_v0.6.2_Complete_Card_Reference.md';
}
for (const territory of canonical.territories || []) {
  territory.source = 'releases/v0.6.2/Gauntlet_v0.6.2_Complete_Card_Reference.md';
}
for (const proposal of canonical.proposals || []) {
  proposal.source = 'releases/v0.6.2/Gauntlet_v0.6.2_Faction_and_Component_Guide.md';
}

let chapters123 = section(baseRulebook, '# 1. Components', '# 4. Your Turn');
chapters123 = chapters123
  .replace('**Action:** normally play from Hand by spending 1 Action during an Action Opportunity.', '**Action:** play from Hand by taking an Action during Opening or Denouement unless the card names one of those phases.')
  .replace(/\n### Actions and Action Opportunities[\s\S]*?(?=\n---\n\n# 3\. Setup)/, `\n### Actions, Faction Actions, and Faction Abilities\n\nThe active player normally takes one Action during either Opening or Denouement. A Faction Action uses that Action at its printed legal phase. A Faction Ability occurs at its stated timing and does not use an Action unless it expressly says otherwise. Chapter 5 contains the complete Action rules.\n`);

let sharedBody = section(sharedRulesSource, '# 1. Turn Structure', '# 8. Compact Shared Reference');
const sharedNumbers = new Map([[1,4],[2,5],[3,6],[4,7],[5,8],[6,9],[7,10]]);
sharedBody = sharedBody.replace(/^# (\d+)\. (.+)$/gm, (_, number, title) => `# ${sharedNumbers.get(Number(number)) || number}. ${title}`)
  .replaceAll('Section 6', 'Chapter 9')
  .replaceAll('Section 4', 'Chapter 7')
  .replaceAll('Section 2', 'Chapter 5')
  .replace('implemented in Wave B', 'listed in the Faction and Component Guide');

let technicalBody = section(baseRulebook, '# 10. Constructing a Deck', '# Part III — Factions');
technicalBody = technicalBody
  .replace(/^# 10\. /m, '# 11. ')
  .replace(/^# 11\. /m, '# 12. ')
  .replace(/^# 12\. /m, '# 13. ')
  .replaceAll('during an Action Opportunity', 'while taking an Action during Opening or Denouement')
  .replaceAll('same Action Opportunity', 'same Action')
  .replaceAll('Action Opportunities', 'Action phases')
  .replaceAll('Action Opportunity', 'Action phase');

let factionBody = section(factionSource, '# 1. Candidate pool structure');
factionBody = factionBody
  .replace(/^# (\d+)\. (.+)$/gm, (_, number, title) => `# ${Number(number) + 13}. ${title}`)
  .replace('Candidate pool structure', 'Card pool structure')
  .replaceAll('v0.6.2 candidate', 'v0.6.2 release')
  .replaceAll('Wave B', 'the v0.6.2 release');

let sharedReference = section(sharedReferenceSource, '# Turn');
sharedReference = sharedReference
  .replaceAll('candidate', 'release')
  .replaceAll('Published v0.6.1 remains canonical until v0.6.2 is released.', 'v0.6.2 is the current canonical playtest release.');

let firstGame = firstGameSource;
const firstHeading = firstGame.search(/^# (?!Gauntlet)/m);
if (firstHeading >= 0) firstGame = firstGame.slice(firstHeading);
firstGame = firstGame
  .replaceAll('candidate', 'release')
  .replaceAll('Published v0.6.1 remains canonical until v0.6.2 is released.', 'v0.6.2 is the current canonical playtest release.');

const rulebook = `# GAUNTLET\n\n## Official Rulebook\n\n**Version 0.6.2 — Second Playtest Revision**\n\n**Published:** August 5, 2026\n\n---\n\n# Welcome to Gauntlet\n\nGauntlet is a two-player tactical card-and-territory game. Each player builds a Deck, chooses one of six factions and one of that faction's Leaders, and contributes three Territories to a shared six-Territory battlefield called the **Gauntlet**.\n\nPlayers advance toward one another, fight battles, occupy opposing Territories, advance contiguous Front Lines, develop Assets, and pursue faction-specific plans. The normal way to win is to run the Gauntlet and win the final Last Stand battle.\n\n# How to Use This Rulebook\n\n- **Part I — Setup and Play Area** covers components, zones, and setup.\n- **Part II — Shared Game Rules** governs turns, Actions, Movement, battles, Front Lines, and results.\n- **Part III — Complete Shared Rules** covers construction and technical interactions.\n- **Part IV — Factions and Components** contains the complete v0.6.2 faction, Proposal, card-revision, and Territory-revision rules.\n\nThe separate Complete Card Reference contains the effective text of all 128 playable card titles and all 25 Territories. The First Game Guide and compact Reference Guide are player aids; this rulebook and specific component text remain authoritative.\n\n# Golden Rules\n\n- Specific card, Leader, faction, Territory, Proposal, or component text overrides a general rule.\n- **May** means optional. **Must** means required.\n- Follow instructions in the order written.\n- Complete as much as possible unless the missing part is a required cost, requirement, or target.\n\n---\n\n# Part I — Setup and Play Area\n\n${chapters123}\n\n---\n\n# Part II — Shared Game Rules\n\n${sharedBody}\n\n---\n\n# Part III — Complete Shared Rules\n\n${technicalBody}\n\n---\n\n# Part IV — Factions and Components\n\n${factionBody}\n`;

const factionGuide = `# Gauntlet v0.6.2 Faction and Component Guide\n\n**Status:** Published playtest source  \n**Version:** v0.6.2 — Second Playtest Revision  \n**Published:** August 5, 2026\n\nThis guide contains the complete adopted v0.6.2 faction procedures, Proposal text, new cards, revised inherited component text, and compatibility rules. Unchanged effective card and Territory text appears in the Complete Card Reference.\n\n${factionBody}\n\n---\n\n# Compatibility Audit\n\n${section(compatibilitySource, '# 1.')}\n`;

const referenceGuide = `# Gauntlet v0.6.2 Reference Guide\n\n**Status:** Published compact reference  \n**Version:** v0.6.2\n\n${sharedReference}\n`;

const firstGameGuide = `# Gauntlet v0.6.2 First Game and Tableside Guide\n\n**Status:** Published player aid  \n**Version:** v0.6.2\n\n${firstGame}\n`;

let returningGuide = returningSource
  .replace('**Status:** Release-candidate source for returning v0.6.1 players', '**Status:** Published returning-player guide')
  .replace('v0.6.1 remains the published playtest release until the v0.6.2 cutover is complete.', 'v0.6.2 is the current canonical playtest release. v0.6.1 remains available as an immutable historical package.');

function effectText(entry) {
  const effects = Array.isArray(entry.effects) ? entry.effects : [];
  if (effects.length) return effects.map((effect) => `> **${effect.label}:** ${effect.text}`).join('\n>\n');
  const keys = ['text','action','gambit','tactic','battle','terms','accepted','refused','asset','overlay','use','mission','capacity','completion'];
  return keys.filter((key) => entry[key]).map((key) => `> **${key.replaceAll('_',' ').replace(/^./, (c) => c.toUpperCase())}:** ${entry[key]}`).join('\n>\n');
}

const cardReferenceParts = ['# Gauntlet v0.6.2 Complete Card and Territory Reference', '', '**Status:** Published canonical component reference', ''];
for (const allegiance of ['Neutral','Military','Diplomats','Financiers','Intelligence','Mystics','Inquisition']) {
  cardReferenceParts.push(`# ${allegiance}`, '');
  for (const card of canonical.cards.filter((entry) => entry.allegiance === allegiance).sort((a,b) => a.name.localeCompare(b.name))) {
    cardReferenceParts.push(`## ${card.name}`, '', `**Cost:** ${card.cost}`, `**Unique:** ${card.unique ? 'Yes' : 'No'}`);
    if (card.trait) cardReferenceParts.push(`**Trait:** ${card.trait}`);
    if (card.card_form) cardReferenceParts.push(`**Card form:** ${card.card_form}`);
    cardReferenceParts.push('', effectText(card), '');
  }
}
cardReferenceParts.push('# Territories', '');
for (const territory of canonical.territories) {
  cardReferenceParts.push(`## ${territory.name}`, '', `**Type:** ${territory.arena ? 'Arena' : 'Territory'}`, '', effectText(territory) || `> ${territory.text}`, '');
}
cardReferenceParts.push('# Proposals', '');
for (const proposal of canonical.proposals || []) {
  cardReferenceParts.push(`## ${proposal.name}`, '');
  if (proposal.stake != null) cardReferenceParts.push(`**Stake:** ${proposal.stake}`);
  if (proposal.requirement) cardReferenceParts.push(`**Requirement:** ${proposal.requirement}`);
  cardReferenceParts.push('', effectText(proposal), '');
}
const cardReference = cardReferenceParts.join('\n');

const releaseNotes = `# Gauntlet v0.6.2 — Second Playtest Revision\n\n**Published:** August 5, 2026\n\nGauntlet v0.6.2 is the second playtest revision. It replaces v0.6.1 as the current canonical playtest edition while preserving the complete v0.6.1 package for historical access.\n\n## Release highlights\n\n- six-phase turn structure with Opening and Denouement;\n- pending battle, Terms, and Onset sequence;\n- Defensive Edge and separate Tiebreak Roll;\n- contiguous Front Line control and revised Capture;\n- distinct Fall Back, retreat, and withdrawal rules;\n- rebuilt twelve-Leader starter catalog using full legal pools;\n- 128 playable card titles, including six new cards and Invasion's move to Military;\n- synchronized Rules Arbiter and executable digital v0.6.2 rules layer;\n- returning-player migration guide.\n\n## Validation\n\nThe release carries forward 368 propagation scenarios and adds 48 closeout scenarios. The repository test, governance, source-parity, starter, Arbiter, and digital execution gates must pass on the publication commit.\n\n## Test revisions and unresolved investigations\n\nFinanciers begin with 2 Capital as a v0.6.2 test revision. The Military alternate victory, any later Peace Treaty threshold change, broader Leader Ability taxonomy, and unadopted balance experiments remain outside this release.\n\nSee **Gauntlet_v0.6.2_Returning_Player_Changes.md** for the five-minute player-facing comparison.\n`;

const manifest = {
  version: 'v0.6.2',
  name: 'Second Playtest Revision',
  status: 'published',
  publication_date: releaseDate,
  previous_version: 'v0.6.1',
  playable_card_designs: canonical.cards.length,
  neutral_cards: canonical.cards.filter((card) => card.allegiance === 'Neutral').length,
  faction_cards: canonical.cards.filter((card) => card.allegiance !== 'Neutral').length,
  territories: canonical.territories.length,
  arenas: canonical.territories.filter((territory) => territory.arena).length,
  proposals: canonical.proposals.length,
  factions: canonical.factions.length,
  leaders: canonical.factions.reduce((total, faction) => total + (faction.leaders?.length || 0), 0),
  propagation_pull_requests: [493, 496, 500, 502, 505, 507],
  scenario_counts: { waveA: 63, waveB: 111, waveC: 66, waveD: 48, waveE: 80, closeout: 48, total: 416 },
  governing_sources: [
    'Gauntlet_v0.6.2_Rulebook.md',
    'Gauntlet_v0.6.2_Faction_and_Component_Guide.md',
    'Gauntlet_v0.6.2_Complete_Card_Reference.md',
    'Gauntlet_v0.6.2_Canonical_Data.json'
  ],
  current_outputs: [
    'README.md',
    'Gauntlet_v0.6.2_Rulebook.md',
    'Gauntlet_v0.6.2_Reference_Guide.md',
    'Gauntlet_v0.6.2_Faction_and_Component_Guide.md',
    'Gauntlet_v0.6.2_First_Game_Guide.md',
    'Gauntlet_v0.6.2_Starter_Decks.json',
    'Gauntlet_v0.6.2_Complete_Card_Reference.md',
    'Gauntlet_v0.6.2_Canonical_Data.json',
    'Gauntlet_v0.6.2_Returning_Player_Changes.md',
    'Gauntlet_v0.6.2_Release_Notes.md',
    'Gauntlet_v0.6.2_Manifest.json',
    'deployment-status.json',
    '../../v0.6.2/',
    '../../rules-assistant/worker-v062.js'
  ],
  validation: {
    source_audit_complete: true,
    canonical_data_generated: true,
    propagation_scenarios: 368,
    closeout_scenarios: 48,
    automated_checks_required: true,
    ready_for_publication: true
  },
  public_links: {
    project_site: 'https://gauntlet.run/',
    release_package: 'https://gauntlet.run/releases/v0.6.2/',
    browser_rulebook: 'https://gauntlet.run/v0.6.2/rulebook/',
    card_reference: 'https://gauntlet.run/v0.6.2/reference/',
    deckbuilder: 'https://gauntlet.run/v0.6.2/deckbuilder/',
    start: 'https://gauntlet.run/v0.6.2/start/',
    returning_player_changes: 'https://gauntlet.run/v0.6.2/changes/'
  },
  unresolved: [
    'Military alternate victory',
    'Peace Treaty threshold beyond the retained five-Proposal test rule',
    'Leader Ability taxonomy beyond adopted wording',
    'Unadopted balance experiments'
  ]
};

const readme = `# Gauntlet v0.6.2 — Second Playtest Revision\n\nThis directory is the immutable source package for the published v0.6.2 playtest edition.\n\n## Start here\n\n- [Official Rulebook](Gauntlet_v0.6.2_Rulebook.md)\n- [Compact Reference Guide](Gauntlet_v0.6.2_Reference_Guide.md)\n- [First Game Guide](Gauntlet_v0.6.2_First_Game_Guide.md)\n- [What Changed Since v0.6.1](Gauntlet_v0.6.2_Returning_Player_Changes.md)\n- [Complete Card and Territory Reference](Gauntlet_v0.6.2_Complete_Card_Reference.md)\n- [Canonical Data](Gauntlet_v0.6.2_Canonical_Data.json)\n\n## Browser tools\n\n- [Start Playing](../../v0.6.2/start/)\n- [Deckbuilder](../../v0.6.2/deckbuilder/)\n- [Card Reference](../../v0.6.2/reference/)\n- [Browser Rulebook](../../v0.6.2/rulebook/)\n\nv0.6.1 remains available at ../v0.6.1/ as an immutable historical release.\n`;

const deploymentStatus = {
  version: 'v0.6.2',
  status: 'published',
  publication_date: releaseDate,
  canonical_public_version: 'v0.6.2',
  public_defaults: {
    website: 'v0.6.2',
    browser_tools: 'v0.6.2',
    rules_arbiter: 'v0.6.2',
    digital_rules: 'v0.6.2'
  },
  historical_versions: ['v0.6.1'],
  release_tracker: 470,
  closeout_tracker: 506,
  returning_player_tracker: 503
};

expectedFile(`${releaseDir}/Gauntlet_v0.6.2_Canonical_Data.json`, json(canonical));
expectedFile(`${releaseDir}/Gauntlet_v0.6.2_Rulebook.md`, rulebook);
expectedFile(`${releaseDir}/Gauntlet_v0.6.2_Reference_Guide.md`, referenceGuide);
expectedFile(`${releaseDir}/Gauntlet_v0.6.2_Faction_and_Component_Guide.md`, factionGuide);
expectedFile(`${releaseDir}/Gauntlet_v0.6.2_First_Game_Guide.md`, firstGameGuide);
expectedFile(`${releaseDir}/Gauntlet_v0.6.2_Starter_Decks.json`, starterSource);
expectedFile(`${releaseDir}/Gauntlet_v0.6.2_Complete_Card_Reference.md`, cardReference);
expectedFile(`${releaseDir}/Gauntlet_v0.6.2_Returning_Player_Changes.md`, returningGuide);
expectedFile(`${releaseDir}/Gauntlet_v0.6.2_Release_Notes.md`, releaseNotes);
expectedFile(`${releaseDir}/Gauntlet_v0.6.2_Manifest.json`, json(manifest));
expectedFile(`${releaseDir}/deployment-status.json`, json(deploymentStatus));
expectedFile(`${releaseDir}/README.md`, readme);

const releaseLandingBody = `<p class="eyebrow">Current canonical playtest edition</p><h1>Gauntlet v0.6.2</h1><p><strong>Second Playtest Revision · Published August 5, 2026</strong></p><p>This release revises turn timing, battles, Territory control, all six faction systems, starter Decks, browser tools, the Rules Arbiter, and the executable digital rules layer.</p><div class="release-actions"><a href="/v0.6.2/start/">Start playing</a><a href="/v0.6.2/rulebook/">Read the rulebook</a><a href="/v0.6.2/changes/">What changed</a><a href="/v0.6.2/deckbuilder/">Build a Deck</a></div><h2>Release package</h2><ul><li><a href="/releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md">Official Rulebook source</a></li><li><a href="/releases/v0.6.2/Gauntlet_v0.6.2_Reference_Guide.md">Compact Reference Guide</a></li><li><a href="/releases/v0.6.2/Gauntlet_v0.6.2_First_Game_Guide.md">First Game Guide</a></li><li><a href="/releases/v0.6.2/Gauntlet_v0.6.2_Complete_Card_Reference.md">Complete Card Reference</a></li><li><a href="/releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json">Canonical JSON</a></li></ul><h2>Historical release</h2><p>The complete v0.6.1 package remains available at <a href="/releases/v0.6.1/">releases/v0.6.1</a>.</p>`;
expectedFile('v0.6.2/index.html', page({ title: 'Gauntlet v0.6.2 — Second Playtest Revision', description: 'The current canonical Gauntlet playtest release.', canonicalPath: 'v0.6.2/', body: releaseLandingBody }));
expectedFile('v0.6.2/changes/index.html', page({ title: 'What Changed in Gauntlet v0.6.2', description: 'A returning-player guide to the changes from Gauntlet v0.6.1.', canonicalPath: 'v0.6.2/changes/', body: markdownToHtml(returningGuide) }));
expectedFile('v0.6.2/rulebook/index.html', page({ title: 'Gauntlet v0.6.2 Rulebook', description: 'The official Gauntlet v0.6.2 playtest rulebook.', canonicalPath: 'v0.6.2/rulebook/', body: markdownToHtml(rulebook) }));

const publishedCorpus = `import { buildCanonicalDocuments, parseRulebookSections } from './local-search.js';\n\nexport const V062_PUBLISHED_VERSION = 'v0.6.2';\nexport const V062_PUBLISHED_SOURCES = Object.freeze([\n  'releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md',\n  'releases/v0.6.2/Gauntlet_v0.6.2_Reference_Guide.md',\n  'releases/v0.6.2/Gauntlet_v0.6.2_Faction_and_Component_Guide.md',\n  'releases/v0.6.2/Gauntlet_v0.6.2_First_Game_Guide.md',\n  'releases/v0.6.2/Gauntlet_v0.6.2_Returning_Player_Changes.md'\n]);\n\nexport function defaultPublishedV062SourceUrls(siteOrigin = 'https://gauntlet.run') {\n  const origin = String(siteOrigin || 'https://gauntlet.run').replace(/\\/$/, '');\n  return {\n    siteOrigin: origin,\n    canonicalUrl: \\`\\${origin}/releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json\\`,\n    canonicalReferenceUrl: \\`\\${origin}/v0.6.2/reference/\\`,\n    documentUrls: V062_PUBLISHED_SOURCES.map((sourcePath) => ({ sourcePath, sourceUrl: \\`\\${origin}/\\${sourcePath}\\` }))\n  };\n}\n\nexport async function loadPublishedV062RulesCorpus(options = {}) {\n  const urls = { ...defaultPublishedV062SourceUrls(options.siteOrigin), ...options };\n  const fetchImpl = options.fetchImpl || globalThis.fetch;\n  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required.');\n  const documentUrls = Array.isArray(urls.documentUrls) ? urls.documentUrls : defaultPublishedV062SourceUrls(urls.siteOrigin).documentUrls;\n  const [canonicalResponse, ...documentResponses] = await Promise.all([\n    fetchImpl(urls.canonicalUrl, { cache: 'no-store' }),\n    ...documentUrls.map((entry) => fetchImpl(entry.sourceUrl, { cache: 'no-store' }))\n  ]);\n  if (!canonicalResponse.ok) throw new Error(\\`Could not load v0.6.2 canonical data (\\${canonicalResponse.status}).\\`);\n  documentResponses.forEach((response, index) => { if (!response.ok) throw new Error(\\`Could not load \\${documentUrls[index].sourcePath} (\\${response.status}).\\`); });\n  const [canonicalData, ...markdownSources] = await Promise.all([canonicalResponse.json(), ...documentResponses.map((response) => response.text())]);\n  if (canonicalData.version !== V062_PUBLISHED_VERSION) throw new Error(\\`Expected \\${V062_PUBLISHED_VERSION}, received \\${String(canonicalData.version)}.\\`);\n  const origin = String(urls.siteOrigin || 'https://gauntlet.run').replace(/\\/$/, '');\n  const canonicalDocuments = buildCanonicalDocuments(canonicalData, origin, urls.canonicalReferenceUrl);\n  const markdownDocuments = markdownSources.flatMap((markdown, index) => parseRulebookSections(markdown, documentUrls[index].sourceUrl).map((document) => ({ ...document, id: \\`v062-published:\\${index}:\\${document.id}\\`, sourcePath: documentUrls[index].sourcePath, sourceUrl: document.sourceUrl || documentUrls[index].sourceUrl })));\n  return { version: V062_PUBLISHED_VERSION, generatedAt: new Date().toISOString(), documents: [...markdownDocuments, ...canonicalDocuments], sourcePaths: ['releases/v0.6.2/Gauntlet_v0.6.2_Canonical_Data.json', ...V062_PUBLISHED_SOURCES] };\n}\n`;
expectedFile('rules-assistant/v062-published-corpus.js', publishedCorpus);

let publishedWorker = read('rules-assistant/worker-v062-candidate.js')
  .replace('defaultV062SourceUrls,\n  loadV062RulesCorpus\n} from "./v062-corpus.js";', 'defaultPublishedV062SourceUrls,\n  loadPublishedV062RulesCorpus\n} from "./v062-published-corpus.js";')
  .replace('const RULES_VERSION = "v0.6.2-candidate";', 'const RULES_VERSION = "v0.6.2";')
  .replace('new Set([RULES_VERSION, "v0.6.2"])', 'new Set([RULES_VERSION, "v0.6.2-candidate"])')
  .replaceAll('v0.6.2 candidate playtest rules', 'v0.6.2 playtest rules')
  .replaceAll('v0.6.2 candidate sources', 'published v0.6.2 sources')
  .replace('["/api/v062/health", "/v062/health"]', '["/api/health", "/health", "/api/v062/health", "/v062/health"]')
  .replace('candidate: true,\n        publishedVersion: "v0.6.1",', 'candidate: false,\n        publishedVersion: "v0.6.2",')
  .replace('["/api/v062/rules", "/v062/rules"]', '["/api/rules", "/rules", "/api/v062/rules", "/v062/rules"]')
  .replace('This candidate Rules Arbiter answers', 'This Rules Arbiter answers')
  .replace('loadV062RulesCorpus(defaultV062SourceUrls', 'loadPublishedV062RulesCorpus(defaultPublishedV062SourceUrls')
  .replaceAll('Candidate corpus reports', 'Published corpus reports')
  .replaceAll('v0.6.2 candidate model call failed', 'v0.6.2 model call failed')
  .replaceAll('v0.6.2 candidate Rules Arbiter failure', 'v0.6.2 Rules Arbiter failure')
  .replaceAll('v0.6.2 candidate Rules Arbiter could not complete', 'v0.6.2 Rules Arbiter could not complete');
expectedFile('rules-assistant/worker-v062.js', publishedWorker);

let workerEntry = read('rules-assistant/worker-entry.js');
if (!workerEntry.includes('import publishedWorker from "./worker-v062.js";')) {
  workerEntry = workerEntry.replace('import candidateWorker from "./worker-v062-candidate.js";', 'import candidateWorker from "./worker-v062-candidate.js";\nimport publishedWorker from "./worker-v062.js";');
}
if (!workerEntry.includes('url.pathname === "/api/rules"')) {
  workerEntry = workerEntry.replace('    if (url.pathname.startsWith("/api/v062/")', '    if (url.pathname === "/api/rules" || url.pathname === "/rules" || url.pathname === "/api/health" || url.pathname === "/health") {\n      return publishedWorker.fetch(request, env, context);\n    }\n\n    if (url.pathname.startsWith("/api/v062/")');
}
if (!workerEntry.includes('/api/v061/rules')) {
  workerEntry = workerEntry.replace('    if (url.pathname === "/api/rules"', '    if (url.pathname === "/api/v061/rules" || url.pathname === "/v061/rules" || url.pathname === "/api/v061/health" || url.pathname === "/v061/health") {\n      const legacyUrl = new URL(request.url);\n      legacyUrl.pathname = legacyUrl.pathname.includes("health") ? "/api/health" : "/api/rules";\n      return worker.fetch(new Request(legacyUrl, request), env, context);\n    }\n\n    if (url.pathname === "/api/rules"');
}
expectedFile('rules-assistant/worker-entry.js', workerEntry);

let widget = read('rules-assistant/widget.js');
widget = widget
  .replace(`import {\n  buildLocalFallbackAnswer,\n  defaultSourceUrls,\n  loadRulesCorpus,\n  retrieveRules\n} from "./local-search.js";`, `import { buildLocalFallbackAnswer, retrieveRules } from "./local-search.js";\nimport { defaultPublishedV062SourceUrls, loadPublishedV062RulesCorpus } from "./v062-published-corpus.js";`)
  .replace('version: "v0.6.1"', 'version: "v0.6.2"')
  .replace('const urls = defaultSourceUrls(window.location.origin);\n    corpusPromise = loadRulesCorpus({ ...urls })', 'const urls = defaultPublishedV062SourceUrls(window.location.origin);\n    corpusPromise = loadPublishedV062RulesCorpus({ ...urls })')
  .replaceAll('v0.6.1 rulebook', 'v0.6.2 rulebook')
  .replace('"When is an occupied Territory captured?"', '"How does Front Line Capture work?"')
  .replace('"Can Onward continue after a battle?"', '"When do Terms occur before Onset?"')
  .replace('"How does defender advantage work?"', '"How does Defensive Edge work?"');
expectedFile('rules-assistant/widget.js', widget);

let home = read('index.html');
home = home
  .replaceAll('Current canonical playtest edition · v0.6.1', 'Current canonical playtest edition · v0.6.2')
  .replace('<div><dt>122</dt><dd>Playable cards</dd></div>', '<div><dt>128</dt><dd>Playable cards</dd></div>')
  .replaceAll('href="start/"', 'href="v0.6.2/start/"')
  .replaceAll('href="deckbuilder/"', 'href="v0.6.2/deckbuilder/"')
  .replaceAll('href="rulebook/"', 'href="v0.6.2/rulebook/"')
  .replaceAll('href="card-reference/"', 'href="v0.6.2/reference/"')
  .replaceAll('canonical v0.6.1 sources', 'canonical v0.6.2 sources')
  .replace('Advance, hold, or withdraw.', 'Advance, Hold, or Fall Back.')
  .replace('Occupy enemy-controlled territories, survive the counterattack, and rotate captured ground to face you.', 'Advance beyond your contiguous Front Line, survive counterattacks, and add one supported Territory during Capture.')
  .replace('Entering the opponent\'s position begins a battle', 'Entering the opponent\'s Position creates a pending battle');
expectedFile('index.html', home);

let versionedStyles = read('v0.6.2/styles.css');
expectedFile('v0.6.2/styles.css', versionedStyles);

const currentContent = `export * from './v062';\nexport const CURRENT_RULES_VERSION = 'v0.6.2' as const;\n`;
expectedFile('src/content/current.ts', currentContent);

const sourceManifest = {
  version: 'v0.6.2',
  candidateVersion: 'v0.6.2-candidate',
  previousVersion: 'v0.6.1',
  status: 'published',
  published: true,
  publicationDate: releaseDate,
  releaseTracker: 470,
  closeoutTracker: 506,
  returningPlayerTracker: 503,
  propagationPullRequests: [493, 496, 500, 502, 505, 507],
  scenarioCounts: { waveA: 63, waveB: 111, waveC: 66, waveD: 48, waveE: 80, closeout: 48, total: 416 },
  publicDefaults: { rulesArbiter: 'v0.6.2', website: 'v0.6.2', browserTools: 'v0.6.2', digital: 'v0.6.2' },
  historicalAccess: { releasePackage: 'releases/v0.6.1/', rulesArbiter: '/api/v061/rules' },
  unresolved: ['Military alternate victory','Peace Treaty threshold beyond retained five-Proposal test rule','Leader Ability taxonomy beyond adopted wording','Unadopted balance experiments'],
  publicationRequirementsSatisfiedBy: ['scripts/build-v062-release.mjs','scripts/validate-v062-published-release.mjs','npm test']
};
expectedFile('v0.6.2/release-manifest.json', json(sourceManifest));

if (failures.length) {
  for (const failure of failures) console.error(failure);
  process.exit(1);
}

console.log(`${check ? 'Verified' : 'Built'} Gauntlet v0.6.2 release package: ${canonical.cards.length} cards, ${canonical.territories.length} Territories, ${canonical.proposals.length} Proposals.`);
