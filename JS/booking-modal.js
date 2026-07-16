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

(() => {
  const referencesTrigger = document.querySelector('[data-references-open]');
  if (!referencesTrigger) return;

  const references = [
    'Von Busch Hof Freinsheim',
    'Alte Post (Euroclassics) Pirmasens',
    'Atelier 29, Hainfeld',
    'Amtshaus "A Table", Freinsheim',
    'Badehaisl Kulturverein, Wachenheim',
    'Baden Badener Sommernächte',
    'Battenberger Burgkultur',
    'Beleuchtete Kirche, Lorsch',
    'Café Kult, Karlsruhe',
    'Café Mandelring, Haardt',
    'Ehemalige Synagoge Weisenheim/Bg.',
    'Filmfestival der Pfalz',
    'Filmgugger Festival Neustadt',
    'Filmfestival Germersheim',
    'Fototage Heimatlichter',
    'Haus Catoir, Bad Dürkheim',
    'Inner Circle Landau-Edenkoben',
    'Karlstorbahnhof Heidelberg',
    'Klinikum Langensteinbach',
    'Street Art Festival, Gönnheim',
    'Kultur im Dorf Hauenstein',
    'Kultur in Rodalben',
    'Kulturamt Bad Dürkheim',
    'Kulturamt Germersheim',
    'Kulturamt Lorsch',
    'Kulturamt Saarlouis',
    'Kulturkeller Bad Dürkheim',
    'Kulturmeile KA-Grötzingen',
    'Kultursommer Rhld.-Pf.',
    'Kulturverein Freinsheim',
    'Kulturviereck Hassloch',
    'Kulturverein Wespennest, Neustadt',
    'Lagerhaus St. Gallen (CH)',
    'Lichtblick, Neustadt',
    'Lustgarten Klagenfurt (AU)',
    'Kulturzentrum Mikado Karlsruhe',
    'Mozartgesellschaft Zweibrücken',
    'Partnerschaftsverein Neuhofen',
    'Partnerschaftsverein Freinsh.-Marcigny',
    'Partnerschaftsverein Schwäbisch Hall',
    'Rotary Club Mannheim-Friedrichsburg',
    'Rotary Club Landau-Neustadt',
    'Seconds Concept Culture, Freinsheim',
    'Sieben Mühlen Kultur, Großkarlbach',
    'Sommerchorkonzerte Garsten (Aut)',
    'Spiegelpalast Neustadt/Wstr.',
    'Sturmfedersches Schloss Dirmstein',
    'Theater der Liebe, Freinsheim',
    'Theater Blaues Haus Bolanden',
    'Theater in der Kurve, Neustadt',
    'Villa Böhm, Neustadt/Wstr.',
    'Villa for Forest, Klagenfurt (Aut)',
    'Friedenskapelle Kaiserslautern',
    'Wein & Jazz, Hassloch',
    'Weingut Mussler, Bissersheim',
    'Wine Street Art Festival Gönnheim',
    'Women Business Club, Mannheim',
  ];

  const overlay = document.createElement('div');
  overlay.className = 'references-overlay';
  overlay.id = 'references-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const backdrop = document.createElement('div');
  backdrop.className = 'references-overlay__backdrop';
  backdrop.setAttribute('aria-hidden', 'true');

  const dialog = document.createElement('div');
  dialog.className = 'references-modal';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');
  dialog.setAttribute('aria-labelledby', 'references-modal-title');
  dialog.setAttribute('tabindex', '-1');

  const closeButton = document.createElement('button');
  closeButton.className = 'references-modal__close';
  closeButton.type = 'button';
  closeButton.setAttribute('aria-label', 'Referenzen schließen');
  closeButton.textContent = '✕';

  const header = document.createElement('header');
  header.className = 'references-modal__header';

  const title = document.createElement('h2');
  title.id = 'references-modal-title';
  title.textContent = 'Referenzen';

  const list = document.createElement('ul');
  list.className = 'references-modal__list';

  references.forEach((reference) => {
    const item = document.createElement('li');
    item.textContent = reference;
    list.append(item);
  });

  header.append(title);
  dialog.append(closeButton, header, list);
  overlay.append(backdrop, dialog);
  document.body.append(overlay);

  let previouslyFocusedElement = null;

  const getFocusableElements = () => Array.from(dialog.querySelectorAll(
    'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
  )).filter((element) => element.offsetParent !== null || element === document.activeElement);

  const openReferences = (event) => {
    event.preventDefault();
    previouslyFocusedElement = document.activeElement;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('overlay-open');
    window.setTimeout(() => closeButton.focus(), 0);
  };

  const closeReferences = () => {
    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('overlay-open');

    if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
      previouslyFocusedElement.focus();
    }
  };

  const handleKeydown = (event) => {
    if (!overlay.classList.contains('is-open')) return;

    if (event.key === 'Escape') {
      event.preventDefault();
      closeReferences();
      return;
    }

    if (event.key !== 'Tab') return;

    const focusableElements = getFocusableElements();
    if (!focusableElements.length) {
      event.preventDefault();
      dialog.focus();
      return;
    }

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

  referencesTrigger.addEventListener('click', openReferences);
  closeButton.addEventListener('click', closeReferences);
  backdrop.addEventListener('click', closeReferences);
  document.addEventListener('keydown', handleKeydown);
})();
