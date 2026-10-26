// Yandex Maps on the contact page. Until a key is set, the placeholder with the
// "Открыть в Яндекс Картах" link stays as is. Key: developer.tech.yandex.ru →
// «JavaScript API и HTTP Геокодер».
// Runs again each time «Контакты» is opened without a page reload (components.js),
// so everything lives inside the IIFE and the API script is requested only once.

(function () {
  const YANDEX_MAPS_API_KEY = '323bd0bd-ed2d-4654-9846-9b55c509a113';

  const OFFICE = {
    coords: [59.89422, 30.439809], // пр-кт Обуховской Обороны, 86К
    name: 'Агентство Консалтинга и Оценки',
    address: 'г. Санкт-Петербург, пр-кт Обуховской Обороны, д. 86, литер К, офис 627',
  };

  function loadYandexMaps(key) {
    if (!window.__akoYandexMaps) {
      window.__akoYandexMaps = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://api-maps.yandex.ru/2.1/?lang=ru_RU&apikey=' + encodeURIComponent(key);
        script.onload = () => window.ymaps.ready(resolve);
        script.onerror = () => { window.__akoYandexMaps = null; reject(); };
        document.head.appendChild(script);
      });
    }
    return window.__akoYandexMaps;
  }

  function initContactMap(container) {
    loadYandexMaps(YANDEX_MAPS_API_KEY)
      .then(() => {
        container.textContent = '';
        container.classList.add('contacts-map__placeholder--map');
        const map = new window.ymaps.Map(container, {
          center: OFFICE.coords,
          zoom: 16,
          controls: ['zoomControl', 'fullscreenControl'],
        });
        // Don't hijack page scrolling: wheel zoom off everywhere, one-finger drag off on touch screens
        map.behaviors.disable('scrollZoom');
        if (window.matchMedia('(pointer: coarse)').matches) map.behaviors.disable('drag');

        // Pin in the site's main colour (styles/themes/*.css)
        const pinColor = getComputedStyle(document.documentElement).getPropertyValue('--general-color').trim() || '#396074';
        const placemark = new window.ymaps.Placemark(OFFICE.coords, {
          hintContent: OFFICE.name,
          balloonContentHeader: OFFICE.name,
          balloonContentBody: OFFICE.address,
        }, { preset: 'islands#dotIcon', iconColor: pinColor });
        map.geoObjects.add(placemark);
      })
      .catch(() => console.warn('Yandex Maps failed to load'));
  }

  const container = document.getElementById('contact-map');
  if (!container || !YANDEX_MAPS_API_KEY) return;

  const observer = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    observer.disconnect();
    initContactMap(container);
  }, { rootMargin: '300px' });
  observer.observe(container);
})();
