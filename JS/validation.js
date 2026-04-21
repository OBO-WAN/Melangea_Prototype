const newsletterForm = document.querySelector(
  "#newsletter-overlay .newsletter-form",
);

if (newsletterForm) {
  const firstNameInput = newsletterForm.querySelector("#newsletter-first-name");
  const lastNameInput = newsletterForm.querySelector("#newsletter-last-name");
  const emailInput = newsletterForm.querySelector("#newsletter-email");
  const postalCodeInput = newsletterForm.querySelector(
    "#newsletter-postal-code",
  );
  const consentInput = newsletterForm.querySelector('input[name="consent"]');

  const trimValue = (input) => {
    if (input && typeof input.value === "string") {
      input.value = input.value.trim();
    }
  };

  const validateNameField = (input, label) => {
    if (!input) return true;

    trimValue(input);
    input.setCustomValidity("");

    if (!input.value) {
      input.setCustomValidity(`Bitte ${label.toLowerCase()} eingeben.`);
      return false;
    }

    if (/\d/.test(input.value)) {
      input.setCustomValidity(`${label} darf keine Ziffern enthalten.`);
      return false;
    }

    return true;
  };

  const validateEmailField = () => {
    if (!emailInput) return true;

    emailInput.value = emailInput.value.trim();
    emailInput.setCustomValidity("");

    if (!emailInput.value) {
      emailInput.setCustomValidity("Bitte eine E-Mail-Adresse eingeben.");
      return false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

    if (!emailPattern.test(emailInput.value)) {
      emailInput.setCustomValidity(
        "Bitte eine vollständige und gültige E-Mail-Adresse eingeben.",
      );
      return false;
    }

    return true;
  };

  const validatePostalCodeField = () => {
    if (!postalCodeInput) return true;

    postalCodeInput.value = postalCodeInput.value.trim();
    postalCodeInput.setCustomValidity("");

    if (!postalCodeInput.value) {
      return true;
    }

    if (!/^\d{5}$/.test(postalCodeInput.value)) {
      postalCodeInput.setCustomValidity(
        "Bitte eine gültige PLZ mit 5 Ziffern eingeben.",
      );
      return false;
    }

    return true;
  };

  const validateConsentField = () => {
    if (!consentInput) return true;

    consentInput.setCustomValidity("");

    if (!consentInput.checked) {
      consentInput.setCustomValidity(
        "Bitte stimmen Sie der Verarbeitung Ihrer Daten zu.",
      );
      return false;
    }

    return true;
  };

  const validateForm = () => {
    const validations = [
      validateNameField(firstNameInput, "Vorname"),
      validateNameField(lastNameInput, "Nachname"),
      validateEmailField(),
      validatePostalCodeField(),
      validateConsentField(),
    ];

    return validations.every(Boolean);
  };

  if (firstNameInput) {
    firstNameInput.addEventListener("input", () => {
      validateNameField(firstNameInput, "Vorname");
    });

    firstNameInput.addEventListener("blur", () => {
      validateNameField(firstNameInput, "Vorname");
    });
  }

  if (lastNameInput) {
    lastNameInput.addEventListener("input", () => {
      validateNameField(lastNameInput, "Nachname");
    });

    lastNameInput.addEventListener("blur", () => {
      validateNameField(lastNameInput, "Nachname");
    });
  }

  if (emailInput) {
    emailInput.addEventListener("input", validateEmailField);
    emailInput.addEventListener("blur", validateEmailField);
  }

  if (postalCodeInput) {
    postalCodeInput.addEventListener("input", () => {
      postalCodeInput.value = postalCodeInput.value.replace(/[^\d]/g, "");
      validatePostalCodeField();
    });

    postalCodeInput.addEventListener("blur", validatePostalCodeField);
  }

  if (consentInput) {
    consentInput.addEventListener("change", validateConsentField);
  }

  newsletterForm.addEventListener("submit", (event) => {
    trimValue(firstNameInput);
    trimValue(lastNameInput);

    const isValid = validateForm();

    if (!isValid) {
      event.preventDefault();
      newsletterForm.reportValidity();

      const firstInvalidField = [
        firstNameInput,
        lastNameInput,
        emailInput,
        postalCodeInput,
        consentInput,
      ].find((field) => field && !field.checkValidity());

      if (firstInvalidField) {
        firstInvalidField.focus();
      }
    }
  });
}
