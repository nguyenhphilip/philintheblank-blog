document.addEventListener("DOMContentLoaded", () => {
  const lightbox = document.getElementById("lightbox");
  const lightboxImage = document.getElementById("lightboxImage");
  const lightboxCaption = document.getElementById("lightboxCaption");
  const lightboxDate = document.getElementById("lightboxDate");
  const lightboxLocation = document.getElementById("lightboxLocation");

  const lightboxClose = document.getElementById("lightboxClose");
  const lightboxPrev = document.getElementById("lightboxPrev");
  const lightboxNext = document.getElementById("lightboxNext");

  const galleryCards = Array.from(document.querySelectorAll(".gallery-card"));

  let currentIndex = -1;

  function updateNavState() {
    if (!lightboxPrev || !lightboxNext) return;

    lightboxPrev.disabled = currentIndex === 0;
    lightboxNext.disabled = currentIndex === galleryCards.length - 1;
  }

  function showImage(index) {
    if (!lightbox || !lightboxImage) return;
    if (index < 0 || index >= galleryCards.length) return;

    const card = galleryCards[index];
    currentIndex = index;

    lightboxImage.src = card.dataset.full || "";
    lightboxImage.alt = card.dataset.alt || "";

    if (lightboxCaption) {
      lightboxCaption.textContent = card.dataset.caption || "";
    }

    if (lightboxDate) {
      lightboxDate.textContent = card.dataset.date || "";
    }

    if (lightboxLocation) {
      lightboxLocation.textContent = card.dataset.location || "";
    }

    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");

    updateNavState();
  }

  function closeLightbox() {
    if (!lightbox || !lightboxImage) return;

    lightbox.hidden = true;
    lightboxImage.src = "";
    lightboxImage.alt = "";

    if (lightboxCaption) lightboxCaption.textContent = "";
    if (lightboxDate) lightboxDate.textContent = "";
    if (lightboxLocation) lightboxLocation.textContent = "";

    document.body.classList.remove("lightbox-open");
    currentIndex = -1;

    if (lightboxPrev) lightboxPrev.disabled = false;
    if (lightboxNext) lightboxNext.disabled = false;
  }

  function showNextImage() {
    if (currentIndex >= galleryCards.length - 1) return;
    showImage(currentIndex + 1);
  }

  function showPreviousImage() {
    if (currentIndex <= 0) return;
    showImage(currentIndex - 1);
  }

  galleryCards.forEach((card, index) => {
    card.addEventListener("click", () => {
      showImage(index);
    });
  });

  if (lightboxClose) {
    lightboxClose.addEventListener("click", closeLightbox);
  }

  if (lightboxNext) {
    lightboxNext.addEventListener("click", showNextImage);
  }

  if (lightboxPrev) {
    lightboxPrev.addEventListener("click", showPreviousImage);
  }

  if (lightbox) {
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) {
        closeLightbox();
      }
    });
  }

  document.addEventListener("keydown", (event) => {
    if (!lightbox || lightbox.hidden) return;

    if (event.key === "Escape") {
      closeLightbox();
    } else if (event.key === "ArrowRight") {
      showNextImage();
    } else if (event.key === "ArrowLeft") {
      showPreviousImage();
    }
  });
});