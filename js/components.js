// ─── Component Loader ───────────────────────────────────────────────────────

// Cached HTML is injected instantly; a background fetch refreshes the cache
// so edits to components show up on the next page view.
function loadComponent(id, path) {
  const key = 'ako::' + path;
  let cached = null;
  try { cached = localStorage.getItem(key); } catch (_) {}

  const refresh = fetch(path, { cache: 'no-cache' })
    .then(res => { if (!res.ok) throw new Error(res.status); return res.text(); })
    .then(html => {
      if (html === cached) return;
      try { localStorage.setItem(key, html); } catch (_) {}
      const placeholder = document.getElementById(id);
      if (placeholder) placeholder.outerHTML = html;
    })
    .catch(() => console.warn('Component load failed:', path));

  const el = document.getElementById(id);
  if (el && cached) el.outerHTML = cached;
  return cached ? Promise.resolve() : refresh;
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

// ─── Service list (single source for every request form) ─────────────────────
// Values match the card ids on appraisal.html and the appraisal-<id>.html pages.

const SERVICE_GROUPS = [
  ['Недвижимость', [
    ['property', 'Оценка недвижимости'],
    ['buildings', 'Оценка зданий и сооружений'],
    ['commercial', 'Оценка коммерческой недвижимости'],
    ['land', 'Оценка земельных участков'],
    ['apartments', 'Оценка квартир'],
    ['country', 'Оценка загородной недвижимости'],
    ['construction', 'Оценка незавершённого строительства'],
  ]],
  ['Движимое имущество и бизнес', [
    ['equipment', 'Оценка машин и оборудования'],
    ['transport', 'Оценка транспортных средств'],
    ['business', 'Оценка бизнеса'],
    ['intangible', 'Оценка нематериальных активов'],
  ]],
  ['Особые случаи', [
    ['damage', 'Оценка ущерба имущества'],
    ['notary', 'Оценка для нотариуса'],
    ['bankruptcy', 'Оценка при банкротстве предприятия'],
  ]],
  ['Экспертиза', [
    ['expertise', 'Судебная и досудебная экспертиза'],
    ['exp-goods', 'Товароведческая экспертиза'],
    ['exp-construction', 'Строительно-техническая экспертиза'],
    ['exp-land', 'Землеустроительная экспертиза'],
    ['exp-economic', 'Экономическая экспертиза'],
    ['exp-ip', 'Экспертиза объектов интеллектуальной собственности'],
    ['exp-auto-goods', 'Автотовароведческая экспертиза'],
    ['exp-auto-tech', 'Автотехническая экспертиза'],
    ['exp-fire', 'Пожарно-техническая экспертиза'],
    ['exp-computer', 'Компьютерно-техническая экспертиза'],
    ['exp-marking', 'Экспертиза маркировочных обозначений'],
    ['exp-appliances', 'Экспертиза электробытовой техники'],
    ['exp-handwriting', 'Почерковедческая экспертиза'],
    ['exp-documents', 'Техническая экспертиза документов'],
    ['exp-soil', 'Почвоведческая экспертиза'],
    ['exp-ecology', 'Экологическая экспертиза'],
    ['exp-biology', 'Биологическая экспертиза'],
  ]],
  ['Консалтинг', [
    ['consulting', 'Консалтинг: инвестиции и строительство'],
  ]],
  [null, [['other', 'Другое']]],
];

function fillServiceSelect(select) {
  select.textContent = '';
  for (const [label, items] of SERVICE_GROUPS) {
    const parent = label ? Object.assign(document.createElement('optgroup'), { label }) : select;
    items.forEach(([value, text]) => parent.appendChild(new Option(text, value)));
    if (label) select.appendChild(parent);
  }
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

  const addOption = opt => {
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
  };

  for (const child of select.children) {
    if (child.tagName === 'OPTGROUP') {
      const label = document.createElement('div');
      label.className = 'cs__group';
      label.textContent = child.label;
      label.addEventListener('click', e => e.stopPropagation());
      dropdown.appendChild(label);
      Array.from(child.children).filter(o => o.value).forEach(addOption);
    } else if (child.value) {
      addOption(child);
    }
  }

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
    if (!wasOpen) {
      // Fit the list into the space left below the field (the page behind the modal can't scroll)
      const spaceBelow = window.innerHeight - trigger.getBoundingClientRect().bottom - 22;
      dropdown.style.maxHeight = Math.max(160, Math.min(340, spaceBelow)) + 'px';
      wrapper.classList.add('cs--open');
      const active = dropdown.querySelector('.cs__option--active');
      if (active) dropdown.scrollTop = active.offsetTop - (dropdown.clientHeight - active.offsetHeight) / 2;
    }
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

// ─── Copy buttons ([data-copy]) ──────────────────────────────────────────────
// Delegated: the footer is injected after the page loads.

function copyText(text) {
  if (navigator.clipboard?.writeText) {
    return navigator.clipboard.writeText(text).catch(() => copyTextFallback(text));
  }
  return copyTextFallback(text);
}

function copyTextFallback(text) {
  const area = document.createElement('textarea');
  area.value = text;
  area.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  return ok ? Promise.resolve() : Promise.reject();
}

document.addEventListener('click', e => {
  const btn = e.target.closest('[data-copy]');
  if (!btn) return;
  copyText(btn.dataset.copy)
    .then(() => showToast('Скопировано: ' + btn.dataset.copy))
    .catch(() => showToast('Не удалось скопировать — выделите текст вручную', '⚠️'));
});

// ─── Lead forms → api/send.php ───────────────────────────────────────────────
// Every form with data-lead-form="<where it is>" sends name, phone, service and comment.

const LEAD_ENDPOINT = './api/send.php';
const LEAD_FALLBACK_PHONE = '+7 (812) 986-28-15';

function collectLead(form) {
  const value = name => (form.querySelector('[name="' + name + '"]')?.value || '').trim();
  const service = form.querySelector('select[name="service"]');
  return {
    name: value('name'),
    phone: value('phone'),
    comment: value('comment'),
    service: service?.selectedOptions[0]?.textContent.trim() || '',
    website: value('website'),
    consent: !!form.querySelector('input[name="consent"]')?.checked,
    source: form.dataset.leadForm || '',
    page: location.href,
    pageTitle: document.title.replace(/\s*\|\s*АКО\s*$/, ''),
  };
}

function validateLead(lead) {
  if (lead.name.length < 2) return { field: 'name', message: 'Укажите, как к вам обращаться' };
  if (lead.phone.replace(/\D/g, '').length !== 11) return { field: 'phone', message: 'Укажите телефон полностью' };
  if (!lead.consent) return { field: 'consent', message: 'Подтвердите согласие на обработку персональных данных' };
  return null;
}

async function sendLead(form) {
  const lead = collectLead(form);
  const problem = validateLead(lead);
  if (problem) {
    showToast(problem.message, '⚠️');
    if (problem.field === 'consent') form.querySelector('.consent')?.classList.add('consent--error');
    return false;
  }

  const button = form.querySelector('[type="submit"]');
  button.disabled = true;
  button.classList.add('is-loading');
  try {
    const response = await fetch(LEAD_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(lead),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      // 4xx: the server explains what to fix; anything else: offer the phone
      const fixable = response.status >= 400 && response.status < 500 && result.error;
      showToast(fixable ? result.error : 'Не удалось отправить заявку. Позвоните нам: ' + LEAD_FALLBACK_PHONE, '⚠️');
      return false;
    }
    form.querySelectorAll('input:not([name="website"]):not([type="checkbox"]), textarea').forEach(field => { field.value = ''; });
    form.querySelectorAll('input[type="checkbox"]').forEach(box => { box.checked = false; });
    form.querySelectorAll('.comment-toggle').forEach(btn => setCommentOpen(btn, false));
    showToast('Заявка отправлена! Перезвоним в течение 30 минут в рабочее время.');
    return true;
  } catch (_) {
    showToast('Нет связи с сервером. Позвоните нам: ' + LEAD_FALLBACK_PHONE, '⚠️');
    return false;
  } finally {
    button.disabled = false;
    button.classList.remove('is-loading');
  }
}

function initLeadForm(form, onSuccess) {
  if (!form || form.dataset.leadWired) return;
  form.dataset.leadWired = '1';
  form.noValidate = true;

  // Honeypot: invisible to people, bots fill it in and the server drops the request
  const trap = document.createElement('input');
  trap.type = 'text';
  trap.name = 'website';
  trap.tabIndex = -1;
  trap.autocomplete = 'off';
  trap.className = 'form-trap';
  trap.setAttribute('aria-hidden', 'true');
  form.appendChild(trap);

  form.querySelector('input[name="consent"]')?.addEventListener('change', e => {
    if (e.target.checked) e.target.closest('.consent')?.classList.remove('consent--error');
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (await sendLead(form)) onSuccess?.();
  });
}

function initLeadForms() {
  document.querySelectorAll('form[data-lead-form]').forEach(form => initLeadForm(form));
}

// ─── Optional comment field: hidden until asked for ──────────────────────────
// <button class="comment-toggle" aria-controls="<id>"> + <div class="comment-panel" id="<id>" inert>

function setCommentOpen(btn, open) {
  const panel = document.getElementById(btn.getAttribute('aria-controls'));
  if (!panel) return;
  btn.setAttribute('aria-expanded', String(open));
  btn.querySelector('span').textContent = open ? 'Убрать комментарий' : 'Добавить комментарий';
  panel.classList.toggle('comment-panel--open', open);
  // Don't leave the caret inside the collapsed field
  if (!open && panel.contains(document.activeElement)) btn.focus();
  panel.inert = !open;
  if (open) panel.querySelector('textarea')?.focus({ preventScroll: true });
}

function initCommentToggles(root = document) {
  root.querySelectorAll('.comment-toggle').forEach(btn => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => setCommentOpen(btn, btn.getAttribute('aria-expanded') !== 'true'));
  });
}

// ─── Modal ────────────────────────────────────────────────────────────────────

// Same markup as the consent tick in index.html / contact.html
const CONSENT_FIELD = `
        <label class="consent">
          <input type="checkbox" name="consent" class="consent__box" />
          <span class="consent__text">
            Даю <a href="./consent.html" target="_blank" class="consent__link">согласие на обработку персональных данных</a>
            и принимаю <a href="./policy.html" target="_blank" class="consent__link">политику конфиденциальности</a>
          </span>
        </label>`;

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
      <form class="modal-form" data-lead-form="Окно «Оставить заявку»" novalidate>
        <div class="cform__grid">
          <div class="cform__field">
            <input type="text" class="cform__input" placeholder=" " id="m-name" name="name" autocomplete="name" />
            <label for="m-name" class="cform__label">Ваше имя</label>
            <span class="cform__line"></span>
          </div>
          <div class="cform__field">
            <input type="tel" class="cform__input" placeholder=" " id="m-phone" name="phone" autocomplete="tel" />
            <label for="m-phone" class="cform__label">Телефон</label>
            <span class="cform__line"></span>
          </div>
        </div>
        <div class="cform__field">
          <select name="service" id="m-service" data-service-select></select>
          <label class="cform__label cform__label--up">Вид услуги</label>
          <span class="cform__line"></span>
        </div>
        <button type="button" class="comment-toggle" aria-expanded="false" aria-controls="m-comment-wrap">
          <i class="fa-solid fa-plus"></i><span>Добавить комментарий</span>
        </button>
        <div class="comment-panel" id="m-comment-wrap" inert>
          <div class="comment-panel__inner">
            <div class="cform__field">
              <textarea class="cform__input cform__textarea" placeholder=" " id="m-comment" name="comment" rows="3"></textarea>
              <label for="m-comment" class="cform__label">Комментарий или вопрос</label>
              <span class="cform__line"></span>
            </div>
          </div>
        </div>
        ${CONSENT_FIELD}
        <button type="submit" class="cform__submit">
          <span>Отправить заявку</span>
          <i class="fa-solid fa-arrow-right"></i>
        </button>
      </form>
    </div>`;

  document.body.appendChild(overlay);
  modalOverlay = overlay;

  // Close handlers
  overlay.querySelector('.modal__close').addEventListener('click', closeModal);
  overlay.addEventListener('click', e => { if (e.target === overlay) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  initLeadForm(overlay.querySelector('.modal-form'), closeModal);
  initCommentToggles(overlay);

  // Init custom select + phone mask inside modal
  overlay.querySelectorAll('select[data-service-select]').forEach(fillServiceSelect);
  overlay.querySelectorAll('select').forEach(buildCustomSelect);
  overlay.querySelectorAll('input[type="tel"]').forEach(applyPhoneMask);
}

function openModal(service) {
  if (!modalOverlay) buildModal();
  if (service) modalOverlay.querySelector('.cs__option[data-value="' + service + '"]')?.click();
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
  document.querySelectorAll('.header__bid:not([data-open-modal])').forEach(btn => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => openModal());
  });

  // Order buttons for a specific service → modal with that service preselected
  document.querySelectorAll('[data-open-modal]').forEach(btn => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    btn.addEventListener('click', () => openModal(btn.dataset.openModal));
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

  // Hero "Все услуги" → toggles the "Оценка" / "Экспертиза" links next to it
  document.querySelectorAll('.services__button[aria-controls]').forEach(btn => {
    if (btn.dataset.wired) return;
    btn.dataset.wired = '1';
    const panel = document.getElementById(btn.getAttribute('aria-controls'));
    btn.addEventListener('click', () => {
      const open = btn.getAttribute('aria-expanded') !== 'true';
      btn.setAttribute('aria-expanded', String(open));
      panel?.classList.toggle('hero__services--open', open);
    });
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
// Loaded with `defer`, so the DOM is already parsed when this runs.

(async function boot() {
  if (location.hash) {
    document.getElementById(decodeURIComponent(location.hash.slice(1)))
      ?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }
  setTimeout(() => document.documentElement.classList.add('is-loaded'));

  await Promise.all([
    loadComponent('header-placeholder', './components/header.html'),
    loadComponent('footer-placeholder', './components/footer.html'),
  ]);

  setActiveLink();
  initBurger();
  setFooterYear();
  document.querySelectorAll('select[data-service-select]').forEach(fillServiceSelect);
  initCustomSelects();
  initPhoneMasks();
  initButtons();
  initLeadForms();
  initCommentToggles();
  initCookieBanner();

  if (window.AOS) {
    AOS.init({ once: true, offset: 80, duration: 500, easing: 'ease-out' });
  }
})();
