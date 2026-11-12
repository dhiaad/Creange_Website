import { fileURLToPath } from 'node:url';
// Assemble les pages statiques de Maison Créange.
// Usage : node build.mjs  →  écrit dans ./site
// - {{> partial}}               insère src/partials/partial.html
// - {{var}}                     variable déclarée dans l'en-tête <!--meta {...} --> de la page
// - {{img name="x" alt="…" sizes="…" class="…" eager}}   génère un <picture> WebP + JPEG responsive
import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const SRC = join(ROOT, 'src');
const OUT = join(ROOT, 'site');
const IMG = join(OUT, 'assets/img');
const SITE_URL = 'https://www.creangeboutique.com';

const pages = {
  'index.html': 'index.html',
  'collections.html': 'collections/index.html',
  'ceremonie.html': 'ceremonie/index.html',
  'a-propos.html': 'a-propos-de-nous/index.html',
  'contact.html': 'contactez-nous/index.html',
  'avis-juridique.html': 'avis-juridique/index.html',
  'confidentialite.html': 'politique-de-confidentialite/index.html',
  '404.html': '404.html',
};

const partial = (name) => readFileSync(join(SRC, 'partials', `${name}.html`), 'utf8');

function attrs(str) {
  const out = {};
  for (const m of str.matchAll(/(\w[\w-]*)(?:="([^"]*)")?/g)) out[m[1]] = m[2] ?? true;
  return out;
}

const imgFiles = readdirSync(IMG);
function picture(a) {
  const widths = [640, 1100, 1600].filter((w) => imgFiles.includes(`${a.name}-${w}.jpg`));
  if (!widths.length) throw new Error(`Image introuvable : ${a.name}`);
  const set = (ext) => widths.map((w) => `/assets/img/${a.name}-${w}.${ext} ${w}w`).join(', ');
  const mid = widths[Math.min(1, widths.length - 1)];
  const sizes = a.sizes || '100vw';
  const loading = a.eager ? 'eager" fetchpriority="high' : 'lazy';
  return `<picture${a.class ? ` class="${a.class}"` : ''}>` +
    `<source type="image/webp" srcset="${set('webp')}" sizes="${sizes}">` +
    `<img src="/assets/img/${a.name}-${mid}.jpg" srcset="${set('jpg')}" sizes="${sizes}" alt="${a.alt || ''}" loading="${loading}" decoding="async"${a.pos ? ` style="object-position:${a.pos}"` : ''}>` +
    `</picture>`;
}

// Photo détourée (WebP avec transparence) : {{cut name="cut-veste-croisee" alt="…" sizes="…" class="…"}}
function cutout(a) {
  const files = imgFiles.filter((f) => f.startsWith(a.name + '-') && f.endsWith('.webp'))
    .map((f) => [f, parseInt(f.slice(a.name.length + 1), 10)]).filter(([, w]) => w > 0).sort((x, y) => x[1] - y[1]);
  if (!files.length) throw new Error(`Détourage introuvable : ${a.name}`);
  const set = files.map(([f, w]) => `/assets/img/${f} ${w}w`).join(', ');
  return `<img${a.class ? ` class="${a.class}"` : ''} src="/assets/img/${files[files.length - 1][0]}" srcset="${set}" sizes="${a.sizes || '50vw'}" alt="${a.alt || ''}" loading="${a.eager ? 'eager' : 'lazy'}" decoding="async"${a.attrs ? ' ' + a.attrs.replace(/'/g, '"') : ''}>`;
}

// Cadre photo : {{ph id="P01" ratio="4/5" title="…" brief="…" class="…"}}
// Si site/assets/img/photos/P01.jpg (ou .webp) existe, la photo remplace le cadre.
const PHOTOS = join(IMG, 'photos');
const MAQ = existsSync(join(SRC, 'maquette.json')) ? JSON.parse(readFileSync(join(SRC, 'maquette.json'), 'utf8')).photos || {} : {};
const pexels = (u, w) => `${u}?auto=compress&cs=tinysrgb&w=${w}`;
// Copie locale des images de maquette (aucune requête vers Pexels côté visiteur).
const MAQ_DIR = join(IMG, 'maquette');
const MAQ_W = [800, 1600];
mkdirSync(MAQ_DIR, { recursive: true });
const srcFile = join(MAQ_DIR, 'sources.json');
const known = existsSync(srcFile) ? JSON.parse(readFileSync(srcFile, 'utf8')) : {};
for (const [id, u] of Object.entries(MAQ)) {
  for (const w of MAQ_W) {
    const f = join(MAQ_DIR, `${id}-${w}.jpg`);
    if (existsSync(f) && known[id] === u) continue;
    const res = await fetch(pexels(u, w));
    if (!res.ok) throw new Error(`Téléchargement impossible : ${id} (${res.status})`);
    writeFileSync(f, Buffer.from(await res.arrayBuffer()));
    console.log('↓', id, w);
  }
  known[id] = u;
}
writeFileSync(srcFile, JSON.stringify(known, null, 2));
const shots = new Map();
function placeholder(a, page) {
  const ratio = a.ratio || '4/5';
  if (!shots.has(a.id)) shots.set(a.id, { ...a, ratio, pages: new Set() });
  shots.get(a.id).pages.add(page);
  const cls = `ph${a.class ? ' ' + a.class : ''}`;
  const style = a.class && a.class.includes('ph--bleed') ? '' : ` style="aspect-ratio:${ratio}"`;
  for (const ext of ['webp', 'jpg']) {
    if (existsSync(join(PHOTOS, `${a.id}.${ext}`))) {
      return `<figure class="${cls} ph--filled"${style}><img src="/assets/img/photos/${a.id}.${ext}" alt="${a.alt || a.title}" loading="${a.eager ? 'eager' : 'lazy'}" decoding="async"></figure>`;
    }
  }
  if (MAQ[a.id]) {
    const big = a.class && a.class.includes('ph--bleed');
    const set = MAQ_W.map((w) => `/assets/img/maquette/${a.id}-${w}.jpg ${w}w`).join(', ');
    return `<figure class="${cls} ph--filled is-maquette"${style} data-ph="${a.id}"><img src="/assets/img/maquette/${a.id}-1600.jpg" srcset="${set}"${a.pos ? ` style="object-position:${a.pos}"` : ''} sizes="${big ? '100vw' : (a.sizes || '(max-width: 900px) 100vw, 50vw')}" alt="${a.alt || a.title}" loading="${a.eager ? 'eager' : 'lazy'}" decoding="async"></figure>`;
  }
  return `<figure class="${cls}"${style} role="img" aria-label="Emplacement photo ${a.id} : ${a.title}">` +
    `<figcaption class="ph__cap"><span class="ph__id">${a.id} · photo à venir</span>` +
    `<span class="ph__t">${a.title}</span>${a.brief ? `<span class="ph__b">${a.brief}</span>` : ''}</figcaption></figure>`;
}
// Photo existante simple : {{pic src="atelier-gilet.webp" alt="…" ratio="1/1" class="…"}}
function pic(a) {
  return `<figure class="pic${a.class ? ' ' + a.class : ''}"${a.ratio ? ` style="aspect-ratio:${a.ratio}"` : ''}><img src="/assets/img/${a.src}" alt="${a.alt || ''}" loading="lazy" decoding="async"${a.pos ? ` style="object-position:${a.pos}"` : ''}></figure>`;
}

function render(tpl, vars, depth = 0, page = '') {
  if (depth > 5) throw new Error('Inclusions trop profondes');
  let html = tpl.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => render(partial(n), vars, depth + 1, page));
  html = html.replace(/\{\{img\s+([^}]*)\}\}/g, (_, a) => picture(attrs(a)));
  html = html.replace(/\{\{cut\s+([^}]*)\}\}/g, (_, a) => cutout(attrs(a)));
  html = html.replace(/\{\{ph\s+([^}]*)\}\}/g, (_, a) => placeholder(attrs(a), page));
  html = html.replace(/\{\{pic\s+([^}]*)\}\}/g, (_, a) => pic(attrs(a)));
  html = html.replace(/\{\{(\w+)\}\}/g, (_, k) => {
    if (!(k in vars)) throw new Error(`Variable manquante : ${k}`);
    return vars[k];
  });
  return html;
}

// Chemins relatifs : le site fonctionne à la racine d'un domaine, dans un sous-dossier
// ou en ouvrant directement index.html depuis l'ordinateur.
function relativize(html, prefix) {
  const fix = (url) => {
    if (!url.startsWith('/') || url.startsWith('//')) return url;
    const [path, hash] = url.split('#');
    let rel = path.slice(1);
    if (rel === '' || rel.endsWith('/')) rel += 'index.html';
    return prefix + rel + (hash !== undefined ? '#' + hash : '');
  };
  return html
    .replace(/\b(href|src)="([^"]*)"/g, (m, a, u) => `${a}="${fix(u)}"`)
    .replace(/\bsrcset="([^"]*)"/g, (m, set) => `srcset="${set.split(', ').map((p) => { const [u, w] = p.split(' '); return fix(u) + (w ? ' ' + w : ''); }).join(', ')}"`);
}

for (const [src, out] of Object.entries(pages)) {
  let tpl = readFileSync(join(SRC, 'pages', src), 'utf8');
  const metaMatch = tpl.match(/^<!--meta\s*([\s\S]*?)-->\s*/);
  const meta = metaMatch ? JSON.parse(metaMatch[1]) : {};
  tpl = tpl.slice(metaMatch ? metaMatch[0].length : 0);
  const path = '/' + out.replace(/index\.html$/, '');
  const vars = {
    canonical: SITE_URL + path,
    year: String(new Date().getFullYear()),
    ...meta,
    navHome: path === '/' ? ' aria-current="page"' : '',
    navCollections: path === '/collections/' ? ' aria-current="page"' : '',
    navCeremonie: path === '/ceremonie/' ? ' aria-current="page"' : '',
    navAbout: path === '/a-propos-de-nous/' ? ' aria-current="page"' : '',
    navContact: path === '/contactez-nous/' ? ' aria-current="page"' : '',
    navLegal: path === '/avis-juridique/' ? ' aria-current="page"' : '',
  };
  const depth = out.split('/').length - 1;
  const html = relativize(render(tpl, vars, 0, path), out === '404.html' ? (process.env.BASE_PATH || '/') : '../'.repeat(depth));
  const dest = join(OUT, out);
  mkdirSync(dirname(dest), { recursive: true });
  writeFileSync(dest, html);
  console.log('✓', out);
}

if (!existsSync(join(OUT, 'assets/css/main.css'))) console.warn('⚠ main.css absent');

// Liste des photos à réaliser, générée à partir des cadres présents dans les pages
const rows = [...shots.values()].sort((a, b) => a.id.localeCompare(b.id, 'fr', { numeric: true }));
const todo = rows.filter((r) => !['webp', 'jpg'].some((e) => existsSync(join(PHOTOS, `${r.id}.${e}`))));
const maqCount = todo.filter((r) => MAQ[r.id]).length;
let md = `# Photos à réaliser\n\nListe générée automatiquement par \`node build.mjs\` à partir des cadres vides du site.\n\n` +
  `Pour remplacer un cadre : enregistrer la photo sous \`site/assets/img/photos/<numéro>.jpg\` (ex. \`P01.jpg\`, 2400 px de large maximum, qualité 80), puis relancer \`node build.mjs\`.\n\n` +
  `Direction commune à toutes les photos : lumière naturelle ou chaude et douce, fonds sobres (pierre, bois, lin), aucun flash frontal, aucun plastique ni étiquette visible, vêtements repassés. Les costumes bleus restent la seule tache froide de l'image : éviter les fonds bleus ou gris froid.\n\n` +
  `${todo.length} photo(s) restante(s) sur ${rows.length}, dont ${maqCount} affichée(s) pour l'instant avec une image provisoire Pexels (liste dans \`src/maquette.json\`).\n\n`;
for (const r of rows) {
  const done = !todo.includes(r);
  md += `## ${r.id} · ${r.title}${done ? ' (fait)' : MAQ[r.id] ? ' (image provisoire)' : ''}\n\n- Format : ${r.ratio.replace('/', ':')}${r.ratio === '16/9' || r.ratio === '3/2' ? ' (paysage)' : r.ratio === '1/1' ? ' (carré)' : ' (portrait)'}\n- Page(s) : ${[...r.pages].join(', ')}\n- Description : ${r.brief || ''}\n\n`;
}
writeFileSync(join(ROOT, 'PHOTOS-A-REALISER.md'), md);
console.log(`✓ PHOTOS-A-REALISER.md (${todo.length}/${rows.length} à faire)`);
