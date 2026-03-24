

document.addEventListener("DOMContentLoaded", () => {
  initPlaylist();
  initBioOverlay();
  initScrollProgress();
  initHeroSlider();
});

// -----------------------------------------------------
// Shared helpers
// -----------------------------------------------------

function qs(selector, scope = document) {
  return scope.querySelector(selector);
}

function qsa(selector, scope = document) {
  return Array.from(scope.querySelectorAll(selector));
}

// -----------------------------------------------------
// Playlist / audio
// -----------------------------------------------------

const tracks = [
  {
    title: "Jeu des Nuages",
    subtitle: "Live Session",
    duration: "3:42",
    src: "assets/MP3/02-Jeu-des-Nuages.mp3",
  },
  {
    title: "Valse des Oiseaux",
    subtitle: "Studio Cut",
    duration: "4:10",
    src: "assets/MP3/03-Valse-des-Oiseaux.mp3",
  },
  {
    title: "Cogene",
    subtitle: "Acoustic",
    duration: "3:15",
    src: "assets/MP3/09-Cogene.mp3",
  },
];

function initPlaylist() {
  const featuredAudio = document.getElementById("featuredAudio");
  const featuredTitle = document.getElementById("featuredTitle");
  const featuredDuration = document.getElementById("featuredDuration");
  const trackList = document.getElementById("trackList");
  const trackCount = document.getElementById("trackCount");

  if (!trackList || !trackCount) return;

  const hasFeaturedPlayer =
    !!featuredAudio && !!featuredTitle && !!featuredDuration;

  function setFeatured(track) {
    if (!hasFeaturedPlayer) return;

    featuredTitle.textContent = track.title;
    featuredDuration.textContent = track.duration;

    if (track.src) {
      featuredAudio.src = track.src;
    } else {
      featuredAudio.removeAttribute("src");
      featuredAudio.load();
    }
  }

  function resetTrackButtons() {
    qsa(".track button", trackList).forEach((button) => {
      button.textContent = hasFeaturedPlayer ? "▶︎ Play" : "Audio folgt";
      button.disabled = !hasFeaturedPlayer;
    });
  }

  function renderTracks() {
    trackCount.textContent = `${tracks.length} Tracks`;
    trackList.innerHTML = "";

    tracks.forEach((track) => {
      const li = document.createElement("li");
      li.className = "track";

      li.innerHTML = `
        <div class="meta">
          <div class="title">${track.title}</div>
          <div class="sub">${track.subtitle} • ${track.duration}</div>
        </div>
        <button type="button" ${hasFeaturedPlayer ? "" : "disabled"}>
          ${hasFeaturedPlayer ? "▶︎ Play" : "Audio folgt"}
        </button>
      `;

      const button = li.querySelector("button");

      if (hasFeaturedPlayer) {
        button.addEventListener("click", async () => {
          const currentSrc = featuredAudio.getAttribute("src") || "";
          const isCurrent = currentSrc.includes(track.src);
          const isPlaying = !featuredAudio.paused;

          if (isCurrent && isPlaying) {
            featuredAudio.pause();
            button.textContent = "▶︎ Play";
            return;
          }

          setFeatured(track);
          resetTrackButtons();

          try {
            await featuredAudio.play();
            button.textContent = "⏸ Pause";
          } catch (error) {
            console.error("Audio playback failed:", error);
            button.textContent = "▶︎ Play";
          }
        });
      }

      trackList.appendChild(li);
    });
  }

  if (hasFeaturedPlayer) {
    setFeatured(tracks[0] || { title: "—", duration: "—", src: "" });

    featuredAudio.addEventListener("ended", resetTrackButtons);
    featuredAudio.addEventListener("pause", () => {
      if (featuredAudio.ended) return;
      qsa(".track button", trackList).forEach((button) => {
        if (button.textContent.includes("Pause")) {
          button.textContent = "▶︎ Play";
        }
      });
    });
  }

  renderTracks();
}


// -----------------------------------------------------
// Bio overlay
// -----------------------------------------------------

function initBioOverlay() {
  const bioOverlay = document.getElementById("bioOverlay");
  const bioTitle = document.getElementById("bioTitle");
  const bioRole = document.getElementById("bioRole");
  const bioText = document.getElementById("bioText");
  const bioDownload = document.getElementById("bioDownload");
  const bioButtons = qsa(".person-bio-btn");
  const closeButtons = qsa("[data-close-overlay]");

  if (
    !bioOverlay ||
    !bioTitle ||
    !bioRole ||
    !bioText ||
    !bioDownload ||
    bioButtons.length === 0
  ) {
    return;
  }

  const bios =
    typeof window.playerBios !== "undefined"
      ? window.playerBios
      : typeof playerBios !== "undefined"
      ? playerBios
      : null;

  if (!bios) {
    console.warn("playerBios is not available.");
    return;
  }

  function openBio(playerKey) {
    const player = bios[playerKey];
    if (!player) return;

    bioTitle.textContent = player.name || "—";
    bioRole.textContent = player.role || "";
    bioText.innerHTML = player.text || "<p>Biografie folgt.</p>";

    if (player.pdf) {
      bioDownload.href = player.pdf;
      bioDownload.style.display = "inline-flex";
    } else {
      bioDownload.href = "#";
      bioDownload.style.display = "none";
    }

    bioOverlay.classList.add("is-open");
    bioOverlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function closeBio() {
    bioOverlay.classList.remove("is-open");
    bioOverlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  bioButtons.forEach((button) => {
    button.addEventListener("click", () => {
      openBio(button.dataset.player);
    });
  });

  closeButtons.forEach((element) => {
    element.addEventListener("click", closeBio);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && bioOverlay.classList.contains("is-open")) {
      closeBio();
    }
  });
}

// -----------------------------------------------------
// Scroll progress bar
// -----------------------------------------------------

function initScrollProgress() {
  function updateScrollProgress() {
    const scrollTop = window.scrollY;
    const docHeight =
      document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;

    document.documentElement.style.setProperty(
      "--scroll-progress",
      `${progress}%`
    );
  }

  updateScrollProgress();

  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  window.addEventListener("resize", updateScrollProgress);
  window.addEventListener("load", updateScrollProgress);
}

// Hero Slider

function initHeroSlider() {
  const slides = document.querySelectorAll(".hero-slide");
  if (!slides.length) return;

  let current = 0;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle("is-active", i === index);
    });
  }

  setInterval(() => {
    current = (current + 1) % slides.length;
    showSlide(current);
  }, 5000);
}