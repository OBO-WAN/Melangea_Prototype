(() => {
  'use strict';

  const DEMO_PASSWORD = 'demo';
  const SESSION_KEY = 'melange_admin_demo_logged_in';
  const STORAGE_KEY = 'melange_admin_demo_concerts';
  const DATE_PATTERN = /^\d{2}\.\d{2}\.\d{4}$/;
  const TIME_PATTERN = /^\d{2}:\d{2} Uhr$/;
  const STATUSES = ['upcoming', 'past', 'cancelled'];
  const FIELDS = ['date', 'time', 'title', 'venue', 'city', 'description', 'detailsUrl', 'ticketsUrl', 'status'];

  const isLoggedIn = () => sessionStorage.getItem(SESSION_KEY) === 'true';

  const showMessage = (element, text, type = 'success') => {
    if (!element) return;
    element.textContent = text;
    element.className = `demo-message demo-message--${type} is-visible`;
  };

  const clearMessage = (element) => {
    if (!element) return;
    element.textContent = '';
    element.className = 'demo-message';
  };

  const initLogin = () => {
    const form = document.getElementById('demo-login-form');
    if (!form) return;

    const passwordInput = document.getElementById('demo-password');
    const message = document.getElementById('demo-login-message');

    if (isLoggedIn()) {
      window.location.href = 'admin-demo.html';
      return;
    }

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      clearMessage(message);

      // This password is intentionally fake and public. It demonstrates the UI only,
      // protects no real data, and is never sent to a server.
      if (passwordInput.value === DEMO_PASSWORD) {
        sessionStorage.setItem(SESSION_KEY, 'true');
        window.location.href = 'admin-demo.html';
        return;
      }

      showMessage(message, 'Falsches Demo-Passwort. Hinweis: demo', 'error');
    });
  };

  const readStoredConcerts = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    try {
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : null;
    } catch (error) {
      return null;
    }
  };

  const loadConcerts = async () => {
    const storedConcerts = readStoredConcerts();
    if (storedConcerts) return storedConcerts;

    const response = await fetch('concerts-demo.json', { cache: 'no-store' });
    if (!response.ok) {
      throw new Error('Die Demo-Konzertdaten konnten nicht geladen werden.');
    }

    const concerts = await response.json();
    if (!Array.isArray(concerts)) {
      throw new Error('Die Demo-Konzertdaten haben ein ungültiges Format.');
    }

    return concerts;
  };

  const emptyConcert = () => ({
    date: '',
    time: '19:30 Uhr',
    title: 'Konzert',
    venue: '',
    city: '',
    description: '',
    detailsUrl: '#',
    ticketsUrl: '#',
    status: 'upcoming',
  });

  const fillRow = (row, concert, index) => {
    row.querySelector('h2').textContent = `Konzert ${index + 1}`;

    FIELDS.forEach((field) => {
      const input = row.querySelector(`[name="${field}"]`);
      if (!input) return;
      input.value = typeof concert[field] === 'string' ? concert[field] : '';
    });
  };

  const renderConcerts = (concerts) => {
    const rows = document.getElementById('demo-concert-rows');
    const template = document.getElementById('demo-concert-template');
    rows.textContent = '';

    concerts.forEach((concert, index) => {
      const fragment = template.content.cloneNode(true);
      const row = fragment.querySelector('[data-concert-row]');
      fillRow(row, concert, index);
      rows.append(row);
    });
  };

  const renumberRows = () => {
    document.querySelectorAll('[data-concert-row]').forEach((row, index) => {
      row.querySelector('h2').textContent = `Konzert ${index + 1}`;
    });
  };

  const collectConcerts = () => Array.from(document.querySelectorAll('[data-concert-row]')).map((row) => {
    const concert = {};
    FIELDS.forEach((field) => {
      const input = row.querySelector(`[name="${field}"]`);
      concert[field] = input ? input.value.trim() : '';
    });
    return concert;
  });

  const validateConcerts = () => {
    const errors = [];

    document.querySelectorAll('.is-invalid').forEach((field) => {
      field.classList.remove('is-invalid');
    });

    document.querySelectorAll('[data-concert-row]').forEach((row, index) => {
      const dateInput = row.querySelector('[name="date"]');
      const timeInput = row.querySelector('[name="time"]');
      const statusInput = row.querySelector('[name="status"]');
      const rowLabel = `Konzert ${index + 1}`;

      if (!DATE_PATTERN.test(dateInput.value.trim())) {
        dateInput.classList.add('is-invalid');
        errors.push(`${rowLabel}: Datum muss TT.MM.JJJJ sein.`);
      }

      if (!TIME_PATTERN.test(timeInput.value.trim())) {
        timeInput.classList.add('is-invalid');
        errors.push(`${rowLabel}: Uhrzeit muss HH:MM Uhr sein.`);
      }

      if (!STATUSES.includes(statusInput.value)) {
        statusInput.classList.add('is-invalid');
        errors.push(`${rowLabel}: Status muss upcoming, past oder cancelled sein.`);
      }
    });

    return errors;
  };

  const addConcertRow = (concert = emptyConcert()) => {
    const rows = document.getElementById('demo-concert-rows');
    const template = document.getElementById('demo-concert-template');
    const fragment = template.content.cloneNode(true);
    const row = fragment.querySelector('[data-concert-row]');
    fillRow(row, concert, rows.children.length);
    rows.append(row);
    row.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const initEditor = async () => {
    const form = document.getElementById('demo-concert-form');
    if (!form) return;

    if (!isLoggedIn()) {
      window.location.replace('admin-demo-login.html');
      return;
    }

    const message = document.getElementById('demo-editor-message');
    const addButton = document.getElementById('demo-add-concert');
    const logoutButton = document.getElementById('demo-logout');

    try {
      const concerts = await loadConcerts();
      renderConcerts(concerts.length > 0 ? concerts : [emptyConcert()]);
    } catch (error) {
      showMessage(message, error.message, 'error');
      renderConcerts([emptyConcert()]);
    }

    addButton.addEventListener('click', () => {
      clearMessage(message);
      addConcertRow();
    });

    document.addEventListener('click', (event) => {
      const removeButton = event.target.closest('[data-remove-row]');
      if (!removeButton) return;
      removeButton.closest('[data-concert-row]').remove();
      renumberRows();
      clearMessage(message);
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      clearMessage(message);

      const errors = validateConcerts();
      if (errors.length > 0) {
        showMessage(message, errors.join(' '), 'error');
        return;
      }

      // Static demo only: this writes exclusively to localStorage and performs no
      // POST request, PHP call, backend save, or access to production admin data.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(collectConcerts(), null, 2));
      showMessage(message, 'Demo gespeichert – nur lokal in diesem Browser.', 'success');
    });

    logoutButton.addEventListener('click', () => {
      sessionStorage.removeItem(SESSION_KEY);
      window.location.href = 'admin-demo-login.html';
    });
  };

  initLogin();
  initEditor();
})();
