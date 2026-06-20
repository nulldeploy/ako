// ─── Component Loader ───────────────────────────────────────────────────────

async function loadComponent(id, path) {
  const el = document.getElementById(id);
  if (!el) return;

  // sessionStorage cache: first visit → fetch + cache, next pages → instant
  const cacheKey = 'ako::' + path;
  const cached = sessionStorage.getItem(cacheKey);

  if (cached) {
    el.outerHTML = cached;
    return;
  }

  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(res.status);
    const html = await res.text();
    sessionStorage.setItem(cacheKey, html);
    el.outerHTML = html;
  } catch (e) {
    console.warn('Component load failed:', path);
  }
}

// ─── Active Nav Link ─────────────────────────────────────────────────────────

function setActiveLink() {
  const path = window.location.pathname;
  document.querySelectorAll('.header__link[data-nav]').forEach(link => {
    const nav = link.dataset.nav;
    const active =
      (nav === 'home' && (path === '/' || path.endsWith('index.html') || path === '')) ||
      (nav === 'services' && (path.endsWith('services.html') || path.endsWith('/services'))) ||
      (nav === 'contact' && (path.endsWith('contact.html') || path.endsWith('/contact'))) ||
      (nav === 'prices' && (path.endsWith('prices.html') || path.endsWith('/prices')));
    link.classList.toggle('link-active', active);
  });
}

// ─── Burger Menu ─────────────────────────────────────────────────────────────

function initBurger() {
  const burger = document.querySelector('.burger-icon');
  const nav = document.querySelector('.header__nav');
  if (!burger || !nav) return;
  burger.addEventListener('click', () => {
    burger.classList.toggle('active');
    nav.classList.toggle('active');
  });
}

// ─── Footer Year ─────────────────────────────────────────────────────────────

function setFooterYear() {
  const el = document.querySelector('.footer__year');
  if (el) el.textContent = new Date().getFullYear();
}

// ─── Custom Select ───────────────────────────────────────────────────────────

function buildCustomSelect(select) {
  if (select.dataset.csInit) return;
  select.dataset.csInit = '1';

  const field = select.closest('[class*="__field"], label');

  const wrapper = document.createElement('div');
  wrapper.className = 'cs';

  const trigger = document.createElement('div');
  trigger.className = 'cs__trigger';
  trigger.setAttribute('role', 'button');
  trigger.setAttribute('tabindex', '0');

  const valueEl = document.createElement('span');
  valueEl.className = 'cs__value';

  const arrowEl = document.createElement('span');
  arrowEl.className = 'cs__arrow';
  arrowEl.innerHTML =
    '<svg viewBox="0 0 10 6" width="10" height="6" fill="none">' +
    '<path d="M1 1L5 5L9 1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>' +
    '</svg>';

  trigger.append(valueEl, arrowEl);

  const dropdown = document.createElement('div');
  dropdown.className = 'cs__dropdown';

  const options = Array.from(select.options).filter(o => o.value);

  options.forEach(opt => {
    const item = document.createElement('div');
    item.className = 'cs__option';
    item.dataset.value = opt.value;
    item.textContent = opt.textContent.trim();

    item.addEventListener('click', () => {
      select.value = opt.value;
      valueEl.textContent = opt.textContent.trim();
      dropdown.querySelectorAll('.cs__option').forEach(o => o.classList.toggle('cs__option--active', o === item));
      wrapper.classList.remove('cs--open');
      const line = field?.querySelector('[class*="__line"]');
      if (line) {
        line.style.transition = 'none';
        line.style.width = '100%';
        setTimeout(() => { line.style.transition = ''; line.style.width = ''; }, 600);
      }
      select.dispatchEvent(new Event('change'));
    });

    dropdown.appendChild(item);
  });

  // Set first option as default value
  if (options.length) {
    const first = options[0];
    select.value = first.value;
    valueEl.textContent = first.textContent.trim();
    dropdown.querySelector('[data-value="' + first.value + '"]')?.classList.add('cs__option--active');
  }

  wrapper.append(trigger, dropdown);

  select.style.display = 'none';
  select.parentNode.insertBefore(wrapper, select);
  wrapper.appendChild(select);

  field?.querySelector('[class*="select-arrow"]')?.remove();

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    const wasOpen = wrapper.classList.contains('cs--open');
    closeAllSelects();
    if (!wasOpen) wrapper.classList.add('cs--open');
  });

  trigger.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); trigger.click(); }
    if (e.key === 'Escape') closeAllSelects();
  });
}

function closeAllSelects() {
  document.querySelectorAll('.cs--open').forEach(s => s.classList.remove('cs--open'));
}

function initCustomSelects() {
  document.querySelectorAll('select').forEach(buildCustomSelect);
}

document.addEventListener('click', closeAllSelects);

// ─── Phone Mask ──────────────────────────────────────────────────────────────

function applyPhoneMask(input) {
  if (input.dataset.phoneMask) return;
  input.dataset.phoneMask = '1';

  function format(raw) {
    let d = raw.replace(/\D/g, '');
    if (d.startsWith('8')) d = '7' + d.slice(1);
    if (d.startsWith('7')) d = d.slice(1);
    d = d.slice(0, 10);
    let out = '+7';
    if (d.length > 0) out += ' (' + d.slice(0, 3);
    if (d.length >= 3) out += ') ' + d.slice(3, 6);
    if (d.length >= 6) out += '-' + d.slice(6, 8);
    if (d.length >= 8) out += '-' + d.slice(8, 10);
    return out;
  }

  input.addEventListener('focus', function () {
    if (!this.value) this.value = '+7 (';
  });

  input.addEventListener('blur', function () {
    if (this.value === '+7 (' || this.value === '+7') this.value = '';
  });

  input.addEventListener('input', function () {
    const pos = this.selectionStart;
    const prev = this.value;
    this.value = format(this.value);
    // restore cursor roughly
    const diff = this.value.length - prev.length;
    try { this.setSelectionRange(pos + diff, pos + diff); } catch (_) {}
  });

  input.addEventListener('keydown', function (e) {
    if (e.key === 'Backspace' && (this.value === '+7 (' || this.value === '+7')) {
      this.value = '';
      e.preventDefault();
    }
  });
}

function initPhoneMasks() {
  document.querySelectorAll('input[type="tel"]').forEach(applyPhoneMask);
}

// ─── Toast ───────────────────────────────────────────────────────────────────

function showToast(message, icon) {
  icon = icon || '✅';
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = '<span class="toast__icon">' + icon + '</span><span>' + message + '</span>';
  document.body.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('toast--out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  }, 3500);
}

// ─── Modal ────────────────────────────────────────────────────────────────────

let modalOverlay = null;

function buildModal() {
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.innerHTML = `
    <div class="modal">
      <button class="modal__close" aria-label="Закрыть"><i class="fa-solid fa-xmark"></i></button>
      <h2 class="modal__title">Оставить заявку</h2>
      <p class="modal__subtitle">Ответим в течение 30 минут в рабочее время</p>
      <form class="modal-form">
        <div class="cform__grid">
          <div class="cform__field">
            <input type="text" class="cform__input" placeholder=" " id="m-name" autocomplete="off" />
            <label for="m-name" class="cform__label">Ваше имя</label>
            <span class="cform__line"></span>
          </div>
          <div class="cform__field">
            <input type="tel" class="cform__input" placeholder=" " id="m-phone" autocomplete="off" />
            <label for="m-phone" class="cform__label">Телефон</label>
            <span class="cform__line"></span>
          </div>
        </div>
        <div class="cform__field">
          <select name="service" id="m-service">
            <option value="real">Оценка жилой недвижимости</option>
            <option value="commercial">Оценка коммерческой недвижимости</option>
            <option value="business">Оценка бизнеса</option>
            <option value="equipment">Оценка оборудования</option>
            <option value="transport">Оценка транспорта</option>
            <option value="court">Судебная экспертиза</option>
            <option value="else">Другое</option>
          </select>
          <label class="cform__label cform__label--up">Вид услуги</label>
          <span class="cform__line"></span>
        </div>
        <button type="submit" class="cform__submit">
          <span>Отправить заявку</span>
          <i class="fa-solid fa-arrow-right"></i>
        </button>
        <p class="cform__privacy">Нажимая кнопку, вы соглашаетесь с <a href="./policy.html" class="cform__privacy-link">политикой конфиденциальности</a></p>
      </form>
    </div>`;

  document.body.appendChild(overlay);
  modalOverlay = overlay;

  // Close handlers
  overlay.querySelector('.modal__close').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  // Form submit
  overlay.querySelector('.modal-form').addEventListener('submit', e => {
    e.preventDefault();
    closeModal();
    showToast('Заявка принята! Мы свяжемся с вами скоро.');
  });

  // Init custom select + phone mask inside modal
  overlay.querySelectorAll('select').forEach(buildCustomSelect);
  overlay.querySelectorAll('input[type="tel"]').forEach(applyPhoneMask);
}

function openModal() {
  if (!modalOverlay) buildModal();
  document.body.style.overflow = 'hidden';
  modalOverlay.classList.add('modal-overlay--open');
}

function closeModal() {
  if (!modalOverlay) return;
  modalOverlay.classList.remove('modal-overlay--open');
  document.body.style.overflow = '';
}

// ─── Wire up all buttons ──────────────────────────────────────────────────────

function initButtons() {
  // Header "Оставить заявку" → modal (runs after header component loads)
  document.querySelectorAll('.header__bid').forEach(btn => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', openModal);
  });

  // Hero "Получить консультацию" → scroll to #consultation or open modal
  document.querySelectorAll('.consultation__button').forEach(btn => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => {
      const target = document.getElementById('consultation');
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        openModal();
      }
    });
  });

  // Hero "Наши услуги" → services page
  document.querySelectorAll('.services__button').forEach(btn => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => { window.location.href = './services.html'; });
  });

  // All form submits → toast success
  document.querySelectorAll('.consultation__submit, .cform__submit').forEach(btn => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.closest('form')?.addEventListener('submit', e => {
      e.preventDefault();
      showToast('Заявка принята! Мы свяжемся с вами скоро.');
    });
    // button type=submit inside form — also handle direct click if no form
    if (!btn.closest('form')) {
      btn.addEventListener('click', () => showToast('Заявка принята! Мы свяжемся с вами скоро.'));
    }
  });
}

// ─── Cookie Banner ───────────────────────────────────────────────────────────

function initCookieBanner() {
  if (localStorage.getItem('ako_cookies_ok')) return;

  const banner = document.createElement('div');
  banner.className = 'cookie-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Уведомление о cookies');
  banner.innerHTML =
    '<span class="cookie-banner__icon">🍪</span>' +
    '<p class="cookie-banner__text">Мы используем cookies для корректной работы сайта и анализа посещаемости. ' +
    'Продолжая использовать сайт, вы соглашаетесь с нашей ' +
    '<a href="./policy.html">политикой конфиденциальности</a>.</p>' +
    '<button class="cookie-banner__btn">Принять</button>';

  document.body.appendChild(banner);

  banner.querySelector('.cookie-banner__btn').addEventListener('click', () => {
    localStorage.setItem('ako_cookies_ok', '1');
    banner.classList.add('cookie-banner--hiding');
    banner.addEventListener('animationend', () => banner.remove(), { once: true });
  });
}

// ─── Boot ────────────────────────────────────────────────────────────────────
// Script is placed at the end of <body>, so DOM is already parsed.
// We skip DOMContentLoaded and boot immediately — this removes the header flash.

(async function boot() {
  await Promise.all([
    loadComponent('header-placeholder', './components/header.html'),
    loadComponent('footer-placeholder', './components/footer.html'),
  ]);

  setActiveLink();
  initBurger();
  setFooterYear();
  initCustomSelects();
  initPhoneMasks();
  initButtons();
  initCookieBanner();

  if (window.AOS) {
    AOS.init({ once: false, mirror: true, offset: 100 });
  }
})();
