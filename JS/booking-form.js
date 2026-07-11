(() => {
  const bookingForms = document.querySelectorAll('[data-booking-form]');

  const messages = {
    sending: 'Ihre Anfrage wird übermittelt …',
    success: 'Vielen Dank. Ihre Booking-Anfrage wurde erfolgreich übermittelt. Eine Bestätigung wurde an Ihre E-Mail-Adresse gesendet.',
    validation: 'Bitte überprüfen Sie Ihre Angaben und füllen Sie alle Pflichtfelder korrekt aus.',
    server: 'Die Booking-Anfrage konnte nicht übermittelt werden. Bitte versuchen Sie es später erneut oder schreiben Sie direkt an info@melangea2.com.',
    githubPages: 'Demo-Modus: Auf GitHub Pages kann die Booking-Anfrage nicht direkt versendet werden. Die vollständige Übermittlung ist auf der gehosteten Website verfügbar.',
  };

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const isGitHubPages = window.location.hostname.endsWith('github.io');

  const readJsonResponse = async (response) => {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      throw new Error('Non-JSON response');
    }

    return response.json();
  };

  bookingForms.forEach((bookingForm) => {
    bookingForm.setAttribute('novalidate', '');
    const statusElement = bookingForm.querySelector('[data-booking-status]');
    const submitButton = bookingForm.querySelector('button[type="submit"]');
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

    const getField = (name) => bookingForm.elements[name];

    const setFieldError = (name, message) => {
      const field = getField(name);
      if (!field) return;

      let error = bookingForm.querySelector(`[data-error-for="${field.id}"]`);
      if (!error) {
        error = document.createElement('p');
        error.id = `${field.id}-error`;
        error.className = 'form-field__error';
        error.dataset.errorFor = field.id;
        error.hidden = true;
        const describedBy = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean);
        if (!describedBy.includes(error.id)) {
          describedBy.push(error.id);
          field.setAttribute('aria-describedby', describedBy.join(' '));
        }
        (field.closest('.booking-field, .booking-consent') || field.parentElement)?.appendChild(error);
      }

      field.setAttribute('aria-invalid', 'true');
      error.textContent = message;
      error.hidden = false;
    };

    const clearFieldErrors = () => {
      bookingForm.querySelectorAll('[aria-invalid="true"]').forEach((field) => field.removeAttribute('aria-invalid'));
      bookingForm.querySelectorAll('[data-error-for]').forEach((error) => {
        error.textContent = '';
        error.hidden = true;
      });
    };

    const validateBookingForm = () => {
      clearFieldErrors();
      const errors = {};
      const value = (name) => {
        const field = getField(name);
        if (field && typeof field.value === 'string') field.value = field.value.trim();
        return field?.value || '';
      };

      if (!value('first-name')) errors['first-name'] = 'Bitte geben Sie Ihren Vornamen ein.';
      if (!value('last-name')) errors['last-name'] = 'Bitte geben Sie Ihren Nachnamen ein.';
      if (!value('email')) errors.email = 'Bitte geben Sie Ihre E-Mail-Adresse ein.';
      else if (!emailPattern.test(value('email'))) errors.email = 'Bitte geben Sie eine gültige E-Mail-Adresse ein.';
      if (!value('event-type')) errors['event-type'] = 'Bitte wählen Sie eine Veranstaltungsart aus.';
      if (!value('performance_date')) errors.performance_date = 'Bitte wählen Sie den gewünschten Veranstaltungstermin aus.';
      if (!value('location')) errors.location = 'Bitte geben Sie den Ort ein.';
      if (value('audience-size') && (!/^\d+$/.test(value('audience-size')) || Number(value('audience-size')) < 1)) {
        errors['audience-size'] = 'Bitte geben Sie eine gültige Publikumsgröße ein.';
      }
      if (!value('message')) errors.message = 'Bitte geben Sie Ihre Nachricht ein.';
      if (!getField('contact-consent')?.checked) errors['contact-consent'] = 'Bitte stimmen Sie der Kontaktaufnahme zu.';

      Object.entries(errors).forEach(([name, message]) => setFieldError(name, message));
      return errors;
    };

    const clearCorrectedFieldError = (field) => {
      if (!field?.name || field.getAttribute('aria-invalid') !== 'true') return;

      const value = typeof field.value === 'string' ? field.value.trim() : '';
      const isCorrected = field.type === 'checkbox' ? field.checked : value !== '';
      if (!isCorrected) return;

      const error = field.id ? bookingForm.querySelector(`[data-error-for="${field.id}"]`) : null;
      field.removeAttribute('aria-invalid');
      if (error) {
        error.textContent = '';
        error.hidden = true;
      }
    };

    bookingForm.addEventListener('input', (event) => {
      clearCorrectedFieldError(event.target);
    });

    bookingForm.addEventListener('change', (event) => {
      clearCorrectedFieldError(event.target);
    });

    bookingForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      if (isSubmitting) return;

      clearStatus();

      const validationErrors = validateBookingForm();
      if (Object.keys(validationErrors).length > 0) {
        showStatus(messages.validation, 'error');
        focusFirstInvalidField(validationErrors);
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
        const endpoint = bookingForm.getAttribute('action') || './php/booking-submit.php';
        const response = await fetch(endpoint, {
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
          if (payload.errors && typeof payload.errors === 'object') {
            clearFieldErrors();
            Object.entries(payload.errors).forEach(([name, message]) => setFieldError(name, message));
          }
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
  });
})();
