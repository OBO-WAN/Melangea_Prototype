(function () {
  const storageKey = 'melange_admin_theme';
  const root = document.documentElement;
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  const lastPathSegment = window.location.pathname.split('/').filter(Boolean).pop() || '';
  const pageName = lastPathSegment.includes('.') ? lastPathSegment : 'index.php';

  const ensureHeadLink = (id, rel, href, type = '') => {
    if (document.getElementById(id)) return;

    const link = document.createElement('link');
    link.id = id;
    link.rel = rel;
    link.href = href;
    if (type) link.type = type;
    document.head.appendChild(link);
  };

  if (['login.php', 'index.php', 'media.php'].includes(pageName)) {
    ensureHeadLink('admin-favicon', 'icon', 'favicon.svg', 'image/svg+xml');
  }

  if (pageName === 'media.php') {
    ensureHeadLink('admin-media-sections-styles', 'stylesheet', 'admin-media-sections.css');
  }

  const getStoredTheme = () => {
    try {
      const storedTheme = window.localStorage.getItem(storageKey);
      return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : null;
    } catch (error) {
      return null;
    }
  };

  const getSystemTheme = () => (darkQuery && darkQuery.matches ? 'dark' : 'light');

  const getActiveTheme = () => getStoredTheme() || getSystemTheme();

  const updateToggle = (theme) => {
    document.querySelectorAll('[data-theme-toggle]').forEach((toggle) => {
      const isDark = theme === 'dark';
      toggle.setAttribute('aria-pressed', String(isDark));
      toggle.setAttribute('aria-label', isDark ? 'Hellmodus aktivieren' : 'Dunkelmodus aktivieren');
    });
  };

  const applyTheme = (theme) => {
    root.dataset.theme = theme;
    updateToggle(theme);
  };

  const saveTheme = (theme) => {
    try {
      window.localStorage.setItem(storageKey, theme);
    } catch (error) {
      // Theme preference is optional; ignore storage failures.
    }
  };

  applyTheme(getActiveTheme());

  const initThemeToggle = () => {
    updateToggle(root.dataset.theme || getActiveTheme());

    document.querySelectorAll('[data-theme-toggle]').forEach((toggle) => {
      toggle.addEventListener('click', () => {
        const nextTheme = (root.dataset.theme || getActiveTheme()) === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
        saveTheme(nextTheme);
      });
    });
  };

  const initMediaSections = () => {
    if (pageName !== 'media.php') return;

    const sections = [
      {
        action: 'save-media.php',
        modifier: 'photos',
        label: 'Fotoverwaltung',
        title: 'Fotogalerien bearbeiten',
        description: 'Bilder, Alternativtexte, Beschreibungen und Reihenfolge verwalten.',
      },
      {
        action: 'save-media-videos.php',
        modifier: 'videos',
        label: 'Videoverwaltung',
      },
      {
        action: 'save-media-audio.php',
        modifier: 'audio',
        label: 'Audioverwaltung',
      },
    ];

    sections.forEach((section) => {
      const form = document.querySelector(`form[action="${section.action}"]`);
      if (!form) return;

      let card = form.previousElementSibling;
      if (!card || !card.classList.contains('admin-card')) {
        card = document.createElement('section');
        card.className = 'admin-card';

        const heading = document.createElement('h2');
        heading.textContent = section.title || '';

        const description = document.createElement('p');
        description.className = 'admin-muted';
        description.textContent = section.description || '';

        card.append(heading, description);
        form.before(card);
      }

      card.classList.add('admin-media-section', `admin-media-section--${section.modifier}`);

      if (!card.querySelector('.admin-media-section__label')) {
        const label = document.createElement('p');
        label.className = 'admin-media-section__label';
        label.textContent = section.label;
        card.prepend(label);
      }
    });
  };

  const initAdminUi = () => {
    initThemeToggle();
    initMediaSections();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdminUi);
  } else {
    initAdminUi();
  }

  if (darkQuery) {
    const handleSystemThemeChange = () => {
      if (!getStoredTheme()) {
        applyTheme(getSystemTheme());
      }
    };

    if (darkQuery.addEventListener) {
      darkQuery.addEventListener('change', handleSystemThemeChange);
    } else if (darkQuery.addListener) {
      darkQuery.addListener(handleSystemThemeChange);
    }
  }
})();
