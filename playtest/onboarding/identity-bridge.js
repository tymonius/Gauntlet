(() => {
  const TOKEN_PATTERN = /^[A-Za-z0-9_-]{24,96}$/;
  const params = new URLSearchParams(window.location.search);
  const code = String(params.get("code") || "").trim();
  if (!TOKEN_PATTERN.test(code)) return;

  const nativeFetch = window.fetch.bind(window);
  let eventSessionId = "";

  window.fetch = async function onboardingIdentityFetch(input, init = {}) {
    let nextInit = init;
    let url = null;
    try {
      url = new URL(typeof input === "string" ? input : input.url, window.location.href);
      const sessionBase = `/api/sessions/${encodeURIComponent(code)}`;
      if (url.pathname === `${sessionBase}/join` && String(init.method || "GET").toUpperCase() === "POST") {
        const requestBody = parseBody(init.body) || {};
        nextInit = {
          ...init,
          headers: { ...(init.headers || {}), "Content-Type": "application/json" },
          body: JSON.stringify({ ...requestBody, purpose: "onboarding" })
        };
      }
    } catch {
      // Preserve the original request when it cannot be inspected.
    }

    const response = await nativeFetch(input, nextInit);
    try {
      url ||= new URL(typeof input === "string" ? input : input.url, window.location.href);
      const sessionBase = `/api/sessions/${encodeURIComponent(code)}`;

      if (url.pathname === sessionBase && response.ok) {
        const payload = await response.clone().json();
        eventSessionId = String(payload?.sessionId || "");
      }

      if (url.pathname === `${sessionBase}/join` && response.ok) {
        const payload = await response.clone().json();
        const participantId = String(payload?.participantId || "");
        eventSessionId ||= String(payload?.session?.sessionId || "");
        if (eventSessionId && participantId) {
          saveIdentity({
            eventSessionId,
            eventCode: code,
            participantId,
            participantToken: String(payload?.participantToken || ""),
            updatedAt: new Date().toISOString()
          });
        }
      }

      if (url.pathname === `${sessionBase}/event` && response.ok) {
        const requestBody = parseBody(nextInit.body);
        const choice = requestBody?.eventType === "onboarding_choice" ? requestBody.data : null;
        if (eventSessionId && choice?.participantId) {
          const existing = readIdentity(eventSessionId);
          saveIdentity({
            ...existing,
            eventSessionId,
            eventCode: code,
            participantId: String(choice.participantId),
            displayName: String(choice.displayName || existing.displayName || ""),
            faction: String(choice.faction || ""),
            leader: String(choice.leader || ""),
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.info("Event identity could not be persisted.", error);
    }
    return response;
  };

  function identityKey(sessionId) {
    return `gauntlet_event_identity_${sessionId}`;
  }

  function readIdentity(sessionId) {
    try {
      return JSON.parse(localStorage.getItem(identityKey(sessionId)) || "{}");
    } catch {
      return {};
    }
  }

  function saveIdentity(value) {
    try {
      localStorage.setItem(identityKey(value.eventSessionId), JSON.stringify(value));
      localStorage.setItem("gauntlet_last_event_identity", JSON.stringify(value));
    } catch {
      // Identity continuity is a convenience; onboarding still works without storage.
    }
  }

  function parseBody(body) {
    if (typeof body !== "string") return null;
    try { return JSON.parse(body); } catch { return null; }
  }
})();
