/* Prueba: el dominio propio está puesto en todas partes y no queda ninguno
   viejo colado.

   No necesita navegador: es un repaso de los archivos. Existe porque una URL
   vieja no da error en ninguna parte — simplemente la vista previa del
   enlace sale rota, o la notificación abre un sitio que ya no es el nuestro,
   y nadie se entera hasta que alguien lo comparte.

   Ejecutar:  node test-domain.js
*/
const fs = require('fs');
const path = require('path');

const DOMINIO = 'sketch-send.com';
const CORREO  = 'hello@' + DOMINIO;
const VIEJO   = 'jic51.github.io/drawing-app';

/* Dónde se sirve el sitio AHORA MISMO.

   GitHub Pages solo toma el dominio propio si existe el archivo CNAME. Sin
   él sigue sirviendo jic51.github.io/drawing-app, y entonces una og:image
   que apunte al dominio nuevo da 404: la vista previa del enlace sale rota
   y nadie se entera, porque la app funciona igual.

   Así que lo que se comprueba no es "pone el dominio nuevo", sino la regla
   que de verdad importa: las URL absolutas apuntan a donde el sitio está
   servido. Vale en los dos estados, y sigue cazando una mezcla de ambos. */
const CNAME_PATH = path.join(__dirname, 'CNAME');
const CON_DOMINIO = fs.existsSync(CNAME_PATH);
const BASE = CON_DOMINIO ? 'https://' + DOMINIO + '/' : 'https://' + VIEJO + '/';

/* Cosas que NO pueden quedar en ningún archivo que se sirva. */
const PROHIBIDO = [
  /* Mientras no exista el CNAME el sitio se sirve ahí, así que no es un
     error encontrarlo: es lo correcto. */
  ...(CON_DOMINIO ? [[/jic51\.github\.io/, 'dominio viejo de GitHub Pages']] : []),
  [/(?<![\w.-])sketchsend\.(com|app)/,     'dominio sin guion (no es el que compramos)'],
  [/joseisrael5101@gmail\.com/,            'correo personal en una página pública'],
];

const RAIZ = __dirname;
const SALTAR = new Set(['node_modules', '.git', '.github']);

function archivos(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SALTAR.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...archivos(p));
    /* Solo lo que se sirve. Los .md son notas del repo y el BACKLOG habla
       del dominio viejo a propósito, para explicar la migración. */
    else if (/\.(html|js|json)$/.test(e.name) && !/^test-.*\.js$/.test(e.name)) out.push(p);
  }
  return out;
}

let fallos = 0;
const chk = (cond, msg, dato) => {
  if (!cond) fallos++;
  console.log((cond ? '✅' : '❌') + ' ' + msg
    + (dato !== undefined ? '   ' + JSON.stringify(dato) : ''));
};

/* ── 1. Nada prohibido en ningún archivo ──────────────────────────── */
console.log('— Sin rastros del dominio viejo —');
const encontrados = [];
for (const f of archivos(RAIZ)) {
  const txt = fs.readFileSync(f, 'utf8');
  txt.split('\n').forEach((linea, i) => {
    for (const [re, por_que] of PROHIBIDO) {
      if (re.test(linea)) {
        encontrados.push(path.relative(RAIZ, f) + ':' + (i + 1) + ' — ' + por_que);
      }
    }
  });
}
chk(encontrados.length === 0, 'ningún archivo publicado trae una URL o correo viejos',
    encontrados.length ? encontrados.slice(0, 10) : undefined);

/* ── 2. El CNAME que necesita GitHub Pages ────────────────────────── */
console.log('\n— GitHub Pages —');
const cnamePath = CNAME_PATH;
if (!CON_DOMINIO) {
  console.log('ℹ️  Sin CNAME: el sitio se sirve en ' + VIEJO
    + '. Las URL absolutas deben apuntar ahí (se comprueba abajo).');
}
if (fs.existsSync(cnamePath)) {
  const c = fs.readFileSync(cnamePath, 'utf8').trim();
  chk(c === DOMINIO, 'el CNAME contiene exactamente el dominio', c);
  /* Una sola línea: GitHub solo admite un dominio y con dos falla el
     despliegue entero, no solo el dominio. */
  chk(fs.readFileSync(cnamePath, 'utf8').trim().split('\n').length === 1,
      'y una sola línea');
}

/* ── 3. Las metaetiquetas que usan las vistas previas ─────────────── */
console.log('\n— Vistas previas de los enlaces —');
for (const f of ['app/index.html', 'app/sketchsendv14.html', 'index.html']) {
  const txt = fs.readFileSync(path.join(RAIZ, f), 'utf8');
  const m = [...txt.matchAll(/<meta\s+(?:property|name)="(og:image|twitter:image)"\s+content="([^"]+)"/g)];
  if (!m.length) { chk(false, f + ': no tiene og:image'); continue; }
  for (const [, prop, url] of m) {
    /* Tiene que ser absoluta: las redes no resuelven rutas relativas. */
    chk(url.startsWith(BASE),
        f + ' ' + prop + ' apunta a donde se sirve el sitio y es absoluta', url);
  }
}

/* ── 4. El correo de contacto en lo legal ─────────────────────────── */
console.log('\n— Correo de contacto —');
for (const f of ['privacy.html', 'terms.html']) {
  const txt = fs.readFileSync(path.join(RAIZ, f), 'utf8');
  chk(txt.includes(CORREO), f + ' usa ' + CORREO);
}

/* ── 5. El enlace que abre la notificación ────────────────────────── */
console.log('\n— Función en la nube —');
const fn = fs.readFileSync(path.join(RAIZ, 'functions', 'index.js'), 'utf8');
const link = fn.match(/link:\s*'([^']+)'/);
chk(link && link[1].startsWith(BASE),
    'la notificación abre donde se sirve el sitio', link ? link[1] : 'sin link');

console.log(fallos ? '\n❌ ' + fallos + ' fallo(s)' : '\n✅ Dominio correcto en todas partes');
process.exit(fallos ? 1 : 0);
