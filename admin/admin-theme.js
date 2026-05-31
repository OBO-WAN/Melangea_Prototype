(function () {
  const storageKey = 'melange_admin_theme';
  const root = document.documentElement;
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;

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
      toggle.textContent = isDark ? 'Hell' : 'Dunkel';
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

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeToggle);
  } else {
    initThemeToggle();
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
