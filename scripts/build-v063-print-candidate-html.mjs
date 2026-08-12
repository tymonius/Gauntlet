import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const check = process.argv.includes('--check');
const sourceDir = 'artifacts/v0.6.3/release-candidate';
const outputDir = 'artifacts/v0.6.3/print-candidate/html';
const failures = [];
const prepared = 'August 11, 2026';
const faviconLinks = `  <link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1" />`;
const googleAnalytics = `  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=G-8YYYZJGGPE"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-8YYYZJGGPE');
  </script>`;

const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8').replace(/\r\n/g, '\n');
const normalize = (value) => String(value).replace(/\r\n/g, '\n').replace(/\s+$/, '') + '\n';

function expected(relativePath, content) {
  const target = path.join(root, relativePath);
  const output = normalize(content);
  if (check) {
    if (!fs.existsSync(target)) failures.push(`Missing generated print candidate HTML: ${relativePath}`);
    else if (read(relativePath) !== output) failures.push(`Stale generated print candidate HTML: ${relativePath}`);
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, 'utf8');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function inlineMarkdown(value) {
  let output = escapeHtml(value);
  output = output.replace(/`([^`]+)`/g, '<code>$1</code>');
  output = output.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  output = output.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  output = output.replace(/\[([^\]]+)]\(([^)]+)\)/g, '<span class="print-link">$1</span>');
  output = output.replaceAll('[[HARD_BREAK]]', '<br>');
  return output;
}

function isTableSeparator(line) {
  return /^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(line);
}

function tableCells(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
}

function markdownToHtml(markdown) {
  const lines = String(markdown)
    .replace(/\r\n/g, '\n')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/ {2,}\n/g, '[[HARD_BREAK]]\n')
    .split('\n');
  const out = [];
  let list = null;
  let quote = false;
  let index = 0;

  const closeList = () => {
    if (list) out.push(`</${list}>`);
    list = null;
  };
  const closeQuote = () => {
    if (quote) out.push('</blockquote>');
    quote = false;
  };

  while (index < lines.length) {
    const trimmed = lines[index].trim();
    if (!trimmed) {
      closeList(); closeQuote(); index += 1; continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeList(); closeQuote();
      const level = Math.min(6, heading[1].length + 1);
      const id = heading[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      out.push(`<h${level} id="${id}">${inlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      closeList(); closeQuote(); out.push('<hr>'); index += 1; continue;
    }

    if (/^\|.*\|$/.test(trimmed) && index + 1 < lines.length && isTableSeparator(lines[index + 1].trim())) {
      closeList(); closeQuote();
      const headers = tableCells(trimmed);
      index += 2;
      const rows = [];
      while (index < lines.length && /^\|.*\|$/.test(lines[index].trim())) {
        rows.push(tableCells(lines[index]));
        index += 1;
      }
      out.push('<table><thead><tr>' + headers.map((cell) => `<th>${inlineMarkdown(cell)}</th>`).join('') + '</tr></thead><tbody>');
      for (const row of rows) out.push('<tr>' + row.map((cell) => `<td>${inlineMarkdown(cell)}</td>`).join('') + '</tr>');
      out.push('</tbody></table>');
      continue;
    }

    if (trimmed.startsWith('>')) {
      closeList();
      if (!quote) { out.push('<blockquote>'); quote = true; }
      out.push(`<p>${inlineMarkdown(trimmed.replace(/^>\s?/, ''))}</p>`);
      index += 1;
      continue;
    }
    closeQuote();

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    const numbered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) { closeList(); out.push(`<${kind}>`); list = kind; }
      out.push(`<li>${inlineMarkdown((bullet || numbered)[1])}</li>`);
      index += 1;
      continue;
    }
    closeList();

    const paragraph = [trimmed];
    index += 1;
    while (index < lines.length) {
      const next = lines[index].trim();
      if (!next || /^(#{1,6})\s+/.test(next) || /^---+$/.test(next) || next.startsWith('>') || /^[-*]\s+/.test(next) || /^\d+\.\s+/.test(next) || (/^\|.*\|$/.test(next) && index + 1 < lines.length && isTableSeparator(lines[index + 1].trim()))) break;
      paragraph.push(next);
      index += 1;
    }
    out.push(`<p>${inlineMarkdown(paragraph.join(' '))}</p>`);
  }

  closeList(); closeQuote();
  return out.join('\n');
}

const documents = [
  {
    key: 'rulebook',
    source: `${sourceDir}/Gauntlet_v0.6.3_Rulebook.md`,
    output: `${outputDir}/rulebook.html`,
    title: 'Gauntlet v0.6.3 Rulebook',
    subtitle: 'Third Playtest Revision - release candidate',
    pageSize: '5.5in 8.5in',
    half: true,
  },
  {
    key: 'reference',
    source: `${sourceDir}/Gauntlet_v0.6.3_Reference_Guide.md`,
    output: `${outputDir}/reference-guide.html`,
    title: 'Gauntlet v0.6.3 Reference Guide',
    subtitle: 'Compact tableside reference - release candidate',
    pageSize: 'Letter portrait',
  },
  {
    key: 'first-game',
    source: `${sourceDir}/Gauntlet_v0.6.3_First_Game_Guide.md`,
    output: `${outputDir}/first-game-guide.html`,
    title: 'Gauntlet v0.6.3 First Game Guide',
    subtitle: 'Teaching order and tableside procedures - release candidate',
    pageSize: 'Letter portrait',
  },
  {
    key: 'faction-guide',
    source: `${sourceDir}/Gauntlet_v0.6.3_Faction_and_Component_Guide.md`,
    output: `${outputDir}/faction-guide.html`,
    title: 'Gauntlet v0.6.3 Faction and Component Guide',
    subtitle: 'Faction, Leader, Proposal, and supplemental-component rules - release candidate',
    pageSize: 'Letter portrait',
  },
  {
    key: 'changes',
    source: `${sourceDir}/Gauntlet_v0.6.3_Returning_Player_Changes.md`,
    output: `${outputDir}/returning-player-changes.html`,
    title: 'What Changed in Gauntlet v0.6.3',
    subtitle: 'Returning-player handout - release candidate',
    pageSize: 'Letter portrait',
  },
];

function documentPage(document, markdown) {
  const body = markdownToHtml(markdown);
  const bannerSubtitle = document.subtitle.replace(/ - release candidate$/, '');
  return `<!doctype html>
<html lang="en">
<head>
${googleAnalytics}
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(document.title)}</title>
${faviconLinks}
  <link rel="stylesheet" href="styles.css">
  <style>@page{size:${document.pageSize};margin:${document.key === 'rulebook' ? '.38in .4in .45in' : '.45in .5in .55in'}}</style>
</head>
<body class="document-page">
  <main class="document-shell ${document.half ? 'half' : ''}">
    <header class="document-header"><p style="margin:0"><strong style="color:var(--accent);text-transform:uppercase;letter-spacing:.08em">Gauntlet v0.6.3 release candidate</strong> · ${escapeHtml(bannerSubtitle)} · Prepared ${prepared} · Not published</p></header>
    <article class="document-body">${body}</article>
  </main>
</body>
</html>`;
}

for (const document of documents) {
  if (!fs.existsSync(path.join(root, document.source))) failures.push(`Missing source release-candidate document: ${document.source}`);
  else expected(document.output, documentPage(document, read(document.source)));
}

function adaptFixed(relativePath) {
  let content = read(`v0.6.2/print/${relativePath}`).replaceAll('v0.6.2', 'v0.6.3');
  content = content.replaceAll('<a class="button secondary" href="index.html">All printed materials</a>', '<span class="version-chip">release candidate - not published</span>');

  if (relativePath === 'player-mat.html') {
    content = content
      .replace('<div class="zone-heading"><h3>Action Reminder</h3><span>1 Action · two normal Action Opportunities</span></div>', '<div class="zone-heading"><h3>Action Reminder</h3><span>1 Action · Opening or Denouement</span></div>')
      .replace('Your Front Line is the contiguous Territories you control from your own end. During Capture, add at most the next opposing Territory immediately beyond it when your token is on or beyond that Territory.', 'Start on your own-end Territory; setup placement is not movement or entering. Front Line = contiguous Territories you control from your end. Capture the next opposing Territory when eligible.')
      .replace('After an attacking win, the attacker may become the occupier. Control normally changes only during a later Capture step when contiguous Front Line requirements are met.', 'Capturing the opponent-end Territory wins immediately. Once the opponent is beyond the Gauntlet, a separate legal Advance beyond their end can start a Last Stand without prior capture.')
      .replace('<strong>gauntlet.run/v0.6.3</strong>', '<strong>v0.6.3 release candidate</strong>');
  }

  if (relativePath === 'playtest-sheet.html') {
    content = content
      .replace('<div class="choice-row" style="margin-top:.04in"><strong>Victory route:</strong><span><i class="box"></i> Ran the Gauntlet</span><span><i class="box"></i> Peace Treaty</span><span><i class="box"></i> Controlling Interest</span><span><i class="box"></i> Special Operation</span><span><i class="box"></i> Ritual</span><span><i class="box"></i> Purification</span></div>', '<div class="choice-row" style="margin-top:.04in"><strong>Victory route:</strong><span><i class="box"></i> Final Territory</span><span><i class="box"></i> Last Stand</span><span><i class="box"></i> Peace Treaty</span><span><i class="box"></i> Controlling Interest</span><span><i class="box"></i> Special Operation</span><span><i class="box"></i> Ritual</span><span><i class="box"></i> Purification</span></div>')
      .replace('<h3>v0.6.3 procedure checks</h3>\n        <div class="choice-row"><span><i class="box"></i> Turn sequence stayed clear</span><span><i class="box"></i> Opening vs Denouement caused confusion</span><span><i class="box"></i> Pending battle / Terms / Onset caused confusion</span><span><i class="box"></i> Defensive Edge / Tiebreak Roll caused confusion</span></div>\n        <div class="choice-row"><span><i class="box"></i> Front Line vs Position caused confusion</span><span><i class="box"></i> Fall Back / retreat / withdrawal caused confusion</span><span><i class="box"></i> Battle zones became mixed</span><span><i class="box"></i> Bound cards became unclear</span></div>', '<h3>v0.6.3 procedure checks</h3>\n        <div class="choice-row"><span><i class="box"></i> Turn sequence stayed clear</span><span><i class="box"></i> Opening selection → Territory arrangement → initiative caused confusion</span><span><i class="box"></i> Setup placement vs movement / entering caused confusion</span><span><i class="box"></i> Final Territory vs Last Stand caused confusion</span></div>\n        <div class="choice-row"><span><i class="box"></i> Pending battle / Terms / Onset caused confusion</span><span><i class="box"></i> Defensive Edge / Tiebreak Roll caused confusion</span><span><i class="box"></i> Front Line vs Position caused confusion</span><span><i class="box"></i> Fall Back / retreat / withdrawal caused confusion</span></div>');
  }

  if (relativePath === 'faction-teaching-cards.html') {
    content = content.replace('Capital; begin with 2 for v0.6.3 testing.', 'Capital; begin with 2.');
  }

  return content;
}

for (const file of ['player-mat.html', 'playtest-sheet.html', 'faction-teaching-cards.html', 'active-player-marker.html']) {
  expected(`${outputDir}/${file}`, adaptFixed(file));
}

expected(`${outputDir}/styles.css`, read('v0.6.2/print/styles.css'));

const index = `<!doctype html>
<html lang="en">
<head>
${googleAnalytics}
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gauntlet v0.6.3 Print Candidate</title>
${faviconLinks}
  <link rel="stylesheet" href="styles.css">
</head>
<body><main class="print-index"><p class="eyebrow">Gauntlet v0.6.3 · release candidate · not published</p><h1>Printed-material candidate</h1><p>This local review surface is generated from the assembled v0.6.3 source release candidate. It is not a public release page.</p><div class="material-grid">
${[
  ['Rulebook', 'rulebook.html'], ['Compact Reference', 'reference-guide.html'], ['First Game Guide', 'first-game-guide.html'], ['Faction and Component Guide', 'faction-guide.html'], ['Returning-player Changes', 'returning-player-changes.html'], ['Player Mat', 'player-mat.html'], ['Formal Playtest Sheet', 'playtest-sheet.html'], ['Faction Teaching Cards', 'faction-teaching-cards.html'], ['Active-Player Marker', 'active-player-marker.html'],
].map(([title, href]) => `<article class="material-card"><h3>${title}</h3><p>v0.6.3 release-candidate source.</p><a class="button" href="${href}">Open</a></article>`).join('\n')}
</div></main></body></html>`;
expected(`${outputDir}/index.html`, index);

const documentManifest = {
  version: 'v0.6.3-print-candidate',
  status: 'candidate-not-published',
  generated_from: documents.map(({ key, source, output, pageSize }) => ({ key, source, output, page_size: pageSize })),
  adapted_fixed_layout_sources: [
    'v0.6.2/print/player-mat.html',
    'v0.6.2/print/playtest-sheet.html',
    'v0.6.2/print/faction-teaching-cards.html',
    'v0.6.2/print/active-player-marker.html',
  ],
  publication_cutover_complete: false,
};
expected(`${outputDir}/document-manifest.json`, JSON.stringify(documentManifest, null, 2));

if (failures.length) {
  console.error('v0.6.3 print-candidate HTML build failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log(`${check ? 'Verified' : 'Generated'} v0.6.3 print-candidate HTML: 5 source documents, 4 fixed-layout aids, local index, and manifest.`);
