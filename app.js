const header = document.querySelector("[data-header]");
const background = document.querySelector(".site-background");
const revealItems = document.querySelectorAll(".reveal");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function updateHeader() {
  if (!header) return;
  header.classList.toggle("is-scrolled", window.scrollY > 24);
}

if (reduceMotion) {
  revealItems.forEach((item) => item.classList.add("is-visible"));
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
  );

  revealItems.forEach((item, index) => {
    item.style.transitionDelay = `${Math.min(index * 45, 240)}ms`;
    observer.observe(item);
  });
}

function updateBackground() {
  if (!background || reduceMotion) return;
  background.style.transform = `translate3d(0, ${window.scrollY * -0.025}px, 0)`;
}

window.addEventListener("scroll", () => {
  updateHeader();
  updateBackground();
}, { passive: true });

updateHeader();
updateBackground();
