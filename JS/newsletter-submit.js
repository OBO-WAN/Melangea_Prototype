import {
  collection,
  addDoc,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/12.12.1/firebase-firestore.js";

const newsletterForm = document.querySelector(
  "#newsletter-overlay .newsletter-form"
);

if (newsletterForm) {
  newsletterForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const firstNameInput = document.getElementById("newsletter-first-name");
    const lastNameInput = document.getElementById("newsletter-last-name");
    const emailInput = document.getElementById("newsletter-email");
    const postalCodeInput = document.getElementById("newsletter-postal-code");
    const messageInput = document.getElementById("newsletter-message");
    const consentInput = newsletterForm.querySelector('input[name="consent"]');

    if (!newsletterForm.checkValidity()) {
      newsletterForm.reportValidity();
      return;
    }

    const db = window.firestoreDb;

    if (!db) {
      alert("Firestore ist nicht initialisiert.");
      return;
    }

    const submitButton = newsletterForm.querySelector('button[type="submit"]');
    const originalButtonText = submitButton ? submitButton.textContent : "";

    try {
      if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = "Wird gesendet...";
      }

      await addDoc(collection(db, "newsletter_signups"), {
        firstName: firstNameInput?.value.trim() || "",
        lastName: lastNameInput?.value.trim() || "",
        email: emailInput?.value.trim() || "",
        postalCode: postalCodeInput?.value.trim() || "",
        message: messageInput?.value.trim() || "",
        consent: consentInput?.checked || false,
        createdAt: serverTimestamp(),
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