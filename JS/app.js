// =====================================================
// Mélange à Deux — app.js
// Safe, modular, and resilient to missing DOM elements
// =====================================================

document.addEventListener("DOMContentLoaded", () => {
  initPlaylist();
  initMobileNav();
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

function isMobileViewport() {
  return window.matchMedia("(max-width: 980px)").matches;
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
// Mobile nav
// -----------------------------------------------------

function initMobileNav() {
  const toggle = qs(".nav-toggle");
  const nav = qs(".nav");
  const headerInner = qs(".header-inner");

  if (!toggle || !nav || !headerInner) return;

  function openMenu() {
    nav.style.display = "flex";
    nav.style.flexDirection = "column";
    nav.style.position = "absolute";
    nav.style.right = "1rem";
    nav.style.top = "calc(100% + 0.5rem)";
    nav.style.padding = "1rem";
    nav.style.background = "rgba(17, 21, 38, 0.95)";
    nav.style.border = "1px solid rgba(255, 255, 255, 0.08)";
    nav.style.borderRadius = "16px";
    nav.style.gap = "1rem";
    nav.style.minWidth = "220px";
    nav.style.boxShadow = "0 12px 30px rgba(0, 0, 0, 0.35)";
    nav.style.zIndex = "300";

    headerInner.style.position = "relative";

    toggle.setAttribute("aria-expanded", "true");
    toggle.setAttribute("aria-label", "Menü schließen");
  }

  function closeMenu() {
    if (isMobileViewport()) {
      nav.style.display = "none";
      nav.style.flexDirection = "";
      nav.style.position = "";
      nav.style.right = "";
      nav.style.top = "";
      nav.style.padding = "";
      nav.style.background = "";
      nav.style.border = "";
      nav.style.borderRadius = "";
      nav.style.gap = "";
      nav.style.minWidth = "";
      nav.style.boxShadow = "";
      nav.style.zIndex = "";
    } else {
      nav.style.display = "";
      nav.style.flexDirection = "";
      nav.style.position = "";
      nav.style.right = "";
      nav.style.top = "";
      nav.style.padding = "";
      nav.style.background = "";
      nav.style.border = "";
      nav.style.borderRadius = "";
      nav.style.gap = "";
      nav.style.minWidth = "";
      nav.style.boxShadow = "";
      nav.style.zIndex = "";
    }

    toggle.setAttribute("aria-expanded", "false");
    toggle.setAttribute("aria-label", "Menü öffnen");
  }

  function toggleMenu() {
    const isOpen = toggle.getAttribute("aria-expanded") === "true";
    if (isOpen) {
      closeMenu();
    } else {
      openMenu();
    }
  }

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!isMobileViewport()) return;
    toggleMenu();
  });

  nav.addEventListener("click", (event) => {
    event.stopPropagation();
  });

  document.addEventListener("click", () => {
    if (isMobileViewport() && toggle.getAttribute("aria-expanded") === "true") {
      closeMenu();
    }
  });

  qsa("a", nav).forEach((link) => {
    link.addEventListener("click", () => {
      if (isMobileViewport()) {
        closeMenu();
      }
    });
  });

  window.addEventListener("resize", () => {
    if (!isMobileViewport()) {
      closeMenu();
    } else if (toggle.getAttribute("aria-expanded") !== "true") {
      nav.style.display = "none";
    }
  });

  closeMenu();
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