(() => {
  const lightbox = document.querySelector('[data-media-lightbox]');
  const triggers = document.querySelectorAll('[data-media-lightbox-open]');
  const lightboxImage = lightbox?.querySelector('[data-media-lightbox-image]');
  const lightboxCaption = lightbox?.querySelector('[data-media-lightbox-caption]');
  const closeButton = lightbox?.querySelector('.media-lightbox__close');
  const closeControls = lightbox?.querySelectorAll('[data-media-lightbox-close]') ?? [];

  let activeTrigger = null;

  const openMediaLightbox = (trigger) => {
    if (!lightbox || !lightboxImage || !closeButton) return;

    const source = trigger.dataset.mediaSrc;
    if (!source) return;

    activeTrigger = trigger;

    const alt = trigger.dataset.mediaAlt || '';
    const caption = trigger.dataset.mediaCaption || '';

    lightboxImage.src = source;
    lightboxImage.alt = alt;

    if (lightboxCaption) {
      lightboxCaption.textContent = caption;
      lightboxCaption.hidden = !caption;
    }

    lightbox.setAttribute('aria-hidden', 'false');
    document.body.classList.add('media-lightbox-open');
    closeButton.focus();
  };

  const closeMediaLightbox = () => {
    if (!lightbox || lightbox.getAttribute('aria-hidden') === 'true') return;

    lightbox.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('media-lightbox-open');

    if (lightboxImage) {
      lightboxImage.removeAttribute('src');
      lightboxImage.alt = '';
    }

    if (lightboxCaption) {
      lightboxCaption.textContent = '';
      lightboxCaption.hidden = true;
    }

    activeTrigger?.focus();
    activeTrigger = null;
  };

  triggers.forEach((trigger) => {
    trigger.addEventListener('click', () => openMediaLightbox(trigger));
  });

  closeControls.forEach((control) => {
    control.addEventListener('click', closeMediaLightbox);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && lightbox?.getAttribute('aria-hidden') === 'false') {
      closeMediaLightbox();
    }
  });
})();
