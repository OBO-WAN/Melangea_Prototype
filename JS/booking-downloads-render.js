(function () {
  'use strict';

  const pathPattern = /^assets\/downloads\/booking\/(?:managed\/)?[A-Za-z0-9._-]+\.(pdf|zip)$/i;
  const idPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/i;

  function validItem(item) {
    return item && typeof item === 'object' && idPattern.test(item.id) &&
      typeof item.label === 'string' && item.label.trim() !== '' && item.label.length <= 160 &&
      pathPattern.test(item.path) && ['pdf', 'zip'].includes(item.fileType) &&
      item.path.toLowerCase().endsWith('.' + item.fileType) &&
      ['left', 'right'].includes(item.column) && Number.isInteger(item.order) && item.order > 0 &&
      typeof item.managedUpload === 'boolean';
  }

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
            link.textContent = 'Download ' + item.label;
            target.append(link);
          });
        if (references) target.append(references);
      });
      if (window.AOS && typeof window.AOS.refresh === 'function') window.AOS.refresh();
    })
    .catch(() => { /* The static fallback links remain available. */ });
}());
