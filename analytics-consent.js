const MEASUREMENT_ID = "G-8YYYZJGGPE";
const STORAGE_KEY = "gauntlet.analyticsConsent";

window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function gtag(){ window.dataLayer.push(arguments); };

window.gtag("consent", "default", {
  analytics_storage: "denied",
  ad_storage: "denied",
  ad_user_data: "denied",
  ad_personalization: "denied",
  wait_for_update: 500
});

let analyticsLoaded = false;
let preferencesReturnFocus = null;
window[`ga-disable-${MEASUREMENT_ID}`] = true;

function readChoice() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function writeChoice(value) {
  try { localStorage.setItem(STORAGE_KEY, value); } catch {}
}

function loadAnalytics() {
  if (analyticsLoaded) return;
  analyticsLoaded = true;
  window[`ga-disable-${MEASUREMENT_ID}`] = false;
  window.gtag("consent", "update", {
    analytics_storage: "granted",
    ad_storage: "denied",
    ad_user_data: "denied",
    ad_personalization: "denied"
  });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  script.addEventListener("load", () => {
    window.gtag("js", new Date());
    window.gtag("config", MEASUREMENT_ID, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });
  }, { once: true });
  document.head.append(script);
}

function removeBanner() {
  document.querySelector(".analytics-consent")?.remove();
}

function applyChoice(choice) {
  if (choice === "accepted") {
    loadAnalytics();
  } else if (choice === "rejected") {
    window[`ga-disable-${MEASUREMENT_ID}`] = true;
    window.gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
  }
}

function restorePreferencesFocus() {
  const target = preferencesReturnFocus;
  preferencesReturnFocus = null;
  if (target instanceof HTMLElement && target.isConnected) {
    target.focus({ preventScroll: true });
  }
}

function showBanner() {
  if (document.querySelector(".analytics-consent")) return;
  const region = document.createElement("aside");
  region.className = "analytics-consent";
  region.setAttribute("role", "region");
  region.setAttribute("aria-label", "Analytics preferences");
  region.innerHTML = `
    <p>Gauntlet uses optional Google Analytics to understand site usage. Analytics stays off unless you allow it. <a href="/privacy/">Privacy</a></p>
    <div class="analytics-consent__actions">
      <button type="button" data-consent="reject">No thanks</button>
      <button type="button" data-consent="accept">Allow analytics</button>
    </div>`;
  region.addEventListener("click", (event) => {
    const button = event.target.closest("[data-consent]");
    if (!button) return;
    const choice = button.dataset.consent === "accept" ? "accepted" : "rejected";
    writeChoice(choice);
    applyChoice(choice);
    removeBanner();
    restorePreferencesFocus();
  });
  document.body.append(region);
}

function openPreferences(event) {
  preferencesReturnFocus = event?.currentTarget instanceof HTMLElement
    ? event.currentTarget
    : document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
  window[`ga-disable-${MEASUREMENT_ID}`] = true;
  writeChoice("");
  removeBanner();
  showBanner();
  document.querySelector(".analytics-consent button")?.focus();
}

window.gauntletAnalyticsPreferences = { open: openPreferences };

document.addEventListener("DOMContentLoaded", () => {
  const choice = readChoice();
  if (choice === "accepted" || choice === "rejected") applyChoice(choice);
  else showBanner();

  document.querySelectorAll("[data-analytics-preferences]").forEach((button) => {
    button.addEventListener("click", openPreferences);
  });
});
