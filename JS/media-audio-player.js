document.addEventListener("DOMContentLoaded", () => {
  initMediaWavePlayers();
});

function initMediaWavePlayers() {
  const players = document.querySelectorAll("[data-media-wave-player]");

  players.forEach((player) => {
    const audio = player.querySelector("[data-media-wave-audio]");
    const title = player.querySelector("[data-media-wave-title]");
    const subtitle = player.querySelector("[data-media-wave-subtitle]");
    const currentTime = player.querySelector("[data-media-wave-current]");
    const durationTime = player.querySelector("[data-media-wave-duration]");
    const seek = player.querySelector("[data-media-wave-seek]");
    const bars = player.querySelector("[data-media-wave-bars]");
    const toggle = player.querySelector("[data-media-wave-toggle]");
    const previous = player.querySelector("[data-media-wave-previous]");
    const next = player.querySelector("[data-media-wave-next]");
    const trackButtons = Array.from(player.querySelectorAll("[data-media-wave-track]"));

    if (
      !audio ||
      !title ||
      !subtitle ||
      !currentTime ||
      !durationTime ||
      !seek ||
      !bars ||
      !toggle ||
      !previous ||
      !next ||
      !trackButtons.length
    ) {
      return;
    }

    const tracks = trackButtons.map((button, index) => ({
      title: button.dataset.title || `Titel ${index + 1}`,
      subtitle: button.dataset.subtitle || "Hörbeispiel",
      duration: button.dataset.duration || "0:00",
      src: button.dataset.src || "",
      seed: Number(button.dataset.seed || index + 1),
    }));

    let activeIndex = 0;
    let isScrubbing = false;

    function formatTime(seconds) {
      if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = Math.floor(seconds % 60);
      return `${minutes}:${String(remainingSeconds).padStart(2, "0")}`;
    }

    function createWaveHeights(seed, count = 72) {
      return Array.from({ length: count }, (_, index) => {
        const phase = index + 1;
        const a = Math.abs(Math.sin(phase * (0.21 + seed * 0.035)));
        const b = Math.abs(Math.cos((phase + 3) * (0.37 + seed * 0.015)));
        const c = Math.abs(Math.sin((phase / count) * Math.PI * 2.25));
        const value = (a * 0.44 + b * 0.34 + c * 0.22) * 0.92;
        return Math.max(0.16, Math.min(0.95, value));
      });
    }

    function renderWave(index) {
      bars.innerHTML = "";
      const fragment = document.createDocumentFragment();
      createWaveHeights(tracks[index].seed).forEach((height) => {
        const bar = document.createElement("span");
        bar.className = "media-wave-player__bar";
        bar.style.setProperty("--bar-height", height.toFixed(3));
        fragment.appendChild(bar);
      });
      bars.appendChild(fragment);
      updateProgress();
    }

    function updateMeta(index) {
      const track = tracks[index];
      title.textContent = track.title;
      subtitle.textContent = track.subtitle;
      durationTime.textContent = track.duration;
    }

    function updateTrackButtons() {
      const isPlaying = !audio.paused && !!audio.currentSrc;
      toggle.textContent = isPlaying ? "⏸" : "▶";
      toggle.setAttribute("aria-label", isPlaying ? "Pause" : "Play");

      trackButtons.forEach((button, index) => {
        button.classList.toggle("is-active", index === activeIndex);
        button.setAttribute("aria-current", index === activeIndex ? "true" : "false");
      });
    }

    function updateProgress() {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const current = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      const progress = duration > 0 ? current / duration : 0;
      const playedCount = Math.round(progress * bars.children.length);

      Array.from(bars.children).forEach((bar, index) => {
        bar.classList.toggle("is-played", index < playedCount);
        bar.classList.toggle(
          "is-current",
          index === playedCount && progress > 0 && progress < 1,
        );
      });

      if (!isScrubbing) {
        seek.value = String(progress * 100);
      }

      currentTime.textContent = formatTime(current);
    }

    function loadTrack(index, autoplay = false) {
      const track = tracks[index];
      if (!track || !track.src) return;

      activeIndex = index;
      audio.src = track.src;
      currentTime.textContent = "0:00";
      seek.value = "0";
      updateMeta(index);
      renderWave(index);
      updateTrackButtons();
      audio.load();

      if (autoplay) {
        audio.play().catch((error) => {
          console.error("Audio playback failed:", error);
        });
      }
    }

    function togglePlayback() {
      if (!audio.currentSrc) {
        loadTrack(activeIndex, true);
        return;
      }

      if (audio.paused) {
        audio.play().catch((error) => {
          console.error("Audio playback failed:", error);
        });
      } else {
        audio.pause();
      }
    }

    function playAdjacent(direction) {
      const nextIndex = (activeIndex + direction + tracks.length) % tracks.length;
      loadTrack(nextIndex, true);
    }

    trackButtons.forEach((button, index) => {
      button.addEventListener("click", () => {
        const isSameTrack = activeIndex === index;
        const isPlaying = !audio.paused && !!audio.currentSrc;

        if (isSameTrack && isPlaying) {
          audio.pause();
          return;
        }

        loadTrack(index, true);
      });
    });

    toggle.addEventListener("click", togglePlayback);
    previous.addEventListener("click", () => playAdjacent(-1));
    next.addEventListener("click", () => playAdjacent(1));

    audio.addEventListener("play", updateTrackButtons);
    audio.addEventListener("pause", updateTrackButtons);
    audio.addEventListener("timeupdate", updateProgress);
    audio.addEventListener("loadedmetadata", () => {
      if (Number.isFinite(audio.duration)) {
        durationTime.textContent = formatTime(audio.duration);
      }
      updateProgress();
    });
    audio.addEventListener("ended", () => playAdjacent(1));

    seek.addEventListener("input", () => {
      isScrubbing = true;
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const nextTime = (Number(seek.value) / 100) * duration;

      if (duration > 0 && Number.isFinite(nextTime)) {
        audio.currentTime = nextTime;
      }

      updateProgress();
    });

    seek.addEventListener("change", () => {
      isScrubbing = false;
      updateProgress();
    });

    loadTrack(activeIndex, false);
  });
}
