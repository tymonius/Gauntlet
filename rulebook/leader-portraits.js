const content = document.querySelector('[data-rulebook-content]');

const FACTION_LEADERS = [
  ['Military', [
    ['General', '../images/sketches/general.png'],
    ['Commandant', '../images/sketches/commandant.png'],
  ]],
  ['Diplomats', [
    ['Ambassador', '../images/sketches/ambassador.png'],
    ['Senator', '../images/sketches/senator.png'],
  ]],
  ['Financiers', [
    ['Banker', '../images/sketches/banker.png'],
    ['Executive', '../images/sketches/executive.png'],
  ]],
  ['Intelligence', [
    ['Ranger', '../images/sketches/ranger.png'],
    ['Spymaster', '../images/sketches/spymaster.png'],
  ]],
  ['Mystics', [
    ['Alchemist', '../images/sketches/alchemist.png'],
    ['Spirit Walker', '../images/sketches/spirit%20walker.png'],
  ]],
  ['Inquisition', [
    ['Grand Inquisitor', '../images/sketches/grand%20inquisitor.png'],
    ['Witch Hunter', '../images/sketches/witch%20hunter.png'],
  ]],
];

function findFactionHeading(faction) {
  return [...content.querySelectorAll('h1')].find((heading) => {
    if (heading.dataset.chapterTitle === faction) return true;
    const label = heading.textContent.replace(/#\s*$/, '').trim();
    return label === faction || new RegExp(`^\\d+\\.\\s*${faction}$`, 'i').test(label);
  });
}

function buildGallery(faction, leaders) {
  const gallery = document.createElement('section');
  gallery.className = 'leader-portrait-gallery';
  gallery.dataset.leaderPortraitGallery = faction;
  gallery.setAttribute('aria-label', `${faction} Leaders`);

  for (const [name, src] of leaders) {
    const figure = document.createElement('figure');
    figure.className = 'leader-portrait-figure';

    const image = document.createElement('img');
    image.className = 'leader-portrait';
    image.src = src;
    image.alt = `${name} Leader sketch`;
    image.loading = 'lazy';
    image.decoding = 'async';

    const caption = document.createElement('figcaption');
    caption.textContent = name;

    figure.append(image, caption);
    gallery.append(figure);
  }

  return gallery;
}

function injectLeaderPortraits() {
  if (!content) return true;

  let completed = 0;
  for (const [faction, leaders] of FACTION_LEADERS) {
    if (content.querySelector(`[data-leader-portrait-gallery="${faction}"]`)) {
      completed += 1;
      continue;
    }

    const heading = findFactionHeading(faction);
    if (!heading) continue;
    heading.insertAdjacentElement('afterend', buildGallery(faction, leaders));
    completed += 1;
  }

  return completed === FACTION_LEADERS.length;
}

if (content) {
  const observer = new MutationObserver(() => {
    if (injectLeaderPortraits()) observer.disconnect();
  });
  observer.observe(content, { childList: true, subtree: true });
  if (injectLeaderPortraits()) observer.disconnect();
}
