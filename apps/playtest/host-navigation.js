(() => {
  const params = new URLSearchParams(window.location.search);
  const code = String(params.get("code") || "").trim();
  const hostKey = String(params.get("host") || "").trim();
  const organizerPreview = params.get("organizerPreview") === "1";
  const path = window.location.pathname.replace(/\/+$/, "/");
  const isOnboarding = path.endsWith("/playtest/onboarding/");
  const isSession = path.endsWith("/playtest/session/");

  injectStyles();

  if (isOnboarding && hostKey) {
    document.documentElement.classList.add("event-dashboard-pending");
  }

  document.addEventListener("DOMContentLoaded", () => {
    if (isOnboarding && hostKey) configureEventDashboard();
    if (isSession && organizerPreview) configureOrganizerPreview();
  });

  function configureEventDashboard() {
    document.documentElement.classList.remove("event-dashboard-pending");
    document.body.classList.add("event-dashboard-mode");
    document.title = "Gauntlet Game-Night Event Dashboard";

    const participantUrl = new URL(window.location.href);
    participantUrl.searchParams.delete("host");
    participantUrl.hash = "";

    const siteHeader = document.querySelector(".site-header");
    const siteNav = siteHeader?.querySelector("nav");
    if (siteNav) {
      siteNav.setAttribute("aria-label", "Organizer navigation");
      siteNav.innerHTML = `
        <a href="#organizer-title">Roster</a>
        <a href="#event-games-title">Table sessions</a>
        <a href="${escapeAttribute(participantUrl.href)}" target="_blank" rel="noopener">Participant preview ↗</a>
      `;
    }

    const banner = document.createElement("section");
    banner.className = "host-workspace-banner";
    banner.setAttribute("aria-labelledby", "host-workspace-title");
    banner.innerHTML = `
      <div>
        <p class="host-workspace-kicker">Organizer workspace</p>
        <h1 id="host-workspace-title">Game-night event dashboard</h1>
        <p>Manage the event roster, create table QR codes, and review live game sessions. Participant onboarding is kept in a separate preview.</p>
        <p id="hostEventIdentity" class="host-event-identity">Loading event…</p>
      </div>
      <nav class="host-workspace-actions" aria-label="Event dashboard sections">
        <a class="host-action primary" href="#organizer-title">View roster</a>
        <a class="host-action" href="#event-games-title">View table sessions</a>
        <a class="host-action" href="${escapeAttribute(participantUrl.href)}" target="_blank" rel="noopener">Preview participant onboarding</a>
      </nav>
    `;

    const main = document.querySelector("main");
    const organizer = document.getElementById("organizerPanel");
    if (main) main.prepend(banner);
    if (organizer && banner.parentNode) banner.after(organizer);

    const organizerTitle = document.getElementById("organizer-title");
    if (organizerTitle) organizerTitle.textContent = "Event roster";
    const organizerHeadingCopy = organizer?.querySelector(":scope > .section-heading > p");
    if (organizerHeadingCopy) {
      organizerHeadingCopy.textContent = "Participant choices for this event. Table sessions are managed below and remain separate from the event roster.";
    }

    updateEventIdentity();
    const identityTarget = document.getElementById("sessionDetail");
    if (identityTarget) {
      new MutationObserver(updateEventIdentity).observe(identityTarget, {
        childList: true,
        characterData: true,
        subtree: true
      });
    }

    preparePlayerPreviewLinks();
    if (organizer) {
      new MutationObserver(preparePlayerPreviewLinks).observe(organizer, {
        childList: true,
        subtree: true
      });
    }

    document.addEventListener("click", interceptPlayerPreview, true);
  }

  function updateEventIdentity() {
    const output = document.getElementById("hostEventIdentity");
    if (!output) return;
    const detail = document.getElementById("sessionDetail")?.textContent.trim();
    output.textContent = detail ? `Event ${detail}` : "Loading event…";
  }

  function preparePlayerPreviewLinks() {
    document.querySelectorAll(".event-game-actions a").forEach((link) => {
      if (link.dataset.organizerPreviewLink === "true") return;
      link.textContent = "Preview player page";
      link.setAttribute("title", "Open this table session as a player-facing organizer preview");
      link.dataset.organizerPreviewLink = "true";
    });
  }

  function interceptPlayerPreview(event) {
    const link = event.target.closest?.('a[data-organizer-preview-link="true"]');
    if (!link) return;

    let previewUrl;
    try {
      previewUrl = new URL(link.href, window.location.href);
    } catch {
      return;
    }

    event.preventDefault();
    previewUrl.searchParams.set("organizerPreview", "1");
    const preview = window.open(previewUrl.href, "_blank");
    if (!preview) window.location.assign(previewUrl.href);
  }

  function configureOrganizerPreview() {
    document.body.classList.add("organizer-preview-mode");
    document.title = `Organizer preview · ${document.title}`;

    const cleanPlayerUrl = new URL(window.location.href);
    cleanPlayerUrl.searchParams.delete("organizerPreview");

    const bar = document.createElement("aside");
    bar.className = "organizer-preview-bar";
    bar.setAttribute("aria-label", "Organizer preview controls");
    bar.innerHTML = `
      <div class="organizer-preview-copy">
        <span>Organizer preview</span>
        <strong>Table-session player view</strong>
        <small>This is the live page players use. Actions taken here affect this table session.</small>
      </div>
      <div class="organizer-preview-actions">
        <button id="returnToEventDashboard" type="button">Return to event dashboard</button>
        <a href="${escapeAttribute(cleanPlayerUrl.href)}" target="_blank" rel="noopener">Open clean player view</a>
      </div>
    `;

    document.body.prepend(bar);
    document.getElementById("returnToEventDashboard")?.addEventListener("click", returnToDashboard);
  }

  function returnToDashboard() {
    if (window.opener && !window.opener.closed) {
      window.opener.focus();
      window.close();
      return;
    }
    if (window.history.length > 1) {
      window.history.back();
      return;
    }
    const button = document.getElementById("returnToEventDashboard");
    if (button) {
      button.disabled = true;
      button.textContent = "The dashboard is open in another tab";
    }
  }

  function injectStyles() {
    const style = document.createElement("style");
    style.dataset.playtestHostNavigation = "true";
    style.textContent = `
      html.event-dashboard-pending body { visibility: hidden; }

      body.event-dashboard-mode {
        background:
          linear-gradient(180deg, rgba(117, 84, 24, .1), transparent 300px),
          var(--paper, #f4ecdc);
      }

      body.event-dashboard-mode .site-header {
        border-bottom: 3px solid #9b7628;
      }

      body.event-dashboard-mode .onboarding-hero,
      body.event-dashboard-mode #onboardingForm {
        display: none !important;
      }

      body.event-dashboard-mode #organizerPanel {
        margin-top: 28px;
        border: 1px solid rgba(117, 84, 24, .45);
        border-top: 7px solid #9b7628;
        background: rgba(255, 250, 239, .9);
        box-shadow: 0 24px 60px rgba(53, 37, 15, .1);
      }

      body.event-dashboard-mode #organizerPanel > .section-heading .eyebrow {
        color: #755418;
      }

      .host-workspace-banner {
        max-width: 1180px;
        margin: 36px auto 0;
        padding: 34px 38px;
        display: grid;
        grid-template-columns: minmax(0, 1fr) auto;
        gap: 34px;
        align-items: center;
        border-left: 8px solid #d0a94d;
        background: #26231f;
        color: #fff9ec;
        box-shadow: 0 18px 50px rgba(24, 18, 9, .2);
      }

      .host-workspace-kicker {
        margin: 0 0 8px;
        color: #e3c675;
        font-size: .75rem;
        font-weight: 900;
        letter-spacing: .14em;
        text-transform: uppercase;
      }

      .host-workspace-banner h1 {
        margin: 0;
        color: #fff9ec;
        font-size: clamp(2.2rem, 5vw, 4.6rem);
        line-height: .98;
      }

      .host-workspace-banner p:not(.host-workspace-kicker):not(.host-event-identity) {
        max-width: 760px;
        margin: 16px 0 0;
        color: rgba(255, 249, 236, .76);
        line-height: 1.55;
      }

      .host-event-identity {
        display: inline-block;
        margin: 18px 0 0;
        padding: 7px 10px;
        border: 1px solid rgba(227, 198, 117, .5);
        color: #f0d992;
        font-size: .78rem;
        font-weight: 800;
        letter-spacing: .06em;
        text-transform: uppercase;
      }

      .host-workspace-actions {
        min-width: 250px;
        display: grid;
        gap: 10px;
      }

      .host-action {
        padding: 12px 15px;
        border: 1px solid rgba(255, 249, 236, .34);
        color: #fff9ec;
        font-weight: 800;
        text-decoration: none;
      }

      .host-action:hover,
      .host-action:focus-visible {
        background: rgba(255, 255, 255, .1);
      }

      .host-action.primary {
        border-color: #d0a94d;
        background: #d0a94d;
        color: #211c13;
      }

      body.organizer-preview-mode {
        border-top: 7px solid #7e1f24;
      }

      .organizer-preview-bar {
        position: sticky;
        top: 0;
        z-index: 1000;
        padding: 13px max(20px, calc((100vw - 1180px) / 2));
        display: flex;
        justify-content: space-between;
        gap: 24px;
        align-items: center;
        background: #2b1718;
        color: #fff7ed;
        box-shadow: 0 7px 24px rgba(20, 8, 9, .25);
      }

      .organizer-preview-copy {
        display: grid;
        gap: 2px;
      }

      .organizer-preview-copy span {
        color: #e7b4a2;
        font-size: .68rem;
        font-weight: 900;
        letter-spacing: .15em;
        text-transform: uppercase;
      }

      .organizer-preview-copy strong {
        font-size: 1rem;
      }

      .organizer-preview-copy small {
        color: rgba(255, 247, 237, .68);
      }

      .organizer-preview-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 9px;
      }

      .organizer-preview-actions button,
      .organizer-preview-actions a {
        min-height: 40px;
        padding: 9px 13px;
        border: 1px solid rgba(255, 247, 237, .45);
        background: transparent;
        color: #fff7ed;
        font: inherit;
        font-weight: 800;
        text-decoration: none;
        cursor: pointer;
      }

      .organizer-preview-actions button {
        border-color: #e7b4a2;
        background: #8b272b;
      }

      .organizer-preview-actions button:disabled {
        opacity: .72;
        cursor: default;
      }

      @media (max-width: 760px) {
        .host-workspace-banner {
          margin-top: 20px;
          padding: 27px 24px;
          grid-template-columns: 1fr;
        }

        .host-workspace-actions { min-width: 0; }

        .organizer-preview-bar {
          position: static;
          align-items: stretch;
          flex-direction: column;
        }

        .organizer-preview-actions {
          display: grid;
          grid-template-columns: 1fr;
        }
      }

      @media print {
        .organizer-preview-bar,
        .host-workspace-banner {
          display: none !important;
        }
      }
    `;
    document.head.append(style);
  }

  function escapeAttribute(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
})();
