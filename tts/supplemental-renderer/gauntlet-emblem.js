const GAUNTLET_WORDMARK_SOURCE = '/images/Gauntlet.svg';
const GAUNTLET_G_VIEWBOX = '0 0 470 493.58';
const SVG_NS = 'http://www.w3.org/2000/svg';

export async function materializeGauntletEmblem(slot) {
  if (!(slot instanceof Element)) throw new Error('Universal Reference emblem slot is missing.');

  const response = await fetch(GAUNTLET_WORDMARK_SOURCE, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Canonical Gauntlet wordmark request failed: ${response.status}.`);
  const source = await response.text();
  const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (parsed.querySelector('parsererror')) throw new Error('Canonical Gauntlet wordmark is not valid SVG.');

  const sourceSvg = parsed.documentElement;
  const paths = [...sourceSvg.querySelectorAll(':scope > path')];
  if (sourceSvg.localName !== 'svg' || paths.length < 2 || sourceSvg.querySelector('image, use')) {
    throw new Error('Canonical Gauntlet wordmark no longer exposes direct vector layers.');
  }

  // The canonical wordmark's first vector layer is the stylized G. Clone that
  // path into a new SVG with its own viewBox; never crop a rasterized/full
  // wordmark image to manufacture the emblem.
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', GAUNTLET_G_VIEWBOX);
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svg.setAttribute('aria-hidden', 'true');
  svg.classList.add('reference-gauntlet-g');

  const path = document.importNode(paths[0], true);
  path.setAttribute('fill', 'currentColor');
  svg.append(path);

  slot.replaceChildren(svg);
  slot.classList.add('reference-faction-emblem--gauntlet-g');

  const rect = svg.getBoundingClientRect();
  if (!(rect.width > 0 && rect.height > 0)) throw new Error('Gauntlet G vector has no rendered geometry.');
}
