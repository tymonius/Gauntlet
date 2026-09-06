const DEFAULT_LIFECYCLE_URL = "/config/release-lifecycle.json";

export function currentPlaytestVersion(lifecycle) {
  const version = String(lifecycle?.current_release || "");
  const release = lifecycle?.releases?.[version];
  if (!/^v\d+\.\d+\.\d+$/.test(version) || release?.status !== "current" || release?.public_cutover !== true) {
    throw new Error("Release lifecycle does not identify an approved current playtest version.");
  }
  return version;
}

export function matchCurrentPlaytestRelease(lifecycle, health) {
  const version = currentPlaytestVersion(lifecycle);
  if (!health?.ok || health.version !== version) {
    throw new Error(`Session service reports ${health?.version || "an unknown version"}; the current playtest is ${version}.`);
  }
  return Object.freeze({ version, health });
}

export async function resolveCurrentPlaytestRelease(apiOrigin, options = {}) {
  const fetchImpl = options.fetchImpl || globalThis.fetch.bind(globalThis);
  const lifecycleUrl = options.lifecycleUrl || DEFAULT_LIFECYCLE_URL;
  const [lifecycleResponse, healthResponse] = await Promise.all([
    fetchImpl(lifecycleUrl, { cache: "no-store" }),
    fetchImpl(`${String(apiOrigin).replace(/\/$/, "")}/health`, { cache: "no-store" }),
  ]);
  if (!lifecycleResponse.ok) throw new Error(`Current playtest configuration could not be loaded (${lifecycleResponse.status}).`);
  if (!healthResponse.ok) throw new Error(`Session service health check failed (${healthResponse.status}).`);
  return matchCurrentPlaytestRelease(await lifecycleResponse.json(), await healthResponse.json());
}
