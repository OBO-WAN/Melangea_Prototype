document.addEventListener("DOMContentLoaded", () => {
  [initBioOverlay, initScrollProgress, initHeroSlider, initMobileNav].forEach(
    (init) => {
      try {
        init();
      } catch (error) {
        console.error(`Failed to initialize ${init.name}:`, error);
      }
    },
  );
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
// Nav mobile
// -----------------------------------------------------

function initMobileNav() {
  const navWrap = qs(".nav-wrap");
  const navToggle = qs("#nav-toggle");
  const navLinks = qsa(".nav a");

  if (!navWrap || !navToggle) return;

  const mobileBreakpoint = 980;

  function isMobileView() {
    return window.innerWidth <= mobileBreakpoint;
  }

  function closeNav() {
    navToggle.checked = false;
  }

  document.addEventListener("click", (event) => {
    if (!isMobileView()) return;

    const clickedInsideNav = navWrap.contains(event.target);
    if (!clickedInsideNav) {
      closeNav();
    }
  });

  navLinks.forEach((link) => {
    link.addEventListener("click", () => {
      if (isMobileView()) {
        closeNav();
      }
    });
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeNav();
    }
  });

  window.addEventListener("resize", () => {
    if (!isMobileView()) {
      closeNav();
    }
  });
}

// -----------------------------------------------------
// Bio overlay
// -----------------------------------------------------

function initBioOverlay() {
  const bioOverlay = qs("#bioOverlay");
  const bioTitle = qs("#bioTitle");
  const bioRole = qs("#bioRole");
  const bioText = qs("#bioText");
  const bioDownload = qs("#bioDownload");
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

  let lastTrigger = null;

  function openBio(playerKey, trigger = null) {
    const player = bios[playerKey];
    if (!player) return;

    lastTrigger = trigger;
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

    if (lastTrigger) {
      lastTrigger.focus();
    }
  }

  bioButtons.forEach((button) => {
    button.addEventListener("click", () => {
      openBio(button.dataset.player, button);
    });
  });

  closeButtons.forEach((element) => {
    element.addEventListener("click", closeBio);
  });

  bioOverlay.addEventListener("click", (event) => {
    if (event.target === bioOverlay) {
      closeBio();
    }
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

    const rawProgress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    const progress = Math.max(0, Math.min(rawProgress, 100));

    document.documentElement.style.setProperty(
      "--scroll-progress",
      `${progress}%`,
    );
  }

  updateScrollProgress();

  window.addEventListener("scroll", updateScrollProgress, { passive: true });
  window.addEventListener("resize", updateScrollProgress);
  window.addEventListener("load", updateScrollProgress);
}

// -----------------------------------------------------
// Hero slider
// -----------------------------------------------------

function initHeroSlider() {
  const slides = qsa(".hero-slide");
  if (slides.length <= 1) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const intervalMs = 5000;
  let current = slides.findIndex((slide) =>
    slide.classList.contains("is-active"),
  );
  let sliderTimer = null;

  if (current < 0) current = 0;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      const isActive = i === index;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
    });
  }

  function nextSlide() {
    current = (current + 1) % slides.length;
    showSlide(current);
  }

  function stopSlider() {
    if (!sliderTimer) return;
    window.clearInterval(sliderTimer);
    sliderTimer = null;
  }

  function startSlider() {
    if (reducedMotion.matches || sliderTimer) return;
    sliderTimer = window.setInterval(nextSlide, intervalMs);
  }

  showSlide(current);
  startSlider();

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopSlider();
    } else {
      startSlider();
    }
  });

  const motionListener = () => {
    if (reducedMotion.matches) {
      stopSlider();
    } else {
      startSlider();
    }
  };

  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", motionListener);
  } else if (typeof reducedMotion.addListener === "function") {
    reducedMotion.addListener(motionListener);
  }
}
