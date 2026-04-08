const newsletterOverlay = document.getElementById("newsletter-overlay");
const newsletterOpenButtons = document.querySelectorAll("[data-newsletter-open]");
const newsletterCloseButtons = document.querySelectorAll("[data-newsletter-close]");

if (newsletterOverlay && newsletterOpenButtons.length) {
  const openNewsletter = (event) => {
    event.preventDefault();
    newsletterOverlay.classList.add("is-open");
    newsletterOverlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  };

  const closeNewsletter = () => {
    newsletterOverlay.classList.remove("is-open");
    newsletterOverlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  };

  newsletterOpenButtons.forEach((button) => {
    button.addEventListener("click", openNewsletter);
  });

  newsletterCloseButtons.forEach((button) => {
    button.addEventListener("click", closeNewsletter);
  });

  document.addEventListener("keydown", (event) => {
    if (
      event.key === "Escape" &&
      newsletterOverlay.classList.contains("is-open")
    ) {
      closeNewsletter();
    }
  });
}