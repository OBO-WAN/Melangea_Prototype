(function () {
  'use strict';

  const pathPattern = /^assets\/downloads\/booking\/(?:managed\/)?[A-Za-z0-9._-]+\.(pdf|zip)$/i;
  const idPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/i;
  const stylesheetHref = 'css/subpages/booking/download-links.css';
  const svgNamespace = 'http://www.w3.org/2000/svg';

  function validItem(item) {
    return item && typeof item === 'object' && idPattern.test(item.id) &&
      typeof item.label === 'string' && item.label.trim() !== '' && item.label.length <= 160 &&
      pathPattern.test(item.path) && ['pdf', 'zip'].includes(item.fileType) &&
      item.path.toLowerCase().endsWith('.' + item.fileType) &&
      ['left', 'right'].includes(item.column) && Number.isInteger(item.order) && item.order > 0 &&
      typeof item.managedUpload === 'boolean';
  }

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
    const cleanLabel = label.replace(/\s+/g, ' ').trim();
    const labelElement = document.createElement('span');
    labelElement.className = 'booking-download-link__label';
    labelElement.textContent = cleanLabel;

    link.dataset.bookingLinkType = type;
    link.setAttribute('aria-label', type === 'references' ? cleanLabel + ' anzeigen' : cleanLabel + ' herunterladen');
    link.replaceChildren(labelElement, createIcon(type));
  }

  function decorateFallbackLinks() {
    document.querySelectorAll('[data-booking-downloads] a[download]').forEach((link) => {
      const label = link.textContent.replace(/^\s*Download\s*/i, '');
      decorateLink(link, label, 'download');
    });

    const references = document.querySelector('[data-references-open]');
    if (references) decorateLink(references, references.textContent, 'references');
  }

  ensureStylesheet();
  decorateFallbackLinks();

  fetch('data/booking-downloads.json', { credentials: 'same-origin' })
    .then((response) => response.ok ? response.json() : Promise.reject(new Error('Daten nicht verfügbar')))
    .then((items) => {
      if (!Array.isArray(items) || !items.every(validItem) || new Set(items.map((item) => item.id)).size !== items.length) throw new Error('Ungültige Daten');
      ['left', 'right'].forEach((column) => {
        const target = document.querySelector('[data-booking-downloads="' + column + '"]');
        if (!target) return;
        const references = column === 'left' ? target.querySelector('[data-references-open]') : null;
        target.replaceChildren();
        items.filter((item) => item.column === column).sort((a, b) => a.order - b.order || a.id.localeCompare(b.id, 'de'))
          .forEach((item) => {
            const link = document.createElement('a');
            link.href = item.path;
            link.download = '';
            decorateLink(link, item.label, 'download');
            target.append(link);
          });
        if (references) target.append(references);
      });
      if (window.AOS && typeof window.AOS.refreshHard === 'function') {
        window.AOS.refreshHard();
      } else if (window.AOS && typeof window.AOS.refresh === 'function') {
        window.AOS.refresh();
      }
    })
    .catch(() => { /* The decorated static fallback links remain available. */ });
}());
