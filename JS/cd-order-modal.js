const cdOrderOverlay = document.getElementById("cd-order-overlay");
const cdOrderOpenButtons = document.querySelectorAll("[data-cd-order-open]");
const cdOrderCloseButtons = document.querySelectorAll("[data-cd-order-close]");
const cdOrderForm = document.querySelector(".cd-order-form");
const cdOrderStatus = document.querySelector("[data-cd-order-status]");
const cdOrderSubmitButton = cdOrderForm?.querySelector('button[type="submit"]');
const cdCoverOpenButton = document.querySelector("[data-cd-cover-open]");
const cdCoverLightbox = document.querySelector("[data-cd-cover-lightbox]");
const cdCoverCloseButtons = document.querySelectorAll("[data-cd-cover-close]");
const cdCoverLightboxCloseButton = cdCoverLightbox?.querySelector(
  ".cd-cover-lightbox__close"
);

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

  const getCdOrderFocusableElements = (container = cdOrderOverlay) =>
    Array.from(container.querySelectorAll(cdOrderFocusableSelector)).filter(
      (element) => element.offsetParent !== null
    );

  const isCdCoverLightboxOpen = () =>
    cdCoverLightbox?.getAttribute("aria-hidden") === "false";

  const setCdOrderBodyScroll = (isOpen) => {
    document.body.style.overflow = isOpen ? "hidden" : "";
  };

  const setCdOrderStatus = (message, type = "info") => {
    if (!cdOrderStatus) {
      return;
    }

    cdOrderStatus.textContent = message;
    cdOrderStatus.hidden = !message;
    cdOrderStatus.dataset.status = type;
  };

  const openCdOrderModal = (event) => {
    event.preventDefault();
    cdOrderLastFocusedElement = event.currentTarget;
    cdOrderOverlay.classList.add("is-open");
    cdOrderOverlay.setAttribute("aria-hidden", "false");
    setCdOrderBodyScroll(true);

    const focusableElements = getCdOrderFocusableElements();
    const firstInput = document.getElementById("cd-order-first-name");
    const initialFocus = firstInput || focusableElements[0];

    window.setTimeout(() => {
      initialFocus?.focus();
    }, 0);
  };

  let cdCoverLastFocusedElement = null;

  const closeCdCoverLightbox = (event, shouldRestoreFocus = true) => {
    event?.preventDefault();

    if (!cdCoverLightbox || !isCdCoverLightboxOpen()) {
      return;
    }

    cdCoverLightbox.setAttribute("aria-hidden", "true");

    if (shouldRestoreFocus) {
      cdCoverLastFocusedElement?.focus();
    }
  };

  const openCdCoverLightbox = (event) => {
    event.preventDefault();

    if (!cdCoverLightbox) {
      return;
    }

    cdCoverLastFocusedElement = event.currentTarget;
    cdCoverLightbox.setAttribute("aria-hidden", "false");

    window.setTimeout(() => {
      cdCoverLightboxCloseButton?.focus();
    }, 0);
  };

  const closeCdOrderModal = (event) => {
    event?.preventDefault();
    closeCdCoverLightbox(undefined, false);
    cdOrderOverlay.classList.remove("is-open");
    cdOrderOverlay.setAttribute("aria-hidden", "true");
    setCdOrderBodyScroll(false);
    cdOrderLastFocusedElement?.focus();
  };

  const trapCdOrderFocus = (event) => {
    if (event.key !== "Tab" || !cdOrderOverlay.classList.contains("is-open")) {
      return;
    }

    const focusContainer = isCdCoverLightboxOpen()
      ? cdCoverLightbox
      : cdOrderOverlay;
    const focusableElements = getCdOrderFocusableElements(focusContainer);

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

  cdCoverOpenButton?.addEventListener("click", openCdCoverLightbox);

  cdCoverCloseButtons.forEach((button) => {
    button.addEventListener("click", closeCdCoverLightbox);
  });

  document.addEventListener("keydown", (event) => {
    if (!cdOrderOverlay.classList.contains("is-open")) {
      return;
    }

    if (event.key === "Escape") {
      if (isCdCoverLightboxOpen()) {
        closeCdCoverLightbox(event);
        return;
      }

      closeCdOrderModal(event);
      return;
    }

    trapCdOrderFocus(event);
  });

  cdOrderForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setCdOrderStatus("");

    if (!cdOrderForm.checkValidity()) {
      cdOrderForm.reportValidity();
      setCdOrderStatus("Bitte prüfen Sie die Pflichtfelder.", "error");
      return;
    }

    const originalButtonText = cdOrderSubmitButton?.textContent || "";

    try {
      if (cdOrderSubmitButton) {
        cdOrderSubmitButton.disabled = true;
        cdOrderSubmitButton.textContent = "Bestellung wird gesendet...";
      }

      const response = await fetch(cdOrderForm.action, {
        method: "POST",
        body: new FormData(cdOrderForm),
        headers: {
          Accept: "application/json",
          "X-Requested-With": "fetch",
        },
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        const errors = Array.isArray(payload.errors)
          ? ` ${payload.errors.join(" ")}`
          : "";
        throw new Error(
          `${payload.message || "Die Bestellung konnte nicht gesendet werden."}${errors}`
        );
      }

      cdOrderForm.reset();
      const quantityInput = document.getElementById("cd-order-quantity");
      if (quantityInput) {
        quantityInput.value = "1";
      }
      setCdOrderStatus(
        payload.message || "Vielen Dank! Ihre CD-Bestellung wurde übermittelt.",
        "success"
      );
      cdOrderStatus?.focus?.();
    } catch (error) {
      setCdOrderStatus(
        error instanceof Error
          ? error.message
          : "Die Bestellung konnte nicht gesendet werden. Bitte versuchen Sie es erneut.",
        "error"
      );
    } finally {
      if (cdOrderSubmitButton) {
        cdOrderSubmitButton.disabled = false;
        cdOrderSubmitButton.textContent = originalButtonText;
      }
    }
  });
}
