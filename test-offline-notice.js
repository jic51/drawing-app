/* Prueba: el aviso de "sin conexión".
   - Con red no se ve NI ocupa espacio (ni una línea de 1px).
   - Sin red aparece una franja fina, sin tapar la app.
   - Al volver la red saluda en verde y se retira sola.
   - Al abrirse y cerrarse, el lienzo se re-encaja: no desborda su área y
     sigue siendo 9:16.

   Ejecutar:  node test-offline-notice.js
*/
const { chromium } = require('playwright');
const path = require('path');

const ARCHIVO = 'file://' + path.resolve(__dirname, 'app/index.html');
const RATIO = 9 / 16;

const MOSTRAR_APP = () => {
  document.querySelectorAll('#splash-screen,#auth-screen')
    .forEach(e => { e.style.display = 'none'; });
  const a = document.getElementById('app');
  if (a) a.style.display = 'flex';
  if (typeof setupCanvas === 'function') setupCanvas();
};

(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errores = [];
  p.on('pageerror', e => errores.push(e.message));

  await p.goto(ARCHIVO);
  await p.waitForTimeout(2600);      // deja pasar el splash
  await p.evaluate(MOSTRAR_APP);
  await p.waitForTimeout(300);

  const leer = () => p.evaluate(() => {
    const bar = document.getElementById('senal');
    const txt = document.getElementById('senal-texto');
    const cv  = document.getElementById('canvas');
    const ar  = document.getElementById('carea');
    const r = bar.getBoundingClientRect();
    const c = cv.getBoundingClientRect();
    return {
      visible: bar.classList.contains('visible'),
      ok:      bar.classList.contains('ok'),
      texto:   txt.textContent,
      franja:  Math.round(r.height),
      lienzo:  Math.round(c.height),
      area:    Math.round(ar.getBoundingClientRect().height),
      ratio:   c.width / c.height,
    };
  });

  let fallos = 0;
  const chk = (cond, msg, dato) => {
    if (!cond) fallos++;
    console.log((cond ? '✅' : '❌') + ' ' + msg
      + (dato !== undefined ? '   ' + JSON.stringify(dato) : ''));
  };

  // ── Con red ──────────────────────────────────────────────────────────
  let e = await leer();
  chk(!e.visible && e.franja === 0,
      'con red: ni se ve ni ocupa sitio', { franja: e.franja });
  const lienzoConRed = e.lienzo;

  // ── Sin red ──────────────────────────────────────────────────────────
  await ctx.setOffline(true);
  await p.waitForTimeout(600);       // transición 280ms + margen
  e = await leer();
  chk(e.visible && !e.ok, 'sin red: aparece la franja', { texto: e.texto });
  chk(/No connection|Sin conexión/.test(e.texto), 'sin red: texto correcto', e.texto);
  chk(e.franja > 20 && e.franja < 40, 'sin red: franja fina', e.franja);
  chk(e.lienzo < lienzoConRed,
      'sin red: el lienzo se re-encaja más bajo', { antes: lienzoConRed, ahora: e.lienzo });
  chk(e.lienzo <= e.area,
      'sin red: el lienzo no desborda su área', { lienzo: e.lienzo, area: e.area });
  chk(Math.abs(e.ratio - RATIO) < 0.01, 'sin red: sigue 9:16', +e.ratio.toFixed(4));

  // ── Vuelve la red ────────────────────────────────────────────────────
  await ctx.setOffline(false);
  await p.waitForTimeout(600);
  e = await leer();
  chk(e.visible && e.ok, 'vuelve la red: aviso en verde', { texto: e.texto });
  chk(/Back online|restablecida/.test(e.texto), 'vuelve la red: texto correcto', e.texto);

  await p.waitForTimeout(2800);      // se retira a los 2600ms
  e = await leer();
  chk(!e.visible && e.franja === 0, 'el aviso verde se retira solo', { franja: e.franja });
  chk(Math.abs(e.lienzo - lienzoConRed) <= 1,
      'el lienzo recupera su tamaño', { antes: lienzoConRed, ahora: e.lienzo });

  chk(errores.length === 0, 'sin errores de JS', errores[0] || '');

  await b.close();
  console.log(fallos ? '\n❌ ' + fallos + ' fallo(s)' : '\n✅ Aviso de conexión correcto');
  process.exit(fallos ? 1 : 0);
})();
