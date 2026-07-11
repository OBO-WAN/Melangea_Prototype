const bookingOverlay = document.querySelector('#booking-overlay');
const bookingOpenButtons = document.querySelectorAll('[data-booking-open]');

if (bookingOverlay && bookingOpenButtons.length) {
  const bookingDialog = bookingOverlay.querySelector('.booking-modal');
  const bookingCloseButtons = bookingOverlay.querySelectorAll('[data-booking-close]');
  const focusableSelector = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');
  let previouslyFocusedElement = null;

  const getFocusableElements = () => Array.from(bookingOverlay.querySelectorAll(focusableSelector))
    .filter((element) => element.offsetParent !== null || element === document.activeElement);

  const openBookingOverlay = () => {
    previouslyFocusedElement = document.activeElement;
    bookingOverlay.classList.add('is-open');
    bookingOverlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overlay-open');

    const firstField = bookingOverlay.querySelector('[name="first-name"]');
    const firstFocusable = firstField || getFocusableElements()[0] || bookingDialog;
    window.setTimeout(() => firstFocusable?.focus(), 0);
  };

  const closeBookingOverlay = () => {
    bookingOverlay.classList.remove('is-open');
    bookingOverlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overlay-open');

    if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
      previouslyFocusedElement.focus();
    }
  };

  const handleKeydown = (event) => {
    if (!bookingOverlay.classList.contains('is-open')) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeBookingOverlay();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (!focusableElements.length) return;

    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstFocusable) {
      event.preventDefault();
      lastFocusable.focus();
    } else if (!event.shiftKey && document.activeElement === lastFocusable) {
      event.preventDefault();
      firstFocusable.focus();
    }
  };

  bookingOpenButtons.forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      openBookingOverlay();
    });
  });

  bookingCloseButtons.forEach((button) => {
    button.addEventListener('click', closeBookingOverlay);
  });

  document.addEventListener('keydown', handleKeydown);
}
