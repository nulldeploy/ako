// Runs synchronously right after #header-placeholder, before first paint.
var AKO_HEADER_KEY = 'ako::./components/header.html';

function setActiveLink() {
  var path = window.location.pathname;
  document.querySelectorAll('.header__link[data-nav]').forEach(function (link) {
    var nav = link.dataset.nav;
    var active =
      (nav === 'home' && (path === '/' || path === '' || path.endsWith('index.html') || path.endsWith('/index'))) ||
      (nav === 'appraisal' && /\/appraisal(-[\w-]+)?(\.html)?$/.test(path)) ||
      (nav === 'expertise' && /\/expertise(-[\w-]+)?(\.html)?$/.test(path)) ||
      (nav === 'prices' && /\/prices(\.html)?$/.test(path)) ||
      (nav === 'about' && /\/about(\.html)?$/.test(path)) ||
      (nav === 'contact' && /\/contact(\.html)?$/.test(path));
    link.classList.toggle('link-active', active);
  });
}

(function () {
  var el = document.getElementById('header-placeholder');
  var html = null;
  try { html = localStorage.getItem(AKO_HEADER_KEY); } catch (e) {}
  if (!el || !html) return;
  el.outerHTML = html;
  setActiveLink();
})();
