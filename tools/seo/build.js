#!/usr/bin/env node
// Applies tools/seo/config.js to every page and checks the site.
//   node tools/seo/build.js           — update pages, sitemap.xml, robots.txt, site.webmanifest
//   node tools/seo/build.js --check   — only report problems, change nothing
//
// In each page it owns: <title>, <meta name="description"> and the block between
// <!-- SEO:start --> and <!-- SEO:end -->. Everything else in the page is left alone,
// so it is safe to run after any edit (and after regenerating service pages).

const fs = require('fs');
const path = require('path');
const config = require('./config');

const ROOT = path.resolve(__dirname, '..', '..');
const CHECK_ONLY = process.argv.includes('--check');
const SITE = config.siteUrl.replace(/\/+$/, '');
// Written by this script, so links to them are fine even before the first run
const GENERATED = ['sitemap.xml', 'robots.txt', 'site.webmanifest'];

const problems = [];
const warn = (file, msg) => problems.push(`${file}: ${msg}`);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ENTITIES = { nbsp: ' ', amp: '&', quot: '"', laquo: '«', raquo: '»', mdash: '—', ndash: '–', lt: '<', gt: '>', '#39': "'" };
const decode = s => s.replace(/&(#?\w+);/g, (m, e) => ENTITIES[e] ?? m);
const textOf = html => decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
const attr = s => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

const pageUrl = file => (file === 'index.html' ? SITE + '/' : `${SITE}/${file}`);
// "./appraisal.html#movable" → absolute URL
const absUrl = href => {
  const [file, hash] = href.replace(/^\.\//, '').split('#');
  return pageUrl(file || 'index.html') + (hash ? '#' + hash : '');
};

const brandless = title => title.replace(/\s*\|\s*АКО\s*$/, '');

// ─── What the page itself says ───────────────────────────────────────────────

function readPage(file, html) {
  const h1s = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/g)].map(m => textOf(m[1]));

  // Visible breadcrumbs: <p class="…breadcrumb…"><a href>Главная</a> <i></i> … Current</p>
  let breadcrumbs = null;
  const bc = html.match(/<p class="[^"]*breadcrumb[^"]*">([\s\S]*?)<\/p>/);
  if (bc) {
    const links = [...bc[1].matchAll(/<a href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)].map(m => ({ name: textOf(m[2]), url: absUrl(m[1]) }));
    const current = textOf(bc[1].slice(bc[1].lastIndexOf('</i>') + 4));
    breadcrumbs = [...links, { name: current, url: pageUrl(file) }];
  }

  const priceText = (html.match(/sd-price-card__price">([^<]*)</) || [])[1] || '';
  const minPrice = /от\s*([\d\s]+)₽/.test(priceText) ? Number(priceText.match(/от\s*([\d\s]+)₽/)[1].replace(/\s/g, '')) : null;

  return { h1s, breadcrumbs, minPrice };
}

// ─── Structured data (schema.org) ────────────────────────────────────────────

function organizationNode() {
  const o = config.organization;
  return {
    '@type': 'ProfessionalService',
    '@id': SITE + '/#organization',
    name: o.name,
    legalName: o.legalName,
    alternateName: o.alternateName,
    description: o.description,
    url: SITE + '/',
    logo: `${SITE}/${o.logo}`,
    image: `${SITE}/${config.ogImage.path}`,
    foundingDate: o.foundingDate,
    telephone: o.telephone,
    email: o.email,
    priceRange: o.priceRange,
    address: {
      '@type': 'PostalAddress',
      postalCode: o.address.postalCode,
      addressLocality: o.address.locality,
      streetAddress: o.address.street,
      addressCountry: 'RU',
    },
    geo: { '@type': 'GeoCoordinates', latitude: o.geo.latitude, longitude: o.geo.longitude },
    hasMap: o.map,
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: o.openingHours.days,
      opens: o.openingHours.opens,
      closes: o.openingHours.closes,
    }],
    areaServed: o.areaServed.map(name => ({ '@type': name.includes('область') ? 'AdministrativeArea' : 'City', name })),
  };
}

function structuredData(file, meta, page) {
  const url = pageUrl(file);
  const graph = [organizationNode()];

  graph.push({
    '@type': 'WebSite',
    '@id': SITE + '/#website',
    url: SITE + '/',
    name: config.organization.name + ' — ' + config.organization.alternateName[0],
    inLanguage: 'ru-RU',
    publisher: { '@id': SITE + '/#organization' },
  });

  const webPage = {
    '@type': meta.type || 'WebPage',
    '@id': url + '#webpage',
    url,
    name: meta.title,
    description: meta.description,
    inLanguage: 'ru-RU',
    isPartOf: { '@id': SITE + '/#website' },
    about: { '@id': SITE + '/#organization' },
  };
  graph.push(webPage);

  if (page.breadcrumbs) {
    webPage.breadcrumb = { '@id': url + '#breadcrumb' };
    graph.push({
      '@type': 'BreadcrumbList',
      '@id': url + '#breadcrumb',
      itemListElement: page.breadcrumbs.map((b, i) => ({ '@type': 'ListItem', position: i + 1, name: b.name, item: b.url })),
    });
  }

  const section = file.startsWith('appraisal-') ? 'Оценка' : file.startsWith('expertise-') ? 'Экспертиза' : null;
  if (section && page.h1s[0]) {
    const service = {
      '@type': 'Service',
      '@id': url + '#service',
      name: page.h1s[0],
      serviceType: page.h1s[0],
      category: section,
      description: meta.description,
      url,
      provider: { '@id': SITE + '/#organization' },
      areaServed: config.organization.areaServed.map(name => ({ '@type': name.includes('область') ? 'AdministrativeArea' : 'City', name })),
    };
    if (page.minPrice) {
      service.offers = {
        '@type': 'Offer',
        url,
        priceCurrency: 'RUB',
        priceSpecification: { '@type': 'PriceSpecification', minPrice: page.minPrice, priceCurrency: 'RUB' },
      };
    }
    webPage.mainEntity = { '@id': url + '#service' };
    graph.push(service);
  }

  return { '@context': 'https://schema.org', '@graph': graph };
}

// ─── <head> block ────────────────────────────────────────────────────────────

function headBlock(file, meta, page, indent) {
  const url = pageUrl(file);
  const og = config.ogImage;
  // Hidden pages (404) get no canonical/og:url/structured data: they have no address of their own to promote
  const indexed = !meta.noindex;
  const lines = [
    '<!-- SEO:start — generated by tools/seo/build.js, edit tools/seo/config.js instead -->',
    indexed ? `<link rel="canonical" href="${url}" />` : '<meta name="robots" content="noindex, follow" />',
    file === 'index.html' && config.yandexVerification ? `<meta name="yandex-verification" content="${attr(config.yandexVerification)}" />` : null,
    file === 'index.html' && config.googleVerification ? `<meta name="google-site-verification" content="${attr(config.googleVerification)}" />` : null,
    `<meta name="theme-color" content="${config.themeColor}" />`,
    '<link rel="icon" href="./favicon.ico" sizes="32x32" />',
    '<link rel="icon" href="./favicon.svg" type="image/svg+xml" />',
    '<link rel="apple-touch-icon" href="./assets/img/favicon/apple-touch-icon.png" />',
    '<link rel="manifest" href="./site.webmanifest" />',
    '<meta property="og:type" content="website" />',
    '<meta property="og:locale" content="ru_RU" />',
    `<meta property="og:site_name" content="${attr(config.organization.name + ' — ' + config.organization.alternateName[0])}" />`,
    `<meta property="og:title" content="${attr(brandless(meta.title))}" />`,
    `<meta property="og:description" content="${attr(meta.description)}" />`,
    indexed ? `<meta property="og:url" content="${url}" />` : null,
    `<meta property="og:image" content="${SITE}/${og.path}" />`,
    `<meta property="og:image:width" content="${og.width}" />`,
    `<meta property="og:image:height" content="${og.height}" />`,
    `<meta property="og:image:alt" content="${attr(og.alt)}" />`,
    '<meta name="twitter:card" content="summary_large_image" />',
    ...(indexed ? [
      '<script type="application/ld+json">',
      // "<" escaped so a stray "</script>" in text can't close the tag
      ...JSON.stringify(structuredData(file, meta, page), null, 2).replace(/</g, '\\u003c').split('\n'),
      '</script>',
    ] : []),
    '<!-- SEO:end -->',
  ].filter(l => l !== null);
  return lines.map(l => indent + l).join('\n');
}

function applyHead(file, html, meta, page) {
  const eol = html.includes('\r\n') ? '\r\n' : '\n';
  let out = html.replace(/\r\n/g, '\n');

  // Drop what we own (and the old favicon link), wherever it currently is
  out = out
    .replace(/^[ \t]*<!-- SEO:start[\s\S]*?<!-- SEO:end -->[ \t]*\n/m, '')
    .replace(/^[ \t]*<title>[\s\S]*?<\/title>[ \t]*\n/m, '')
    .replace(/^[ \t]*<meta name="description"[^>]*>[ \t]*\n/m, '')
    .replace(/^[ \t]*<link rel="(?:shortcut )?icon"[^>]*>[ \t]*\n/gm, '');

  const viewport = out.match(/^([ \t]*)<meta name="viewport"[^>]*>[ \t]*\n/m);
  if (!viewport) {
    warn(file, 'no <meta name="viewport"> to anchor the SEO block — page left unchanged');
    return html;
  }
  const indent = viewport[1];
  const block = [
    `${indent}<title>${attr(meta.title).replace(/&quot;/g, '"')}</title>`,
    `${indent}<meta name="description" content="${attr(meta.description)}" />`,
    headBlock(file, meta, page, indent),
  ].join('\n') + '\n';

  const at = viewport.index + viewport[0].length;
  out = out.slice(0, at) + block + out.slice(at);
  return out.replace(/\n/g, eol);
}

// ─── Checks ──────────────────────────────────────────────────────────────────

function checkMeta(file, meta, page) {
  const t = meta.title.length;
  const d = meta.description.length;
  if (t < 25 || t > 65) warn(file, `title is ${t} characters (aim for 25–65): "${meta.title}"`);
  if (d < 100 || d > 165) warn(file, `description is ${d} characters (aim for 100–165)`);
  if (page.h1s.length !== 1) warn(file, `has ${page.h1s.length} <h1> (should be exactly one)`);
}

function checkDuplicates(entries) {
  for (const key of ['title', 'description']) {
    const seen = new Map();
    for (const [file, meta] of entries) {
      if (seen.has(meta[key])) warn(file, `same ${key} as ${seen.get(meta[key])}`);
      else seen.set(meta[key], file);
    }
  }
}

// Internal links, anchors, images, scripts and styles must point at something real
function checkReferences(files) {
  const idsOf = new Map();
  const ids = file => {
    if (!idsOf.has(file)) {
      const p = path.join(ROOT, file);
      idsOf.set(file, fs.existsSync(p) ? new Set([...fs.readFileSync(p, 'utf8').matchAll(/\sid="([^"]+)"/g)].map(m => m[1])) : null);
    }
    return idsOf.get(file);
  };

  for (const file of files) {
    const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
    const isComponent = file.startsWith('components/');

    for (const [, href] of html.matchAll(/\shref="([^"]+)"/g)) {
      if (/^(https?:|mailto:|tel:|data:|javascript:)/.test(href)) continue;
      const [target, hash] = href.replace(/^\.\//, '').split('#');
      if (!target) {
        // "#anchor" on the same page (components are injected into every page, skip them)
        if (hash && !isComponent && !ids(file).has(hash)) warn(file, `link to missing anchor ${href}`);
        continue;
      }
      if (!GENERATED.includes(target) && !fs.existsSync(path.join(ROOT, target))) { warn(file, `broken link ${href}`); continue; }
      if (hash && target.endsWith('.html') && !ids(target).has(hash)) warn(file, `link to missing anchor ${href}`);
    }

    for (const [, src] of html.matchAll(/\ssrc="([^"]+)"/g)) {
      if (/^(https?:|data:|\/\/)/.test(src)) continue;
      if (!fs.existsSync(path.join(ROOT, src.replace(/^\.\//, '')))) warn(file, `missing file ${src}`);
    }

    for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) {
      if (!/\salt="/.test(tag)) warn(file, `image without alt: ${tag.slice(0, 90)}…`);
    }
  }
}

// ─── Site-wide files ─────────────────────────────────────────────────────────

function sitemap(entries) {
  const urls = entries
    .filter(([, meta]) => !meta.noindex)
    .map(([file, meta]) => {
      const lastmod = fs.statSync(path.join(ROOT, file)).mtime.toISOString().slice(0, 10);
      const priority = (meta.priority ?? (file.includes('-') ? 0.7 : 0.8)).toFixed(1);
      return `  <url>\n    <loc>${pageUrl(file)}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <priority>${priority}</priority>\n  </url>`;
    });
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

function robots() {
  // components/ stays open: search engines render pages with JS and need the header/footer
  return [
    'User-agent: *',
    'Disallow: /api/',
    'Disallow: /tools/',
    '',
    `Sitemap: ${SITE}/sitemap.xml`,
    '',
  ].join('\n');
}

function manifest() {
  const o = config.organization;
  return JSON.stringify({
    name: `${o.name} — ${o.alternateName[0]}`,
    short_name: o.name,
    lang: 'ru',
    start_url: './',
    display: 'browser',
    theme_color: config.themeColor,
    background_color: '#ffffff',
    icons: [
      { src: './assets/img/favicon/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: './assets/img/favicon/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }, null, 2) + '\n';
}

function writeIfChanged(file, content) {
  const p = path.join(ROOT, file);
  if (fs.existsSync(p) && fs.readFileSync(p, 'utf8') === content) return false;
  if (!CHECK_ONLY) fs.writeFileSync(p, content);
  return true;
}

// ─── Run ─────────────────────────────────────────────────────────────────────

const pageFiles = fs.readdirSync(ROOT).filter(f => f.endsWith('.html')).sort();
const componentFiles = fs.existsSync(path.join(ROOT, 'components'))
  ? fs.readdirSync(path.join(ROOT, 'components')).filter(f => f.endsWith('.html')).map(f => 'components/' + f)
  : [];

for (const file of Object.keys(config.pages)) {
  if (!pageFiles.includes(file)) warn(file, 'listed in config.js but the file does not exist');
}

const entries = [];
const changed = [];
for (const file of pageFiles) {
  const meta = config.pages[file];
  if (!meta) { warn(file, 'has no entry in tools/seo/config.js — add a title and description'); continue; }
  entries.push([file, meta]);

  const html = fs.readFileSync(path.join(ROOT, file), 'utf8');
  const page = readPage(file, html);
  checkMeta(file, meta, page);
  if (writeIfChanged(file, applyHead(file, html, meta, page))) changed.push(file);
}

checkDuplicates(entries);
checkReferences([...pageFiles, ...componentFiles]);

for (const [file, content] of [['sitemap.xml', sitemap(entries)], ['robots.txt', robots()], ['site.webmanifest', manifest()]]) {
  if (writeIfChanged(file, content)) changed.push(file);
}

const verb = CHECK_ONLY ? 'would change' : 'updated';
console.log(`${entries.length} pages checked, ${changed.length ? `${verb}: ${changed.join(', ')}` : 'nothing to change'}`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  problems.forEach(p => console.log('  - ' + p));
  process.exitCode = 1;
} else {
  console.log('No problems found.');
}
