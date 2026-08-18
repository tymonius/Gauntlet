const FACTION_LABELS = Object.freeze({
  diplomats: 'Diplomats',
  financiers: 'Financiers',
  intelligence: 'Intelligence',
  mystics: 'Mystics',
  inquisition: 'Inquisition',
  military: 'Military',
});

function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;',
  })[character]);
}

function cleanInlineMarkdown(value) {
  return String(value || '')
    .replace(/^>\s*/, '')
    .replace(/\*\*/g, '')
    .replace(/__/g, '')
    .replace(/`/g, '')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
    .trim();
}

function headingLines(markdown, heading, depth = 2) {
  const level = Number(depth);
  if (!Number.isInteger(level) || level < 1 || level > 6) {
    throw new Error(`Invalid reference source heading depth ${depth} for ${heading}.`);
  }

  const lines = String(markdown || '').split(/\r?\n/);
  const marker = `${'#'.repeat(level)} ${heading}`;
  const start = lines.findIndex(line => line.trim() === marker);
  if (start < 0) throw new Error(`Reference source is missing heading ${JSON.stringify(marker)}.`);

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    const match = lines[index].trim().match(/^(#{1,6})\s+/);
    if (match && match[1].length <= level) {
      end = index;
      break;
    }
  }
  return lines.slice(start + 1, end);
}

function parseTableRow(line) {
  const text = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return text.split('|').map(cell => cleanInlineMarkdown(cell));
}

function isSeparatorRow(cells) {
  return cells.length > 0 && cells.every(cell => /^:?-{3,}:?$/.test(cell.replace(/\s+/g, '')));
}

function parseMarkdownBlocks(sourceLines, sourceName) {
  const blocks = [];
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push({ type: 'paragraph', text: cleanInlineMarkdown(paragraph.join(' ')) });
    paragraph = [];
  };
  const flushList = () => {
    if (list?.items.length) blocks.push(list);
    list = null;
  };
  const flushText = () => {
    flushParagraph();
    flushList();
  };

  for (let index = 0; index < sourceLines.length; index += 1) {
    let line = sourceLines[index].trim();

    if (!line || /^---+$/.test(line)) {
      flushText();
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      flushText();
      blocks.push({ type: 'subheading', level: heading[1].length, text: cleanInlineMarkdown(heading[2]) });
      continue;
    }

    if (/^\|.*\|$/.test(line)) {
      flushText();
      const rows = [];
      while (index < sourceLines.length && /^\s*\|.*\|\s*$/.test(sourceLines[index])) {
        rows.push(parseTableRow(sourceLines[index]));
        index += 1;
      }
      index -= 1;

      const headers = rows.shift() || [];
      if (rows.length && isSeparatorRow(rows[0])) rows.shift();
      if (!headers.length || !rows.length) throw new Error(`Malformed Markdown table while extracting ${sourceName}.`);
      blocks.push({ type: 'table', headers, rows });
      continue;
    }

    line = line.replace(/^>\s*/, '').trim();
    const unordered = line.match(/^[-*]\s+(.+)$/);
    const ordered = line.match(/^\d+\.\s+(.+)$/);
    if (unordered || ordered) {
      flushParagraph();
      const orderedList = Boolean(ordered);
      if (!list || list.ordered !== orderedList) {
        flushList();
        list = { type: 'list', ordered: orderedList, items: [] };
      }
      list.items.push(cleanInlineMarkdown((ordered || unordered)[1]));
      continue;
    }
    flushList();

    const labeled = line.match(/^\*\*([^*]+?):\*\*\s*(.*)$/);
    if (labeled) {
      flushParagraph();
      blocks.push({ type: 'rule', label: cleanInlineMarkdown(labeled[1]), text: cleanInlineMarkdown(labeled[2]) });
      continue;
    }

    paragraph.push(line);
  }

  flushText();
  if (!blocks.length) throw new Error(`No printable rules were extracted for ${sourceName}.`);
  return blocks;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseReferenceSection(markdown, selector, componentName) {
  const heading = String(selector?.heading || '').trim();
  const depth = Number(selector?.depth);
  if (!heading || !Number.isInteger(depth)) {
    throw new Error(`${componentName} reference selector must declare heading and depth.`);
  }

  let lines = headingLines(markdown, heading, depth);
  if (selector.ruleLabel) {
    const label = String(selector.ruleLabel).trim();
    const matcher = new RegExp(`^>?\\s*\\*\\*${escapeRegExp(label)}:\\*\\*`, 'i');
    const start = lines.findIndex(line => matcher.test(line.trim()));
    if (start < 0) throw new Error(`${componentName} reference selector ${heading} is missing rule label ${label}.`);
    lines = lines.slice(start);
  }

  return {
    heading: String(selector.title || heading),
    sourceHeading: heading,
    blocks: parseMarkdownBlocks(lines, `${componentName} — ${heading}`),
  };
}

function parseReferenceFace(markdown, face, componentName, side) {
  if (!face || !String(face.title || '').trim() || !Array.isArray(face.sections) || !face.sections.length) {
    throw new Error(`${componentName} reference ${side} face must declare a title and source sections.`);
  }
  return {
    title: String(face.title).trim(),
    sections: face.sections.map(selector => parseReferenceSection(markdown, selector, componentName)),
  };
}

function versionFromSource(source) {
  return String(source || '').match(/v\d+\.\d+\.\d+/i)?.[0] || '';
}

export async function loadReferenceRecords(contractUrl = '/config/tts-component-contract.json') {
  const contractResponse = await fetch(contractUrl, { cache: 'no-store' });
  if (!contractResponse.ok) throw new Error(`Reference component contract request failed: ${contractResponse.status}`);
  const contract = await contractResponse.json();
  const components = (contract.components || []).filter(component => component.family === 'reference-card');
  if (components.length !== 7) throw new Error(`Expected 7 reference cards in the component contract; found ${components.length}.`);

  const sourceCache = new Map();
  const records = [];
  for (const component of components) {
    if (component.backPolicy !== 'twoSided' || !component.referenceFaces?.front || !component.referenceFaces?.reverse) {
      throw new Error(`Reference component ${component.id} is not a complete two-sided reference card.`);
    }

    const sourceUrl = `/${String(component.source || '').replace(/^\/+/, '')}`;
    let markdown = sourceCache.get(sourceUrl);
    if (!markdown) {
      const sourceResponse = await fetch(sourceUrl, { cache: 'no-store' });
      if (!sourceResponse.ok) throw new Error(`Reference source request failed for ${component.id}: ${sourceResponse.status}`);
      markdown = await sourceResponse.text();
      sourceCache.set(sourceUrl, markdown);
    }

    records.push({
      id: component.id,
      name: component.name,
      faction: component.faction,
      family: component.family,
      source: component.source,
      version: versionFromSource(component.source),
      faces: {
        front: parseReferenceFace(markdown, component.referenceFaces.front, component.name, 'front'),
        reverse: parseReferenceFace(markdown, component.referenceFaces.reverse, component.name, 'reverse'),
      },
    });
  }
  return records;
}

function renderBlock(block) {
  if (block.type === 'subheading') {
    return `<h5 class="reference-inline-heading">${esc(block.text)}</h5>`;
  }

  if (block.label) {
    return `<p class="reference-rule"><strong>${esc(block.label)}:</strong> ${esc(block.text)}</p>`;
  }

  if (block.type === 'list') {
    const tag = block.ordered ? 'ol' : 'ul';
    return `<${tag}>${(block.items || []).map(item => `<li>${esc(item)}</li>`).join('')}</${tag}>`;
  }

  if (block.type === 'table') {
    const head = `<thead><tr>${(block.headers || []).map(header => `<th>${esc(header)}</th>`).join('')}</tr></thead>`;
    const body = `<tbody>${(block.rows || []).map(row => `<tr>${row.map(cell => `<td>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`;
    return `<table class="reference-table">${head}${body}</table>`;
  }

  return `<p>${esc(block.text)}</p>`;
}

function shortComponentName(name) {
  return String(name || '')
    .replace(/^Inquisition\s+/i, '')
    .replace(/\s+Card$/i, '')
    .trim();
}

export function referenceCardMarkup(record, sideName, options = {}) {
  const face = record?.faces?.[sideName];
  if (!record || !face) throw new Error(`Reference card ${record?.id || 'unknown'} has no ${sideName} face.`);
  const factionLabel = FACTION_LABELS[record.faction] || record.faction;
  const version = options.version || record.version || 'Reference';
  const componentName = shortComponentName(record.name);

  const sections = face.sections.map(section => `<section class="reference-section">
    <h4 class="reference-section-title">${esc(section.heading)}</h4>
    <div class="reference-blocks">${section.blocks.map(renderBlock).join('')}</div>
  </section>`).join('');

  return `<article class="gauntlet-card faction-component-card reference-card" data-faction="${esc(record.faction)}" data-component-id="${esc(record.id)}" data-reference-side="${esc(sideName)}" aria-label="${esc(record.name)} — ${esc(face.title)}">
    <div class="reference-card-interior">
      <span class="reference-watermark" aria-hidden="true"></span>
      <header class="reference-card-header">
        <div class="reference-kicker"><span class="reference-faction-emblem" aria-hidden="true"></span><span>${esc(factionLabel)} Reference</span></div>
        <h3 class="reference-face-title">${esc(face.title)}</h3>
        <p class="reference-component-name">${esc(componentName)}</p>
      </header>
      <div class="reference-body">${sections}</div>
      <footer class="reference-card-footer"><span>${esc(factionLabel)}</span><strong>Reference · Not a Deck Card</strong><span>${esc(version)}</span></footer>
    </div>
  </article>`;
}

export function fitReferenceCard(card, { minimumScale = 0.82 } = {}) {
  if (!card) throw new Error('Reference card fitter received no card.');
  const body = card.querySelector('.reference-body');
  if (!body) throw new Error(`Reference card ${card.dataset.componentId || 'unknown'} has no body.`);

  let scale = 1;
  let sectionGap = 0.035;
  let attempts = 0;
  const overflows = () => body.scrollHeight > body.clientHeight + 0.75;

  card.style.setProperty('--reference-rules-scale', scale.toFixed(3));
  card.style.setProperty('--reference-section-gap', `${sectionGap.toFixed(3)}in`);

  while (overflows() && scale > minimumScale && attempts < 24) {
    scale = Math.max(minimumScale, scale - 0.015);
    sectionGap = Math.max(0.018, sectionGap - 0.0015);
    card.style.setProperty('--reference-rules-scale', scale.toFixed(3));
    card.style.setProperty('--reference-section-gap', `${sectionGap.toFixed(3)}in`);
    attempts += 1;
  }

  const overflow = overflows();
  card.dataset.referenceScale = scale.toFixed(3);
  card.dataset.fitWarning = overflow ? 'true' : 'false';
  return { scale, overflow, sectionGap };
}

export function fitAllReferenceCards(root = document) {
  const results = [];
  for (const card of root.querySelectorAll('.reference-card')) {
    results.push({ card, ...fitReferenceCard(card) });
  }
  return results;
}
