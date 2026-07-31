(() => {
  document.addEventListener("DOMContentLoaded", installGuideLink);

  function installGuideLink() {
    const params = new URLSearchParams(window.location.search);
    const path = String(window.location.pathname || "");
    const hostContext = Boolean(params.get("host")) || params.get("organizerPreview") === "1" || path.includes("/playtest/host/");
    const role = hostContext ? "host" : "participant";
    const label = hostContext ? "Host guide" : "Player guide";
    const href = `${window.location.origin}/playtest/guide/?role=${role}`;

    const nav = document.querySelector(".site-header nav");
    if (nav && !nav.querySelector('[data-game-night-guide="true"]')) {
      const link = document.createElement("a");
      link.href = href;
      link.dataset.gameNightGuide = "true";
      link.textContent = label;
      nav.append(link);
    }

    const workspaceActions = document.querySelector(".host-workspace-actions, .organizer-preview-actions");
    if (workspaceActions && !workspaceActions.querySelector('[data-game-night-guide="true"]')) {
      const link = document.createElement("a");
      link.href = href;
      link.dataset.gameNightGuide = "true";
      link.textContent = label;
      workspaceActions.append(link);
    }
  }
})();
