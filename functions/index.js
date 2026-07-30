const {setGlobalOptions} = require("firebase-functions/v2");
const {
  onDocumentCreated,
} = require("firebase-functions/v2/firestore");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

const ADMIN_EMAIL = "info@melangea2.com";
const MAIL_COLLECTION = "mail";

setGlobalOptions({
  region: "europe-west3",
  maxInstances: 3,
});

initializeApp();

const db = getFirestore();

/**
 * Normalizes a form value and limits its length.
 *
 * @param {*} value Value to normalize.
 * @param {number} maxLength Maximum permitted length.
 * @return {string} Normalized text.
 */
function cleanText(value, maxLength) {
  if (typeof value !== "string") {
    return "";
  }

  return value
      .replace(/\r\n?/g, "\n")
      .replace(/[^\P{C}\n\t]+/gu, "")
      .trim()
      .slice(0, maxLength);
}

/**
 * Escapes text for safe HTML output.
 *
 * @param {*} value Value to escape.
 * @return {string} HTML-safe text.
 */
function escapeHtml(value) {
  return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll("\"", "&quot;")
      .replaceAll("'", "&#039;");
}

/**
 * Builds one HTML field for an email message.
 *
 * @param {string} label Field label.
 * @param {string} value Field value.
 * @return {string} HTML paragraph containing the field.
 */
function htmlField(label, value) {
  return [
    "<p><strong>",
    escapeHtml(label),
    ":</strong> ",
    escapeHtml(value),
    "</p>",
  ].join("");
}

/**
 * Builds the internal newsletter notification.
 *
 * @param {Object} signup Sanitized signup data.
 * @return {{subject: string, text: string, html: string}} Mail message.
 */
function buildAdminMessage(signup) {
  const html = [
    "<h2>Neue Newsletter-Anmeldung</h2>",
    htmlField("Vorname", signup.firstName),
    htmlField("Nachname", signup.lastName),
    htmlField("E-Mail", signup.email),
    htmlField("Postleitzahl", signup.postalCode),
    htmlField("Nachricht", signup.message),
    htmlField("Einwilligung", "Ja"),
  ].join("\n");

  const text = [
    "Neue Newsletter-Anmeldung",
    "",
    `Vorname: ${signup.firstName}`,
    `Nachname: ${signup.lastName}`,
    `E-Mail: ${signup.email}`,
    `Postleitzahl: ${signup.postalCode}`,
    `Nachricht: ${signup.message}`,
    "Einwilligung: Ja",
  ].join("\n");

  return {
    subject: "Neue Newsletter-Anmeldung",
    text,
    html,
  };
}

/**
 * Builds the confirmation email for the subscriber.
 *
 * @param {Object} signup Sanitized signup data.
 * @return {{subject: string, text: string, html: string}} Mail message.
 */
function buildConfirmationMessage(signup) {
  const greeting = signup.firstName ?
    `Guten Tag ${signup.firstName},` :
    "Guten Tag,";

  const html = [
    `<p>${escapeHtml(greeting)}</p>`,
    "<p>vielen Dank für Ihre Anmeldung zum Newsletter von " +
      "Mélange à Deux &amp; Amis.</p>",
    "<p>Wir haben folgende Angaben erhalten:</p>",
    htmlField("Vorname", signup.firstName),
    htmlField("Nachname", signup.lastName),
    htmlField("E-Mail", signup.email),
    htmlField("Postleitzahl", signup.postalCode),
    htmlField("Nachricht", signup.message),
    "<p>Ihre Anmeldung wurde erfolgreich gespeichert.</p>",
    "<p>Herzliche Grüße<br>Mélange à Deux &amp; Amis</p>",
  ].join("\n");

  const text = [
    greeting,
    "",
    "vielen Dank für Ihre Anmeldung zum Newsletter von " +
      "Mélange à Deux & Amis.",
    "",
    "Wir haben folgende Angaben erhalten:",
    `Vorname: ${signup.firstName}`,
    `Nachname: ${signup.lastName}`,
    `E-Mail: ${signup.email}`,
    `Postleitzahl: ${signup.postalCode}`,
    `Nachricht: ${signup.message}`,
    "",
    "Ihre Anmeldung wurde erfolgreich gespeichert.",
    "",
    "Herzliche Grüße",
    "Mélange à Deux & Amis",
  ].join("\n");

  return {
    subject: "Bestätigung Ihrer Newsletter-Anmeldung",
    text,
    html,
  };
}

exports.sendNewsletterEmails = onDocumentCreated(
    {
      document: "newsletter_signups/{signupId}",
      retry: true,
    },
    async (event) => {
      const snapshot = event.data;

      if (!snapshot) {
        logger.error("Newsletter-Dokument nicht verfügbar.");
        return;
      }

      const signupId = event.params.signupId;
      const data = snapshot.data();

      const signup = {
        firstName: cleanText(data.firstName, 80),
        lastName: cleanText(data.lastName, 80),
        email: cleanText(data.email, 320),
        postalCode: cleanText(data.postalCode, 20),
        message: cleanText(data.message, 2000) || "Keine Angabe",
        consent: data.consent === true,
      };

      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(signup.email) || !signup.consent) {
        logger.warn("Ungültige Newsletter-Anmeldung übersprungen.", {
          signupId,
        });
        return;
      }

      const adminMailRef = db
          .collection(MAIL_COLLECTION)
          .doc(`newsletter-admin-${signupId}`);

      const confirmationMailRef = db
          .collection(MAIL_COLLECTION)
          .doc(`newsletter-confirm-${signupId}`);

      await db.runTransaction(async (transaction) => {
        const [adminMail, confirmationMail] = await Promise.all([
          transaction.get(adminMailRef),
          transaction.get(confirmationMailRef),
        ]);

        if (!adminMail.exists) {
          transaction.create(adminMailRef, {
            to: [ADMIN_EMAIL],
            replyTo: signup.email,
            message: buildAdminMessage(signup),
          });
        }

        if (!confirmationMail.exists) {
          transaction.create(confirmationMailRef, {
            to: [signup.email],
            replyTo: ADMIN_EMAIL,
            message: buildConfirmationMessage(signup),
          });
        }
      });

      logger.info("Newsletter-E-Mails wurden eingereiht.", {
        signupId,
      });
    },
);

