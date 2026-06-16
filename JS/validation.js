const newsletterForm = document.querySelector(
  "#newsletter-overlay .newsletter-form",
);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function ensureInlineError(input) {
  if (!input) return null;

  if (!input.id) {
    input.id = `${input.name || "field"}-input`;
  }

  let error = document.querySelector(`[data-error-for="${input.id}"]`);
  if (error) return error;

  error = document.createElement("p");
  error.id = `${input.id}-error`;
  error.className = "form-field__error";
  error.dataset.errorFor = input.id;
  error.hidden = true;

  const describedBy = (input.getAttribute("aria-describedby") || "")
    .split(/\s+/)
    .filter(Boolean);
  if (!describedBy.includes(error.id)) {
    describedBy.push(error.id);
    input.setAttribute("aria-describedby", describedBy.join(" "));
  }

  const wrapper = input.closest(".newsletter-field, .newsletter-consent") || input.parentElement;
  wrapper?.appendChild(error);
  return error;
}

function showInlineError(input, message) {
  const error = ensureInlineError(input);
  if (!input || !error) return;

  input.setAttribute("aria-invalid", "true");
  error.textContent = message;
  error.hidden = false;
}

function clearInlineError(input) {
  if (!input) return;
  const error = ensureInlineError(input);
  input.removeAttribute("aria-invalid");
  if (error) {
    error.textContent = "";
    error.hidden = true;
  }
}

function trimInput(input) {
  if (input && typeof input.value === "string") {
    input.value = input.value.trim();
  }
}

function validateNewsletterForm(form = newsletterForm, { focusInvalid = false } = {}) {
  if (!form) return true;

  const firstNameInput = form.querySelector("#newsletter-first-name");
  const lastNameInput = form.querySelector("#newsletter-last-name");
  const emailInput = form.querySelector("#newsletter-email");
  const postalCodeInput = form.querySelector("#newsletter-postal-code");
  const messageInput = form.querySelector("#newsletter-message");
  const consentInput = form.querySelector('input[name="consent"]');
  const errors = [];

  [firstNameInput, lastNameInput, emailInput, postalCodeInput, messageInput, consentInput].forEach(clearInlineError);
  [firstNameInput, lastNameInput, emailInput, postalCodeInput, messageInput].forEach(trimInput);

  if (!firstNameInput?.value) {
    errors.push([firstNameInput, "Bitte geben Sie Ihren Vornamen ein."]);
  } else if (/\d/.test(firstNameInput.value)) {
    errors.push([firstNameInput, "Der Vorname darf keine Ziffern enthalten."]);
  }

  if (!lastNameInput?.value) {
    errors.push([lastNameInput, "Bitte geben Sie Ihren Nachnamen ein."]);
  } else if (/\d/.test(lastNameInput.value)) {
    errors.push([lastNameInput, "Der Nachname darf keine Ziffern enthalten."]);
  }

  if (!emailInput?.value) {
    errors.push([emailInput, "Bitte geben Sie Ihre E-Mail-Adresse ein."]);
  } else if (!emailPattern.test(emailInput.value)) {
    errors.push([emailInput, "Bitte geben Sie eine gültige E-Mail-Adresse ein."]);
  }

  if (postalCodeInput?.value && !/^\d{5}$/.test(postalCodeInput.value)) {
    errors.push([postalCodeInput, "Bitte geben Sie eine gültige Postleitzahl mit 5 Ziffern ein."]);
  }

  if (!consentInput?.checked) {
    errors.push([consentInput, "Bitte stimmen Sie der Datenschutzerklärung zu."]);
  }

  errors.forEach(([input, message]) => showInlineError(input, message));

  if (errors.length && focusInvalid) {
    errors[0][0]?.focus();
  }

  return errors.length === 0;
}

if (newsletterForm) {
  newsletterForm.setAttribute("novalidate", "");
  const watchedFields = [
    "#newsletter-first-name",
    "#newsletter-last-name",
    "#newsletter-email",
    "#newsletter-postal-code",
    "#newsletter-message",
    'input[name="consent"]',
  ];

  watchedFields.forEach((selector) => {
    const field = newsletterForm.querySelector(selector);
    if (!field) return;

    ensureInlineError(field);
    const eventName = field.type === "checkbox" ? "change" : "input";
    field.addEventListener(eventName, () => {
      if (field === newsletterForm.querySelector("#newsletter-postal-code")) {
        field.value = field.value.replace(/[^\d]/g, "");
      }
      validateNewsletterForm(newsletterForm);
    });
    field.addEventListener("blur", () => validateNewsletterForm(newsletterForm));
  });
}

window.validateNewsletterForm = validateNewsletterForm;
window.customFormValidation = {
  ensureInlineError,
  showInlineError,
  clearInlineError,
};
