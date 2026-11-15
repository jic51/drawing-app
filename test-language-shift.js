/* Prueba: la landing no se recoloca al cambiar de idioma.

   Una misma frase no mide igual en inglés que en español. Sin reservar
   sitio, los botones crecían o encogían y tres párrafos pasaban de una
   línea a dos, empujando hacia abajo todo lo que venía después: la página
   entera parecía reacomodarse.

   Se permite que una línea de texto centrado se recentre unos píxeles
   (inevitable sin congelar anchos, y congelarlos deja cortes feos), pero
   NADA debe moverse en vertical, que es lo que de verdad se nota.

   Si mañana cambia un texto de la landing, esta prueba avisa y hay que
   volver a medir los mínimos.

   Ejecutar:  node test-language-shift.js
*/
const { chromium } = require('playwright');
const path = require('path');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  await p.goto('file://' + path.resolve(__dirname, 'index.html'));
  await p.waitForTimeout(3600);
  await p.evaluate(() => document.getElementById('landing-splash')?.remove());
  await p.waitForTimeout(400);

  const medir = () => p.evaluate(() => {
    const out = {};
    document.querySelectorAll('[data-i18n], .cta-btn, .nav-cta, .section-title, .stat, .counter-label').forEach((e, i) => {
      const r = e.getBoundingClientRect();
      const clave = (e.dataset.i18n || e.className || e.tagName) + '#' + i;
      out[clave] = { x: Math.round(r.left), y: Math.round(r.top + scrollY),
                     w: Math.round(r.width), h: Math.round(r.height) };
    });
    return out;
  });

  const antes = await medir();
  await p.evaluate(() => {
    const b = [...document.querySelectorAll('.lang-toggle *')].find(x => x.textContent.trim() === 'ES');
    if (b) b.click();
  });
  await p.waitForTimeout(900);
  const despues = await medir();

  const movidos = [];
  for (const k of Object.keys(antes)) {
    if (!despues[k]) continue;
    const a = antes[k], d = despues[k];
    const dy = Math.abs(a.y - d.y), dx = Math.abs(a.x - d.x), dh = Math.abs(a.h - d.h);
    if (dy > 2 || dx > 2 || dh > 2) movidos.push({ k, dx, dy, dh, ancho: a.w + '→' + d.w });
  }
  const verticales = movidos.filter(m => m.dy > 2 || m.dh > 2);
  const soloAncho  = movidos.filter(m => m.dy <= 2 && m.dh <= 2);

  let f = 0;
  const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

  chk(verticales.length === 0,
      'nada se mueve en vertical al cambiar de idioma',
      verticales.slice(0, 8).map(m => m.k + ' dy=' + m.dy + ' dh=' + m.dh));
  /* Tres líneas de texto centrado que se recentran unos px: tolerable. */
  chk(soloAncho.length <= 4,
      'como mucho unas pocas líneas de texto centrado se recentran',
      { cuantas: soloAncho.length, cuales: soloAncho.map(m => m.k) });
  chk(Object.keys(antes).length > 30, 'se midieron elementos de verdad',
      { medidos: Object.keys(antes).length });

  await b.close();
  console.log(f ? '\n❌ ' + f + ' fallo(s)' : '\n✅ La landing no se recoloca al cambiar de idioma');
  process.exit(f ? 1 : 0);
})();
