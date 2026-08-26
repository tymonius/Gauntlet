const GAUNTLET_G_SOURCE = '/assets/wordmark/gauntlet-wordmark-layer-1.svg';
const GAUNTLET_G_VIEWBOX = '0 0 470 493.58';

export async function materializeGauntletEmblem(slot) {
  if (!(slot instanceof Element)) throw new Error('Universal Reference emblem slot is missing.');

  const response = await fetch(GAUNTLET_G_SOURCE, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Gauntlet G vector request failed: ${response.status}.`);
  const source = await response.text();
  const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
  if (parsed.querySelector('parsererror')) throw new Error('Canonical Gauntlet G layer is not valid SVG.');

  const sourceSvg = parsed.documentElement;
  const paths = sourceSvg.querySelectorAll('path');
  if (sourceSvg.localName !== 'svg' || paths.length !== 1 || sourceSvg.querySelector('image, use')) {
    throw new Error('Canonical Gauntlet G layer must contain exactly one direct vector path.');
  }

  // Layer 1 is the canonical isolated G vector. Give that vector its own
  // composition box instead of clipping pixels from the complete wordmark.
  sourceSvg.setAttribute('viewBox', GAUNTLET_G_VIEWBOX);
  sourceSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  sourceSvg.removeAttribute('width');
  sourceSvg.removeAttribute('height');
  sourceSvg.classList.add('reference-gauntlet-g');
  paths[0].setAttribute('fill', 'currentColor');

  const svg = document.importNode(sourceSvg, true);
  slot.replaceChildren(svg);
  slot.classList.add('reference-faction-emblem--gauntlet-g');

  const rect = svg.getBoundingClientRect();
  if (!(rect.width > 0 && rect.height > 0)) throw new Error('Gauntlet G vector has no rendered geometry.');
}
