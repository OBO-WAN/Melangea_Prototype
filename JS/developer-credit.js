(function () {
  'use strict';

  function addDeveloperCredit() {
    const footer = document.querySelector('.site-footer');
    if (!footer || footer.querySelector('.footer-credit')) return;

    const stylesheetHref = 'css/developer-credit.css';
    if (!document.querySelector(`link[href="${stylesheetHref}"]`)) {
      const stylesheet = document.createElement('link');
      stylesheet.rel = 'stylesheet';
      stylesheet.href = stylesheetHref;
      document.head.append(stylesheet);
    }

    const credit = document.createElement('div');
    credit.className = 'footer-credit';

    const label = document.createElement('span');
    label.textContent = 'Developed by';

    const link = document.createElement('a');
    link.href = 'https://naranjo.io';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'naranjo.io';
    link.setAttribute('aria-label', 'Website des Entwicklers naranjo.io');

    credit.append(label, link);
    footer.append(credit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', addDeveloperCredit, { once: true });
  } else {
    addDeveloperCredit();
  }
}());
