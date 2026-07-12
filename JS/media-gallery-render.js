(() => {
  'use strict';

  const GALLERY_URL = 'data/media-gallery.json';
  const SECTION_NAMES = ['collage', 'photoWall'];
  const LOCAL_IMAGE_PATTERN = /^assets\/IMG\/medien\/[A-Za-z0-9._-]+\.(?:webp|jpe?g|png)$/i;
  const COLLAGE_MODIFIERS = ['', 'media-collage-item--large', 'media-collage-item--portrait', '', '', 'media-collage-item--wide'];

  const fail = (message) => {
    throw new Error(message);
  };

  const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

  const validateText = (value, fieldName) => {
    if (typeof value !== 'string') fail(`Ungültiges Feld: ${fieldName}`);
    return value;
  };

  const validateGallery = (data) => {
    if (!isPlainObject(data)) fail('Die Galerie-Daten sind kein Objekt.');

    const ids = new Set();
    const normalized = {};

    SECTION_NAMES.forEach((sectionName) => {
      if (!Array.isArray(data[sectionName])) fail(`Galerie-Abschnitt fehlt: ${sectionName}`);

      normalized[sectionName] = data[sectionName].map((item) => {
        if (!isPlainObject(item)) fail(`Ungültiger Galerie-Eintrag in ${sectionName}`);

        const id = validateText(item.id, 'id').trim();
        const src = validateText(item.src, 'src').trim();
        const alt = validateText(item.alt, 'alt');
        const caption = validateText(item.caption, 'caption');

        if (!/^[a-z0-9][a-z0-9_-]*$/i.test(id)) fail(`Ungültige ID: ${id}`);
        if (ids.has(id)) fail(`Doppelte ID: ${id}`);
        ids.add(id);

        if (!LOCAL_IMAGE_PATTERN.test(src) || src.includes('..')) fail(`Ungültiger Bildpfad: ${src}`);

        return { id, src, alt, caption };
      });
    });

    return normalized;
  };

  const createFigure = (sectionName, item, index) => {
    const figure = document.createElement('figure');
    figure.dataset.mediaGalleryId = item.id;

    if (sectionName === 'collage') {
      figure.className = 'media-collage-item';
      const modifier = COLLAGE_MODIFIERS[index + 1] || '';
      if (modifier) figure.classList.add(modifier);
      figure.dataset.aos = 'fade-up';
      const delay = index === 0 ? '' : String(40 + index * 40);
      if (delay) figure.dataset.aosDelay = delay;
    } else {
      figure.className = 'media-photo-card';
      figure.setAttribute('role', 'listitem');
      figure.dataset.aos = 'zoom-in';
    }

    const button = document.createElement('button');
    button.className = 'media-gallery__zoom';
    button.type = 'button';
    button.dataset.mediaLightboxOpen = '';
    button.dataset.mediaSrc = item.src;
    button.dataset.mediaAlt = item.alt;
    button.dataset.mediaCaption = item.caption;
    button.setAttribute('aria-label', item.caption ? `Bild „${item.caption}“ vergrößern` : `${item.alt} vergrößern`);

    const image = document.createElement('img');
    image.src = item.src;
    image.alt = item.alt;
    image.loading = index === 0 && sectionName === 'collage' ? 'eager' : 'lazy';
    image.decoding = 'async';

    button.append(image);
    figure.append(button);

    if (sectionName === 'collage') {
      const figcaption = document.createElement('figcaption');
      figcaption.textContent = item.caption;
      figure.append(figcaption);
    }

    return figure;
  };

  const renderFragments = (gallery) => {
    const rendered = {};

    SECTION_NAMES.forEach((sectionName) => {
      const container = document.querySelector(`[data-media-gallery-section="${sectionName}"]`);
      if (!container) fail(`Galerie-Container fehlt: ${sectionName}`);

      const fragment = document.createDocumentFragment();
      gallery[sectionName].forEach((item, index) => {
        fragment.append(createFigure(sectionName, item, index));
      });

      rendered[sectionName] = { container, fragment };
    });

    return rendered;
  };

  fetch(GALLERY_URL, { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) fail(`Galerie-JSON konnte nicht geladen werden (${response.status}).`);
      return response.json();
    })
    .then((data) => {
      const gallery = validateGallery(data);
      const rendered = renderFragments(gallery);

      SECTION_NAMES.forEach((sectionName) => {
        const { container, fragment } = rendered[sectionName];
        container.replaceChildren(fragment);
      });

      if (window.AOS && typeof window.AOS.refreshHard === 'function') {
        window.AOS.refreshHard();
      }

      document.dispatchEvent(new CustomEvent('media-gallery:rendered'));
    })
    .catch((error) => {
      console.error('Media gallery fallback remains active:', error instanceof Error ? error.message : 'unknown error');
    });
})();
