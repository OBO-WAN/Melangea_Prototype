document.addEventListener("DOMContentLoaded", () => {
  initAudioPlaylist();
});

function initAudioPlaylist() {
  const trackList = document.querySelector("#trackList");
  const trackCount = document.querySelector("#trackCount");

  const waveAudio = document.querySelector("#waveAudio");
  const waveTitle = document.querySelector("#waveTitle");
  const waveSubtitle = document.querySelector("#waveSubtitle");
  const waveCurrent = document.querySelector("#waveCurrent");
  const waveDuration = document.querySelector("#waveDuration");
  const waveSeek = document.querySelector("#waveSeek");
  const wavePeaks = document.querySelector("#wavePeaks");
  const waveToggle = document.querySelector("#waveToggle");
  const wavePrev = document.querySelector("#wavePrev");
  const waveNext = document.querySelector("#waveNext");

  if (
    !trackList ||
    !trackCount ||
    !waveAudio ||
    !waveTitle ||
    !waveSubtitle ||
    !waveCurrent ||
    !waveDuration ||
    !waveSeek ||
    !wavePeaks ||
    !waveToggle ||
    !wavePrev ||
    !waveNext
  ) {
    return;
  }

  const tracks = [
    {
      title: "Ostinato",
      subtitle: "Studio Version",
      duration: "1:52",
      src: "assets/MP3/Ostinato_Studio_1.mp3",
      seed: 1.15,
    },
    {
      title: "Eurology",
      subtitle: "Live",
      duration: "3:21",
      src: "assets/MP3/Eurology_Live_2.mp3",
      seed: 2.4,
    },
    {
      title: "Higher Sky",
      subtitle: "Live",
      duration: "3:47",
      src: "assets/MP3/higherSky_Live_3.mp3",
      seed: 3.1,
    },
  ];

  let activeIndex = 0;
  let isScrubbing = false;

  function formatTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }

  function buildPeaks(seed, count = 60) {
    return Array.from({ length: count }, (_, index) => {
      const a = Math.abs(Math.sin((index + 1) * (0.34 + seed * 0.04)));
      const b = Math.abs(Math.cos((index + 2) * (0.16 + seed * 0.03)));
      const envelope =
        0.55 + 0.45 * Math.abs(Math.sin((index / count) * Math.PI * 1.5));
      const value = (a * 0.62 + b * 0.38) * envelope;
      return Math.max(0.14, Math.min(0.96, value));
    });
  }

  function updateTrackCount() {
    trackCount.textContent = `${tracks.length} Tracks`;
  }

  function updatePlayerMeta(index) {
    const track = tracks[index];
    if (!track) return;

    waveTitle.textContent = track.title;
    waveSubtitle.textContent = track.subtitle;
    waveDuration.textContent = track.duration || "0:00";
  }

  function updateTransportUI() {
    const isPlaying = !waveAudio.paused && !!waveAudio.currentSrc;

    waveToggle.textContent = isPlaying ? "⏸" : "▶";
    waveToggle.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
  }

  function updateTrackButtons() {
    const items = trackList.querySelectorAll(".track");
    const buttons = trackList.querySelectorAll(".track button");
    const isPlaying = !waveAudio.paused && !!waveAudio.currentSrc;

    items.forEach((item, index) => {
      item.classList.toggle("is-active", index === activeIndex);
    });

    buttons.forEach((button, index) => {
      const pressed = index === activeIndex && isPlaying;
      button.textContent = pressed ? "⏸ Pause" : "▶ Play";
      button.setAttribute("aria-pressed", pressed ? "true" : "false");
    });

    updateTransportUI();
  }

  function renderWaveform(index) {
    const peaks = buildPeaks(tracks[index].seed);

    wavePeaks.innerHTML = peaks
      .map(
        (peak) =>
          `<span class="wave-player__peak" style="--peak-height:${peak}"></span>`,
      )
      .join("");

    updateWaveProgress();
  }

  function updateWaveProgress() {
    const duration = Number.isFinite(waveAudio.duration)
      ? waveAudio.duration
      : 0;
    const current = Number.isFinite(waveAudio.currentTime)
      ? waveAudio.currentTime
      : 0;

    const progress = duration > 0 ? current / duration : 0;
    const peaks = wavePeaks.querySelectorAll(".wave-player__peak");
    const playedCount = Math.round(progress * peaks.length);

    peaks.forEach((peak, index) => {
      peak.classList.toggle("is-played", index < playedCount);
      peak.classList.toggle(
        "is-current",
        index === playedCount && progress > 0 && progress < 1,
      );
    });

    if (!isScrubbing) {
      waveSeek.value = String(progress * 100);
    }

    waveCurrent.textContent = formatTime(current);
  }

  async function loadTrack(index, autoplay = false) {
    const track = tracks[index];
    if (!track) return;

    activeIndex = index;
    waveAudio.src = track.src;

    updatePlayerMeta(index);
    waveCurrent.textContent = "0:00";
    waveSeek.value = "0";
    renderWaveform(index);
    updateTrackButtons();

    if (autoplay) {
      try {
        await waveAudio.play();
      } catch (error) {
        console.error("Audio playback failed:", error);
      }
      updateTrackButtons();
      updateWaveProgress();
    }
  }

  async function playTrack(index) {
    if (index !== activeIndex || !waveAudio.currentSrc) {
      await loadTrack(index, true);
      return;
    }

    try {
      await waveAudio.play();
    } catch (error) {
      console.error("Audio playback failed:", error);
    }

    updateTrackButtons();
  }

  function pauseTrack() {
    waveAudio.pause();
    updateTrackButtons();
  }

  function togglePlayback() {
    if (!waveAudio.currentSrc) {
      loadTrack(activeIndex, true);
      return;
    }

    if (waveAudio.paused) {
      playTrack(activeIndex);
    } else {
      pauseTrack();
    }
  }

  function playPrevTrack() {
    const nextIndex = (activeIndex - 1 + tracks.length) % tracks.length;
    loadTrack(nextIndex, true);
  }

  function playNextTrack() {
    const nextIndex = (activeIndex + 1) % tracks.length;
    loadTrack(nextIndex, true);
  }

  function renderTracks() {
    trackList.innerHTML = "";

    tracks.forEach((track, index) => {
      const li = document.createElement("li");
      li.className = "track";

      li.innerHTML = `
        <div class="meta">
          <div class="title">${track.title}</div>
          <div class="sub">${track.subtitle} • ${track.duration}</div>
        </div>
        <button type="button" aria-pressed="false">▶ Play</button>
      `;

      const button = li.querySelector("button");

      button.addEventListener("click", () => {
        const isSameTrack = index === activeIndex;
        const isPlaying = !waveAudio.paused && !!waveAudio.currentSrc;

        if (isSameTrack && isPlaying) {
          pauseTrack();
          return;
        }

        playTrack(index);
      });

      trackList.appendChild(li);
    });

    updateTrackButtons();
  }

  waveToggle.addEventListener("click", togglePlayback);
  wavePrev.addEventListener("click", playPrevTrack);
  waveNext.addEventListener("click", playNextTrack);

  waveAudio.addEventListener("play", () => {
    updateTrackButtons();
    updateWaveProgress();
  });

  waveAudio.addEventListener("pause", () => {
    updateTrackButtons();
    updateWaveProgress();
  });

  waveAudio.addEventListener("timeupdate", updateWaveProgress);

  waveAudio.addEventListener("loadedmetadata", () => {
    if (Number.isFinite(waveAudio.duration)) {
      waveDuration.textContent = formatTime(waveAudio.duration);
    }
    updateWaveProgress();
  });

  waveAudio.addEventListener("ended", () => {
    playNextTrack();
  });

  waveSeek.addEventListener("input", () => {
    isScrubbing = true;

    const duration = Number.isFinite(waveAudio.duration)
      ? waveAudio.duration
      : 0;
    const nextTime = (Number(waveSeek.value) / 100) * duration;

    if (duration > 0 && Number.isFinite(nextTime)) {
      waveAudio.currentTime = nextTime;
    }

    updateWaveProgress();
  });

  waveSeek.addEventListener("change", () => {
    isScrubbing = false;
    updateWaveProgress();
  });

  updateTrackCount();
  renderTracks();

  // Initialize the player UI without assigning an audio source.
  // The selected MP3 is requested only after a user presses Play.
  updatePlayerMeta(activeIndex);
  renderWaveform(activeIndex);
  updateTrackButtons();
}
