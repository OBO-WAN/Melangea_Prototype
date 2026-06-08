const cdOrderOverlay = document.getElementById("cd-order-overlay");
const cdOrderOpenButtons = document.querySelectorAll("[data-cd-order-open]");
const cdOrderCloseButtons = document.querySelectorAll("[data-cd-order-close]");
const cdOrderForm = document.querySelector(".cd-order-form");
const cdOrderRecipient = "info@melangea2.com";
const cdOrderSubject = "CD-Bestellung Mélange à Deux";

// A real automatic reply must be configured later via the email provider, backend, or mail automation.
// The subject ‘CD-Bestellung Mélange à Deux’ can be used for filtering.

if (cdOrderOverlay && cdOrderOpenButtons.length) {
  let cdOrderLastFocusedElement = null;

  const cdOrderFocusableSelector = [
    "a[href]",
    "button:not([disabled])",
    "input:not([disabled])",
    "textarea:not([disabled])",
    "select:not([disabled])",
    '[tabindex]:not([tabindex="-1"])',
  ].join(",");

  const getCdOrderFocusableElements = () =>
    Array.from(cdOrderOverlay.querySelectorAll(cdOrderFocusableSelector)).filter(
      (element) => element.offsetParent !== null
    );

  const setCdOrderBodyScroll = (isOpen) => {
    document.body.style.overflow = isOpen ? "hidden" : "";
  };

  const openCdOrderModal = (event) => {
    event.preventDefault();
    cdOrderLastFocusedElement = event.currentTarget;
    cdOrderOverlay.classList.add("is-open");
    cdOrderOverlay.setAttribute("aria-hidden", "false");
    setCdOrderBodyScroll(true);

    const focusableElements = getCdOrderFocusableElements();
    const firstInput = document.getElementById("cd-order-email");
    const initialFocus = firstInput || focusableElements[0];

    window.setTimeout(() => {
      initialFocus?.focus();
    }, 0);
  };

  const closeCdOrderModal = () => {
    cdOrderOverlay.classList.remove("is-open");
    cdOrderOverlay.setAttribute("aria-hidden", "true");
    setCdOrderBodyScroll(false);
    cdOrderLastFocusedElement?.focus();
  };

  const trapCdOrderFocus = (event) => {
    if (event.key !== "Tab" || !cdOrderOverlay.classList.contains("is-open")) {
      return;
    }

    const focusableElements = getCdOrderFocusableElements();

    if (!focusableElements.length) {
      event.preventDefault();
      return;
    }

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    } else if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  cdOrderOpenButtons.forEach((button) => {
    button.addEventListener("click", openCdOrderModal);
  });

  cdOrderCloseButtons.forEach((button) => {
    button.addEventListener("click", closeCdOrderModal);
  });

  document.addEventListener("keydown", (event) => {
    if (!cdOrderOverlay.classList.contains("is-open")) {
      return;
    }

    if (event.key === "Escape") {
      closeCdOrderModal();
      return;
    }

    trapCdOrderFocus(event);
  });

  cdOrderForm?.addEventListener("submit", (event) => {
    event.preventDefault();

    if (!cdOrderForm.checkValidity()) {
      cdOrderForm.reportValidity();
      return;
    }

    const formData = new FormData(cdOrderForm);
    const email = String(formData.get("email") || "").trim();
    const street = String(formData.get("street") || "").trim();
    const city = String(formData.get("city") || "").trim();
    const cdTitle = String(formData.get("cd-title") || "").trim();
    const quantity = String(formData.get("quantity") || "").trim();
    const format = String(formData.get("format") || "").trim();
    const wishes = String(formData.get("wishes") || "").trim() || "Keine Angabe";

    const emailBody = [
      "CD-Bestellung Mélange à Deux",
      "",
      "Absender-E-Mail:",
      email,
      "",
      "Versandadresse:",
      `Straße: ${street}`,
      `PLZ / Ort: ${city}`,
      "",
      "CD:",
      cdTitle,
      "",
      "Anzahl:",
      quantity,
      "",
      "Format:",
      format,
      "",
      "Weitere Wünsche:",
      wishes,
    ].join("\n");

    const mailtoUrl = `mailto:${cdOrderRecipient}?subject=${encodeURIComponent(
      cdOrderSubject
    )}&body=${encodeURIComponent(emailBody)}`;

    window.location.href = mailtoUrl;
  });
}
