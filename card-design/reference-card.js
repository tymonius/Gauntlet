import { loadCurrentGame } from '../game-data/current-game.mjs';

const FACTION_LABELS = Object.freeze({
  neutral: 'Universal',
  diplomats: 'Diplomats',
  financiers: 'Financiers',
  intelligence: 'Intelligence',
  mystics: 'Mystics',
  inquisition: 'Inquisition',
  military: 'Military',
});

const REFERENCE_TITLE_MIN_PT = 8.4;
const CSS_PX_PER_PT = 96 / 72;

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
    presentation: face.presentation || null,
    sections: face.sections.map(selector => parseReferenceSection(markdown, selector, componentName)),
  };
}

function parseBespokeReferenceFace(markdown, face, componentName, side) {
  const title = String(face?.title || '').trim();
  if (!title) throw new Error(`${componentName} bespoke reference ${side} face must declare a title.`);

  const sideLabel = side === 'reverse' ? 'Reverse' : 'Front';
  const faceHeading = `${sideLabel} — ${title}`;
  const lines = headingLines(markdown, faceHeading, 2);
  const sections = [];
  let current = null;

  const flushSection = () => {
    if (!current) return;
    sections.push({
      heading: current.heading,
      sourceHeading: current.heading,
      blocks: parseMarkdownBlocks(current.lines, `${componentName} — ${current.heading}`),
    });
    current = null;
  };

  for (const line of lines) {
    const heading = line.trim().match(/^###\s+(.+)$/);
    if (heading) {
      flushSection();
      current = { heading: cleanInlineMarkdown(heading[1]), lines: [] };
      continue;
    }
    if (!current) {
      if (line.trim()) throw new Error(`${componentName} bespoke ${side} face has copy before its first section.`);
      continue;
    }
    current.lines.push(line);
  }
  flushSection();

  if (!sections.length) throw new Error(`${componentName} bespoke ${side} face has no printable sections.`);
  return { title, presentation: face.presentation || null, sections };
}

export async function loadReferenceRecordForFaceSpec(spec) {
  const content = spec?.content;
  const component = content?.component;
  const sideName = String(spec?.side || '').trim();
  if (content?.type !== 'reference' || !component?.id || !content?.source || !content?.selector || !sideName) {
    throw new Error(`Face ${spec?.id || '(unknown)'} is missing canonical reference source data.`);
  }

  const sourceUrl = `/${String(content.source).replace(/^\/+/, '')}`;
  const response = await fetch(sourceUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Reference source request failed for ${component.id}: ${response.status}`);
  }
  const markdown = await response.text();
  const parseFace = content.copyMode === 'bespoke' ? parseBespokeReferenceFace : parseReferenceFace;
  const face = parseFace(markdown, content.selector, component.name, sideName);

  return {
    id: component.id,
    name: component.name,
    faction: component.faction || 'neutral',
    family: component.family,
    copyMode: content.copyMode || 'guide-derived',
    presentation: content.presentation || component.presentation?.reference || null,
    source: spec.provenance?.gameplay || '/game-data/current-game.json',
    version: spec.provenance?.displayVersion || spec.provenance?.version || 'Reference',
    faces: {
      [sideName]: face,
    },
  };
}

export async function loadReferenceRecords(componentIds = null) {
  const currentGame = await loadCurrentGame();
  const requestedIds = componentIds == null
    ? null
    : new Set((Array.isArray(componentIds) ? componentIds : [componentIds])
      .map(value => String(value || '').trim())
      .filter(Boolean));
  const components = [
    ...(currentGame.sharedComponents || []),
    ...(currentGame.components || []),
  ].filter(component => (
    component.family === 'reference-card'
    && component.referenceFaces?.front
    && component.referenceFaces?.reverse
    && (!requestedIds || requestedIds.has(component.id))
  ));
  if (!components.length) {
    if (requestedIds) throw new Error(`Current-game authority cannot resolve requested reference card(s): ${[...requestedIds].join(', ')}.`);
    throw new Error('Current-game authority declares no reference cards.');
  }

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

    const parseFace = component.copyMode === 'bespoke'
      ? (face, side) => parseBespokeReferenceFace(markdown, face, component.name, side)
      : (face, side) => parseReferenceFace(markdown, face, component.name, side);

    records.push({
      id: component.id,
      name: component.name,
      faction: component.faction || 'neutral',
      family: component.family,
      copyMode: component.copyMode || 'guide-derived',
      presentation: component.presentation?.reference || null,
      source: currentGame.authorityUrl,
      version: currentGame.displayVersion,
      faces: {
        front: parseFace(component.referenceFaces.front, 'front'),
        reverse: parseFace(component.referenceFaces.reverse, 'reverse'),
      },
    });
  }
  return records;
}

function typedBlock(blocks, type, index, sourceName) {
  const candidates = blocks.filter(block => block.type === type);
  const block = candidates[index];
  if (!block) throw new Error(`Reference presentation ${sourceName} is missing ${type}:${index}.`);
  return block;
}

function selectedSectionBlocks(record, sideName, section) {
  if (record.copyMode === 'bespoke') return section.blocks;
  const selectors = record.presentation?.selectors?.[sideName]?.[section.sourceHeading];
  if (!selectors) return section.blocks;

  return selectors.map(selector => {
    const match = String(selector).match(/^(paragraph|list|table|rule|subheading):(\d+)$/);
    if (!match) throw new Error(`Invalid reference presentation selector ${selector} for ${record.id}/${sideName}/${section.sourceHeading}.`);
    return typedBlock(section.blocks, match[1], Number(match[2]), `${record.id}/${sideName}/${section.sourceHeading}`);
  });
}

function presentationFace(record, sideName) {
  const face = record?.faces?.[sideName];
  if (!face) throw new Error(`Reference card ${record?.id || 'unknown'} has no ${sideName} face.`);
  return {
    ...face,
    sections: face.sections.map(section => ({
      ...section,
      blocks: selectedSectionBlocks(record, sideName, section),
    })),
  };
}

function renderOrderedList(block) {
  return `<ol class="reference-step-list">${(block.items || []).map((item, index) => `<li><strong class="reference-callout-label reference-step-index" aria-hidden="true">${index + 1}</strong><span class="reference-step-text">${esc(item)}</span></li>`).join('')}</ol>`;
}

function renderOptionList(block) {
  return `<ul class="reference-option-list">${(block.items || []).map(item => `<li><span class="reference-option-mark" aria-hidden="true"></span><span>${esc(item)}</span></li>`).join('')}</ul>`;
}

function renderTable(block) {
  const head = `<thead><tr>${(block.headers || []).map(header => `<th>${esc(header)}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${(block.rows || []).map(row => `<tr>${row.map((cell, index) => `<td${index === 0 ? ' class="reference-table-key"' : ''}>${esc(cell)}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<div class="reference-matrix"><table class="reference-table">${head}${body}</table></div>`;
}

function renderBlock(block) {
  if (block.type === 'subheading') {
    return `<div class="reference-inline-banner"><span>${esc(block.text)}</span></div>`;
  }

  if (block.label) {
    return `<div class="reference-callout"><strong class="reference-callout-label">${esc(block.label)}</strong><p>${esc(block.text)}</p></div>`;
  }

  if (block.type === 'list') {
    return block.ordered ? renderOrderedList(block) : renderOptionList(block);
  }

  if (block.type === 'table') return renderTable(block);

  return `<p class="reference-prose">${esc(block.text)}</p>`;
}

function sectionKind(section) {
  if (section.blocks.some(block => block.type === 'table')) return 'matrix';
  if (section.blocks.some(block => block.type === 'list' && block.ordered)) return 'procedure';
  if (section.blocks.every(block => block.label || block.type === 'subheading')) return 'callouts';
  return 'rules';
}

function sectionSlug(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function renderSection(section) {
  const kind = sectionKind(section);
  return `<section class="reference-section reference-panel reference-panel--${kind}" data-reference-panel-kind="${kind}" data-reference-section="${esc(sectionSlug(section.heading))}">
    <header class="reference-panel-heading"><h4>${esc(section.heading)}</h4></header>
    <div class="reference-panel-content">${section.blocks.map(renderBlock).join('')}</div>
  </section>`;
}

function shortComponentName(name) {
  return String(name || '')
    .replace(/^Inquisition\s+/i, '')
    .replace(/\s+Card$/i, '')
    .trim();
}

export function referenceCardMarkup(record, sideName, options = {}) {
  const face = presentationFace(record, sideName);
  const factionLabel = FACTION_LABELS[record.faction] || record.faction;
  const version = options.version || record.version || 'Reference';
  const componentName = shortComponentName(record.name);
  const sections = face.sections.map(renderSection).join('');
  const titlePresentation = face.presentation || {};
  const titleFontSizePt = Number(titlePresentation.titleFontSizePt);
  const titleLetterSpacingEm = Number(titlePresentation.titleLetterSpacingEm);
  const titleStyle = [
    Number.isFinite(titleFontSizePt) ? `font-size:${titleFontSizePt}pt` : '',
    Number.isFinite(titleLetterSpacingEm) ? `letter-spacing:${titleLetterSpacingEm}em` : '',
  ].filter(Boolean).join(';');
  const titleStyleAttribute = titleStyle ? ` style="${titleStyle}"` : '';

  return `<article class="gauntlet-card faction-component-card reference-card" data-faction="${esc(record.faction)}" data-component-id="${esc(record.id)}" data-reference-side="${esc(sideName)}" aria-label="${esc(record.name)} — ${esc(face.title)}">
    <div class="reference-card-interior">
      <span class="reference-watermark" aria-hidden="true"></span>
      <header class="reference-card-header">
        <h3 class="reference-face-title"${titleStyleAttribute}>${esc(face.title)}</h3>
        <div class="reference-type-line"><span class="reference-faction-emblem" aria-hidden="true"></span><span>${esc(componentName)}</span></div>
      </header>
      <div class="reference-body">${sections}</div>
      <footer class="card-footer"><span>${esc(factionLabel)}</span><span>Reference</span><span>${esc(version)}</span></footer>
    </div>
  </article>`;
}

function fitReferenceTitle(card, minimumTitlePt = REFERENCE_TITLE_MIN_PT) {
  const title = card.querySelector('.reference-face-title');
  if (!title) return { fontSize: 0, overflow: false, wrapped: false };

  card.dataset.referenceTitleWrapped = 'false';
  title.style.fontSize = '';
  const minimumPx = Number(minimumTitlePt) * CSS_PX_PER_PT;
  const naturalFontSize = Number.parseFloat(getComputedStyle(title).fontSize);
  let fontSize = naturalFontSize;
  if (!Number.isFinite(fontSize)) return { fontSize: 0, overflow: false, wrapped: false };

  let attempts = 0;
  const horizontallyOverflows = () => title.scrollWidth > title.clientWidth + 0.5;
  while (horizontallyOverflows() && fontSize > minimumPx && attempts < 48) {
    fontSize = Math.max(minimumPx, fontSize - 0.25);
    title.style.fontSize = `${fontSize}px`;
    attempts += 1;
  }

  let wrapped = false;
  if (horizontallyOverflows()) {
    title.style.fontSize = '';
    card.dataset.referenceTitleWrapped = 'true';
    wrapped = true;
    fontSize = Number.parseFloat(getComputedStyle(title).fontSize);

    const wrappedOverflows = () => (
      title.scrollWidth > title.clientWidth + 0.5
      || title.scrollHeight > title.clientHeight + 0.5
    );
    attempts = 0;
    while (wrappedOverflows() && fontSize > minimumPx && attempts < 48) {
      fontSize = Math.max(minimumPx, fontSize - 0.25);
      title.style.fontSize = `${fontSize}px`;
      attempts += 1;
    }
  }

  const overflow = wrapped
    ? title.scrollWidth > title.clientWidth + 0.5 || title.scrollHeight > title.clientHeight + 0.5
    : horizontallyOverflows();
  card.dataset.referenceTitleSize = Number.isFinite(fontSize) ? fontSize.toFixed(2) : naturalFontSize.toFixed(2);
  card.dataset.referenceTitleWarning = overflow ? 'true' : 'false';
  return { fontSize, overflow, wrapped };
}

export function fitReferenceCard(card, { minimumScale = 0.82, maximumScale = 1.40, minimumTitlePt = REFERENCE_TITLE_MIN_PT } = {}) {
  if (!card) throw new Error('Reference card fitter received no card.');
  const body = card.querySelector('.reference-body');
  if (!body) throw new Error(`Reference card ${card.dataset.componentId || 'unknown'} has no body.`);

  const titleFit = fitReferenceTitle(card, minimumTitlePt);
  let scale = maximumScale;
  let sectionGap = 0.038;
  let attempts = 0;
  const hasClippedPanels = () => Array.from(card.querySelectorAll('.reference-panel')).some(panel => {
    const overflowY = getComputedStyle(panel).overflowY;
    const canClip = overflowY === 'hidden' || overflowY === 'clip';
    return canClip && panel.scrollHeight > panel.clientHeight + 0.75;
  });
  const overflows = () => body.scrollHeight > body.clientHeight + 0.75 || hasClippedPanels();

  card.style.setProperty('--reference-rules-scale', scale.toFixed(3));
  card.style.setProperty('--reference-section-gap', `${sectionGap.toFixed(3)}in`);

  while (overflows() && scale > minimumScale && attempts < 48) {
    scale = Math.max(minimumScale, scale - 0.015);
    sectionGap = Math.max(0.010, sectionGap - 0.0011);
    card.style.setProperty('--reference-rules-scale', scale.toFixed(3));
    card.style.setProperty('--reference-section-gap', `${sectionGap.toFixed(3)}in`);
    attempts += 1;
  }

  const overflow = overflows() || titleFit.overflow;
  card.dataset.referenceScale = scale.toFixed(3);
  card.dataset.fitWarning = overflow ? 'true' : 'false';
  return { scale, overflow, sectionGap, titleFontSize: titleFit.fontSize, titleWrapped: titleFit.wrapped };
}

export function fitAllReferenceCards(root = document) {
  const results = [];
  for (const card of root.querySelectorAll('.reference-card')) {
    results.push({ card, ...fitReferenceCard(card) });
  }
  return results;
}