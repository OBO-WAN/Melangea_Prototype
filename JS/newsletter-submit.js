import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const newsletterForm = document.querySelector(
  "#newsletter-overlay .newsletter-form"
);

const NOTIFICATION_EMAIL = "info@melangea2.com";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

if (newsletterForm) {
  newsletterForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstNameInput = document.getElementById("newsletter-first-name");
    const lastNameInput = document.getElementById("newsletter-last-name");
    const emailInput = document.getElementById("newsletter-email");
    const postalCodeInput = document.getElementById("newsletter-postal-code");
    const messageInput = document.getElementById("newsletter-message");
    const consentInput = newsletterForm.querySelector('input[name="consent"]');

    if (!window.validateNewsletterForm?.(newsletterForm, { focusInvalid: true })) {
      return;
    }

    const db = window.firestoreDb;

    if (!db) {
      alert("Firestore ist nicht initialisiert.");
      return;
    }

    const firstName = firstNameInput?.value.trim() || "";
    const lastName = lastNameInput?.value.trim() || "";
    const email = emailInput?.value.trim() || "";
    const postalCode = postalCodeInput?.value.trim() || "";
    const message = messageInput?.value.trim() || "";
    const consent = consentInput?.checked || false;

    const submitButton = newsletterForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : "";

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Wird gesendet...";
      }

      await addDoc(collection(db, "newsletter_signups"), {
        firstName,
        lastName,
        email,
        postalCode,
        message,
        consent,
        createdAt: serverTimestamp(),
      });

      await addDoc(collection(db, "mail"), {
        to: [NOTIFICATION_EMAIL],
        message: {
          subject: "Neue Newsletter-Anmeldung",
          html: `
            <h2>Neue Newsletter-Anmeldung</h2>
            <p><strong>Vorname:</strong> ${escapeHtml(firstName)}</p>
            <p><strong>Nachname:</strong> ${escapeHtml(lastName)}</p>
            <p><strong>Email:</strong> ${escapeHtml(email)}</p>
            <p><strong>Postleitzahl:</strong> ${escapeHtml(postalCode)}</p>
            <p><strong>Nachricht:</strong> ${escapeHtml(message)}</p>
            <p><strong>Einwilligung:</strong> ${consent ? "Ja" : "Nein"}</p>
          `,
        },
      });

      alert("Vielen Dank! Ihre Anmeldung wurde gespeichert.");
      newsletterForm.reset();
    } catch (error) {
      console.error("Fehler beim Speichern der Newsletter-Anmeldung:", error);
      alert("Die Anmeldung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = originalButtonText;
      }
    }
  });
}