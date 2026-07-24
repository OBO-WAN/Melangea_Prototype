(() => {
  "use strict";

  const STORAGE_KEY = "melangea2_consent_v2";
  const CONSENT_VERSION = 2;
  const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
  const GA_COOKIE_PREFIXES = ["_ga"];

  let dialog;
  let analyticsCheckbox;
  let externalMediaCheckbox;
  let statusMessage;
  let lastTrigger;

  function readConsent() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;

      const consent = JSON.parse(raw);
      const isCurrent = consent.version === CONSENT_VERSION;
      const isFresh =
        Number.isFinite(consent.savedAt) &&
        Date.now() - consent.savedAt <= MAX_AGE_MS;

      if (!isCurrent || !isFresh) {
        window.localStorage.removeItem(STORAGE_KEY);
        return null;
      }

      return consent;
    } catch {
      return null;
    }
  }

  function writeConsent({ analytics, externalMedia }) {
    const consent = {
      version: CONSENT_VERSION,
      analytics: Boolean(analytics),
      externalMedia: Boolean(externalMedia),
      savedAt: Date.now(),
    };

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(consent));
    } catch {
      // The current page still respects the choice if storage is unavailable.
    }

    return consent;
  }

  function getAnalyticsConfig() {
    const config = window.MELANGEA_ANALYTICS_CONFIG || {};
    const measurementId =
      typeof config.measurementId === "string"
        ? config.measurementId.trim()
        : "";

    return {
      enabled: config.enabled === true,
      measurementId,
      isValidId: /^G-[A-Z0-9]+$/.test(measurementId),
    };
  }

  function gtag() {
    window.dataLayer.push(arguments);
  }

  function activateAnalytics() {
    const config = getAnalyticsConfig();

    if (
      !config.enabled ||
      !config.isValidId ||
      document.querySelector("script[data-ga4-loader]")
    ) {
      return false;
    }

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || gtag;

    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
    window.gtag("js", new Date());
    window.gtag("config", config.measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      send_page_view: true,
    });

    const script = document.createElement("script");
    script.async = true;
    script.dataset.ga4Loader = "";
    script.src =
      "https://www.googletagmanager.com/gtag/js?id=" +
      encodeURIComponent(config.measurementId);
    document.head.append(script);

    return true;
  }

  function setExternalMediaPlaceholder(iframe) {
    if (iframe.srcdoc) return;

    iframe.srcdoc = `
      <!doctype html>
      <html lang="de">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width">
          <style>
            * { box-sizing: border-box; }
            body {
              display: grid;
              min-height: 100vh;
              margin: 0;
              padding: 1rem;
              place-items: center;
              background: #111a2f;
              color: #e9ecf1;
              font: 600 16px/1.45 system-ui, sans-serif;
              text-align: center;
            }
            p { max-width: 32rem; margin: 0; }
          </style>
        </head>
        <body>
          <p>Dieses YouTube-Video wird erst geladen, wenn Sie „Externe Medien“ in den Cookie-Einstellungen erlauben.</p>
        </body>
      </html>
    `;
  }

  function activateExternalMedia() {
    document.querySelectorAll("iframe[data-consent-src]").forEach((iframe) => {
      const source = iframe.dataset.consentSrc;
      if (!source || iframe.src === source) return;

      iframe.removeAttribute("srcdoc");
      iframe.src = source;
    });
  }

  function prepareExternalMedia() {
    const consent = readConsent();

    document.querySelectorAll("iframe[data-consent-src]").forEach((iframe) => {
      if (consent?.externalMedia === true) {
        iframe.removeAttribute("srcdoc");
        iframe.src = iframe.dataset.consentSrc;
      } else {
        iframe.removeAttribute("src");
        setExternalMediaPlaceholder(iframe);
      }
    });
  }

  function expireCookie(name, domain) {
    const domainPart = domain ? `; Domain=${domain}` : "";
    const securePart = location.protocol === "https:" ? "; Secure" : "";

    document.cookie =
      `${name}=; Max-Age=0; Path=/${domainPart}; SameSite=Lax${securePart}`;
  }

  function removeAnalyticsCookies() {
    document.cookie.split(";").forEach((entry) => {
      const name = entry.split("=")[0].trim();
      const isAnalyticsCookie = GA_COOKIE_PREFIXES.some(
        (prefix) => name === prefix || name.startsWith(`${prefix}_`),
      );

      if (!isAnalyticsCookie) return;

      expireCookie(name);
      expireCookie(name, location.hostname);
      expireCookie(name, `.${location.hostname.replace(/^www\./, "")}`);
    });
  }

  function denyLoadedAnalytics() {
    if (typeof window.gtag !== "function") return;

    window.gtag("consent", "update", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
    });
  }

  function closeDialog() {
    if (!dialog) return;
    dialog.close();
    document.body.style.overflow = "";

    if (lastTrigger) {
      lastTrigger.focus();
      lastTrigger = null;
    }
  }

  function applyConsent(
    { analytics, externalMedia },
    { reloadOnWithdrawal = false } = {},
  ) {
    const previous = readConsent();
    writeConsent({ analytics, externalMedia });

    if (analytics) {
      activateAnalytics();
    } else {
      denyLoadedAnalytics();
      removeAnalyticsCookies();
    }

    if (externalMedia) {
      activateExternalMedia();
    }

    const requiresReload =
      reloadOnWithdrawal &&
      ((previous?.analytics === true &&
        !analytics &&
        Boolean(document.querySelector("script[data-ga4-loader]"))) ||
        (previous?.externalMedia === true && !externalMedia));

    if (requiresReload) {
      window.location.reload();
      return;
    }

    statusMessage.textContent =
      analytics || externalMedia
        ? "Ihre Auswahl wurde gespeichert."
        : "Nur erforderliche Technologien sind aktiv.";
    window.setTimeout(closeDialog, 250);
  }

  function createDialog() {
    dialog = document.createElement("dialog");
    dialog.className = "consent-dialog";
    dialog.id = "consent-settings";
    dialog.setAttribute("aria-labelledby", "consent-title");
    dialog.setAttribute("aria-describedby", "consent-description");
    dialog.innerHTML = `
      <div class="consent-dialog__inner">
        <button class="consent-dialog__close" type="button" aria-label="Cookie-Einstellungen schließen" data-consent-close>×</button>
        <p class="consent-dialog__eyebrow">Datenschutz</p>
        <h2 class="consent-dialog__title" id="consent-title">Cookie-Einstellungen</h2>
        <p class="consent-dialog__intro" id="consent-description">
          Wir verwenden erforderliche Technologien für den Betrieb der Website.
          Statistik wird nur nach Ihrer ausdrücklichen Einwilligung geladen.
        </p>

        <div class="consent-dialog__option">
          <div>
            <strong>Erforderlich</strong>
            <span class="consent-dialog__required">Immer aktiv</span>
          </div>
          <small>Speichert Ihre Datenschutzauswahl und ermöglicht die grundlegenden Website-Funktionen.</small>
        </div>

        <label class="consent-dialog__option">
          <div>
            <strong>Statistik</strong>
            <span>Google Analytics 4</span>
          </div>
          <input class="consent-dialog__toggle" type="checkbox" data-consent-analytics />
          <small>Hilft uns nach Ihrer Einwilligung zu verstehen, wie die Website genutzt wird.</small>
        </label>

        <label class="consent-dialog__option">
          <div>
            <strong>Externe Medien</strong>
            <span>YouTube-Videos</span>
          </div>
          <input class="consent-dialog__toggle" type="checkbox" data-consent-external-media />
          <small>Lädt eingebettete Videos und stellt dabei eine Verbindung zu YouTube her.</small>
        </label>

        <p class="consent-dialog__links">
          Einzelheiten finden Sie in unserer
          <a href="./datenschutz.html#analytics-title">Datenschutzerklärung</a>.
        </p>

        <div class="consent-dialog__actions">
          <button class="btn btn-ghost" type="button" data-consent-necessary>Nur erforderliche</button>
          <button class="btn btn-ghost" type="button" data-consent-save>Auswahl speichern</button>
          <button class="btn" type="button" data-consent-all>Alle akzeptieren</button>
        </div>
        <p class="consent-status" role="status" aria-live="polite" data-consent-status></p>
      </div>
    `;

    document.body.append(dialog);
    analyticsCheckbox = dialog.querySelector("[data-consent-analytics]");
    externalMediaCheckbox = dialog.querySelector(
      "[data-consent-external-media]",
    );
    statusMessage = dialog.querySelector("[data-consent-status]");

    dialog
      .querySelector("[data-consent-close]")
      .addEventListener("click", closeDialog);
    dialog
      .querySelector("[data-consent-necessary]")
      .addEventListener("click", () =>
        applyConsent(
          { analytics: false, externalMedia: false },
          { reloadOnWithdrawal: true },
        ),
      );
    dialog
      .querySelector("[data-consent-save]")
      .addEventListener("click", () =>
        applyConsent(
          {
            analytics: analyticsCheckbox.checked,
            externalMedia: externalMediaCheckbox.checked,
          },
          { reloadOnWithdrawal: true },
        ),
      );
    dialog
      .querySelector("[data-consent-all]")
      .addEventListener("click", () =>
        applyConsent({ analytics: true, externalMedia: true }),
      );

    dialog.addEventListener("cancel", (event) => {
      if (!readConsent()) {
        event.preventDefault();
      } else {
        document.body.style.overflow = "";
      }
    });
  }

  function openDialog(trigger, firstVisit = false) {
    const consent = readConsent();
    lastTrigger = trigger || null;
    analyticsCheckbox.checked = consent?.analytics === true;
    externalMediaCheckbox.checked = consent?.externalMedia === true;
    statusMessage.textContent = "";
    dialog.dataset.firstVisit = String(firstVisit);
    dialog.showModal();
    document.body.style.overflow = "hidden";
  }

  function init() {
    createDialog();
    prepareExternalMedia();

    document.addEventListener("click", (event) => {
      const trigger = event.target.closest("[data-consent-settings]");
      if (!trigger) return;

      event.preventDefault();
      openDialog(trigger);
    });

    const consent = readConsent();

    if (!consent) {
      openDialog(null, true);
    } else {
      if (consent.analytics) activateAnalytics();
      if (consent.externalMedia) activateExternalMedia();
    }
  }

  window.melangeConsent = Object.freeze({
    refreshExternalMedia: prepareExternalMedia,
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
