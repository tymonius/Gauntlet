const PAGE_BREAK = '<div class="page-break"></div>';

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeUrl(url) {
  const trimmed = url.trim();
  const unwrapped = trimmed.startsWith('<') && trimmed.endsWith('>')
    ? trimmed.slice(1, -1).trim()
    : trimmed;

  if (unwrapped.startsWith('../../images/')) {
    return `../../../../images/${unwrapped.slice('../../images/'.length)}`;
  }
  if (unwrapped.startsWith('images/')) {
    return `../../../../${unwrapped}`;
  }
  return unwrapped;
}

function plainText(value) {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/<[^>]+>/g, '')
    .trim();
}

function createSlugger() {
  const counts = new Map();

  return (value) => {
    const base = plainText(value)
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'section';

    const count = counts.get(base) || 0;
    counts.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };
}

function renderInline(rawValue) {
  const tokens = [];
  const breakToken = 'GAUNTLETLINEBREAKTOKEN';
  const stash = (html) => {
    const token = `GAUNTLETINLINETOKEN${tokens.length}END`;
    tokens.push(html);
    return token;
  };

  let value = String(rawValue)
    .replace(/ {2}\n/g, breakToken)
    .replace(/\n/g, ' ')
    .replace(/`([^`]+)`/g, (_, code) => stash(`<code>${escapeHtml(code)}</code>`))
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
      const source = escapeHtml(normalizeUrl(url));
      return stash(`<img src="${source}" alt="${escapeHtml(alt)}" loading="lazy" />`);
    })
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, label, url) => {
      const href = escapeHtml(normalizeUrl(url));
      const external = /^https?:\/\//i.test(url) ? ' target="_blank" rel="noreferrer"' : '';
      return stash(`<a href="${href}"${external}>${escapeHtml(label)}</a>`);
    });

  value = escapeHtml(value)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*]+)\*(?!\*)/g, '$1<em>$2</em>')
    .replace(/(^|[^_])_([^_]+)_(?!_)/g, '$1<em>$2</em>')
    .replaceAll(breakToken, '<br />');

  tokens.forEach((html, index) => {
    value = value.replaceAll(`GAUNTLETINLINETOKEN${index}END`, html);
  });

  return value;
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isTableDivider(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function isListLine(line) {
  return /^\s*(?:[-*+] |\d+\. )/.test(line);
}

function isBlockStart(lines, index) {
  const line = lines[index] || '';
  if (!line.trim()) return true;
  if (line.trim() === PAGE_BREAK) return true;
  if (/^#{1,6}\s+/.test(line)) return true;
  if (/^\s*(?:---+|\*\*\*+)\s*$/.test(line)) return true;
  if (/^>\s?/.test(line)) return true;
  if (isListLine(line)) return true;
  if (index + 1 < lines.length && line.includes('|') && isTableDivider(lines[index + 1])) return true;
  return false;
}

export function renderMarkdown(source) {
  const cleanedSource = String(source).replace(/<!--[\s\S]*?-->/g, '');
  const lines = cleanedSource.replace(/\r\n?/g, '\n').split('\n');
  const slug = createSlugger();
  const headings = [];
  const html = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed || trimmed === PAGE_BREAK) {
      index += 1;
      continue;
    }

    const headingMatch = /^(#{1,6})\s+(.+)$/.exec(line);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const label = headingMatch[2].trim();
      const id = slug(label);
      headings.push({ id, level, label: plainText(label) });
      html.push(`<h${level} id="${id}">${renderInline(label)}</h${level}>`);
      index += 1;
      continue;
    }

    if (/^\s*(?:---+|\*\*\*+)\s*$/.test(line)) {
      html.push('<hr />');
      index += 1;
      continue;
    }

    if (index + 1 < lines.length && line.includes('|') && isTableDivider(lines[index + 1])) {
      const headers = splitTableRow(line);
      const rows = [];
      index += 2;
      while (index < lines.length && lines[index].trim() && lines[index].includes('|')) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }

      html.push('<div class="table-scroll" tabindex="0"><table><thead><tr>');
      headers.forEach((cell) => html.push(`<th scope="col">${renderInline(cell)}</th>`));
      html.push('</tr></thead><tbody>');
      rows.forEach((row) => {
        html.push('<tr>');
        headers.forEach((_, cellIndex) => html.push(`<td>${renderInline(row[cellIndex] || '')}</td>`));
        html.push('</tr>');
      });
      html.push('</tbody></table></div>');
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quote.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      html.push(`<blockquote>${renderInline(quote.join('\n'))}</blockquote>`);
      continue;
    }

    if (isListLine(line)) {
      const ordered = /^\s*\d+\. /.test(line);
      const tag = ordered ? 'ol' : 'ul';
      const items = [];
      const pattern = ordered ? /^\s*\d+\.\s+(.+)$/ : /^\s*[-*+]\s+(.+)$/;

      while (index < lines.length) {
        const match = pattern.exec(lines[index]);
        if (!match) break;
        items.push(match[1]);
        index += 1;
      }

      html.push(`<${tag}>`);
      items.forEach((item) => html.push(`<li>${renderInline(item)}</li>`));
      html.push(`</${tag}>`);
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (index < lines.length && !isBlockStart(lines, index)) {
      paragraph.push(lines[index]);
      index += 1;
    }
    html.push(`<p>${renderInline(paragraph.join('\n'))}</p>`);
  }

  return { html: html.join('\n'), headings };
}
