import { resolvePublishedAssetTarget } from './stage-tts-release-assets.mjs';

// Frozen current-game retains its candidate source identity after public cutover.
// Before rendering a stable-labelled TTS face, verify the mechanics and starter
// Decks still match the actual published release snapshot.
export async function validateTtsFacePublicationSource(release) {
  if (!release.authorityVersion) {
    throw new Error('TTS face publication requires explicit gameplay authority provenance.');
  }
  if (release.version === release.authorityVersion) return;
  if (!release.publicationTargetActive) {
    throw new Error('TTS face publication requires an aligned release target.');
  }
  await resolvePublishedAssetTarget(release);
}

// The canonical browser renderer is intentionally sourced from current-game.
// Relabel only the already-verified TTS screenshot, not the underlying authority
// or the canonical browser/Deckbuilder render surface.
export async function stampTtsFacePublicationVersion(
  page,
  release,
  selector,
  footerSelector,
  datasetVersionKey = null,
) {
  const displayVersion = release.displayVersion || release.version;
  if (displayVersion === release.authorityVersion) return;
  if (!release.publicationTargetActive) {
    throw new Error('Cannot relabel TTS faces without an aligned release target.');
  }

  await page.locator(selector).evaluate((element, {
    authorityVersion, displayVersion, footerSelector, datasetVersionKey,
  }) => {
    const footer = element.querySelector(footerSelector);
    if (!footer || footer.textContent?.trim() !== authorityVersion) {
      throw new Error('Rendered TTS face does not match the verified frozen authority version.');
    }
    if (datasetVersionKey && element.dataset[datasetVersionKey] !== authorityVersion) {
      throw new Error('Rendered TTS face provenance does not match the verified frozen authority.');
    }
    footer.textContent = displayVersion;
    if (datasetVersionKey) element.dataset[datasetVersionKey] = displayVersion;
  }, { authorityVersion: release.authorityVersion, displayVersion, footerSelector, datasetVersionKey });
}
