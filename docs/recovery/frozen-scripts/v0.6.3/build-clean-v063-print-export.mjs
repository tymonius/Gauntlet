import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { renderMarkdown } from '../artifacts/reconstruction/clean-v0.6.3/browser-rulebook/markdown.js';

const root = process.cwd();
const outputDir = 'artifacts/reconstruction/clean-v0.6.3/print-export/generated';
const authoritySetId = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const canonicalPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/canonical-data.json';
const startersPath = 'artifacts/reconstruction/clean-v0.6.3/downstream/starter-decks.json';
const rulebookPath = 'artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md';
const factionGuides = [
  ['Military', 'military', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/military/Gauntlet_v0.6.3_Military_Faction_Guide.md'],
  ['Diplomats', 'diplomats', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/diplomat/Gauntlet_v0.6.3_Diplomat_Faction_Guide.md'],
  ['Financiers', 'financiers', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/financier/Gauntlet_v0.6.3_Financier_Faction_Guide.md'],
  ['Intelligence', 'intelligence', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/intelligence/Gauntlet_v0.6.3_Intelligence_Faction_Guide.md'],
  ['Mystics', 'mystics', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/mystics/Gauntlet_v0.6.3_Mystics_Faction_Guide.md'],
  ['Inquisition', 'inquisition', 'artifacts/reconstruction/clean-v0.6.3/faction-guides/inquisition/Gauntlet_v0.6.3_Inquisition_Faction_Guide.md'],
];

const readBuffer = (relative) => fs.readFileSync(path.join(root, relative));
const read = (relative) => readBuffer(relative).toString('utf8').replace(/\r\n/g, '\n');
const hashBytes = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const hashFile = (relative) => hashBytes(readBuffer(relative));
const write = (relative, content) => {
  const target = path.join(root, relative);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
};
const writeText = (relative, content) => write(relative, String(content).replace(/\r\n/g, '\n').replace(/\s+$/, '') + '\n');

fs.rmSync(path.join(root, outputDir), { recursive: true, force: true });
fs.mkdirSync(path.join(root, outputDir), { recursive: true });

const canonical = JSON.parse(read(canonicalPath));
const starters = JSON.parse(read(startersPath));
if (canonical.authority_set_id !== authoritySetId || starters.authority_set_id !== authoritySetId) throw new Error('Print/export source authority-set mismatch.');
if (canonical.cards?.length !== 128 || canonical.territories?.length !== 25 || canonical.factions?.length !== 6) throw new Error('Canonical print/export counts drifted.');
if (starters.decks?.length !== 12) throw new Error('Starter print/export count drifted.');

const safe = (value) => String(value ?? '').replaceAll('|', '\\|').replace(/\r?\n/g, '<br>');
const slugify = (value) => String(value ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function cardReferenceMarkdown() {
  const lines = [
    '# Gauntlet clean v0.6.3 Card and Territory Reference',
    '',
    `Reconstruction-only print/export artifact. Authority set: \`${authoritySetId}\`.`,
    '',
    `Playable cards: **${canonical.cards.length}**. Territories: **${canonical.territories.length}**.`,
    '',
    '# Playable Cards',
    '',
  ];
  const allegianceOrder = ['Neutral', 'Military', 'Diplomats', 'Financiers', 'Intelligence', 'Mystics', 'Inquisition'];
  const cards = [...canonical.cards].sort((a, b) => allegianceOrder.indexOf(a.allegiance) - allegianceOrder.indexOf(b.allegiance) || a.name.localeCompare(b.name));
  for (const card of cards) {
    lines.push(`## ${card.name}`, '');
    lines.push(`- **ID:** \`${card.id}\``);
    lines.push(`- **Allegiance:** ${card.allegiance}`);
    lines.push(`- **Deckbuilding Value:** ${Number(card.cost)}`);
    if (card.trait) lines.push(`- **Trait:** ${card.trait}`);
    if (card.unique) lines.push('- **Unique:** Yes');
    lines.push('');
    for (const effect of card.effects || []) lines.push(`**${effect.label}:** ${effect.text}`, '');
  }
  lines.push('# Territories', '');
  for (const territory of [...canonical.territories].sort((a, b) => Number(a.number || 0) - Number(b.number || 0) || a.name.localeCompare(b.name))) {
    lines.push(`## ${territory.number ? `${territory.number}. ` : ''}${territory.name}`, '');
    lines.push(`- **ID:** \`${territory.id}\``);
    lines.push(`- **Type:** ${territory.arena ? 'Arena Territory' : 'Territory'}`);
    lines.push('');
    const effects = territory.effects?.length ? territory.effects : [{ label: 'Text', text: territory.text || '' }];
    for (const effect of effects) lines.push(`**${effect.label}:** ${effect.text}`, '');
  }
  return lines.join('\n');
}

function starterCatalogMarkdown() {
  const cardsByName = new Map(canonical.cards.map((card) => [card.name, card]));
  const lines = [
    '# Gauntlet clean v0.6.3 Starter Deck Catalog',
    '',
    `Reconstruction-only print/export artifact. Authority set: \`${authoritySetId}\`.`,
    '',
    starters.purpose || '',
    '',
    `All ${starters.decks.length} approved starters are exactly 30 cards / 60 Deckbuilding Value. Territory order is shown from the player's own end toward the opponent's end.`,
    '',
  ];
  for (const deck of starters.decks) {
    const faction = canonical.factions.find((item) => item.id === deck.factionId);
    const leader = faction?.leaders?.find((item) => slugify(item.name) === deck.leaderId)?.name || deck.leaderId;
    lines.push(`# ${faction?.name || deck.factionId} — ${leader}`, '', `## ${deck.name}`, '', deck.summary || '', '');
    lines.push('**Signature cards:** ' + (deck.signatureCards || []).join(', '), '');
    const territoryOrder = deck.recommendedTerritoryOrder || deck.territories || [];
    lines.push('**Recommended Territory order:** ' + territoryOrder.join(' → '), '');
    lines.push('| Card | Qty | Value each | Total value |', '|---|---:|---:|---:|');
    let count = 0;
    let value = 0;
    for (const item of deck.cards) {
      const card = cardsByName.get(item.name);
      if (!card) throw new Error(`${deck.name} references missing card ${item.name}.`);
      const quantity = Number(item.quantity);
      const lineValue = quantity * Number(card.cost);
      count += quantity;
      value += lineValue;
      lines.push(`| ${safe(item.name)} | ${quantity} | ${Number(card.cost)} | ${lineValue} |`);
    }
    lines.push('', `**Total:** ${count} cards / ${value} Deckbuilding Value.`, '', '---', '');
  }
  return lines.join('\n');
}

const printCss = `
:root{--ink:#211d18;--muted:#6d6256;--line:#d8c8ae;--paper:#fffdf8;--accent:#7d241f}
*{box-sizing:border-box} body{margin:0;background:#eee8de;color:var(--ink);font-family:Georgia,'Times New Roman',serif}
main{width:min(8.5in,calc(100% - 24px));margin:24px auto;padding:.55in;background:var(--paper);box-shadow:0 12px 38px rgba(40,30,20,.12)}
h1,h2,h3{break-after:avoid;color:var(--accent)} h1{margin:1.1em 0 .45em;font-size:2rem} h1:first-child{margin-top:0} h2{margin:1.1em 0 .35em;font-size:1.35rem}
p,li{line-height:1.5} table{width:100%;border-collapse:collapse;margin:1em 0;font-size:.9rem} th,td{padding:6px 8px;border:1px solid var(--line);vertical-align:top} th{background:#f1e7d5;text-align:left}
blockquote{margin:1em 0;padding:.7em 1em;border-left:4px solid #a98446;background:#f6efe3} code{font-size:.85em;overflow-wrap:anywhere}
.print-meta{margin:0 0 24px;padding:10px 12px;border:1px solid var(--line);color:var(--muted);font:12px/1.4 system-ui,sans-serif}.print-meta strong{color:var(--ink)}
@page{size:Letter;margin:.5in}@media print{body{background:#fff}main{width:auto;margin:0;padding:0;box-shadow:none}h1{break-before:page}main>h1:first-of-type{break-before:auto}table,blockquote{break-inside:avoid}.print-meta{break-after:avoid}}
`;

function htmlDocument(title, markdown, role) {
  const rendered = renderMarkdown(markdown);
  return `<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>${printCss}</style></head><body><main><div class="print-meta"><strong>Gauntlet clean v0.6.3 reconstruction</strong> · ${role} · authority ${authoritySetId} · not published</div>${rendered.html}</main></body></html>\n`;
}

const materials = [];
function addMaterial(key, title, role, markdown, markdownFile) {
  const mdPath = `${outputDir}/markdown/${markdownFile}`;
  const htmlPath = `${outputDir}/html/${markdownFile.replace(/\.md$/, '.html')}`;
  writeText(mdPath, markdown);
  writeText(htmlPath, htmlDocument(title, markdown, role));
  materials.push({ key, title, role, markdown: mdPath, html: htmlPath });
}

const rulebookMarkdown = read(rulebookPath);
addMaterial('rulebook', 'Gauntlet clean v0.6.3 Rulebook', 'certified Rulebook print surface', rulebookMarkdown, 'Gauntlet_clean-v0.6.3_Rulebook.md');
for (const [name, slug, source] of factionGuides) addMaterial(`${slug}_guide`, `Gauntlet clean v0.6.3 ${name} Faction Guide`, 'certified faction-guide print surface', read(source), `Gauntlet_clean-v0.6.3_${name}_Faction_Guide.md`);
addMaterial('card_reference', 'Gauntlet clean v0.6.3 Card and Territory Reference', 'canonical-data print reference', cardReferenceMarkdown(), 'Gauntlet_clean-v0.6.3_Card_and_Territory_Reference.md');
addMaterial('starter_catalog', 'Gauntlet clean v0.6.3 Starter Deck Catalog', 'approved-starter print catalog', starterCatalogMarkdown(), 'Gauntlet_clean-v0.6.3_Starter_Deck_Catalog.md');

write(`${outputDir}/json/Gauntlet_clean-v0.6.3_Canonical_Data.json`, readBuffer(canonicalPath));
write(`${outputDir}/json/Gauntlet_clean-v0.6.3_Starter_Decks.json`, readBuffer(startersPath));
const exportSchema = {
  schema_version: 1,
  version: 'clean-v0.6.3-deck-export',
  authority_set_id: authoritySetId,
  canonical_data_sha256: hashFile(canonicalPath),
  starter_decks_sha256: hashFile(startersPath),
  construction: {
    minimum_cards: canonical.deck_construction.minimum_cards,
    maximum_deckbuilding_value: canonical.deck_construction.maximum_deckbuilding_value,
    territories_per_player: canonical.deck_construction.territories_per_player,
    maximum_arenas: canonical.deck_construction.maximum_arenas,
    factions_per_deck: canonical.deck_construction.factions_per_deck,
    leaders_per_deck: canonical.deck_construction.leaders_per_deck,
    unique_copy_limit: 1,
  },
  fields: {
    factionId: 'canonical faction id',
    leaderId: 'slugified canonical Leader name',
    cards: [{ id: 'canonical card id', quantity: 'positive integer' }],
    territoryIds: ['three canonical Territory ids in own-end-to-opponent-end order'],
  },
  publication_unlocked: false,
};
writeText(`${outputDir}/json/Gauntlet_clean-v0.6.3_Deck_Export_Schema.json`, JSON.stringify(exportSchema, null, 2));

const sourceFiles = [rulebookPath, ...factionGuides.map((entry) => entry[2]), canonicalPath, startersPath];
const manifest = {
  schema_version: 1,
  target: 'clean-v0.6.3-print-export-generated',
  status: 'generated_reconstruction_bundle_not_published',
  authority_set_id: authoritySetId,
  sources: sourceFiles.map((source) => ({ path: source, sha256: hashFile(source) })),
  materials,
  json_exports: [
    `${outputDir}/json/Gauntlet_clean-v0.6.3_Canonical_Data.json`,
    `${outputDir}/json/Gauntlet_clean-v0.6.3_Starter_Decks.json`,
    `${outputDir}/json/Gauntlet_clean-v0.6.3_Deck_Export_Schema.json`,
  ],
  pdf_outputs: [],
  publication_unlocked: false,
  public_current_release: 'v0.6.1',
};
writeText(`${outputDir}/Gauntlet_clean-v0.6.3_Print_Export_Manifest.json`, JSON.stringify(manifest, null, 2));
console.log(`Generated clean v0.6.3 print/export sources: ${materials.length} print documents and ${manifest.json_exports.length} JSON exports.`);
