import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, 'releases/v0.6/Gauntlet_v0.6.0_Canonical_Data.json'), 'utf8'));
const OUT = path.join(ROOT, 'build/v0.6.0/cards');
fs.mkdirSync(OUT, { recursive: true });

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function textHtml(value) {
  return escapeHtml(value).replace(/\n• /g, '<br>• ').replace(/\n/g, '<br>');
}

const css = `
@page { size: Letter; margin: 0.25in 0.5in; }
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; background: white; font-family: "Noto Serif", serif; }
.sheet { width: 7.5in; height: 10.5in; display: grid; grid-template-columns: repeat(3, 2.5in); grid-template-rows: repeat(3, 3.5in); break-after: page; page-break-after: always; }
.sheet:last-child { break-after: auto; page-break-after: auto; }
.card { position: relative; width: 2.5in; height: 3.5in; overflow: hidden; border: 1.2pt solid var(--border, #6f5a3e); background: linear-gradient(180deg, #fffdf7 0%, #f2ece0 100%); padding: 0.11in; display: flex; flex-direction: column; }
.card::after { content: ""; position: absolute; inset: 0.045in; border: 0.45pt solid color-mix(in srgb, var(--border, #6f5a3e) 65%, white); pointer-events: none; }
.card-header { display: flex; align-items: flex-start; gap: 0.07in; border-bottom: 0.7pt solid var(--border, #6f5a3e); padding-bottom: 0.045in; margin-bottom: 0.045in; z-index: 1; }
.card-title { flex: 1; font-family: "Noto Sans", sans-serif; font-weight: 800; font-size: 10.7pt; line-height: 1.02; color: #241f19; }
.card-cost { width: 0.31in; height: 0.31in; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--border, #6f5a3e); color: white; font-family: "Noto Sans", sans-serif; font-weight: 800; font-size: 10pt; flex: none; }
.card-meta { font-family: "Noto Sans", sans-serif; font-size: 5.6pt; text-transform: uppercase; letter-spacing: 0.045em; color: #665f55; margin-bottom: 0.045in; z-index: 1; }
.fit { font-size: var(--body-size, 7pt); line-height: 1.18; overflow: hidden; z-index: 1; }
.effect { margin-bottom: 0.055in; }
.effect-label { font-family: "Noto Sans", sans-serif; font-size: var(--label-size, 6.5pt); font-weight: 800; text-transform: uppercase; letter-spacing: 0.025em; color: #332b23; }
.unique { margin-top: auto; padding-top: 0.035in; border-top: 0.55pt solid #a69a88; font-family: "Noto Sans", sans-serif; font-size: 5.5pt; font-weight: 700; color: #4f463c; z-index: 1; }
.territory { --border: #5f674b; background: linear-gradient(180deg, #fbf7e8 0%, #e8e4ce 100%); justify-content: flex-start; }
.territory.arena { --border: #74402e; background: linear-gradient(180deg, #f9efe7 0%, #ead6c7 100%); }
.territory .card-title { font-size: 12pt; text-align: center; }
.territory .card-meta { text-align: center; margin-top: 0.02in; }
.territory .fit { margin-top: 0.16in; font-size: var(--body-size, 8.2pt); line-height: 1.24; text-align: left; }
.placeholder { border: 0.5pt dashed #bbb; background: white; }
@media print { html, body { width: 8.5in; } }
`;

const fitScript = `
function fitCards() {
  const results = [];
  document.querySelectorAll('.card:not(.placeholder)').forEach(card => {
    let body = card.classList.contains('territory') ? 8.2 : 7.0;
    let label = 6.5;
    const min = card.classList.contains('territory') ? 5.9 : 4.8;
    card.style.setProperty('--body-size', body + 'pt');
    card.style.setProperty('--label-size', label + 'pt');
    while (card.scrollHeight > card.clientHeight && body > min) {
      body = Math.max(min, body - 0.1);
      label = Math.max(4.5, label - 0.075);
      card.style.setProperty('--body-size', body.toFixed(2) + 'pt');
      card.style.setProperty('--label-size', label.toFixed(2) + 'pt');
    }
    results.push({ name: card.dataset.name, fits: card.scrollHeight <= card.clientHeight, overflow: card.scrollHeight - card.clientHeight, body });
  });
  window.__cardFitResults = results;
  window.__cardsReady = true;
}
window.addEventListener('load', async () => { if (document.fonts?.ready) await document.fonts.ready; fitCards(); });
`;

function documentHtml(title, cards) {
  const pages = [];
  for (let index = 0; index < cards.length; index += 9) {
    const page = cards.slice(index, index + 9);
    while (page.length < 9) page.push('<article class="card placeholder"></article>');
    pages.push(`<section class="sheet">${page.join('')}</section>`);
  }
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${css}</style></head><body>${pages.join('')}<script>${fitScript}</script></body></html>`;
}

const neutralCards = DATA.cards.filter(card => card.allegiance === 'Neutral').map(card => {
  const meta = ['Neutral', card.complexity, card.trait, card.card_form].filter(Boolean).join(' • ');
  const effects = card.effects.map(effect => `<div class="effect"><span class="effect-label">${escapeHtml(effect.label)}:</span> ${textHtml(effect.text)}</div>`).join('');
  return `<article class="card" data-name="${escapeHtml(card.name)}" style="--border:#826b4d"><div class="card-header"><div class="card-title">${escapeHtml(card.name)}</div><div class="card-cost">${card.cost}</div></div><div class="card-meta">${escapeHtml(meta)}</div><div class="fit">${effects}</div>${card.unique_rule ? `<div class="unique">${escapeHtml(card.unique_rule)}</div>` : ''}</article>`;
});

const territoryCards = DATA.territories.map(territory => `<article class="card territory ${territory.arena ? 'arena' : ''}" data-name="${escapeHtml(territory.name)}"><div class="card-header"><div class="card-title">${escapeHtml(territory.name)}</div></div><div class="card-meta">${escapeHtml(territory.arena ? 'Arena • ' : '')}${escapeHtml(territory.complexity ?? '')}</div><div class="fit">${textHtml(territory.text)}</div></article>`);

fs.writeFileSync(path.join(OUT, 'neutral.html'), documentHtml('Gauntlet v0.6.0 Neutral Cards', neutralCards));
fs.writeFileSync(path.join(OUT, 'territories.html'), documentHtml('Gauntlet v0.6.0 Territories', territoryCards));
console.log(`Built ${neutralCards.length} Neutral cards and ${territoryCards.length} Territories.`);
