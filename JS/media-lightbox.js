(() => {
  const lightbox = document.querySelector('[data-media-lightbox]');
  let triggers = Array.from(
    document.querySelectorAll('[data-media-lightbox-open]')
  );
  const lightboxImage = lightbox?.querySelector('[data-media-lightbox-image]');
  const lightboxCaption = lightbox?.querySelector('[data-media-lightbox-caption]');
  const closeButton = lightbox?.querySelector('.media-lightbox__close');
  const previousButton = lightbox?.querySelector('[data-media-lightbox-previous]');
  const nextButton = lightbox?.querySelector('[data-media-lightbox-next]');
  const closeControls = lightbox?.querySelectorAll('[data-media-lightbox-close]') ?? [];

  let activeTrigger = null;
  let activeIndex = -1;

  const refreshTriggers = () => {
    triggers = Array.from(document.querySelectorAll('[data-media-lightbox-open]'));
    const hasMultipleImages = triggers.length > 1;

    if (previousButton) {
      previousButton.hidden = !hasMultipleImages;
    }

    if (nextButton) {
      nextButton.hidden = !hasMultipleImages;
    }
  };

  refreshTriggers();

  const preloadMediaImage = (index) => {
    if (triggers.length < 2) return;

    const normalizedIndex = (index + triggers.length) % triggers.length;
    const source = triggers[normalizedIndex].dataset.mediaSrc;

    if (!source) return;

    const image = new Image();
    image.src = source;
  };

  const showMediaImage = (index) => {
    if (!lightboxImage || triggers.length === 0) return;

    activeIndex = (index + triggers.length) % triggers.length;

    const trigger = triggers[activeIndex];
    const source = trigger.dataset.mediaSrc;
    const alt = trigger.dataset.mediaAlt || '';
    const caption = trigger.dataset.mediaCaption || '';

    if (!source) return;

    lightboxImage.src = source;
    lightboxImage.alt = alt;

    if (lightboxCaption) {
      lightboxCaption.textContent = caption;
      lightboxCaption.hidden = caption === '';
    }

    preloadMediaImage(activeIndex - 1);
    preloadMediaImage(activeIndex + 1);
  };

  const openMediaLightbox = (trigger) => {
    if (!lightbox || !lightboxImage || !closeButton) return;

    const index = triggers.indexOf(trigger);
    if (index < 0) return;

    activeTrigger = trigger;
    showMediaImage(index);

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

    activeIndex = -1;
    activeTrigger?.focus();
    activeTrigger = null;
  };

  const showPreviousImage = () => {
    showMediaImage(activeIndex - 1);
  };

  const showNextImage = () => {
    showMediaImage(activeIndex + 1);
  };

  document.addEventListener('click', (event) => {
    const trigger = event.target.closest('[data-media-lightbox-open]');

    if (!trigger) return;

    refreshTriggers();
    openMediaLightbox(trigger);
  });

  document.addEventListener('media-gallery:rendered', refreshTriggers);

  closeControls.forEach((control) => {
    control.addEventListener('click', closeMediaLightbox);
  });

  previousButton?.addEventListener('click', showPreviousImage);
  nextButton?.addEventListener('click', showNextImage);

  document.addEventListener('keydown', (event) => {
    const isOpen = lightbox?.getAttribute('aria-hidden') === 'false';

    if (!isOpen) return;

    if (event.key === 'Escape') {
      closeMediaLightbox();
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      showPreviousImage();
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      showNextImage();
    }
  });
})();
