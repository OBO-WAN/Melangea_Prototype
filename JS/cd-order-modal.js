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
  cdOrderForm?.setAttribute("novalidate", "");
  let cdOrderLastFocusedElement = null;
  let isCdOrderSubmitting = false;
  const cdEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  const ensureCdOrderError = (field) => {
    if (!field) return null;
    if (!field.id) field.id = `cd-order-${field.name}-field`;
    let error = cdOrderForm?.querySelector(`[data-error-for="${field.id}"]`);
    if (error) return error;
    error = document.createElement("p");
    error.id = `${field.id}-error`;
    error.className = "form-field__error";
    error.dataset.errorFor = field.id;
    error.hidden = true;
    const describedBy = (field.getAttribute("aria-describedby") || "").split(/\s+/).filter(Boolean);
    if (!describedBy.includes(error.id)) {
      describedBy.push(error.id);
      field.setAttribute("aria-describedby", describedBy.join(" "));
    }
    (field.closest(".cd-order-field, .cd-order-choice, .cd-order-consent, .cd-order-fieldset") || field.parentElement)?.appendChild(error);
    return error;
  };

  const showCdOrderError = (field, message) => {
    const error = ensureCdOrderError(field);
    if (!field || !error) return;
    field.setAttribute("aria-invalid", "true");
    error.textContent = message;
    error.hidden = false;
  };

  const clearCdOrderErrors = () => {
    cdOrderForm?.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute("aria-invalid"));
    cdOrderForm?.querySelectorAll("[data-error-for]").forEach((error) => {
      error.textContent = "";
      error.hidden = true;
    });
  };

  const validateCdOrderForm = () => {
    clearCdOrderErrors();
    const errors = [];
    const byName = (name) => cdOrderForm?.elements[name];
    const value = (name) => {
      const field = byName(name);
      if (field && typeof field.value === "string") field.value = field.value.trim();
      return field?.value || "";
    };

    if (!value("first_name")) errors.push([byName("first_name"), "Bitte geben Sie Ihren Vornamen ein."]);
    if (!value("last_name")) errors.push([byName("last_name"), "Bitte geben Sie Ihren Nachnamen ein."]);
    if (!value("email")) errors.push([byName("email"), "Bitte geben Sie Ihre E-Mail-Adresse ein."]);
    else if (!cdEmailPattern.test(value("email"))) errors.push([byName("email"), "Bitte geben Sie eine gültige E-Mail-Adresse ein."]);
    if (!value("street")) errors.push([byName("street"), "Bitte geben Sie Straße und Hausnummer ein."]);
    if (!value("postal_code")) errors.push([byName("postal_code"), "Bitte geben Sie Ihre Postleitzahl ein."]);
    else if (!/^\d{5}$/.test(value("postal_code"))) errors.push([byName("postal_code"), "Bitte geben Sie eine gültige Postleitzahl mit 5 Ziffern ein."]);
    if (!value("city")) errors.push([byName("city"), "Bitte geben Sie Ihren Ort ein."]);
    if (!value("quantity") || !/^\d+$/.test(value("quantity")) || Number(value("quantity")) < 1) {
      errors.push([byName("quantity"), "Bitte geben Sie eine gültige Anzahl ein."]);
    }
    if (!byName("consent")?.checked) errors.push([byName("consent"), "Bitte stimmen Sie der Datenschutzerklärung zu."]);

    errors.forEach(([field, message]) => showCdOrderError(field, message));
    return errors;
  };


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

    if (isCdOrderSubmitting) {
      return;
    }

    const validationErrors = validateCdOrderForm();
    if (validationErrors.length > 0) {
      setCdOrderStatus("Bitte prüfen Sie die Pflichtfelder.", "error");
      validationErrors[0][0]?.focus();
      return;
    }

    const originalButtonText = cdOrderSubmitButton?.textContent || "";

    try {
      isCdOrderSubmitting = true;
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
      isCdOrderSubmitting = false;
      if (cdOrderSubmitButton) {
        cdOrderSubmitButton.disabled = false;
        cdOrderSubmitButton.textContent = originalButtonText;
      }
    }
  });
}
