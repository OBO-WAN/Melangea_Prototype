import {getFirestoreServices} from "./firebase-config.js";

const newsletterForm = document.querySelector(
    "#newsletter-overlay .newsletter-form",
);

if (newsletterForm) {
  newsletterForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstNameInput =
      document.getElementById("newsletter-first-name");
    const lastNameInput =
      document.getElementById("newsletter-last-name");
    const emailInput =
      document.getElementById("newsletter-email");
    const postalCodeInput =
      document.getElementById("newsletter-postal-code");
    const messageInput =
      document.getElementById("newsletter-message");
    const consentInput =
      newsletterForm.querySelector('input[name="consent"]');

    if (
      !window.validateNewsletterForm?.(
          newsletterForm,
          {focusInvalid: true},
      )
    ) {
      return;
    }

    const firstName = firstNameInput?.value.trim() || "";
    const lastName = lastNameInput?.value.trim() || "";
    const email = emailInput?.value.trim() || "";
    const postalCode = postalCodeInput?.value.trim() || "";
    const message = messageInput?.value.trim() || "";
    const consent = consentInput?.checked || false;

    const submitButton =
      newsletterForm.querySelector('button[type="submit"]');
    const originalButtonText =
      submitButton ? submitButton.textContent : "";

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Wird gesendet...";
      }

      const {
        db,
        addDoc,
        collection,
        serverTimestamp,
      } = await getFirestoreServices();

      await addDoc(collection(db, "newsletter_signups"), {
        firstName,
        lastName,
        email,
        postalCode,
        message,
        consent,
        createdAt: serverTimestamp(),
      });

      alert(
          "Vielen Dank! Ihre Anmeldung wurde gespeichert. " +
          "Sie erhalten in Kürze eine Bestätigung per E-Mail.",
      );

      newsletterForm.reset();
    } catch (error) {
      console.error(
          "Fehler beim Speichern der Newsletter-Anmeldung:",
          error,
      );

      alert(
          "Die Anmeldung konnte nicht gespeichert werden. " +
          "Bitte versuchen Sie es erneut.",
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
}