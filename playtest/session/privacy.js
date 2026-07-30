(() => {
  const url = new URL(window.location.href);
  const code = String(url.searchParams.get("code") || "").trim();
  const hostKey = String(url.searchParams.get("host") || "").trim();
  if (!hostKey) return;

  if (/^[A-Za-z0-9_-]{24,96}$/.test(code)) {
    const storagePrefix = `gauntlet_playtest_${code.slice(0, 16)}`;
    try {
      sessionStorage.setItem(`${storagePrefix}_host`, hostKey);
    } catch {
      // The app still captures the host key from the original URL when storage is unavailable.
      return;
    }
  }

  url.searchParams.delete("host");
  const search = url.searchParams.toString();
  history.replaceState(null, "", `${url.pathname}${search ? `?${search}` : ""}${url.hash}`);
})();
