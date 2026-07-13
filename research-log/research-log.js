const printButton = document.querySelector("[data-print-report]");
const presentationButton = document.querySelector("[data-presentation-toggle]");
const slides = Array.from(document.querySelectorAll(".report-slide"));
const slideCount = document.querySelector("[data-slide-count]");
const previousButton = document.querySelector("[data-slide-prev]");
const nextButton = document.querySelector("[data-slide-next]");
const exitButton = document.querySelector("[data-slide-exit]");
let currentSlide = 0;

if (printButton) {
  printButton.addEventListener("click", () => window.print());
}

function updateControls() {
  if (!slides.length) return;
  if (slideCount) slideCount.textContent = `${currentSlide + 1} / ${slides.length}`;
  if (previousButton) previousButton.disabled = currentSlide === 0;
  if (nextButton) nextButton.disabled = currentSlide === slides.length - 1;
}

function showSlide(index) {
  if (!slides.length) return;
  currentSlide = Math.max(0, Math.min(index, slides.length - 1));
  slides.forEach((slide, slideIndex) => {
    slide.classList.toggle("is-current-slide", slideIndex === currentSlide);
  });
  updateControls();
  window.scrollTo({ top: 0, behavior: "auto" });
  slides[currentSlide].focus({ preventScroll: true });
}

function enterPresentation() {
  if (!slides.length) return;
  currentSlide = 0;
  document.body.classList.add("presentation-mode");
  if (presentationButton) presentationButton.textContent = "離開簡報模式";
  showSlide(currentSlide);
}

function exitPresentation() {
  document.body.classList.remove("presentation-mode");
  if (presentationButton) presentationButton.textContent = "簡報模式";
  slides.forEach((slide) => slide.classList.remove("is-current-slide"));
  updateControls();
}

if (presentationButton) {
  presentationButton.addEventListener("click", () => {
    if (document.body.classList.contains("presentation-mode")) {
      exitPresentation();
    } else {
      enterPresentation();
    }
  });
}

if (previousButton) {
  previousButton.addEventListener("click", () => showSlide(currentSlide - 1));
}

if (nextButton) {
  nextButton.addEventListener("click", () => showSlide(currentSlide + 1));
}

if (exitButton) {
  exitButton.addEventListener("click", exitPresentation);
}

window.addEventListener("keydown", (event) => {
  if (!document.body.classList.contains("presentation-mode")) return;

  if (event.key === "Escape") {
    exitPresentation();
    return;
  }

  if (["ArrowRight", "PageDown", " "].includes(event.key)) {
    event.preventDefault();
    showSlide(currentSlide + 1);
  }

  if (["ArrowLeft", "PageUp"].includes(event.key)) {
    event.preventDefault();
    showSlide(currentSlide - 1);
  }

  if (event.key === "Home") {
    event.preventDefault();
    showSlide(0);
  }

  if (event.key === "End") {
    event.preventDefault();
    showSlide(slides.length - 1);
  }
});

updateControls();
