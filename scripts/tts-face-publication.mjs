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

// The canonical renderer can already show a published footer while retaining
// candidate source provenance. TTS stamping remains fail-closed and idempotent:
// the release/source parity check runs before this helper, and neither caller
// nor renderer may silently stamp an unrelated edition.
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
    if (!footer || ![authorityVersion, displayVersion].includes(footer.textContent?.trim())) {
      throw new Error('Rendered TTS face does not match the verified frozen authority or published label.');
    }
    if (datasetVersionKey && ![authorityVersion, displayVersion].includes(element.dataset[datasetVersionKey])) {
      throw new Error('Rendered TTS face copy version does not match the verified authority or published label.');
    }
    footer.textContent = displayVersion;
    if (datasetVersionKey) element.dataset[datasetVersionKey] = displayVersion;
  }, { authorityVersion: release.authorityVersion, displayVersion, footerSelector, datasetVersionKey });
}
