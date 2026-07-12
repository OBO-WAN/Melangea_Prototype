(() => {
  'use strict';

  const AUDIO_URL = 'data/media-audio.json';
  const PLAYLIST_SELECTOR = '[data-media-audio-playlist]';
  const PLAYER_SELECTOR = '[data-media-wave-player]';
  const DURATION_PATTERN = /^\d{1,3}:[0-5]\d$/;
  const ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/i;
  const LOCAL_MP3_PATTERN = /^assets\/MP3\/(?:[A-Za-z0-9._-]+|medien\/[A-Za-z0-9._-]+)\.mp3$/i;

  function isValidPath(src) {
    return typeof src === 'string' &&
      LOCAL_MP3_PATTERN.test(src) &&
      !src.includes('..') &&
      !src.includes('\\') &&
      !/^[a-z][a-z0-9+.-]*:/i.test(src) &&
      !/[\x00-\x1F\x7F]/.test(src);
  }

  function cleanTrack(track, ids) {
    if (!track || typeof track !== 'object') return null;
    const id = String(track.id || '');
    const title = String(track.title || '');
    const subtitle = String(track.subtitle || '');
    const duration = String(track.duration || '');
    const src = String(track.src || '');
    const seed = Number(track.seed);

    if (!ID_PATTERN.test(id) || ids.has(id)) return null;
    if (!isValidPath(src)) return null;
    if (title.trim() === '' || title.length > 160) return null;
    if (subtitle.length > 220) return null;
    if (!DURATION_PATTERN.test(duration)) return null;
    if (!Number.isFinite(seed) || seed <= 0 || seed > 9999) return null;

    ids.add(id);
    return { id, title, subtitle, duration, src, seed };
  }

  function validateAudioData(data) {
    if (!data || typeof data !== 'object' || !Array.isArray(data.tracks)) {
      throw new Error('Ungültige Audio-Daten.');
    }
    const ids = new Set();
    const tracks = data.tracks.map((track) => cleanTrack(track, ids));
    if (tracks.some((track) => track === null) || tracks.length === 0) {
      throw new Error('Ungültige Audio-Titelliste.');
    }
    return tracks;
  }

  function appendTextSpan(parent, className, text) {
    const span = document.createElement('span');
    span.className = className;
    span.textContent = text;
    parent.appendChild(span);
    return span;
  }

  function createTrackElement(track, index) {
    const li = document.createElement('li');
    const button = document.createElement('button');
    button.className = 'media-wave-player__track';
    button.type = 'button';
    button.dataset.mediaWaveTrack = '';
    button.dataset.title = track.title;
    button.dataset.subtitle = track.subtitle;
    button.dataset.duration = track.duration;
    button.dataset.src = track.src;
    button.dataset.seed = String(track.seed);
    button.setAttribute('aria-current', index === 0 ? 'true' : 'false');
    if (index === 0) button.classList.add('is-active');

    appendTextSpan(button, 'media-wave-player__track-number', String(index + 1).padStart(2, '0'));
    const textWrap = document.createElement('span');
    appendTextSpan(textWrap, 'media-wave-player__track-title', track.title);
    appendTextSpan(textWrap, 'media-wave-player__track-subtitle', track.subtitle);
    button.appendChild(textWrap);
    appendTextSpan(button, 'media-wave-player__track-duration', track.duration);
    li.appendChild(button);
    return li;
  }

  function resetPlayer(player, firstTrack) {
    const title = player.querySelector('[data-media-wave-title]');
    const subtitle = player.querySelector('[data-media-wave-subtitle]');
    const duration = player.querySelector('[data-media-wave-duration]');
    const current = player.querySelector('[data-media-wave-current]');
    const seek = player.querySelector('[data-media-wave-seek]');
    const audio = player.querySelector('[data-media-wave-audio]');

    if (title) title.textContent = firstTrack.title;
    if (subtitle) subtitle.textContent = firstTrack.subtitle;
    if (duration) duration.textContent = firstTrack.duration;
    if (current) current.textContent = '0:00';
    if (seek) seek.value = '0';
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
  }

  async function renderAudioPlaylist() {
    try {
      const playlist = document.querySelector(PLAYLIST_SELECTOR);
      const player = playlist ? playlist.closest(PLAYER_SELECTOR) : null;
      if (!playlist || !player) return;

      const response = await fetch(AUDIO_URL, { cache: 'no-cache' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const tracks = validateAudioData(await response.json());

      const fragment = document.createDocumentFragment();
      tracks.forEach((track, index) => fragment.appendChild(createTrackElement(track, index)));
      playlist.replaceChildren(fragment);
      resetPlayer(player, tracks[0]);
      document.dispatchEvent(new CustomEvent('media-audio:rendered', { detail: { player } }));

      if (window.AOS && typeof window.AOS.refreshHard === 'function') {
        window.AOS.refreshHard();
      }
    } catch (error) {
      console.warn('Audio-Playlist konnte nicht dynamisch geladen werden.', error);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderAudioPlaylist, { once: true });
  } else {
    renderAudioPlaylist();
  }
})();
