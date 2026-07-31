(() => {
  const STORAGE_KEY = "gauntlet_playtest_host_registry_v1";
  const API_ORIGIN = String(
    window.GAUNTLET_PLAYTEST_SESSION_ENDPOINT ||
    "https://gauntlet-playtest-sessions.tymon-scott.workers.dev"
  ).replace(/\/$/, "");
  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
  const MAX_EVENTS = 20;
  const MAX_STANDALONE = 100;

  const registryApi = Object.freeze({
    read: readRegistry,
    registerEvent,
    registerGame,
    registerStandalone,
    forgetEvent,
    forgetStandalone,
    clear: clearRegistry,
    importManifest
  });
  window.GauntletHostRegistry = registryApi;

  document.addEventListener("DOMContentLoaded", initPageContext);

  function initPageContext() {
    const params = new URLSearchParams(window.location.search);
    const code = String(params.get("code") || "").trim();
    const hostKey = String(params.get("host") || "").trim();
    const organizerPreview = params.get("organizerPreview") === "1";
    const path = normalizePath(window.location.pathname);

    if (path.endsWith("/playtest/onboarding/") && TOKEN_PATTERN.test(code) && hostKey) {
      registerCurrentEvent(code, hostKey);
      installEventObservers(code);
      addHostHomeLinks();
      return;
    }

    if (path.endsWith("/playtest/session/") && organizerPreview) {
      addHostHomeLinks();
      return;
    }

    if (path.endsWith("/playtest/session/") && TOKEN_PATTERN.test(code) && hostKey) {
      void registerSessionHostPage(code, hostKey);
      addFloatingHostHomeLink();
    }
  }

  function registerCurrentEvent(code, hostKey) {
    const dashboardUrl = new URL(window.location.href);
    dashboardUrl.searchParams.set("code", code);
    dashboardUrl.searchParams.set("host", hostKey);
    dashboardUrl.searchParams.delete("organizerPreview");
    dashboardUrl.hash = "";

    const participantUrl = new URL(dashboardUrl.href);
    participantUrl.searchParams.delete("host");

    const event = registerEvent({
      code,
      hostKey,
      dashboardUrl: dashboardUrl.href,
      participantUrl: participantUrl.href,
      registrationControlsUrl: `${window.location.origin}/playtest/session/?code=${encodeURIComponent(code)}&host=${encodeURIComponent(hostKey)}`,
      sheetSerial: readEventSerial(),
      updatedAt: new Date().toISOString()
    });
    syncLocalGames(code, event.code);
    void enrichEventRecord(code);
  }

  async function enrichEventRecord(code) {
    try {
      const response = await fetch(`${API_ORIGIN}/api/sessions/${encodeURIComponent(code)}`, { cache: "no-store" });
      if (!response.ok) return;
      const session = await response.json();
      const current = readRegistry().events.find((item) => item.code === code);
      if (!current) return;
      registerEvent({
        ...current,
        sessionId: session.sessionId,
        sheetSerial: session.sheetSerial || current.sheetSerial,
        createdAt: session.createdAt || current.createdAt,
        updatedAt: new Date().toISOString()
      });
    } catch {
      // The dashboard remains usable without enrichment.
    }
  }

  async function registerSessionHostPage(code, hostKey) {
    try {
      const response = await fetch(`${API_ORIGIN}/api/sessions/${encodeURIComponent(code)}`, { cache: "no-store" });
      if (!response.ok) return;
      const session = await response.json();
      if (session.sessionKind === "event") {
        const dashboardUrl = `${window.location.origin}/playtest/onboarding/?code=${encodeURIComponent(code)}&host=${encodeURIComponent(hostKey)}`;
        registerEvent({
          code,
          hostKey,
          dashboardUrl,
          participantUrl: `${window.location.origin}/playtest/onboarding/?code=${encodeURIComponent(code)}`,
          registrationControlsUrl: window.location.href,
          sheetSerial: session.sheetSerial,
          updatedAt: new Date().toISOString()
        });
      } else {
        registerStandalone({
          code,
          sessionId: session.sessionId,
          sheetSerial: session.sheetSerial,
          hostUrl: window.location.href,
          joinUrl: `${window.location.origin}/playtest/session/?code=${encodeURIComponent(code)}`,
          status: session.status,
          createdAt: session.createdAt,
          updatedAt: new Date().toISOString()
        });
      }
    } catch {
      // Host Home is a convenience layer. The underlying page remains usable.
    }
  }

  function installEventObservers(code) {
    const sync = () => {
      registerCurrentEvent(
        code,
        String(new URLSearchParams(window.location.search).get("host") || "").trim()
      );
      syncLocalGames(code, code);
    };

    const detail = document.getElementById("sessionDetail");
    if (detail) {
      new MutationObserver(sync).observe(detail, { childList: true, characterData: true, subtree: true });
    }

    const organizer = document.getElementById("organizerPanel");
    if (organizer) {
      new MutationObserver(sync).observe(organizer, { childList: true, subtree: true });
    }

    window.addEventListener("storage", (event) => {
      if (event.key === localGamesKey(code)) syncLocalGames(code, code);
    });
    window.setTimeout(sync, 0);
  }

  function syncLocalGames(code, eventCode) {
    let games = [];
    try {
      const parsed = JSON.parse(localStorage.getItem(localGamesKey(code)) || "[]");
      games = Array.isArray(parsed) ? parsed : [];
    } catch {
      games = [];
    }
    for (const game of games) {
      if (!game?.joinUrl) continue;
      registerGame(eventCode, {
        sessionId: game.sessionId,
        sheetSerial: game.sheetSerial,
        joinUrl: game.joinUrl,
        createdAt: game.createdAt,
        updatedAt: new Date().toISOString()
      });
    }
  }

  function registerEvent(value) {
    const code = cleanToken(value?.code);
    const hostKey = cleanString(value?.hostKey, 160);
    if (!code || !hostKey) return null;

    const registry = readRegistry();
    const existing = registry.events.find((item) => item.code === code) || { code, games: [] };
    const next = {
      ...existing,
      code,
      hostKey,
      sessionId: cleanString(value.sessionId || existing.sessionId, 80),
      sheetSerial: cleanString(value.sheetSerial || existing.sheetSerial, 48),
      dashboardUrl: safeUrl(value.dashboardUrl || existing.dashboardUrl),
      participantUrl: safeUrl(value.participantUrl || existing.participantUrl),
      registrationControlsUrl: safeUrl(value.registrationControlsUrl || existing.registrationControlsUrl),
      createdAt: cleanDate(value.createdAt || existing.createdAt) || existing.createdAt || new Date().toISOString(),
      updatedAt: cleanDate(value.updatedAt) || new Date().toISOString(),
      games: Array.isArray(existing.games) ? existing.games : []
    };

    registry.events = [next, ...registry.events.filter((item) => item.code !== code)]
      .slice(0, MAX_EVENTS);
    writeRegistry(registry);
    return next;
  }

  function registerGame(eventCodeValue, value) {
    const eventCode = cleanToken(eventCodeValue);
    const joinUrl = safeUrl(value?.joinUrl);
    if (!eventCode || !joinUrl) return null;

    const registry = readRegistry();
    const event = registry.events.find((item) => item.code === eventCode);
    if (!event) return null;

    const gameKey = cleanString(value.sessionId || value.sheetSerial || joinUrl, 200);
    const games = Array.isArray(event.games) ? event.games : [];
    const existing = games.find((item) => gameIdentity(item) === gameKey) || {};
    const nextGame = {
      ...existing,
      sessionId: cleanString(value.sessionId || existing.sessionId, 80),
      sheetSerial: cleanString(value.sheetSerial || existing.sheetSerial, 48),
      joinUrl,
      createdAt: cleanDate(value.createdAt || existing.createdAt) || existing.createdAt || new Date().toISOString(),
      updatedAt: cleanDate(value.updatedAt) || new Date().toISOString()
    };
    event.games = [nextGame, ...games.filter((item) => gameIdentity(item) !== gameKey)]
      .slice(0, 100);
    event.updatedAt = new Date().toISOString();
    registry.events = [event, ...registry.events.filter((item) => item.code !== eventCode)];
    writeRegistry(registry);
    return nextGame;
  }

  function registerStandalone(value) {
    const hostUrl = safeUrl(value?.hostUrl);
    const joinUrl = safeUrl(value?.joinUrl);
    const sessionId = cleanString(value?.sessionId, 80);
    const code = cleanToken(value?.code || tokenFromUrl(joinUrl) || tokenFromUrl(hostUrl));
    if (!hostUrl || !code) return null;

    const registry = readRegistry();
    const key = sessionId || code;
    const existing = registry.standalone.find((item) => standaloneIdentity(item) === key) || {};
    const next = {
      ...existing,
      code,
      sessionId: sessionId || existing.sessionId || "",
      sheetSerial: cleanString(value.sheetSerial || existing.sheetSerial, 48),
      hostUrl,
      joinUrl: joinUrl || existing.joinUrl || `${window.location.origin}/playtest/session/?code=${encodeURIComponent(code)}`,
      status: cleanString(value.status || existing.status, 24),
      createdAt: cleanDate(value.createdAt || existing.createdAt) || existing.createdAt || new Date().toISOString(),
      updatedAt: cleanDate(value.updatedAt) || new Date().toISOString()
    };
    registry.standalone = [next, ...registry.standalone.filter((item) => standaloneIdentity(item) !== key)]
      .slice(0, MAX_STANDALONE);
    writeRegistry(registry);
    return next;
  }

  function importManifest(manifest) {
    if (!manifest || typeof manifest !== "object") throw new Error("That file is not a Gauntlet host manifest.");
    let imported = 0;

    if (Array.isArray(manifest.games) && manifest.eventSessionId) {
      const event = findEventForManifest(manifest);
      if (!event) {
        throw new Error("Open the event dashboard once before importing its table manifest.");
      }
      for (const game of manifest.games) {
        if (game?.joinUrl) {
          registerGame(event.code, game);
          imported += 1;
        }
      }
    }

    if (Array.isArray(manifest.sessions)) {
      for (const session of manifest.sessions) {
        if (session?.hostUrl) {
          registerStandalone(session);
          imported += 1;
        }
      }
    }

    if (!imported) throw new Error("No usable event tables or standalone sessions were found.");
    return imported;
  }

  function findEventForManifest(manifest) {
    const registry = readRegistry();
    return registry.events.find((event) =>
      event.sessionId === manifest.eventSessionId ||
      (manifest.eventSheetSerial && event.sheetSerial === manifest.eventSheetSerial)
    ) || null;
  }

  function forgetEvent(codeValue) {
    const code = cleanToken(codeValue);
    const registry = readRegistry();
    registry.events = registry.events.filter((item) => item.code !== code);
    writeRegistry(registry);
  }

  function forgetStandalone(identity) {
    const key = cleanString(identity, 200);
    const registry = readRegistry();
    registry.standalone = registry.standalone.filter((item) => standaloneIdentity(item) !== key);
    writeRegistry(registry);
  }

  function clearRegistry() {
    localStorage.removeItem(STORAGE_KEY);
  }

  function readRegistry() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        version: 1,
        events: Array.isArray(parsed.events) ? parsed.events : [],
        standalone: Array.isArray(parsed.standalone) ? parsed.standalone : []
      };
    } catch {
      return { version: 1, events: [], standalone: [] };
    }
  }

  function writeRegistry(value) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 1,
        events: Array.isArray(value.events) ? value.events : [],
        standalone: Array.isArray(value.standalone) ? value.standalone : []
      }));
      window.dispatchEvent(new CustomEvent("gauntlet-host-registry-change"));
    } catch {
      // Host Home remains optional when storage is unavailable.
    }
  }

  function addHostHomeLinks() {
    const hostHome = `${window.location.origin}/playtest/host/`;
    const actions = document.querySelector(".host-workspace-actions, .organizer-preview-actions");
    if (actions && !actions.querySelector('[data-host-home-link="true"]')) {
      const link = document.createElement("a");
      link.href = hostHome;
      link.dataset.hostHomeLink = "true";
      link.textContent = "Host Home";
      actions.prepend(link);
    }

    const siteNav = document.querySelector(".site-header nav");
    if (siteNav && !siteNav.querySelector('[data-host-home-link="true"]')) {
      const link = document.createElement("a");
      link.href = hostHome;
      link.dataset.hostHomeLink = "true";
      link.textContent = "Host Home";
      siteNav.prepend(link);
    }
  }

  function addFloatingHostHomeLink() {
    if (document.querySelector('[data-floating-host-home="true"]')) return;
    const link = document.createElement("a");
    link.href = `${window.location.origin}/playtest/host/`;
    link.dataset.floatingHostHome = "true";
    link.textContent = "← Host Home";
    Object.assign(link.style, {
      position: "fixed",
      left: "18px",
      bottom: "18px",
      zIndex: "9999",
      padding: "10px 14px",
      border: "1px solid rgba(255,255,255,.28)",
      borderRadius: "999px",
      background: "#2b241c",
      color: "#fff8ed",
      fontWeight: "800",
      textDecoration: "none",
      boxShadow: "0 10px 28px rgba(0,0,0,.2)"
    });
    document.body.append(link);
  }

  function readEventSerial() {
    const detail = document.getElementById("sessionDetail")?.textContent || "";
    return detail.split("·")[0]?.trim() || "";
  }

  function localGamesKey(code) {
    return `gauntlet_event_games_${code.slice(0, 16)}`;
  }

  function gameIdentity(game) {
    return cleanString(game?.sessionId || game?.sheetSerial || game?.joinUrl, 200);
  }

  function standaloneIdentity(session) {
    return cleanString(session?.sessionId || session?.code || session?.hostUrl, 200);
  }

  function tokenFromUrl(value) {
    try { return new URL(value).searchParams.get("code") || ""; }
    catch { return ""; }
  }

  function normalizePath(value) {
    return String(value || "/").replace(/\/+$/, "/");
  }

  function safeUrl(value) {
    if (!value) return "";
    try {
      const url = new URL(value, window.location.origin);
      if (url.origin !== window.location.origin) return "";
      return url.href;
    } catch {
      return "";
    }
  }

  function cleanToken(value) {
    const token = cleanString(value, 120);
    return TOKEN_PATTERN.test(token) ? token : "";
  }

  function cleanString(value, maxLength) {
    return String(value ?? "").trim().slice(0, maxLength);
  }

  function cleanDate(value) {
    const date = new Date(value || "");
    return Number.isNaN(date.valueOf()) ? "" : date.toISOString();
  }
})();
