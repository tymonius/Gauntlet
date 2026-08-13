import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const check = process.argv.includes('--check');
const failures = [];

const documents = [
  {
    key: 'rulebook',
    source: 'releases/v0.6.2/Gauntlet_v0.6.2_Rulebook.md',
    output: 'v0.6.2/print/rulebook.html',
    title: 'Gauntlet v0.6.2 Rulebook',
    subtitle: 'Official rules - Second Playtest Revision',
    pageSize: '5.5in 8.5in',
    bodyClass: 'rulebook-print',
  },
  {
    key: 'reference',
    source: 'releases/v0.6.2/Gauntlet_v0.6.2_Reference_Guide.md',
    output: 'v0.6.2/print/reference-guide.html',
    title: 'Gauntlet v0.6.2 Reference Guide',
    subtitle: 'Compact tableside reference',
    pageSize: 'Letter portrait',
    bodyClass: 'reference-print',
  },
  {
    key: 'first-game',
    source: 'releases/v0.6.2/Gauntlet_v0.6.2_First_Game_Guide.md',
    output: 'v0.6.2/print/first-game-guide.html',
    title: 'Gauntlet v0.6.2 First Game Guide',
    subtitle: 'Teaching order and tableside procedures',
    pageSize: 'Letter portrait',
    bodyClass: 'first-game-print',
  },
  {
    key: 'faction-guide',
    source: 'releases/v0.6.2/Gauntlet_v0.6.2_Faction_and_Component_Guide.md',
    output: 'v0.6.2/print/faction-guide.html',
    title: 'Gauntlet v0.6.2 Faction and Component Guide',
    subtitle: 'Complete faction, Proposal, and supplemental-component rules',
    pageSize: 'Letter portrait',
    bodyClass: 'faction-guide-print',
  },
  {
    key: 'changes',
    source: 'releases/v0.6.2/Gauntlet_v0.6.2_Returning_Player_Changes.md',
    output: 'v0.6.2/print/returning-player-changes.html',
    title: 'What Changed in Gauntlet v0.6.2',
    subtitle: 'Returning-player handout',
    pageSize: 'Letter portrait',
    bodyClass: 'changes-print',
  },
];

const standaloneHtml = [
  'playtest/player-mat/index.html',
  'v0.6.2/print/active-player-marker.html',
  'v0.6.2/print/faction-teaching-cards.html',
  'v0.6.2/print/index.html',
  'v0.6.2/print/player-mat.html',
  'v0.6.2/print/playtest-sheet.html',
];

const faviconLinks = [
  '  <link rel="icon" type="image/png" href="/favicon-32.png?v=20260804-1" sizes="32x32" />',
  '  <link rel="icon" type="image/x-icon" href="/favicon.ico?v=20260804-1" sizes="any" />',
  '  <link rel="apple-touch-icon" href="/apple-touch-icon.png?v=20260804-1" />',
];

const faviconHrefs = [
  '/favicon-32.png?v=20260804-1',
  '/favicon.ico?v=20260804-1',
  '/apple-touch-icon.png?v=20260804-1',
];

const analyticsMeasurementId = 'G-8YYYZJGGPE';
const googleAnalyticsTag = `  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${analyticsMeasurementId}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${analyticsMeasurementId}');
  </script>`;

const normalize = (value) => String(value).replace(/\r\n/g, '\n');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

function expected(relativePath, content) {
  const target = path.join(root, relativePath);
  const output = normalize(content).replace(/\s+$/, '') + '\n';
  if (check) {
    if (!fs.existsSync(target)) {
      failures.push(`Missing generated print document: ${relativePath}`);
      return;
    }
    if (normalize(fs.readFileSync(target, 'utf8')) !== output) {
      failures.push(`Stale generated print document: ${relativePath}`);
    }
    return;
  }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, output, 'utf8');
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function synchronizeSiteFavicons(relativePath, content) {
  let output = normalize(content);
  for (const href of faviconHrefs) {
    output = output.replace(new RegExp(`^[\\t ]*<link\\b[^>]*href="${escapeRegex(href)}"[^>]*>[\\t ]*\\n?`, 'gm'), '');
  }

  const viewport = '  <meta name="viewport" content="width=device-width, initial-scale=1">\n';
  if (!output.includes(viewport)) {
    failures.push(`Cannot place favicon links in ${relativePath}: missing viewport meta tag.`);
    return output;
  }
  return output.replace(viewport, `${viewport}${faviconLinks.join('\n')}\n`);
}

function synchronizeGoogleAnalytics(relativePath, content) {
  let output = normalize(content);
  if (!relativePath.startsWith('v0.6.2/print/')) return output;
  if (output.includes(analyticsMeasurementId)) return output;
  if (output.includes('googletagmanager.com/gtag/js?id=')) {
    failures.push(`${relativePath} contains a different Google Analytics tag.`);
    return output;
  }
  if (!/<head(?:\s[^>]*)?>/i.test(output)) {
    failures.push(`Cannot place Google Analytics tag in ${relativePath}: missing head element.`);
    return output;
  }
  return output.replace(/<head(?:\s[^>]*)?>/i, (head) => `${head}\n${googleAnalyticsTag}`);
}

function synchronizeStandaloneHtml(relativePath, content) {
  let output = synchronizeSiteFavicons(relativePath, content);
  output = synchronizeGoogleAnalytics(relativePath, output);
  if (relativePath === 'v0.6.2/print/player-mat.html') {
    const oldActionHeading = '<div class="zone-heading"><h3>Action Reminder</h3><span>Normally one total</span></div>';
    const currentActionHeading = '<div class="zone-heading"><h3>Action Reminder</h3><span>1 Action · two normal Action Opportunities</span></div>';
    output = output.replace(oldActionHeading, currentActionHeading);
    if (!output.includes(currentActionHeading)) {
      failures.push(`${relativePath} is missing the current Action Opportunity reminder.`);
    }
  }
  return output;
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
  output = output.replace(/\[([^\]]+)]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  return output;
}

function isTableSeparator(line) {
  return /^\|(?:\s*:?-{3,}:?\s*\|)+\s*$/.test(line);
}

function tableCells(line) {
  return line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim());
}

function markdownToHtml(markdown) {
  const lines = normalize(markdown).split('\n');
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
    const raw = lines[index];
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      closeList();
      closeQuote();
      index += 1;
      continue;
    }

    const heading = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      closeList();
      closeQuote();
      const level = Math.min(6, heading[1].length + 1);
      const id = heading[2].toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      out.push(`<h${level} id="${id}">${inlineMarkdown(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      closeList();
      closeQuote();
      out.push('<hr>');
      index += 1;
      continue;
    }

    if (/^\|.*\|$/.test(trimmed) && index + 1 < lines.length && isTableSeparator(lines[index + 1].trim())) {
      closeList();
      closeQuote();
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
      if (!quote) {
        out.push('<blockquote>');
        quote = true;
      }
      out.push(`<p>${inlineMarkdown(trimmed.replace(/^>\s?/, ''))}</p>`);
      index += 1;
      continue;
    }
    closeQuote();

    const bullet = trimmed.match(/^[-*]\s+(.+)$/);
    const numbered = trimmed.match(/^\d+\.\s+(.+)$/);
    if (bullet || numbered) {
      const kind = bullet ? 'ul' : 'ol';
      if (list !== kind) {
        closeList();
        out.push(`<${kind}>`);
        list = kind;
      }
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

  closeList();
  closeQuote();
  return out.join('\n');
}

function page(document, markdown) {
  const body = markdownToHtml(markdown);
  return `<!doctype html>
<html lang="en">
<head>
${googleAnalyticsTag}
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
${faviconLinks.join('\n')}
  <title>${escapeHtml(document.title)}</title>
  <link rel="stylesheet" href="styles.css">
  <style>@page{size:${document.pageSize};margin:${document.key === 'rulebook' ? '.38in .4in .45in' : '.45in .5in .55in'}}</style>
</head>
<body class="document-page ${document.bodyClass}">
  <header class="screen-header screen-only">
    <div><p class="eyebrow">Gauntlet v0.6.2 printed document</p><h1>${escapeHtml(document.title)}</h1><p>${escapeHtml(document.subtitle)}</p></div>
    <div class="screen-actions"><a class="button secondary" href="index.html">All printed materials</a><button onclick="window.print()">Print / Save PDF</button></div>
  </header>
  <main class="document-shell ${document.key === 'rulebook' ? 'half' : ''}">
    <header class="document-header"><h1>${escapeHtml(document.title)}</h1><p>${escapeHtml(document.subtitle)} · Published August 5, 2026</p></header>
    <article class="document-body">${body}</article>
  </main>
</body>
</html>`;
}

for (const document of documents) {
  const source = read(document.source);
  if (!source.includes('v0.6.2')) failures.push(`${document.source} does not identify v0.6.2.`);
  expected(document.output, page(document, source));
}

for (const relativePath of standaloneHtml) {
  expected(relativePath, synchronizeStandaloneHtml(relativePath, read(relativePath)));
}

expected('v0.6.2/print/document-manifest.json', `${JSON.stringify({
  version: 'v0.6.2',
  status: 'published',
  generated_from: documents.map(({ key, source, output, pageSize }) => ({ key, source, output, page_size: pageSize })),
}, null, 2)}\n`);

if (failures.length) {
  console.error(failures.join('\n'));
  process.exit(1);
}

console.log(`${check ? 'Verified' : 'Generated'} ${documents.length} v0.6.2 print-document HTML files.`);
