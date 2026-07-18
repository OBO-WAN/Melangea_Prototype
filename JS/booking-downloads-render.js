(function () {
  'use strict';

  const pathPattern = /^assets\/downloads\/booking\/(?:managed\/)?[A-Za-z0-9._-]+\.(pdf|zip)$/i;
  const stylesheetHref = 'css/subpages/booking/download-links.css';
  const svgNamespace = 'http://www.w3.org/2000/svg';
  const slots = [
    {
      id: 'pressetext-lang',
      label: 'Pressetext lang',
      fileType: 'pdf',
      selector: 'a[href="assets/downloads/booking/pressetext-lang.pdf"]',
    },
    {
      id: 'pressetext-kurz',
      label: 'Pressetext kurz',
      fileType: 'pdf',
      selector: 'a[href="assets/downloads/booking/pressetext-kurz.pdf"]',
    },
    {
      id: 'kurzbeschreibung',
      label: 'Kurzbeschreibung',
      fileType: 'pdf',
      selector: 'a[href="assets/downloads/booking/kurzbeschreibung.pdf"]',
    },
    {
      id: 'fotos',
      label: 'Fotos',
      fileType: 'zip',
      selector: 'a[href="assets/downloads/booking/fotos.zip"]',
    },
    {
      id: 'biographien-der-musiker',
      label: 'Biographien der Musiker',
      fileType: 'pdf',
      selector: 'a[href="assets/downloads/booking/biographien-der-musiker.pdf"]',
    },
    {
      id: 'repertoire-auszug',
      label: 'Repertoire-Auszug',
      fileType: 'pdf',
      selector: 'a[href="assets/downloads/booking/repertoire-auszug.pdf"]',
    },
    {
      id: 'techrider',
      label: 'Techrider',
      fileType: 'pdf',
      selector: 'a[href="assets/downloads/booking/techrider.pdf"]',
    },
  ];

  function ensureStylesheet() {
    if (document.querySelector('link[href="' + stylesheetHref + '"]')) return;

    const stylesheet = document.createElement('link');
    stylesheet.rel = 'stylesheet';
    stylesheet.href = stylesheetHref;
    document.head.append(stylesheet);
  }

  function createSvgPath(attributes) {
    const path = document.createElementNS(svgNamespace, 'path');
    Object.entries(attributes).forEach(([name, value]) => path.setAttribute(name, value));
    return path;
  }

  function createIcon(type) {
    const wrapper = document.createElement('span');
    wrapper.className = 'booking-download-link__icon';
    wrapper.setAttribute('aria-hidden', 'true');

    const svg = document.createElementNS(svgNamespace, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('focusable', 'false');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.8');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');

    if (type === 'references') {
      svg.append(
        createSvgPath({ d: 'M8 6h11' }),
        createSvgPath({ d: 'M8 12h11' }),
        createSvgPath({ d: 'M8 18h11' }),
        createSvgPath({ d: 'M4.5 6h.01' }),
        createSvgPath({ d: 'M4.5 12h.01' }),
        createSvgPath({ d: 'M4.5 18h.01' }),
      );
    } else {
      svg.append(
        createSvgPath({ d: 'M12 3v12' }),
        createSvgPath({ d: 'm7 10 5 5 5-5' }),
        createSvgPath({ d: 'M5 20h14' }),
      );
    }

    wrapper.append(svg);
    return wrapper;
  }

  function decorateLink(link, label, type) {
    const labelElement = document.createElement('span');
    labelElement.className = 'booking-download-link__label';
    labelElement.textContent = label;

    link.dataset.bookingLinkType = type;
    link.replaceChildren(labelElement, createIcon(type));
  }

  function validItem(item, slot) {
    if (!item || typeof item !== 'object' || item.id !== slot.id || item.fileType !== slot.fileType) {
      return false;
    }

    if (item.path === null) {
      return typeof item.managedUpload === 'boolean';
    }

    return typeof item.path === 'string'
      && pathPattern.test(item.path)
      && item.path.toLowerCase().endsWith('.' + slot.fileType)
      && typeof item.managedUpload === 'boolean';
  }

  function setAvailable(link, slot, path) {
    link.href = path;
    link.download = '';
    link.removeAttribute('aria-disabled');
    link.removeAttribute('title');
    delete link.dataset.bookingLinkUnavailable;
    link.setAttribute('aria-label', slot.label + ' herunterladen');
  }

  function setUnavailable(link, slot) {
    link.removeAttribute('href');
    link.removeAttribute('download');
    link.dataset.bookingLinkUnavailable = 'true';
    link.setAttribute('aria-disabled', 'true');
    link.setAttribute('aria-label', slot.label + ' derzeit nicht verfügbar');
    link.title = 'Derzeit nicht verfügbar';
  }

  ensureStylesheet();

  const fixedLinks = new Map();
  slots.forEach((slot) => {
    const link = document.querySelector(slot.selector);
    if (!link) return;

    fixedLinks.set(slot.id, link);
    decorateLink(link, slot.label, 'download');
    link.setAttribute('aria-label', slot.label + ' herunterladen');
  });

  const references = document.querySelector('[data-references-open]');
  if (references) {
    decorateLink(references, 'Referenzen', 'references');
    references.setAttribute('aria-label', 'Referenzen anzeigen');
  }

  fetch('data/booking-downloads.json', { credentials: 'same-origin' })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('Daten nicht verfügbar')))
    .then((items) => {
      if (!Array.isArray(items)) throw new Error('Ungültige Daten');

      const itemsById = new Map();
      items.forEach((item) => {
        if (item && typeof item.id === 'string') itemsById.set(item.id, item);
      });

      slots.forEach((slot) => {
        const link = fixedLinks.get(slot.id);
        if (!link) return;

        const item = itemsById.get(slot.id);
        if (!validItem(item, slot) || item.path === null) {
          setUnavailable(link, slot);
          return;
        }

        setAvailable(link, slot, item.path);
      });
    })
    .catch(() => {
      // Static fallback links stay available when the data file cannot be loaded.
    });
}());
