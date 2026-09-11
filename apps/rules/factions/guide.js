import { renderMarkdown } from '/rulebook/markdown.js';
import { loadCurrentGame } from '/game-data/current-game.mjs';

const page = document.body;
const sourceUrl = page.dataset.guideSource;
const content = document.querySelector('[data-guide-content]');
const toc = document.querySelector('[data-guide-toc]');
const status = document.querySelector('[data-guide-status]');
const tocToggle = document.querySelector('[data-toc-toggle]');
const sidebar = document.querySelector('[data-guide-sidebar]');
const versionBadges = [...document.querySelectorAll('[data-current-version]')];

function buildToc(headings) {
  if (!toc) return;
  const fragment = document.createDocumentFragment();
  headings
    .filter(({ level }) => level === 2)
    .forEach(({ id, label }) => {
      const link = document.createElement('a');
      link.href = `#${id}`;
      link.textContent = label;
      fragment.append(link);
    });
  toc.replaceChildren(fragment);
}

function decorateHeadings() {
  content?.querySelectorAll('h2[id], h3[id]').forEach((heading) => {
    const label = heading.textContent.trim();
    const anchor = document.createElement('a');
    anchor.className = 'heading-anchor';
    anchor.href = `#${heading.id}`;
    anchor.setAttribute('aria-label', `Link to ${label}`);
    anchor.textContent = '#';
    heading.append(anchor);
  });
}

function scrollToHash() {
  const raw = window.location.hash.replace(/^#/, '');
  if (!raw) return;
  let id = raw;
  try { id = decodeURIComponent(raw); } catch { /* keep raw fragment */ }
  requestAnimationFrame(() => document.getElementById(id)?.scrollIntoView({ block: 'start' }));
}

async function renderGuide() {
  if (!sourceUrl || !content) return;
  try {
    const [sourceResponse, currentGame] = await Promise.all([
      fetch(sourceUrl, { cache: 'no-store' }),
      loadCurrentGame(),
    ]);
    if (!sourceResponse.ok) throw new Error(`Faction Guide request failed: HTTP ${sourceResponse.status}.`);

    const source = await sourceResponse.text();
    const rendered = renderMarkdown(source);
    content.innerHTML = rendered.html;
    content.setAttribute('aria-busy', 'false');
    buildToc(rendered.headings);
    decorateHeadings();

    const version = currentGame.displayVersion || currentGame.version || 'current development';
    versionBadges.forEach((badge) => { badge.textContent = version; });
    if (status) status.textContent = `Draft guide · authority ${version} · source-backed from the rules publication tree`;
    scrollToHash();
  } catch (error) {
    console.error(error);
    content.setAttribute('aria-busy', 'false');
    content.innerHTML = `<div class="guide-error" role="alert"><strong>Could not load this Faction Guide.</strong><p>${String(error.message || error)}</p></div>`;
    if (status) status.textContent = 'Draft guide source unavailable.';
  }
}

tocToggle?.addEventListener('click', () => {
  const expanded = tocToggle.getAttribute('aria-expanded') === 'true';
  tocToggle.setAttribute('aria-expanded', String(!expanded));
  sidebar?.classList.toggle('is-open', !expanded);
});

toc?.addEventListener('click', () => {
  if (window.matchMedia('(max-width: 900px)').matches) {
    tocToggle?.setAttribute('aria-expanded', 'false');
    sidebar?.classList.remove('is-open');
  }
});

window.addEventListener('hashchange', scrollToHash);
renderGuide();
