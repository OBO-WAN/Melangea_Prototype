(() => {
  const galleryUrl = 'data/media-gallery.json';
  const sections = {
    collage: document.querySelector('[data-media-gallery-section="collage"]'),
    photoWall: document.querySelector('[data-media-gallery-section="photoWall"]'),
  };

  const isSafeImagePath = (value) => (
    typeof value === 'string'
    && /^assets\/IMG\/[A-Za-z0-9ÄÖÜäöüß_ .\/-]+\.(webp|jpe?g|png)$/i.test(value)
    && !value.includes('..')
    && !value.includes('\\')
  );

  const createImageButton = (image, eager, label) => {
    const button = document.createElement('button');
    button.className = 'media-gallery__zoom';
    button.type = 'button';
    button.setAttribute('data-media-lightbox-open', '');
    button.dataset.mediaSrc = image.src;
    button.dataset.mediaAlt = image.alt;
    button.dataset.mediaCaption = image.caption;
    button.setAttribute('aria-label', `Bild „${image.caption || label}“ vergrößern`);

    const img = document.createElement('img');
    img.src = image.src;
    img.alt = image.alt;
    img.loading = eager ? 'eager' : 'lazy';
    img.decoding = 'async';

    button.append(img);
    return button;
  };

  const renderCollage = (items) => {
    const container = sections.collage;
    if (!container) return;
    container.textContent = '';
    const modifiers = ['media-collage-item--large', 'media-collage-item--portrait', '', '', 'media-collage-item--wide'];

    items.forEach((image, index) => {
      if (!isSafeImagePath(image.src)) return;
      const figure = document.createElement('figure');
      figure.className = ['media-collage-item', modifiers[index] || ''].filter(Boolean).join(' ');
      figure.setAttribute('data-aos', 'fade-up');
      if (index > 0) figure.setAttribute('data-aos-delay', String(80 + (index - 1) * 40));
      figure.append(createImageButton(image, index === 0, image.caption));

      const caption = document.createElement('figcaption');
      caption.textContent = image.caption;
      figure.append(caption);
      container.append(figure);
    });
  };

  const renderPhotoWall = (items) => {
    const container = sections.photoWall;
    if (!container) return;
    container.textContent = '';

    items.forEach((image, index) => {
      if (!isSafeImagePath(image.src)) return;
      const figure = document.createElement('figure');
      figure.className = 'media-photo-card';
      figure.setAttribute('role', 'listitem');
      figure.setAttribute('data-aos', 'zoom-in');
      figure.append(createImageButton(image, false, `Konzertfoto ${index + 1}`));
      container.append(figure);
    });
  };

  fetch(galleryUrl, { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) throw new Error('Galeriedaten konnten nicht geladen werden.');
      return response.json();
    })
    .then((gallery) => {
      renderCollage(Array.isArray(gallery.collage) ? gallery.collage : []);
      renderPhotoWall(Array.isArray(gallery.photoWall) ? gallery.photoWall : []);
      document.dispatchEvent(new CustomEvent('media-gallery:rendered'));
    })
    .catch(() => {
      Object.values(sections).forEach((container) => {
        if (container) container.textContent = '';
      });
    });
})();
