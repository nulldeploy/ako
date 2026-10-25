// Homepage «Благодарственные письма»: slider + full-size letter viewer

(function () {
  const section = document.querySelector('.letters');
  if (!section) return;

  if (window.Swiper) {
    new Swiper(section.querySelector('.letters__slider'), {
      slidesPerView: 'auto',
      spaceBetween: 20,
      watchOverflow: true,
      navigation: {
        prevEl: section.querySelector('.letters__arrow--prev'),
        nextEl: section.querySelector('.letters__arrow--next'),
      },
      pagination: {
        el: section.querySelector('.letters__pagination'),
        clickable: true,
      },
      a11y: {
        prevSlideMessage: 'Предыдущее письмо',
        nextSlideMessage: 'Следующее письмо',
        paginationBulletMessage: 'Письмо {{index}}',
      },
    });
  }

  // ─── Lightbox ──────────────────────────────────────────────────────────────

  let lightbox = null;
  let opener = null;

  function buildLightbox() {
    lightbox = document.createElement('div');
    lightbox.className = 'lightbox';
    lightbox.setAttribute('role', 'dialog');
    lightbox.setAttribute('aria-modal', 'true');
    lightbox.setAttribute('aria-label', 'Благодарственное письмо');
    lightbox.innerHTML = `
      <button type="button" class="lightbox__close" aria-label="Закрыть"><i class="fa-solid fa-xmark"></i></button>
      <img class="lightbox__img" alt="" />`;
    document.body.appendChild(lightbox);

    lightbox.querySelector('.lightbox__close').addEventListener('click', close);
    lightbox.addEventListener('click', e => { if (e.target === lightbox) close(); });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && lightbox.classList.contains('lightbox--open')) close();
    });
  }

  function open(src, alt, from) {
    if (!lightbox) buildLightbox();
    opener = from;
    const img = lightbox.querySelector('.lightbox__img');
    img.src = src;
    img.alt = alt;
    lightbox.scrollTop = 0;
    document.body.style.overflow = 'hidden';
    lightbox.classList.add('lightbox--open');
    lightbox.querySelector('.lightbox__close').focus({ preventScroll: true });
  }

  function close() {
    lightbox.classList.remove('lightbox--open');
    document.body.style.overflow = '';
    opener?.focus({ preventScroll: true });
  }

  section.querySelectorAll('[data-letter-full]').forEach(btn => {
    btn.addEventListener('click', () => {
      const alt = btn.closest('.letter')?.querySelector('.letter__paper img')?.alt || '';
      open(btn.dataset.letterFull, alt, btn);
    });
  });
})();
