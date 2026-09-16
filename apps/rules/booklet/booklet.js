import { renderMarkdown } from './markdown.js';

const PUBLICATIONS = Object.freeze({
  'player-guide': Object.freeze({
    title: "Player's Guide",
    description: "Learn the shared game, set up the table, understand the turn, and get from a starter Deck to the first decisive contests.",
    accent: '#9c2026',
    hero: 1,
  }),
  military: Object.freeze({
    title: 'Military Guide',
    description: 'The operating guide for Command, Orders, Military Leaders, and the Military path through the Gauntlet.',
    accent: '#8f1f25',
    symbol: '/images/faction-symbols/military.svg',
    hero: 2,
  }),
  diplomats: Object.freeze({
    title: 'Diplomats Guide',
    description: 'The operating guide for Influence, Proposals, Diplomat Leaders, and the diplomatic path through the Gauntlet.',
    accent: '#244b8f',
    symbol: '/images/faction-symbols/diplomats.svg',
    hero: 3,
  }),
  financiers: Object.freeze({
    title: 'Financiers Guide',
    description: 'The operating guide for Capital, Deeds, Financier Leaders, and economic control of the Gauntlet.',
    accent: '#276744',
    symbol: '/images/faction-symbols/financiers.svg',
    hero: 4,
  }),
  intelligence: Object.freeze({
    title: 'Intelligence Guide',
    description: 'The operating guide for Intel, Operations, Intelligence Leaders, and covert progress through the Gauntlet.',
    accent: '#34373b',
    symbol: '/images/faction-symbols/intelligence.svg',
    hero: 1,
  }),
  mystics: Object.freeze({
    title: 'Mystics Guide',
    description: 'The operating guide for Rites, Rituals, Mystic Leaders, and Arcane play in the Gauntlet.',
    accent: '#603d78',
    symbol: '/images/faction-symbols/mystics.svg',
    hero: 2,
  }),
  inquisition: Object.freeze({
    title: 'Inquisition Guide',
    description: 'The operating guide for Conviction, Purges, Inquisition Leaders, and doctrinal control of the Gauntlet.',
    accent: '#9a6e21',
    symbol: '/images/faction-symbols/inquisition.svg',
    hero: 3,
  }),
  'complete-rules': Object.freeze({
    title: 'Complete Rules',
    description: 'The complete technical rules reference for exact procedures, timing, interactions, definitions, and edge cases.',
    accent: '#9c2026',
    hero: 4,
  }),
});

function selectedPublication() {
  const requested = new URL(window.location.href).searchParams.get('doc') || 'player-guide';
  return [requested, PUBLICATIONS[requested] || PUBLICATIONS['player-guide']];
}

function numberedHeading(label) {
  const match = label.trim().match(/^(\d+)\.\s+(.+)$/);
  return match ? { number: match[1], title: match[2] } : null;
}

function decorateContent(content, documentId) {
  const openingTitle = content.querySelector(':scope > h1:first-child');
  openingTitle?.remove();

  content.querySelectorAll('h2').forEach((heading) => {
    const numbered = numberedHeading(heading.textContent || '');
    if (numbered) {
      heading.textContent = numbered.title;
      heading.style.setProperty('--section-number', `'${numbered.number.padStart(2, '0')}'`);
    } else {
      heading.classList.add('booklet-section-opener');
      heading.style.setProperty('--section-number', "''");
    }
    heading.classList.add('booklet-section-heading');
  });

  content.querySelectorAll('h3').forEach(heading => heading.classList.add('booklet-subheading'));
  content.querySelectorAll('img[loading="lazy"]').forEach(image => { image.loading = 'eager'; });

  if (!['player-guide', 'complete-rules'].includes(documentId)) {
    const portraits = [...content.querySelectorAll('img')].slice(0, 2);
    if (portraits.length > 0) {
      const gallery = document.createElement('div');
      gallery.className = 'candidate-featured-leaders booklet-featured-leaders';
      const first = portraits[0];
      first.before(gallery);
      portraits.forEach(image => {
        image.classList.add('leader-portrait');
        const figure = image.closest('figure');
        gallery.append(figure || image);
      });
    }
  }
}

function buildContents(headings) {
  const list = document.querySelector('[data-booklet-contents]');
  const sections = headings.filter(({ level }) => level === 2);
  list.replaceChildren(...sections.map(({ id, label }) => {
    const numbered = numberedHeading(label);
    const item = document.createElement('li');
    const number = document.createElement('span');
    number.className = 'contents-number';
    number.textContent = numbered ? numbered.number.padStart(2, '0') : '—';
    const title = document.createElement('span');
    title.className = 'contents-title';
    title.textContent = numbered?.title || label;
    item.dataset.target = id;
    item.append(number, title);
    return item;
  }));

  if (sections.length === 0) document.querySelector('[data-booklet-front-matter]').hidden = true;
}

async function main() {
  const [documentId, publication] = selectedPublication();
  const sourcePath = documentId === 'complete-rules'
    ? 'complete-rules'
    : documentId === 'player-guide'
      ? 'player-guide'
      : `factions/${documentId}`;
  const response = await fetch(`../sources/${encodeURIComponent(sourcePath)}.md`, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Unable to load ${publication.title}: HTTP ${response.status}`);
  const source = await response.text();
  const rendered = renderMarkdown(source);
  const content = document.querySelector('[data-booklet-content]');
  content.innerHTML = rendered.html;
  decorateContent(content, documentId);
  buildContents(rendered.headings);

  document.documentElement.style.setProperty('--booklet-accent', publication.accent);
  document.body.dataset.bookletDocument = documentId;
  document.body.dataset.rulesetMode = 'candidate';
  document.body.dataset.candidateDocument = documentId;
  document.querySelector('[data-booklet-title]').textContent = publication.title;
  document.querySelector('[data-booklet-running-title]').textContent = publication.title;
  document.querySelector('[data-booklet-back-title]').textContent = `Gauntlet v0.7.2 · ${publication.title}`;
  document.querySelector('[data-booklet-description]').textContent = publication.description;
  document.querySelector('[data-booklet-cover-art]').src = `/images/woodcuts/hero compositions/hero ${publication.hero}.png`;
  document.title = `${publication.title} — Gauntlet v0.7.2`;

  const symbol = document.querySelector('[data-booklet-faction-symbol]');
  if (publication.symbol) {
    symbol.style.setProperty('--booklet-symbol', `url("${publication.symbol}")`);
    symbol.hidden = false;
  } else {
    symbol.hidden = true;
  }

  await Promise.race([
    document.fonts?.ready || Promise.resolve(),
    new Promise(resolve => setTimeout(resolve, 10000)),
  ]);
  document.body.dataset.bookletReady = 'true';
}

main().catch(error => {
  document.body.dataset.bookletReady = 'error';
  document.body.dataset.bookletError = error.message;
  throw error;
});
