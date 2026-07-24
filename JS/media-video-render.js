(() => {
  'use strict';

  const VIDEO_URL = 'data/media-videos.json';
  const YOUTUBE_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

  const fail = (message) => {
    throw new Error(message);
  };

  const isPlainObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);

  const validateVideos = (data) => {
    if (!isPlainObject(data) || !Array.isArray(data.videos)) fail('Die Video-Daten sind ungültig.');

    const ids = new Set();
    const youtubeIds = new Set();

    return data.videos.map((item) => {
      if (!isPlainObject(item)) fail('Ein Video-Eintrag ist ungültig.');

      const id = typeof item.id === 'string' ? item.id.trim() : '';
      const youtubeId = typeof item.youtubeId === 'string' ? item.youtubeId.trim() : '';
      const title = typeof item.title === 'string' ? item.title.trim() : '';

      if (!/^[a-z0-9][a-z0-9_-]*$/i.test(id) || ids.has(id)) fail(`Ungültige oder doppelte Video-ID: ${id}`);
      if (!YOUTUBE_ID_PATTERN.test(youtubeId) || youtubeIds.has(youtubeId)) fail(`Ungültige oder doppelte YouTube-ID: ${youtubeId}`);
      if (title === '') fail(`Der Video-Titel fehlt: ${id}`);

      ids.add(id);
      youtubeIds.add(youtubeId);

      return { id, youtubeId, title };
    });
  };

  const createVideoCard = (video, index) => {
    const article = document.createElement('article');
    article.className = 'media-video-card';
    article.dataset.mediaVideoId = video.id;
    article.dataset.aos = 'fade-up';
    article.dataset.aosDuration = '700';
    article.dataset.aosEasing = 'ease-out-cubic';
    if (index > 0) article.dataset.aosDelay = String(index === 1 ? 80 : index * 40 + 40);

    const frame = document.createElement('div');
    frame.className = 'media-video-frame';

    const iframe = document.createElement('iframe');
    iframe.dataset.consentSrc = `https://www.youtube-nocookie.com/embed/${video.youtubeId}`;
    iframe.title = video.title;
    iframe.loading = 'lazy';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
    iframe.referrerPolicy = 'strict-origin-when-cross-origin';
    iframe.allowFullscreen = true;

    frame.append(iframe);
    article.append(frame);

    return article;
  };

  fetch(VIDEO_URL, { cache: 'no-cache' })
    .then((response) => {
      if (!response.ok) fail(`Video-JSON konnte nicht geladen werden (${response.status}).`);
      return response.json();
    })
    .then((data) => {
      const videos = validateVideos(data);
      const container = document.querySelector('[data-media-video-grid]');
      if (!container) fail('Video-Container fehlt.');

      const fragment = document.createDocumentFragment();
      videos.forEach((video, index) => fragment.append(createVideoCard(video, index)));
      container.replaceChildren(fragment);
      window.melangeConsent?.refreshExternalMedia();

      if (window.AOS && typeof window.AOS.refreshHard === 'function') {
        window.AOS.refreshHard();
      }

      document.dispatchEvent(new CustomEvent('media-videos:rendered'));
    })
    .catch((error) => {
      console.error('Media video fallback remains active:', error instanceof Error ? error.message : 'unknown error');
    });
})();
