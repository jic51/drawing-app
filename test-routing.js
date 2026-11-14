/* Prueba: las rutas del sitio.

   La raíz es la landing y la app vive en /app/. Lo delicado es que hasta
   ahora la app estaba en la raíz, así que TODOS los enlaces ya compartidos
   apuntan ahí: ver un dibujo, agregar a alguien, abrir un perfil y entrar
   por correo. Si la landing se quedara con ellos, cada uno de esos enlaces
   dejaría de funcionar sin que nada pareciera estar roto.

   Levanta un servidor de verdad a propósito: con file:// las rutas de
   carpeta no se comportan como en GitHub Pages y la prueba no diría nada.

   Ejecutar:  node test-routing.js   (desde la raíz del proyecto)
*/
const { chromium } = require('playwright');
const path = require('path');
let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

/* Un servidor de verdad: con file:// las rutas de carpeta no se comportan
   como en GitHub Pages y la prueba no diría nada útil. */
const http = require('http'), fs = require('fs');
/* La raíz del sitio es el proyecto, no la carpeta de este script. */
const RAIZ = process.cwd();
const TIPOS = { '.html':'text/html', '.js':'text/javascript', '.json':'application/json',
                '.png':'image/png', '.svg':'image/svg+xml' };
const srv = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.endsWith('/')) p += 'index.html';
  const abs = path.join(RAIZ, p);
  if (!abs.startsWith(RAIZ) || !fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
    res.writeHead(404); res.end('404'); return;
  }
  res.writeHead(200, { 'Content-Type': TIPOS[path.extname(abs)] || 'application/octet-stream' });
  fs.createReadStream(abs).pipe(res);
});

(async () => {
  await new Promise(r => srv.listen(0, r));
  const base = 'http://127.0.0.1:' + srv.address().port;
  const b = await chromium.launch();

  const visita = async (ruta, esperaRedir) => {
    const p = await b.newPage({ viewport: { width: 1100, height: 800 } });
    await p.goto(base + ruta);
    await p.waitForTimeout(esperaRedir ? 1800 : 1200);
    const r = await p.evaluate(() => ({
      url: location.pathname + location.search,
      // ¿qué página es? la landing tiene el hero; la app, el lienzo
      esLanding: !!document.querySelector('.hero-logo'),
      esApp: !!document.getElementById('canvas'),
      verVisible: !!document.querySelector('#viewer-screen.activo'),
    }));
    await p.close();
    return r;
  };

  console.log('— La raíz es la landing —');
  let r = await visita('/');
  chk(r.esLanding && !r.esApp, 'sketch-send.com → la landing', r);

  console.log('\n— /app/ es la app —');
  r = await visita('/app/');
  chk(r.esApp && !r.esLanding, 'sketch-send.com/app → la app', r);

  console.log('\n— Enlaces ya compartidos (apuntan a la raíz) —');
  for (const [q, nombre] of [['?view=ABCdef123456789', 'ver un dibujo'],
                             ['?add=ABC12345', 'agregar a alguien'],
                             ['?u=joselo', 'perfil']]) {
    r = await visita('/' + q, true);
    chk(r.url.startsWith('/app/') && r.esApp,
        nombre + ' (' + q + ') llega a la app', { acaba_en: r.url });
    chk(r.url.includes(q.slice(1)), 'y conserva el parámetro', r.url);
  }

  console.log('\n— /landing.html de siempre —');
  r = await visita('/landing.html', true);
  chk(r.esLanding && r.url === '/', 'redirige a la raíz', r);

  await b.close(); srv.close();
  console.log(f ? '\n❌ ' + f + ' fallos' : '\n✅ rutas correctas');
  process.exit(f ? 1 : 0);
})();
