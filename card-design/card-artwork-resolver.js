export const ART_EXTENSIONS = Object.freeze(['png', 'jpg', 'webp', 'jpeg']);

export function slugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function unicodeSlugify(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFC')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-|-$/g, '');
}

export function artworkStems(card, faction) {
  const id = String(card?.id ?? '').toLowerCase();
  const factionPrefix = `${faction}-`;
  const idStem = id.startsWith(factionPrefix) ? id.slice(factionPrefix.length) : slugify(id);
  const stems = [idStem, slugify(card?.name), unicodeSlugify(card?.name)].filter(Boolean);
  return [...new Set(stems)].map(stem => `/images/artwork/cards/${faction}/${stem}`);
}

export function artworkCandidates(card, faction, extensions = ART_EXTENSIONS) {
  return artworkStems(card, faction).flatMap(stem => extensions.map(extension => `${stem}.${extension}`));
}

export async function resolveFirstArtwork(card, faction, exists, extensions = ART_EXTENSIONS) {
  for (const src of artworkCandidates(card, faction, extensions)) {
    if (await exists(src)) return src.replace(/^\//, '');
  }
  return null;
}
