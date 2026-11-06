/**
 * MEMORIAL PHOTO GALLERY
 * ======================
 * Add a photograph: upload it to images/, then add one object to PHOTOS.
 * Delete a photograph: remove its object from PHOTOS.
 * Replace a photograph: change the `file` name in its object.
 * Reorder photographs: move the object up or down the list.
 * Optional: store small WebP thumbnails in images/thumbnails/.
 * If no thumbnail is provided, the original image is used.
 * No HTML or CSS editing is required to manage photographs.
 */
const PHOTOS = [
  { file: 'pic7.png', thumbnail: 'pic7.webp', description: 'Veronica standing indoors in green and gold attire' },
  { file: 'pic6.png', thumbnail: 'pic6.webp', description: 'Veronica standing outdoors in green and gold attire' },
  { file: 'pic5.png', thumbnail: 'pic5.webp', description: 'Veronica seated outdoors in magenta attire' },
  { file: 'pic4.png', thumbnail: 'pic4.webp', description: 'Veronica standing in a garden in magenta attire' },
  { file: 'pic3.png', thumbnail: 'pic3.webp', description: 'Veronica standing outdoors in magenta attire' },
];

const gallery = document.getElementById('memorialGallery');
const lightbox = document.getElementById('galleryLightbox');
const lightboxImage = document.getElementById('lightboxImage');
const lightboxCaption = document.getElementById('lightboxCaption');
const closeButton = document.getElementById('lightboxClose');
let currentPhoto = 0;
let lastTrigger = null;

function imageUrl(filename) {
  // Encode special characters (spaces, parentheses) without changing folder names.
  return 'images/' + encodeURIComponent(filename);
}

function thumbnailUrl(photo) {
  return photo.thumbnail
    ? 'images/thumbnails/' + encodeURIComponent(photo.thumbnail)
    : imageUrl(photo.file);
}

function displayPhoto(index) {
  if (!PHOTOS.length) return;
  currentPhoto = (index + PHOTOS.length) % PHOTOS.length;
  const photo = PHOTOS[currentPhoto];
  lightboxImage.src = imageUrl(photo.file);
  lightboxImage.alt = photo.description;
  lightboxCaption.textContent = `${currentPhoto + 1} of ${PHOTOS.length} · ${photo.description}`;
}

function openPhoto(index, button) {
  lastTrigger = button;
  displayPhoto(index);
  if (typeof lightbox.showModal === 'function') {
    lightbox.showModal();
    closeButton.focus();
  } else {
    lightbox.setAttribute('open', '');
  }
}

function closePhoto() {
  lightbox.close();
  if (lastTrigger) lastTrigger.focus();
}

if (gallery && lightbox && lightboxImage && lightboxCaption) {
  PHOTOS.forEach((photo, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'gallery-photo';
    button.setAttribute('aria-label', `View photograph ${index + 1}: ${photo.description}`);

    const image = document.createElement('img');
    image.src = thumbnailUrl(photo);
    image.alt = photo.description;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', () => {
      // A missing thumbnail should never hide an otherwise valid photograph.
      if (image.src !== new URL(imageUrl(photo.file), document.baseURI).href) {
        image.src = imageUrl(photo.file);
      }
    });

    button.appendChild(image);
    button.addEventListener('click', () => openPhoto(index, button));
    gallery.appendChild(button);
  });

  closeButton.addEventListener('click', closePhoto);
  document.getElementById('lightboxPrev').addEventListener('click', () => displayPhoto(currentPhoto - 1));
  document.getElementById('lightboxNext').addEventListener('click', () => displayPhoto(currentPhoto + 1));

  lightbox.addEventListener('click', (event) => {
    // Clicking the dark backdrop closes the photograph.
    if (event.target === lightbox) closePhoto();
  });
  lightbox.addEventListener('close', () => {
    lightboxImage.removeAttribute('src');
    if (lastTrigger) lastTrigger.focus();
  });
  lightbox.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); displayPhoto(currentPhoto - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); displayPhoto(currentPhoto + 1); }
  });
}
