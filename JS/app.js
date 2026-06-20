document.addEventListener("DOMContentLoaded", () => {
  [
    initAOS,
    initBioOverlay,
    initScrollProgress,
    initHeroSlider,
    initMobileNav,
    initPressCarousel,
    initSocialFab,
  ].forEach((init) => {
    try {
      init();
    } catch (error) {
      console.error(`Failed to initialize ${init.name}:`, error);
    }
  });
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
// Animate on scroll
// -----------------------------------------------------

function initAOS() {
  if (typeof window.AOS === "undefined") return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  window.AOS.init({
    duration: 700,
    easing: "ease-out-cubic",
    once: true,
    offset: 80,
    disable: () => reducedMotion.matches,
  });

  const refreshAOS = () => {
    window.AOS.refreshHard();
  };

  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", refreshAOS);
  } else if (typeof reducedMotion.addListener === "function") {
    reducedMotion.addListener(refreshAOS);
  }
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

// -----------------------------------------------------
// Press carousel
// -----------------------------------------------------

function initPressCarousel() {
  const carousels = qsa("[data-press-carousel]");
  if (carousels.length === 0) return;

  carousels.forEach((carousel) => {
    const viewport = qs("[data-press-carousel-viewport]", carousel);
    const track = qs("[data-press-carousel-track]", carousel);
    const prevButton = qs("[data-press-carousel-prev]", carousel);
    const nextButton = qs("[data-press-carousel-next]", carousel);
    const dotsWrap = qs("[data-press-carousel-dots]", carousel);
    const controls = qs("[data-press-carousel-controls]", carousel);

    if (!viewport || !track || !prevButton || !nextButton || !dotsWrap) return;

    const slides = qsa(".press-carousel__slide", track);
    if (slides.length === 0) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    );

    let pageCount = 1;
    let activePage = 0;
    let scrollFrame = null;
    let resizeTimer = null;

    function clampPage(page) {
      return Math.max(0, Math.min(page, pageCount - 1));
    }

    function getSlidesPerView() {
      const firstSlide = slides[0];
      const slideWidth = firstSlide.getBoundingClientRect().width;
      const viewportWidth = viewport.getBoundingClientRect().width;

      if (!slideWidth || !viewportWidth) return 1;

      return Math.max(1, Math.round(viewportWidth / slideWidth));
    }

    function getMaxScroll() {
      return Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    }

    function calculatePageCount() {
      pageCount = Math.max(1, Math.ceil(slides.length / getSlidesPerView()));
      activePage = clampPage(activePage);
    }

    function updateControls() {
      prevButton.disabled = activePage <= 0;
      nextButton.disabled = activePage >= pageCount - 1;

      qsa(".press-carousel__dot", dotsWrap).forEach((dot, index) => {
        const isActive = index === activePage;
        dot.classList.toggle("is-active", isActive);
        dot.setAttribute("aria-current", isActive ? "true" : "false");
      });

      if (controls) {
        controls.hidden = pageCount <= 1;
      }
    }

    function renderDots() {
      dotsWrap.innerHTML = "";

      for (let index = 0; index < pageCount; index += 1) {
        const dot = document.createElement("button");
        dot.type = "button";
        dot.className = "press-carousel__dot";
        dot.setAttribute("aria-label", `Pressestimmen Seite ${index + 1}`);

        dot.addEventListener("click", () => {
          goToPage(index);
        });

        dotsWrap.appendChild(dot);
      }
    }

    function goToPage(page) {
      activePage = clampPage(page);

      const maxScroll = getMaxScroll();
      const targetLeft =
        pageCount > 1 ? (maxScroll / (pageCount - 1)) * activePage : 0;

      viewport.scrollTo({
        left: targetLeft,
        behavior: prefersReducedMotion.matches ? "auto" : "smooth",
      });

      updateControls();
    }

    function syncActivePageFromScroll() {
      const maxScroll = getMaxScroll();
      const nextPage =
        maxScroll > 0
          ? Math.round((viewport.scrollLeft / maxScroll) * (pageCount - 1))
          : 0;

      activePage = clampPage(nextPage);
      updateControls();
    }

    function refreshCarousel() {
      calculatePageCount();
      renderDots();
      goToPage(activePage);
    }

    prevButton.addEventListener("click", () => {
      goToPage(activePage - 1);
    });

    nextButton.addEventListener("click", () => {
      goToPage(activePage + 1);
    });

    viewport.addEventListener(
      "scroll",
      () => {
        if (scrollFrame) return;

        scrollFrame = window.requestAnimationFrame(() => {
          syncActivePageFromScroll();
          scrollFrame = null;
        });
      },
      { passive: true },
    );

    viewport.addEventListener("keydown", (event) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        goToPage(activePage - 1);
      }

      if (event.key === "ArrowRight") {
        event.preventDefault();
        goToPage(activePage + 1);
      }
    });

    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(refreshCarousel, 120);
    });

    refreshCarousel();
  });
}

// -----------------------------------------------------
// Scroll to the top button
// -----------------------------------------------------

const scrollTopBtn = document.getElementById("scrollTopBtn");

if (scrollTopBtn) {
  const toggleScrollTopBtn = () => {
    if (window.scrollY > 300) {
      scrollTopBtn.classList.add("is-visible");
    } else {
      scrollTopBtn.classList.remove("is-visible");
    }
  };

  scrollTopBtn.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });

  window.addEventListener("scroll", toggleScrollTopBtn, { passive: true });
  toggleScrollTopBtn();
}
// -----------------------------------------------------
// Floating social media menu
// -----------------------------------------------------

function initSocialFab() {
  const socialProfiles = [
    {
      name: "Facebook",
      href: "https://www.facebook.com/melangea2/",
      label: "Mélange à Deux auf Facebook",
      icon: "facebook",
    },
    {
      name: "Instagram",
      href: "https://www.instagram.com/melangea2/",
      label: "Mélange à Deux auf Instagram",
      icon: "instagram",
    },
  ];

  if (qs("[data-social-fab]") || socialProfiles.length === 0) return;

  const socialFab = document.createElement("div");
  socialFab.className = "social-fab";
  socialFab.setAttribute("data-social-fab", "");

  const socialLinks = document.createElement("div");
  socialLinks.className = "social-fab__links";
  socialLinks.id = "social-fab-links";
  socialLinks.setAttribute("data-social-fab-links", "");
  socialLinks.setAttribute("aria-hidden", "true");

  socialProfiles.forEach((profile, index) => {
    const link = document.createElement("a");
    link.className = "social-fab__link";
    link.href = profile.href;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.setAttribute("aria-label", profile.label);
    link.setAttribute("tabindex", "-1");
    link.style.setProperty("--social-fab-index", String(index));
    link.innerHTML = getSocialFabIcon(profile.icon);
    socialLinks.append(link);
  });

  const socialToggle = document.createElement("button");
  socialToggle.className = "social-fab__toggle";
  socialToggle.type = "button";
  socialToggle.setAttribute("data-social-fab-toggle", "");
  socialToggle.setAttribute("aria-label", "Social-Media-Links öffnen");
  socialToggle.setAttribute("aria-controls", socialLinks.id);
  socialToggle.setAttribute("aria-expanded", "false");
  socialToggle.innerHTML = getSocialFabIcon("share");

  socialFab.append(socialLinks, socialToggle);
  document.body.append(socialFab);

  const setSocialFabOpen = (isOpen) => {
    socialFab.classList.toggle("is-open", isOpen);
    socialToggle.setAttribute("aria-expanded", String(isOpen));
    socialToggle.setAttribute(
      "aria-label",
      isOpen ? "Social-Media-Links schließen" : "Social-Media-Links öffnen",
    );
    socialLinks.setAttribute("aria-hidden", String(!isOpen));
    qsa(".social-fab__link", socialLinks).forEach((link) => {
      link.setAttribute("tabindex", isOpen ? "0" : "-1");
    });
  };

  socialToggle.addEventListener("click", () => {
    setSocialFabOpen(!socialFab.classList.contains("is-open"));
  });

  socialLinks.addEventListener("click", (event) => {
    if (event.target.closest("a")) {
      setSocialFabOpen(false);
    }
  });

  document.addEventListener("click", (event) => {
    if (!socialFab.classList.contains("is-open")) return;
    if (!socialFab.contains(event.target)) {
      setSocialFabOpen(false);
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && socialFab.classList.contains("is-open")) {
      setSocialFabOpen(false);
      socialToggle.focus();
    }
  });
}

function getSocialFabIcon(icon) {
  const icons = {
    facebook:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M14 8.9V7.2c0-.8.2-1.3 1.4-1.3h1.7V3.1c-.8-.1-1.7-.2-2.5-.2-2.6 0-4.4 1.6-4.4 4.5v1.5H7.3V12h2.9v8.9H14V12h2.8l.4-3.1H14Z"/></svg>',
    instagram:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7.8 2.8h8.4a5 5 0 0 1 5 5v8.4a5 5 0 0 1-5 5H7.8a5 5 0 0 1-5-5V7.8a5 5 0 0 1 5-5Zm0 2A3 3 0 0 0 4.8 7.8v8.4a3 3 0 0 0 3 3h8.4a3 3 0 0 0 3-3V7.8a3 3 0 0 0-3-3H7.8Zm4.2 3.5a3.7 3.7 0 1 1 0 7.4 3.7 3.7 0 0 1 0-7.4Zm0 2a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4Zm4-2.9a1 1 0 1 1 2 0 1 1 0 0 1-2 0Z"/></svg>',
    share:
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M18 15.2c-1.2 0-2.2.6-2.8 1.5L9 13.6a3.7 3.7 0 0 0 0-3.2l6.2-3.1A3.4 3.4 0 1 0 14.4 5c0 .2 0 .4.1.6L8.2 8.7a3.4 3.4 0 1 0 0 6.6l6.3 3.1c0 .2-.1.4-.1.6a3.4 3.4 0 1 0 3.6-3.8Z"/></svg>',
  };

  return icons[icon] || "";
}
