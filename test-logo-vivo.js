/* ¿El logo de la landing se queda quieto al recargar?
 *
 * Jose: «ayer no pasaba esto pero ahora el logo animado de la landing se
 * queda al recargar la página».
 *
 * En el video que mandó yo no lo veo: el logo cambia entre 486 y 852
 * píxeles por cuadro durante el splash. Así que o pasa de vez en cuando, o
 * depende de algo de su navegador. Esta prueba recarga varias veces y mira
 * si en alguna el logo deja de moverse.
 *
 * Mide PÍXELES, no estilos: una animación CSS que se para sigue teniendo su
 * propiedad `animation` puesta, así que preguntarle al estilo no sirve.
 *
 * Ejecutar:  node test-logo-vivo.js     (o NAVEGADOR=webkit node ...)
 */
const { chromium, webkit, firefox } = require('playwright');
const NAVEGADOR = { chromium, webkit, firefox }[process.env.NAVEGADOR || 'chromium'] || chromium;
const { servir, erroresDeLaApp } = require('./test-server');

let f = 0;
const chk = (c, m, d) => { if (!c) f++; console.log((c?'✅':'❌')+' '+m+(d!==undefined?'   '+JSON.stringify(d):'')); };

/* Cuántos píxeles cambian en la zona del logo entre dos instantes.
   Solo mira los VISIBLES: la landing tiene un logo en la barra de
   navegación que está oculto, y medirlo daba 0 siempre —un falso positivo
   que me hizo creer que el logo estaba congelado cuando no lo estaba. */
async function moviendose(p, sel, ms) {
  const el = await p.evaluateHandle((s) => {
    for (const e of document.querySelectorAll(s)) {
      const cs = getComputedStyle(e), r = e.getBoundingClientRect();
      if (cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0
          && r.width > 10 && r.height > 5 && r.top < innerHeight && r.bottom > 0) return e;
    }
    return null;
  }, sel);
  const elem = el.asElement();
  if (!elem) return null;
  const caja = await elem.boundingBox();
  if (!caja || caja.width < 10) return null;
  const rec = { x: Math.round(caja.x), y: Math.round(caja.y),
                width: Math.round(caja.width), height: Math.round(caja.height) };
  const a = await p.screenshot({ clip: rec });
  await p.waitForTimeout(ms);
  const b = await p.screenshot({ clip: rec });
  let d = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) if (a[i] !== b[i]) d++;
  return d;
}

(async () => {
  const SITIO = await servir();
  const b = await NAVEGADOR.launch();
  const p = await b.newPage({ viewport: { width: 1280, height: 800 } });
  const errs = []; p.on('pageerror', e => errs.push(e.message));

  const quietos = [];
  const VUELTAS = 5;

  for (let i = 1; i <= VUELTAS; i++) {
    await p.goto(SITIO.pagina('index.html'), { waitUntil: 'load' });

    /* Durante el splash */
    await p.waitForTimeout(700);
    const enSplash = await moviendose(p, '#landing-splash-logo', 500);

    /* Y ya en la landing, pasado el splash */
    await p.waitForTimeout(3500);
    const enHeader = await moviendose(p, '#hero-logo, .ss-logo:not(#landing-splash-logo)', 500);

    const fila = { vuelta: i, splash: enSplash, cabecera: enHeader };
    quietos.push(fila);
    const parado = (enSplash !== null && enSplash === 0) || (enHeader !== null && enHeader === 0);
    console.log(`   recarga ${i}: splash=${enSplash === null ? 'n/a' : enSplash} ` +
                `cabecera=${enHeader === null ? 'n/a' : enHeader}` + (parado ? '   ← QUIETO' : ''));
  }

  const encontrado = quietos.filter(q =>
    (q.splash !== null && q.splash === 0) || (q.cabecera !== null && q.cabecera === 0));

  const hubo = quietos.some(q => q.splash !== null || q.cabecera !== null);
  chk(hubo, 'se encontró el logo para poder medirlo');
  chk(encontrado.length === 0,
      `el logo se mueve en las ${VUELTAS} recargas`,
      encontrado.length ? encontrado : 'ninguna quieta');

  const propios = erroresDeLaApp(errs);
  chk(propios.length === 0, 'sin errores de la app', propios);

  await b.close();
  await SITIO.cerrar();
  if (f) { console.log(`\n❌ ${f} fallo(s)`); process.exit(1); }
  console.log('\n✅ el logo sigue vivo al recargar');
})();
