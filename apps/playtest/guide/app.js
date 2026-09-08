(() => {
  const params = new URLSearchParams(window.location.search);
  const requestedRole = params.get("role") === "participant" ? "participant" : "host";
  const el = {};

  document.addEventListener("DOMContentLoaded", init);

  function init() {
    el.hostGuide = document.getElementById("hostGuide");
    el.participantGuide = document.getElementById("participantGuide");
    el.hostGuideTab = document.getElementById("hostGuideTab");
    el.participantGuideTab = document.getElementById("participantGuideTab");
    el.printGuide = document.getElementById("printGuide");
    el.copyGuideLink = document.getElementById("copyGuideLink");
    el.guideStatus = document.getElementById("guideStatus");

    document.querySelectorAll("[data-role-choice]").forEach((button) => {
      button.addEventListener("click", () => setRole(button.dataset.roleChoice, true));
      button.addEventListener("keydown", handleRoleTabKeydown);
    });
    el.printGuide?.addEventListener("click", () => window.print());
    el.copyGuideLink?.addEventListener("click", copyCurrentGuide);

    setRole(requestedRole, false);
    if (window.location.hash) {
      window.setTimeout(() => document.querySelector(window.location.hash)?.scrollIntoView(), 0);
    }
  }

  function handleRoleTabKeydown(event) {
    const tabs = [el.hostGuideTab, el.participantGuideTab].filter(Boolean);
    const currentIndex = tabs.indexOf(event.currentTarget);
    if (currentIndex < 0) return;

    let targetIndex = null;
    if (event.key === "ArrowRight") targetIndex = (currentIndex + 1) % tabs.length;
    if (event.key === "ArrowLeft") targetIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    if (event.key === "Home") targetIndex = 0;
    if (event.key === "End") targetIndex = tabs.length - 1;
    if (targetIndex == null) return;

    event.preventDefault();
    const target = tabs[targetIndex];
    setRole(target.dataset.roleChoice, true);
    target.focus();
  }

  function setRole(roleValue, updateUrl) {
    const role = roleValue === "participant" ? "participant" : "host";
    const isHost = role === "host";
    document.body.dataset.activeRole = role;
    el.hostGuide.hidden = !isHost;
    el.participantGuide.hidden = isHost;
    el.hostGuideTab.setAttribute("aria-selected", String(isHost));
    el.participantGuideTab.setAttribute("aria-selected", String(!isHost));
    el.hostGuideTab.tabIndex = isHost ? 0 : -1;
    el.participantGuideTab.tabIndex = isHost ? -1 : 0;
    document.title = isHost
      ? "Host Guide · Gauntlet Game-Night Playtest"
      : "Participant Guide · Gauntlet Game-Night Playtest";

    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("role", role);
      url.hash = "";
      window.history.replaceState({}, "", url);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function copyCurrentGuide() {
    const url = new URL(window.location.href);
    url.searchParams.set("role", document.body.dataset.activeRole || "host");
    url.hash = "";
    try {
      await navigator.clipboard.writeText(url.href);
      setStatus("Guide link copied.", "success");
    } catch {
      window.prompt("Copy this guide link:", url.href);
    }
  }

  function setStatus(message, kind = "") {
    if (!el.guideStatus) return;
    el.guideStatus.textContent = message;
    el.guideStatus.className = `form-status${kind ? ` ${kind}` : ""}`;
  }
})();
