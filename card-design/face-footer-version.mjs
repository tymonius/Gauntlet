import { PUBLISHED_VERSION } from '../packages/game-data/ruleset.mjs';

// The immutable v0.7.2 current-game source keeps its -candidate identity after
// public cutover. This alias affects only physical-face presentation, never
// FaceSpec provenance, gameplay authority, or developer ruleset selection.
export function faceFooterVersion(provenance) {
  const authorityVersion = String(provenance?.version || '').trim();
  const sourceLabel = String(provenance?.displayVersion || authorityVersion).trim();
  return authorityVersion === `${PUBLISHED_VERSION}-candidate` && sourceLabel === authorityVersion
    ? PUBLISHED_VERSION
    : (sourceLabel || 'Current');
}

export function stampCanonicalFaceFooter(element, provenance) {
  const sourceLabel = String(provenance?.displayVersion || provenance?.version || '').trim();
  const releaseLabel = faceFooterVersion(provenance);
  if (!sourceLabel || sourceLabel === releaseLabel) return;

  // Every production face is stamped before layout validation and capture.
  const footers = element.querySelectorAll('.card-footer > span:last-child, .territory-footer > span:last-child');
  for (const footer of footers) {
    if (footer.textContent?.trim() !== sourceLabel) {
      throw new Error('Physical face footer disagrees with its gameplay source version.');
    }
    footer.textContent = releaseLabel;
  }

  // Leader copy version is presentation metadata; copy source remains unchanged.
  if (element.dataset.leaderCopyVersion === sourceLabel) {
    element.dataset.leaderCopyVersion = releaseLabel;
  }
}
