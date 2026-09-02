const STORAGE_KEY = 'gauntlet.art-direction-drafts.v1';

export function readArtDirectionDrafts(storage = window.localStorage) {
  try {
    const parsed = JSON.parse(storage?.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function mergeArtDirectionDrafts(authority = {}, storage = window.localStorage) {
  return {
    ...(authority && typeof authority === 'object' ? authority : {}),
    ...readArtDirectionDrafts(storage),
  };
}

export { STORAGE_KEY };
