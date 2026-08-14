import { renderMarkdown } from '../rulebook/markdown.js';

const AUTHORITY_SET_ID = '64c8d65c2e63df1ed4d74d16178688c8bf7ead1cd6408496b2e423a2d4d7df49';
const RULEBOOK_SOURCE = '/artifacts/reconstruction/clean-v0.6.3/rulebook/Gauntlet_v0.6.3_Rulebook.md';
const RULEBOOK_SHA256 = '7cca20e8de2eee10332c4e3e82ca5e7abdae3a0af61837bf77caa79ccbc9d643';
const STARTERS_SOURCE = '/artifacts/reconstruction/clean-v0.6.3/downstream/starter-decks.json';
const STARTERS_SHA256 = '4c0ebe201584fc709623e37bb31630394294830dbe7b0f75ba43ae61bce33d64';

const FACTIONS = [
  ['military', 'Military', '⚔'], ['diplomats', 'Diplomats', '§'], ['financiers', 'Financiers', '◆'],
  ['intelligence', 'Intelligence', '◉'], ['mystics', 'Mystics', '✦'], ['inquisition', 'Inquisition', '✠'],
];

const state = { decks: [], factionId: '', leaderId: '' };
const learningContent = document.querySelector('[data-learning-content]');
const sourceStatus = document.querySelector('[data-source-status]');
const factionChoices = document.querySelector('[data-faction-choices]');
const leaderFieldset = document.querySelector('[data-leader-fieldset]');
const leaderPrompt = document.querySelector('[data-leader-prompt]');
const leaderChoices = document.querySelector('[data-leader-choices]');
const starterPreview = document.querySelector('[data-starter-preview]');
const cleanDeckbuilder = document.querySelector('[data-clean-deckbuilder]');

function bytesToHex(buffer) { return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join(''); }
async function fetchVerified(url, expectedSha256) {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${url} returned ${response.status}.`);
  const bytes = await response.arrayBuffer();
  const actualHash = bytesToHex(await crypto.subtle.digest('SHA-256', bytes));
  if (actualHash !== expectedSha256) throw new Error(`Source hash mismatch for ${url}: expected ${expectedSha256}, received ${actualHash}.`);
  return new TextDecoder().decode(bytes);
}
function extractTopLevel(source, heading) {
  const marker = `# ${heading}`;
  const start = source.indexOf(marker);
  if (start < 0) throw new Error(`Certified Rulebook is missing heading: ${heading}`);
  const next = source.indexOf('\n# ', start + marker.length);
  return source.slice(start, next < 0 ? source.length : next).trim();
}
function extractPartOneHowItWorks(source) {
  const partStart = source.indexOf('# Part I — Learn to Play');
  const partEnd = source.indexOf('# Part II', partStart + 1);
  if (partStart < 0 || partEnd < 0) throw new Error('Certified Rulebook Part I boundary is missing.');
  const part = source.slice(partStart, partEnd);
  const chapterMatches = [...part.matchAll(/^# (\d+\.\s+[^\n]+)$/gm)];
  const excerpts = [];
  chapterMatches.forEach((match, index) => {
    const title = match[1].trim();
    const bodyStart = match.index + match[0].length;
    const bodyEnd = chapterMatches[index + 1]?.index ?? part.length;
    const body = part.slice(bodyStart, bodyEnd);
    const howMarker = '## How it works';
    const howStart = body.indexOf(howMarker);
    if (howStart < 0) return;
    const afterHeading = howStart + howMarker.length;
    const nextSecondLevel = body.indexOf('\n## ', afterHeading);
    excerpts.push(`# ${title}\n\n${body.slice(afterHeading, nextSecondLevel < 0 ? body.length : nextSecondLevel).trim()}`);
  });
  if (excerpts.length < 8) throw new Error(`Expected at least eight Part I How it works excerpts; found ${excerpts.length}.`);
  return excerpts;
}
function buildLearningSource(source) { return [extractTopLevel(source, 'Welcome to Gauntlet'), extractTopLevel(source, 'Game at a Glance'), extractTopLevel(source, 'How to Win'), ...extractPartOneHowItWorks(source)].join('\n\n---\n\n'); }
function humanizeId(value) { return String(value).split('-').map((part) => part ? part[0].toUpperCase() + part.slice(1) : '').join(' '); }
function escapeHtml(value) { return String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;'); }
function factionLabel(id) { return FACTIONS.find(([factionId]) => factionId === id)?.[1] || humanizeId(id); }
function selectedDeck() { return state.decks.find((item) => item.factionId === state.factionId && item.leaderId === state.leaderId) || null; }

function syncDeckbuilderLink(deck = selectedDeck()) {
  const url = new URL('../deckbuilder/', window.location.href);
  if (deck) {
    url.searchParams.set('faction', deck.factionId);
    url.searchParams.set('leader', deck.leaderId);
    url.searchParams.set('starter', '1');
    url.searchParams.set('source', 'start');
  }
  cleanDeckbuilder.href = url.href;
}

function renderFactionChoices() {
  factionChoices.replaceChildren();
  for (const [id, label, symbol] of FACTIONS) {
    if (!state.decks.some((deck) => deck.factionId === id)) continue;
    const article = document.createElement('article');
    article.className = `faction-choice ${id}`;
    const inputId = `start-faction-${id}`;
    article.innerHTML = `<label for="${inputId}"><input id="${inputId}" type="radio" name="faction" value="${id}" /><span class="choice-mark" aria-hidden="true">${symbol}</span><strong>${label}</strong><small>Two approved starter Leaders</small></label><a href="../faction-pages/${id}/">Open certified faction page →</a>`;
    article.querySelector('input').addEventListener('change', () => { state.factionId = id; state.leaderId = ''; renderLeaderChoices(); renderStarter(); });
    factionChoices.append(article);
  }
}
function renderLeaderChoices() {
  leaderChoices.replaceChildren();
  const decks = state.decks.filter((deck) => deck.factionId === state.factionId);
  leaderFieldset.disabled = decks.length === 0;
  leaderPrompt.textContent = decks.length ? `Choose one of the two ${factionLabel(state.factionId)} starter Leaders.` : 'Choose a faction first.';
  for (const deck of decks) {
    const label = document.createElement('label');
    label.className = 'leader-choice';
    const leader = humanizeId(deck.leaderId);
    label.innerHTML = `<input type="radio" name="leader" value="${escapeHtml(deck.leaderId)}" /><span><strong>${escapeHtml(leader)}</strong><small>${escapeHtml(deck.name)}</small></span>`;
    label.querySelector('input').addEventListener('change', () => { state.leaderId = deck.leaderId; renderStarter(); });
    leaderChoices.append(label);
  }
}
function renderStarter() {
  const deck = selectedDeck();
  syncDeckbuilderLink(deck);
  if (!deck) { starterPreview.innerHTML = '<p>Choose a faction and Leader to inspect the matching starter Deck.</p>'; return; }
  const cards = deck.cards.map((card) => `<li><span>${escapeHtml(card.name)}</span><strong>×${Number(card.quantity)}</strong></li>`).join('');
  const signatures = (deck.signatureCards || []).map((card) => `<li>${escapeHtml(card)}</li>`).join('');
  const territories = (deck.recommendedTerritoryOrder || deck.territories || []).map(escapeHtml).join(' → ');
  starterPreview.innerHTML = `<div class="starter-heading"><div><p class="eyebrow">${escapeHtml(factionLabel(deck.factionId))} · ${escapeHtml(humanizeId(deck.leaderId))}</p><h3>${escapeHtml(deck.name)}</h3></div><div class="starter-meta"><span>${Number(deck.cardCount)} cards</span><span>${Number(deck.deckbuildingValue)}/60 value</span></div></div><p class="starter-summary">${escapeHtml(deck.summary)}</p><div class="starter-detail-grid"><div><h4>Recommended Territory order</h4><p>${territories}</p><small>Strategy recommendation from own end toward opponent end; arrangement occurs after opening selection and may be changed at setup.</small></div><div><h4>Signature cards</h4><ul>${signatures}</ul></div></div><h4>Complete 30-card list</h4><ul class="starter-card-list">${cards}</ul>`;
}
async function initialize() {
  try {
    const [rulebookSource, starterSource] = await Promise.all([fetchVerified(RULEBOOK_SOURCE, RULEBOOK_SHA256), fetchVerified(STARTERS_SOURCE, STARTERS_SHA256)]);
    const starters = JSON.parse(starterSource);
    if (starters.version !== 'clean-v0.6.3-downstream') throw new Error(`Unexpected starter version: ${starters.version}`);
    if (!Array.isArray(starters.decks) || starters.decks.length !== 12) throw new Error('v0.6.3 requires exactly 12 approved starter Decks.');
    if (!starters.decks.every((deck) => deck.cardCount === 30 && deck.deckbuildingValue === 60)) throw new Error('Every clean starter Deck must remain 30 cards / 60 value.');
    state.decks = starters.decks;
    const rendered = renderMarkdown(buildLearningSource(rulebookSource));
    learningContent.innerHTML = rendered.html;
    learningContent.setAttribute('aria-busy', 'false');
    renderFactionChoices(); renderLeaderChoices(); renderStarter();
    sourceStatus.textContent = `Verified v0.6.3 authority ${AUTHORITY_SET_ID.slice(0, 12)}… · certified Rulebook and 12 approved starter Decks loaded.`;
  } catch (error) {
    console.error(error);
    learningContent.setAttribute('aria-busy', 'false');
    learningContent.innerHTML = `<div class="source-error"><strong>Certified Start sources could not be verified.</strong><p>${escapeHtml(error.message)}</p></div>`;
    sourceStatus.textContent = 'Source verification failed. Do not use this reconstruction for play.';
    syncDeckbuilderLink(null);
  }
}
initialize();
