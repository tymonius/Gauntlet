import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');
const write = (relative, content) => fs.writeFileSync(path.join(root, relative), content, 'utf8');

const factions = [
  ['military', 'Military', '⚔'],
  ['diplomats', 'Diplomats', '§'],
  ['financiers', 'Financiers', '◆'],
  ['intelligence', 'Intelligence', '◉'],
  ['mystics', 'Mystics', '✦'],
  ['inquisition', 'Inquisition', '✠'],
];

function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) {
    assert(text.includes(to), `Missing both legacy and replacement forms for ${label}.`);
    return text;
  }
  const updated = text.replace(from, to);
  assert(!updated.includes(from), `Replacement for ${label} did not apply cleanly.`);
  return updated;
}

function ensureBlock(text, marker, block) {
  return text.includes(marker) ? text : `${text.replace(/\s+$/, '')}\n\n${block.trim()}\n`;
}

function factionSymbol(slug) {
  return `/images/faction-symbols/${slug}.svg`;
}

{
  const relative = 'index.html';
  let text = read(relative);
  for (const [slug, name, unicode] of factions) {
    text = replaceOnce(
      text,
      `<span class="faction-symbol" aria-hidden="true">${unicode}</span>`,
      `<span class="faction-symbol faction-symbol-asset" aria-hidden="true" style="--faction-symbol:url('${factionSymbol(slug)}')"></span>`,
      `homepage ${name} faction symbol`,
    );
  }
  write(relative, text);
}

{
  const relative = 'start/index.html';
  let text = read(relative);
  for (const [slug, name, unicode] of factions) {
    text = replaceOnce(
      text,
      `<span class="choice-mark" aria-hidden="true">${unicode}</span><strong>${name}</strong>`,
      `<span class="choice-mark faction-symbol-asset" aria-hidden="true" style="--faction-symbol:url('${factionSymbol(slug)}')"></span><strong>${name}</strong>`,
      `Start Playing ${name} faction symbol`,
    );
  }
  write(relative, text);

  const stylesPath = 'start/styles.css';
  let styles = read(stylesPath);
  if (!styles.startsWith('@import url("../design-tokens.css");')) {
    styles = `@import url("../design-tokens.css");\n${styles}`;
  }
  const legacyDisplay = 'font-family:var(--font-display,Georgia,serif);';
  const historicalDisplay = 'font-family:var(--font-display-historical);font-weight:400;';
  if (styles.includes(legacyDisplay)) styles = styles.replaceAll(legacyDisplay, historicalDisplay);
  else assert(styles.includes(historicalDisplay), 'Start Playing lacks both legacy and corrected display typography declarations.');
  styles = ensureBlock(styles, '/* Faction-symbol assets: public Start chooser. */', `
/* Faction-symbol assets: public Start chooser. */
.choice-mark.faction-symbol-asset{
  background:currentColor;
  -webkit-mask:var(--faction-symbol) center/68% 68% no-repeat;
  mask:var(--faction-symbol) center/68% 68% no-repeat;
}
`);
  write(stylesPath, styles);
}

{
  const relative = 'factions/index.html';
  let text = read(relative);
  for (const [slug, name, unicode] of factions) {
    text = replaceOnce(
      text,
      `<span class="hub-symbol" aria-hidden="true">${unicode}</span>`,
      `<span class="hub-symbol faction-symbol-asset" aria-hidden="true" style="--faction-symbol:url('${factionSymbol(slug)}')"></span>`,
      `Factions hub ${name} faction symbol`,
    );
  }
  write(relative, text);
}

for (const [slug, name, unicode] of factions) {
  const relative = `factions/${slug}/index.html`;
  let text = read(relative);
  text = replaceOnce(
    text,
    `<p class="eyebrow">${unicode} ${name} · faction guide</p>`,
    `<p class="eyebrow faction-eyebrow"><span class="faction-eyebrow-symbol faction-symbol-asset" aria-hidden="true" style="--faction-symbol:url('${factionSymbol(slug)}')"></span>${name} · faction guide</p>`,
    `${name} faction-guide hero symbol`,
  );
  write(relative, text);
}

{
  const relative = 'factions/homepage.css';
  let text = read(relative);
  text = ensureBlock(text, '/* Asset-backed public faction symbols. */', `
/* Asset-backed public faction symbols. */
.faction-symbol.faction-symbol-asset{
  background:currentColor;
  -webkit-mask:var(--faction-symbol) center/72% 72% no-repeat;
  mask:var(--faction-symbol) center/72% 72% no-repeat;
}
`);
  write(relative, text);
}

{
  const relative = 'factions/factions.css';
  let text = read(relative);
  text = ensureBlock(text, '/* Asset-backed public faction symbols. */', `
/* Asset-backed public faction symbols. */
.hub-symbol.faction-symbol-asset,
.faction-eyebrow-symbol.faction-symbol-asset{
  display:inline-block;
  flex:0 0 auto;
  background:currentColor;
  -webkit-mask:var(--faction-symbol) center/contain no-repeat;
  mask:var(--faction-symbol) center/contain no-repeat;
}
.hub-symbol.faction-symbol-asset{width:3.2rem;height:3.2rem;}
.faction-eyebrow{display:flex;align-items:center;gap:.55rem;}
.faction-eyebrow-symbol.faction-symbol-asset{width:1.35rem;height:1.35rem;}
`);
  write(relative, text);
}

console.log('Applied v0.6.3 public UI cleanup: asset-backed faction symbols and Start Playing display typography.');
