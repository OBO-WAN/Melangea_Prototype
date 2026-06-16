const bookingForm = document.querySelector('[data-booking-form]');

const messages = {
  sending: 'Ihre Anfrage wird übermittelt …',
  success: 'Vielen Dank. Ihre Booking-Anfrage wurde erfolgreich übermittelt. Eine Bestätigung wurde an Ihre E-Mail-Adresse gesendet.',
  validation: 'Bitte überprüfen Sie Ihre Angaben und füllen Sie alle Pflichtfelder korrekt aus.',
  server: 'Die Booking-Anfrage konnte nicht übermittelt werden. Bitte versuchen Sie es später erneut oder schreiben Sie direkt an info@melangea2.com.',
  githubPages: 'Demo-Modus: Auf GitHub Pages kann die Booking-Anfrage nicht direkt versendet werden. Die vollständige Übermittlung ist auf der gehosteten Website verfügbar.',
};

if (bookingForm) {
  const statusElement = bookingForm.querySelector('[data-booking-status]');
  const submitButton = bookingForm.querySelector('button[type="submit"]');
  const isGitHubPages = window.location.hostname.endsWith('github.io');
  let isSubmitting = false;

  const showStatus = (message, type = 'neutral') => {
    if (!statusElement) return;
    statusElement.textContent = message;
    statusElement.hidden = false;
    statusElement.dataset.status = type;
  };

  const clearStatus = () => {
    if (!statusElement) return;
    statusElement.textContent = '';
    statusElement.hidden = true;
    delete statusElement.dataset.status;
  };

  const setSubmitting = (submitting) => {
    isSubmitting = submitting;
    if (submitButton) {
      submitButton.disabled = submitting;
      submitButton.setAttribute('aria-busy', submitting ? 'true' : 'false');
    }
  };

  const focusFirstInvalidField = (errors = {}) => {
    const firstFieldName = Object.keys(errors)[0];
    if (!firstFieldName) return;

    const field = bookingForm.elements[firstFieldName];
    if (field && typeof field.focus === 'function') {
      field.focus();
    }
  };

  const readJsonResponse = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new Error('Non-JSON response');
    }

    return response.json();
  };

  bookingForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (isSubmitting) return;

    clearStatus();

    if (!bookingForm.reportValidity()) {
      showStatus(messages.validation, 'error');
      return;
    }

    // GitHub Pages hosts static files only and cannot execute the PHP endpoint.
    if (isGitHubPages) {
      showStatus(messages.githubPages, 'error');
      return;
    }

    setSubmitting(true);
    showStatus(messages.sending, 'neutral');

    try {
      const response = await fetch('./php/booking-submit.php', {
        method: 'POST',
        body: new FormData(bookingForm),
        headers: {
          Accept: 'application/json',
        },
      });

      const payload = await readJsonResponse(response);

      if (response.ok && payload.success) {
        bookingForm.reset();
        showStatus(payload.message || messages.success, 'success');
        return;
      }

      if (response.status === 422) {
        showStatus(payload.message || messages.validation, 'error');
        focusFirstInvalidField(payload.errors);
        return;
      }

      showStatus(payload.message || messages.server, 'error');
    } catch (error) {
      showStatus(messages.server, 'error');
    } finally {
      setSubmitting(false);
    }
  });
}
