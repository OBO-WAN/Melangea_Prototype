(function (window, document) {
  "use strict";

  var defaults = {
    duration: 400,
    easing: "ease",
    once: false,
    offset: 120,
    disable: false,
  };

  var settings = defaults;
  var elements = [];
  var observer = null;
  var scrollHandler = null;

  function extend(target, source) {
    var output = {};
    Object.keys(target).forEach(function (key) {
      output[key] = target[key];
    });

    Object.keys(source || {}).forEach(function (key) {
      output[key] = source[key];
    });

    return output;
  }

  function isDisabled() {
    if (typeof settings.disable === "function") {
      return settings.disable();
    }

    return settings.disable === true;
  }

  function collectElements() {
    elements = Array.prototype.slice.call(document.querySelectorAll("[data-aos]"));
  }

  function prepareElement(element) {
    element.classList.add("aos-init");
    element.setAttribute("data-aos-duration", element.getAttribute("data-aos-duration") || settings.duration);
    element.setAttribute("data-aos-easing", element.getAttribute("data-aos-easing") || settings.easing);
  }

  function animateElement(element) {
    element.classList.add("aos-animate");
  }

  function resetElement(element) {
    if (!settings.once) {
      element.classList.remove("aos-animate");
    }
  }

  function revealAll() {
    elements.forEach(function (element) {
      prepareElement(element);
      animateElement(element);
    });
  }

  function clearObserver() {
    if (observer) {
      observer.disconnect();
      observer = null;
    }

    if (scrollHandler) {
      window.removeEventListener("scroll", scrollHandler);
      window.removeEventListener("resize", scrollHandler);
      scrollHandler = null;
    }
  }

  function observeWithIntersectionObserver() {
    observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateElement(entry.target);

            if (settings.once && observer) {
              observer.unobserve(entry.target);
            }
          } else {
            resetElement(entry.target);
          }
        });
      },
      {
        root: null,
        rootMargin: "0px 0px -" + settings.offset + "px 0px",
        threshold: 0,
      },
    );

    elements.forEach(function (element) {
      prepareElement(element);
      observer.observe(element);
    });
  }

  function observeWithScroll() {
    function check() {
      var viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      elements.forEach(function (element) {
        var rect = element.getBoundingClientRect();
        var inView = rect.top <= viewportHeight - settings.offset && rect.bottom >= 0;

        if (inView) {
          animateElement(element);
        } else {
          resetElement(element);
        }
      });
    }

    scrollHandler = check;

    elements.forEach(prepareElement);
    window.addEventListener("scroll", scrollHandler, { passive: true });
    window.addEventListener("resize", scrollHandler);
    check();
  }

  function refresh() {
    clearObserver();
    collectElements();

    document.body.setAttribute("data-aos-duration", settings.duration);
    document.body.setAttribute("data-aos-easing", settings.easing);

    if (isDisabled()) {
      revealAll();
      return;
    }

    if ("IntersectionObserver" in window) {
      observeWithIntersectionObserver();
    } else {
      observeWithScroll();
    }
  }

  function init(options) {
    settings = extend(defaults, options || {});
    refresh();
  }

  window.AOS = {
    init: init,
    refresh: refresh,
    refreshHard: refresh,
  };
})(window, document);
