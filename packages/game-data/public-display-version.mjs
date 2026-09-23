import { PUBLISHED_VERSION } from './ruleset.mjs';

// The gameplay authority's version remains its immutable source identity.
// The currently published version is a distinct presentation value; resolving
// it once here makes every runtime consumer agree without changing frozen data.
export function publicDisplayVersion(authority, publishedVersion = PUBLISHED_VERSION) {
  const sourceVersion = String(authority?.version || '').trim();
  const sourceLabel = String(authority?.displayVersion || sourceVersion).trim();
  const published = String(publishedVersion || '').trim();

  return published && sourceVersion === `${published}-candidate` && sourceLabel === sourceVersion
    ? published
    : (sourceLabel || sourceVersion || 'Current');
}
